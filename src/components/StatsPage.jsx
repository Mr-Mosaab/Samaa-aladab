import { useEffect, useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts'
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

function ChartBlock({ title, meta, data, dataKey, color, maxY }) {
  const hasData = data.some((d) => d[dataKey] > 0)
  return (
    <div className="chart-card">
      <div className="chart-title">{title}</div>
      <div className="chart-meta">{meta}</div>
      {!hasData ? (
        <div className="empty">لا توجد بيانات مسجّلة بعد.</div>
      ) : (
        <div className="chart-box">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 6, left: -18, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e3eef2" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontFamily: 'IBM Plex Sans Arabic', fontSize: 12, fill: '#3d6478' }}
                interval={0}
                angle={data.length > 5 ? -30 : 0}
                textAnchor={data.length > 5 ? 'end' : 'middle'}
                height={data.length > 5 ? 56 : 28}
              />
              <YAxis
                allowDecimals={false}
                domain={maxY ? [0, maxY] : [0, 'auto']}
                tick={{ fontFamily: 'IBM Plex Sans Arabic', fontSize: 12, fill: '#3d6478' }}
              />
              <Tooltip
                cursor={{ fill: 'rgba(143,198,214,0.12)' }}
                contentStyle={{
                  fontFamily: 'IBM Plex Sans Arabic',
                  borderRadius: 12,
                  border: '1px solid #cfe2e9',
                  direction: 'rtl',
                }}
                formatter={(v) => [`${v} يوم`, '']}
                labelFormatter={(l) => l}
              />
              <Bar dataKey={dataKey} radius={[6, 6, 0, 0]} maxBarSize={46}>
                {data.map((_, i) => <Cell key={i} fill={color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
