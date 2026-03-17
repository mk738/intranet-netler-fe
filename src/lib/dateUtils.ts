const SHORT_MONTH: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
const FULL_DATE:   Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }

/** Parse a date string (YYYY-MM-DD or ISO datetime) as local midnight. */
function parseLocal(dateStr: string | null | undefined): Date {
  if (!dateStr) return new Date(NaN)
  const datePart = dateStr.slice(0, 10)   // take only "YYYY-MM-DD"
  const [y, m, d] = datePart.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Count Mon–Fri days between start and end inclusive. Returns 0 if end < start. */
export function calculateBusinessDays(start: string, end: string): number {
  const s = parseLocal(start)
  const e = parseLocal(end)
  if (e < s) return 0

  let count = 0
  const cur = new Date(s)
  while (cur <= e) {
    const dow = cur.getDay()
    if (dow !== 0 && dow !== 6) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

/** "Dec 23 – Jan 3, 2026" */
export function formatDateRange(start: string, end: string): string {
  const s = parseLocal(start)
  const e = parseLocal(end)
  const startFmt = new Intl.DateTimeFormat('en-US', SHORT_MONTH).format(s)
  const endFmt   = new Intl.DateTimeFormat('en-US', FULL_DATE).format(e)
  return `${startFmt} – ${endFmt}`
}

/** "Dec 10, 2025" */
export function formatShortDate(date: string | null | undefined): string {
  const d = parseLocal(date)
  return isNaN(d.getTime()) ? '—' : new Intl.DateTimeFormat('en-US', FULL_DATE).format(d)
}

/** Today as YYYY-MM-DD */
export function todayString(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
