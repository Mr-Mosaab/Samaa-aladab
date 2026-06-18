import { useEffect, useMemo, useRef, useState } from 'react'
import { getSupabase } from '../supabaseClient'
import { buildWeeks, DAY_LABELS } from '../dateUtils'
import { Masthead, Spinner, Modal } from './Shared'

export default function RegisterPage({ notify }) {
  const sb = getSupabase()

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState([])
  const [poems, setPoems] = useState([])

  // الخطوة 1
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(null) // كائن الطالب
  const [showAdd, setShowAdd] = useState(false)
  const comboRef = useRef(null)

  // الخطوة 2
  const [poemId, setPoemId] = useState('')
  const [weekIdx, setWeekIdx] = useState('')
  // المربعات: { hifz: Set(dayIndex), sharh: Set(dayIndex) }
  const [marks, setMarks] = useState({ hifz: new Set(), sharh: new Set() })
  const [saving, setSaving] = useState(false)

  // تحميل الطلاب والقصائد
  useEffect(() => {
    let alive = true
    async function load() {
      setLoading(true)
      const [{ data: st }, { data: pm }] = await Promise.all([
        sb.from('students').select('*').eq('is_active', true).order('name'),
        sb.from('poems').select('*').order('start_date'),
      ])
      if (!alive) return
      setStudents(st || [])
      setPoems(pm || [])
      const current = (pm || []).find((p) => p.is_current) || (pm || [])[0]
      if (current) setPoemId(current.id)
      setLoading(false)
    }
    load()
    return () => { alive = false }
  }, [sb])

  // إغلاق القائمة عند النقر خارجها
  useEffect(() => {
    function onClick(e) {
      if (comboRef.current && !comboRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim()
    if (!q) return students
    return students.filter((s) => s.name.includes(q))
  }, [students, query])

  const currentPoem = poems.find((p) => p.id === poemId)
  const weeks = useMemo(
    () => (currentPoem ? buildWeeks(currentPoem.start_date) : []),
    [currentPoem]
  )

  // عند تغيير القصيدة/الأسبوع نجلب السجلات الموجودة لملء المربعات
  useEffect(() => {
    async function loadMarks() {
      if (!selected || !poemId || weekIdx === '') return
      const week = weeks[Number(weekIdx)]
      if (!week) return
      const { data } = await sb
        .from('attendance')
        .select('day_of_week, type')
        .eq('student_id', selected.id)
        .eq('poem_id', poemId)
        .eq('week_number', week.number)
      const hifz = new Set()
      const sharh = new Set()
      ;(data || []).forEach((r) => {
        if (r.type === 'hifz') hifz.add(r.day_of_week)
        else sharh.add(r.day_of_week)
      })
      setMarks({ hifz, sharh })
    }
    loadMarks()
  }, [selected, poemId, weekIdx, weeks, sb])

  function pickStudent(s) {
    setSelected(s)
    setQuery(s.name)
    setOpen(false)
  }

  async function addStudent(name) {
    const clean = name.trim()
    if (!clean) return
    const { data, error } = await sb
      .from('students')
      .insert({ name: clean })
      .select()
      .single()
    if (error) {
      notify(error.code === '23505' ? 'الاسم موجود مسبقاً' : 'تعذّر إضافة الاسم')
      return
    }
    setStudents((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name, 'ar')))
    pickStudent(data)
    setShowAdd(false)
    notify('تمت إضافة الاسم')
  }

  function toggle(type, day) {
    setMarks((prev) => {
      const next = { hifz: new Set(prev.hifz), sharh: new Set(prev.sharh) }
      if (next[type].has(day)) next[type].delete(day)
      else next[type].add(day)
      return next
    })
  }

  async function save() {
    const week = weeks[Number(weekIdx)]
    if (!selected || !poemId || !week) return
    setSaving(true)

    // نمسح سجلات هذا الطالب/القصيدة/الأسبوع ثم نعيد الإدراج وفق الحالة الحالية.
    await sb
      .from('attendance')
      .delete()
      .eq('student_id', selected.id)
      .eq('poem_id', poemId)
      .eq('week_number', week.number)

    const rows = []
    ;['hifz', 'sharh'].forEach((type) => {
      marks[type].forEach((day) => {
        rows.push({
          student_id: selected.id,
          poem_id: poemId,
          week_number: week.number,
          week_start_date: week.startDate,
          day_of_week: day,
          type,
        })
      })
    })

    if (rows.length > 0) {
      const { error } = await sb.from('attendance').insert(rows)
      if (error) {
        notify('حدث خطأ أثناء الحفظ')
        setSaving(false)
        return
      }
    }
    setSaving(false)
    notify('تم حفظ التسجيل ✓')
  }

  if (loading) {
    return (
      <div className="app-shell">
        <Masthead tagline="تسجيل الحفظ وقراءة الشروح" />
        <Spinner />
      </div>
    )
  }

  return (
    <div className="app-shell">
      <Masthead tagline="تسجيل الحفظ وقراءة الشروح" />

      {step === 1 && (
        <div className="card">
          <h2>اختر اسمك</h2>
          <p className="subtle">ابحث عن اسمك في القائمة، أو أضِف اسماً جديداً.</p>

          <div className="field" ref={comboRef}>
            <label>الاسم</label>
            <div className="combo">
              <input
                className="input"
                placeholder="اكتب أو اختر اسمك"
                value={query}
                onFocusCapture={() => setOpen(true)}
                onChange={(e) => { setQuery(e.target.value); setOpen(true); setSelected(null) }}
              />
              {open && (
                <div className="combo-list">
                  {filtered.length === 0 ? (
                    <div className="combo-empty">لا يوجد اسم مطابق</div>
                  ) : (
                    filtered.map((s) => (
                      <div
                        key={s.id}
                        className={`combo-item ${selected?.id === s.id ? 'active' : ''}`}
                        onClick={() => pickStudent(s)}
                      >
                        {s.name}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          <button className="btn btn-ghost" onClick={() => setShowAdd(true)} style={{ marginBottom: 14 }}>
            ＋ إضافة اسم جديد
          </button>

          <button
            className="btn btn-primary"
            disabled={!selected}
            onClick={() => setStep(2)}
          >
            التالي
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="card">
          <span className="chip">{selected?.name}</span>
          <h2>تسجيل الأيام</h2>
          <p className="subtle">اختر القصيدة والأسبوع، ثم علّم أيام الحفظ وقراءة الشرح.</p>

          <div className="field">
            <label>القصيدة</label>
            <select className="select" value={poemId} onChange={(e) => { setPoemId(e.target.value); setWeekIdx('') }}>
              {poems.map((p) => (
                <option key={p.id} value={p.id}>{p.name}{p.is_current ? ' (الحالية)' : ''}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>الأسبوع</label>
            <select className="select" value={weekIdx} onChange={(e) => setWeekIdx(e.target.value)}>
              <option value="">— اختر الأسبوع —</option>
              {weeks.map((w, i) => (
                <option key={w.number} value={i}>{w.label}</option>
              ))}
            </select>
          </div>

          {weekIdx !== '' && (() => {
            const disabledDays = weeks[Number(weekIdx)]?.disabledDays || []
            return (
            <>
              {disabledDays.length > 0 && (
                <div className="notice">
                  هذا الأسبوع يبدأ يوم الأربعاء — الأيام السابقة معطّلة.
                </div>
              )}
              <table className="attendance-table">
                <thead>
                  <tr>
                    <th></th>
                    {DAY_LABELS.map((d) => <th key={d}>{d}</th>)}
                  </tr>
                </thead>
                <tbody>
                  <tr className="row-hifz">
                    <td className="row-label">الحفظ</td>
                    {DAY_LABELS.map((_, day) => {
                      const disabled = disabledDays.includes(day)
                      return (
                        <td key={day}>
                          <button
                            className={`check ${marks.hifz.has(day) ? 'checked' : ''} ${disabled ? 'disabled' : ''}`}
                            onClick={() => !disabled && toggle('hifz', day)}
                            disabled={disabled}
                            aria-label={`حفظ ${DAY_LABELS[day]}`}
                            aria-pressed={marks.hifz.has(day)}
                          >{disabled ? '—' : '✓'}</button>
                        </td>
                      )
                    })}
                  </tr>
                  <tr className="row-sharh">
                    <td className="row-label">قراءة الشرح</td>
                    {DAY_LABELS.map((_, day) => {
                      const disabled = disabledDays.includes(day)
                      return (
                        <td key={day}>
                          <button
                            className={`check ${marks.sharh.has(day) ? 'checked' : ''} ${disabled ? 'disabled' : ''}`}
                            onClick={() => !disabled && toggle('sharh', day)}
                            disabled={disabled}
                            aria-label={`شرح ${DAY_LABELS[day]}`}
                            aria-pressed={marks.sharh.has(day)}
                          >{disabled ? '—' : '✓'}</button>
                        </td>
                      )
                    })}
                  </tr>
                </tbody>
              </table>

              <div className="btn-row" style={{ marginTop: 20 }}>
                <button className="btn btn-ghost" onClick={() => setStep(1)}>رجوع</button>
                <button className="btn btn-primary" onClick={save} disabled={saving}>
                  {saving ? 'جارٍ الحفظ…' : 'حفظ التسجيل'}
                </button>
              </div>
            </>
            )
          })()}

          {weekIdx === '' && (
            <button className="btn btn-ghost" onClick={() => setStep(1)}>رجوع</button>
          )}
        </div>
      )}

      {showAdd && (
        <AddStudentModal onClose={() => setShowAdd(false)} onAdd={addStudent} />
      )}
    </div>
  )
}

function AddStudentModal({ onClose, onAdd }) {
  const [name, setName] = useState('')
  return (
    <Modal title="إضافة اسم جديد" onClose={onClose}>
      <div className="field">
        <label>الاسم</label>
        <input
          className="input"
          placeholder="اسم الطالب"
          value={name}
          autoFocus
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onAdd(name)}
        />
      </div>
      <div className="btn-row">
        <button className="btn btn-ghost" onClick={onClose}>إلغاء</button>
        <button className="btn btn-primary" onClick={() => onAdd(name)}>إضافة</button>
      </div>
    </Modal>
  )
}
