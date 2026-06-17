import { useEffect, useMemo, useState } from 'react'
import { getSupabase } from '../supabaseClient'
import { totalAvailableDays } from '../dateUtils'
import { Masthead, Spinner, Modal } from './Shared'

const ADMIN_PASSWORD = '1289'
const SESSION_KEY = 'sama_admin_session'

export default function AdminPage({ notify }) {
  const [authed, setAuthed] = useState(
    () => sessionStorage.getItem(SESSION_KEY) === 'ok'
  )

  if (!authed) {
    return <Login onSuccess={() => { sessionStorage.setItem(SESSION_KEY, 'ok'); setAuthed(true) }} />
  }
  return <AdminDashboard notify={notify} onLogout={() => { sessionStorage.removeItem(SESSION_KEY); setAuthed(false) }} />
}

function Login({ onSuccess }) {
  const [user, setUser] = useState('')
  const [pass, setPass] = useState('')
  const [err, setErr] = useState('')

  function submit() {
    if (pass === ADMIN_PASSWORD) onSuccess()
    else setErr('كلمة المرور غير صحيحة.')
  }

  return (
    <div className="app-shell">
      <Masthead tagline="لوحة الإدارة" />
      <div className="card">
        <h2>تسجيل دخول الإدارة</h2>
        <p className="subtle">هذه الصفحة مخصّصة للمشرفين فقط.</p>
        <div className="field">
          <label>اسم المستخدم</label>
          <input className="input" value={user} onChange={(e) => setUser(e.target.value)} placeholder="المشرف" />
        </div>
        <div className="field">
          <label>كلمة المرور</label>
          <input
            className="input" type="password" value={pass}
            onChange={(e) => setPass(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="••••"
          />
        </div>
        {err && <p className="error-text">{err}</p>}
        <button className="btn btn-primary" onClick={submit} style={{ marginTop: 8 }}>دخول</button>
      </div>
    </div>
  )
}

function AdminDashboard({ notify, onLogout }) {
  const sb = getSupabase()
  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState([])
  const [poems, setPoems] = useState([])
  const [rows, setRows] = useState([])
  const [showAddPoem, setShowAddPoem] = useState(false)

  async function loadAll() {
    setLoading(true)
    const [{ data: st }, { data: pm }, { data: at }] = await Promise.all([
      sb.from('students').select('*').order('name'),
      sb.from('poems').select('*').order('start_date'),
      sb.from('attendance').select('*'),
    ])
    setStudents(st || [])
    setPoems(pm || [])
    setRows(at || [])
    setLoading(false)
  }

  useEffect(() => { loadAll() }, []) // eslint-disable-line

  const currentPoem = poems.find((p) => p.is_current) || poems[0]

  // حساب المتأخرين عن الحفظ منذ بداية القصيدة الحالية.
  // الغياب = أيام الحفظ المتاحة − أيام الحفظ المسجّلة.
  const lateData = useMemo(() => {
    if (!currentPoem) return []
    const available = totalAvailableDays(currentPoem.start_date)
    return students
      .filter((s) => s.is_active)
      .map((s) => {
        const done = rows.filter(
          (x) => x.student_id === s.id && x.poem_id === currentPoem.id && x.type === 'hifz'
        ).length
        const missed = Math.max(0, available - done)
        return { student: s, missed }
      })
  }, [students, rows, currentPoem])

  const lateTwo = lateData.filter((d) => d.missed >= 2 && d.missed < 4)
  const lateFour = lateData.filter((d) => d.missed >= 4)

  async function excludeStudent(s) {
    const ok = window.confirm(`هل تريد استبعاد «${s.name}»؟ لن يظهر في قائمة التسجيل.`)
    if (!ok) return
    const { error } = await sb.from('students').update({ is_active: false }).eq('id', s.id)
    if (error) { notify('تعذّر الاستبعاد'); return }
    setStudents((prev) => prev.map((x) => (x.id === s.id ? { ...x, is_active: false } : x)))
    notify('تم الاستبعاد')
  }

  async function reactivate(s) {
    const { error } = await sb.from('students').update({ is_active: true }).eq('id', s.id)
    if (error) { notify('تعذّرت الإعادة'); return }
    setStudents((prev) => prev.map((x) => (x.id === s.id ? { ...x, is_active: true } : x)))
    notify('تمت إعادة الطالب')
  }

  if (loading) {
    return (
      <div className="app-shell">
        <Masthead tagline="لوحة الإدارة" />
        <Spinner />
      </div>
    )
  }

  return (
    <div className="app-shell">
      <Masthead tagline="لوحة الإدارة" />

      <div className="card">
        <h2>المتأخرون عن الحفظ</h2>
        <p className="subtle">
          محسوبة منذ بداية «{currentPoem?.name}» — إجمالي الغياب عن الحفظ ({totalAvailableDays(currentPoem?.start_date || '2026-06-17')} يوم متاح حتى اليوم).
        </p>

        <div className="admin-cols">
          <div>
            <h3 style={{ fontFamily: 'var(--display)', marginBottom: 10 }}>متأخر يومين فأكثر</h3>
            {lateTwo.length === 0 ? (
              <div className="empty">لا أحد 🎉</div>
            ) : (
              <ul className="late-list">
                {lateTwo.map((d) => (
                  <li key={d.student.id}>
                    <span>{d.student.name}</span>
                    <span className="badge badge-warn">{d.missed} يوم</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h3 style={{ fontFamily: 'var(--display)', marginBottom: 10 }}>متأخر ٤ أيام فأكثر</h3>
            {lateFour.length === 0 ? (
              <div className="empty">لا أحد 🎉</div>
            ) : (
              <ul className="late-list">
                {lateFour.map((d) => (
                  <li key={d.student.id}>
                    <span>{d.student.name}</span>
                    <span className="badge badge-bad">{d.missed} يوم</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <h2 style={{ margin: 0 }}>إدارة الطلاب</h2>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowAddPoem(true)}>＋ قصيدة</button>
        </div>
        <p className="subtle">استبعد من تجاوز ٤ أيام تأخراً، أو أعِد من تريد.</p>

        {students.map((s) => (
          <div key={s.id} className={`student-row ${s.is_active ? '' : 'inactive'}`}>
            <span className="name">{s.name}{!s.is_active && ' (مستبعَد)'}</span>
            {s.is_active ? (
              <button className="btn btn-danger btn-sm" onClick={() => excludeStudent(s)}>استبعاد</button>
            ) : (
              <button className="btn btn-ghost btn-sm" onClick={() => reactivate(s)}>إعادة</button>
            )}
          </div>
        ))}
      </div>

      <button className="btn btn-ghost" onClick={onLogout}>تسجيل الخروج</button>

      {showAddPoem && (
        <AddPoemModal
          sb={sb}
          notify={notify}
          onClose={() => setShowAddPoem(false)}
          onAdded={() => { setShowAddPoem(false); loadAll() }}
        />
      )}
    </div>
  )
}

function AddPoemModal({ sb, notify, onClose, onAdded }) {
  const [name, setName] = useState('')
  const [start, setStart] = useState('')
  const [makeCurrent, setMakeCurrent] = useState(true)
  const [busy, setBusy] = useState(false)

  async function add() {
    if (!name.trim() || !start) { notify('أدخل اسم القصيدة وتاريخ البداية'); return }
    setBusy(true)
    // إن كانت ستصبح الحالية: ننهي القصيدة السابقة ونلغي تفعيلها.
    if (makeCurrent) {
      await sb.from('poems').update({ is_current: false }).eq('is_current', true)
    }
    const { error } = await sb.from('poems').insert({
      name: name.trim(),
      start_date: start,
      is_current: makeCurrent,
    })
    setBusy(false)
    if (error) { notify('تعذّرت الإضافة'); return }
    notify('تمت إضافة القصيدة')
    onAdded()
  }

  return (
    <Modal title="إضافة قصيدة جديدة" onClose={onClose}>
      <div className="field">
        <label>اسم القصيدة</label>
        <input className="input" placeholder="مثال: معلقة امرئ القيس" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <label>تاريخ بداية القصيدة</label>
        <input className="input" type="date" value={start} onChange={(e) => setStart(e.target.value)} dir="ltr" />
      </div>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, fontSize: '0.9rem' }}>
        <input type="checkbox" checked={makeCurrent} onChange={(e) => setMakeCurrent(e.target.checked)} />
        اجعلها القصيدة الحالية (وإنهاء السابقة)
      </label>
      <div className="btn-row">
        <button className="btn btn-ghost" onClick={onClose}>إلغاء</button>
        <button className="btn btn-primary" onClick={add} disabled={busy}>{busy ? 'جارٍ…' : 'إضافة'}</button>
      </div>
    </Modal>
  )
}
