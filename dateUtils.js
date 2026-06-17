import { addDays, differenceInCalendarDays, format } from 'date-fns'

// أيام الأسبوع في البرنامج: الأحد(0) .. الخميس(4) — 5 أيام عمل
export const DAY_LABELS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس']
export const WORK_DAYS = 5

// JS getDay(): الأحد=0 .. السبت=6. أيام العمل عندنا 0..4.
function isWorkDay(date) {
  const d = date.getDay()
  return d >= 0 && d <= 4
}

// نحوّل تاريخاً نصياً (YYYY-MM-DD) إلى كائن Date محلي بدون انزياح المنطقة الزمنية.
export function parseDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// تنسيق مختصر: يوم/شهر  مثل 17/6
export function shortDate(date) {
  return format(date, 'd/M')
}

// عدد أيام العمل (الأحد-الخميس) بين تاريخين شاملين الطرفين.
export function countWorkDays(start, end) {
  if (end < start) return 0
  let count = 0
  let cur = new Date(start)
  while (cur <= end) {
    if (isWorkDay(cur)) count++
    cur = addDays(cur, 1)
  }
  return count
}

// نبني قائمة الأسابيع من تاريخ بداية القصيدة حتى اليوم (+ أسبوع إضافي للأمام).
// كل أسبوع = 7 أيام تقويمية، لكن أيام التسجيل فيه هي الأحد-الخميس فقط.
// تاريخ بداية الأسبوع = الأحد الذي يبدأ منه ذلك الأسبوع.
export function buildWeeks(poemStartStr) {
  const start = parseDate(poemStartStr)

  // نرجع لبداية أسبوع التقويم (الأحد) الذي يقع فيه تاريخ البداية.
  const startWeekSunday = addDays(start, -start.getDay())

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // عدد الأسابiع المنقضية حتى اليوم + أسبوع احتياطي للأمام
  const daysElapsed = Math.max(0, differenceInCalendarDays(today, startWeekSunday))
  const weeksElapsed = Math.floor(daysElapsed / 7) + 1

  const weeks = []
  for (let i = 0; i < weeksElapsed; i++) {
    const weekSunday = addDays(startWeekSunday, i * 7)
    weeks.push({
      number: i + 1,
      startDate: format(weekSunday, 'yyyy-MM-dd'),
      label: `الأسبوع ${i + 1} — من ${shortDate(weekSunday)}`,
    })
  }
  return weeks
}

// إجمالي أيام الحفظ "المتاحة" منذ بداية القصيدة حتى اليوم (للحساب: المتأخرون).
// نحسب أيام العمل من تاريخ بداية القصيدة حتى اليوم.
export function totalAvailableDays(poemStartStr) {
  const start = parseDate(poemStartStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return countWorkDays(start, today)
}
