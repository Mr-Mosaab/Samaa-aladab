import { useEffect, useMemo, useState } from 'react'
import { getSupabase } from '../supabaseClient'
import { buildWeeks } from '../dateUtils'
import { Masthead, Spinner } from './Shared'

const HIFZ_COLOR = '#6fb0c4'
const SHARH_COLOR = '#c2a25a'

export default function StatsPage() {
  const sb = getSupabase()
  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState([])
  const [poems, setPoems] = useState([])
  const [rows, setRows] = useState([]) // كل سجلات الحضور

  const [poemId, setPoemId] = useState('')
  const [weekIdx, setWeekIdx] = useState('0')

  useEffect(() => {
    let alive = true
    async function load() {
      setLoading(true)
      const [{ data: st }, { data: pm }, { data: at }] = await Promise.all([
        sb.from('students').select('*').eq('is_active', true).order('name'),
        sb.from('poems').select('*').order('start_date'),
        sb.from('attendance').select('*'),
      ])
      if (!alive) return
      setStudents(st || [])
      setPoems(pm || [])
      setRows(at || [])
      const current = (pm || []).find((p) => p.is_current) || (pm || [])[0]
      if (current) setPoemId(current.id)
      setLoading(false)
    }
    load()
    return () => { alive = false }
  }, [sb])

  const currentPoem = poems.find((p) => p.id === poemId)
  const weeks = useMemo(
    () => (currentPoem ? buildWeeks(currentPoem.start_date) : []),
    [currentPoem]
  )

  // بيانات الأسبوع المختار: عدد الأيام لكل طالب
  const weekData = useMemo(() => {
    const week = weeks[Number(weekIdx)]
    if (!week || !poemId) return []
    return students.map((s) => {
      const r = rows.filter(
        (x) => x.student_id === s.id && x.poem_id === poemId && x.week_number === week.number
      )
      return {
        name: s.name,
        hifz: r.filter((x) => x.type === 'hifz').length,
        sharh: r.filter((x) => x.type === 'sharh').length,
      }
    })
  }, [students, rows, weeks, weekIdx, poemId])

  // بيانات تراكمية منذ بداية القصيدة
  const cumulativeData = useMemo(() => {
    if (!poemId) return []
    return students.map((s) => {
      const r = rows.filter((x) => x.student_id === s.id && x.poem_id === poemId)
      return {
        name: s.name,
        hifz: r.filter((x) => x.type === 'hifz').length,
        sharh: r.filter((x) => x.type === 'sharh').length,
      }
    })
  }, [students, rows, poemId])

  if (loading) {
    return (
      <div className="app-shell">
        <Masthead tagline="الإحصائيات والمتابعة" />
        <Spinner />
      </div>
    )
  }

  const week = weeks[Number(weekIdx)]

  return (
    <div className="app-shell">
      <Masthead tagline="الإحصائيات والمتابعة" />

      <div className="card">
        <h2>إحصائيات الأسبوع</h2>
        <p className="subtle">عدد أيام الحفظ وقراءة الشرح لكل طالب في أسبوع محدد.</p>

        <div className="filters">
          <div className="field">
            <label>القصيدة</label>
            <select className="select" value={poemId} onChange={(e) => { setPoemId(e.target.value); setWeekIdx('0') }}>
              {poems.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label>الأسبوع</label>
            <select className="select" value={weekIdx} onChange={(e) => setWeekIdx(e.target.value)}>
              {weeks.map((w, i) => <option key={w.number} value={i}>{w.label}</option>)}
            </select>
          </div>
        </div>

        <ChartBlock
          title="الحفظ — الأسبوع"
          meta={week ? week.label : ''}
          data={weekData}
          dataKey="hifz"
          color={HIFZ_COLOR}
          maxY={5}
        />
        <ChartBlock
          title="قراءة الشرح — الأسبوع"
          meta={week ? week.label : ''}
          data={weekData}
          dataKey="sharh"
          color={SHARH_COLOR}
          maxY={5}
        />
      </div>

      <div className="card">
        <h2>الإجمالي التراكمي</h2>
        <p className="subtle">إجمالي الأيام منذ بداية القصيدة «{currentPoem?.name}».</p>

        <ChartBlock
          title="إجمالي الحفظ"
          meta="منذ بداية القصيدة"
          data={cumulativeData}
          dataKey="hifz"
          color={HIFZ_COLOR}
        />
        <ChartBlock
          title="إجمالي قراءة الشرح"
          meta="منذ بداية القصيدة"
          data={cumulativeData}
          dataKey="sharh"
          color={SHARH_COLOR}
        />
      </div>
    </div>
  )
}

function ChartBlock({ title, meta, data, dataKey, color }) {
  const hasData = data.some((d) => d[dataKey] > 0)
  // نرتّب البيانات تنازلياً حسب القيمة (الأعلى في الأعلى).
  const sorted = [...data].sort((a, b) => b[dataKey] - a[dataKey])
  // أقصى قيمة لتحديد عرض الأشرطة نسبياً (الحد الأدنى 5 = أيام الأسبوع).
  const maxVal = Math.max(5, ...sorted.map((d) => d[dataKey]))

  return (
    <div className="chart-card">
      <div className="chart-title">{title}</div>
      <div className="chart-meta">{meta}</div>
      {!hasData ? (
        <div className="empty">لا توجد بيانات مسجّلة بعد.</div>
      ) : (
        <div className="bars">
          {sorted.map((d) => {
            const val = d[dataKey]
            const pct = (val / maxVal) * 100
            return (
              <div className="bar-row" key={d.name}>
                <span className="bar-name">{d.name}</span>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${pct}%`, background: color }}>
                    {val > 0 && <span className="bar-value">{val}</span>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
