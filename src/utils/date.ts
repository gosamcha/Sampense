export function formatDateLocal(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseLocalDate(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function addDays(dateKey: string, amount: number) {
  const date = parseLocalDate(dateKey)
  date.setDate(date.getDate() + amount)
  return formatDateLocal(date)
}

export function addMonths(dateKey: string, amount: number) {
  const date = parseLocalDate(dateKey)
  const day = date.getDate()
  date.setDate(1)
  date.setMonth(date.getMonth() + amount)
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  date.setDate(Math.min(day, lastDay))
  return formatDateLocal(date)
}

export function startOfWeek(dateKey: string) {
  const date = parseLocalDate(dateKey)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  return formatDateLocal(date)
}

export function endOfWeek(dateKey: string) {
  return addDays(startOfWeek(dateKey), 6)
}

export function startOfMonth(dateKey: string) {
  return `${dateKey.slice(0, 7)}-01`
}

export function endOfMonth(dateKey: string) {
  const date = parseLocalDate(startOfMonth(dateKey))
  date.setMonth(date.getMonth() + 1)
  date.setDate(0)
  return formatDateLocal(date)
}

export function monthKey(dateKey: string) {
  return dateKey.slice(0, 7)
}

export function formatDailyHeader(dateKey: string) {
  return dateKey.slice(5).replace('-', '/')
}

export function formatMonthTitle(dateKey: string) {
  const date = parseLocalDate(dateKey)
  return date
    .toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    .toUpperCase()
}

export function formatWeekTitle(dateKey: string) {
  const start = parseLocalDate(startOfWeek(dateKey))
  const end = parseLocalDate(endOfWeek(dateKey))
  const startMonth = start.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()

  if (start.getMonth() === end.getMonth()) {
    return `${startMonth} ${start.getDate()}–${end.getDate()}`
  }

  return `${startMonth} ${start.getDate()} – ${endMonth} ${end.getDate()}`
}

export function dateKeysBetween(start: string, end: string) {
  const result: string[] = []
  let cursor = start
  while (cursor <= end) {
    result.push(cursor)
    cursor = addDays(cursor, 1)
  }
  return result
}

export function weekdayShort(dateKey: string) {
  return parseLocalDate(dateKey)
    .toLocaleDateString('en-US', { weekday: 'short' })
    .toUpperCase()
}

export function dayNumber(dateKey: string) {
  return parseLocalDate(dateKey).getDate()
}

export function isValidDateKey(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  return formatDateLocal(parseLocalDate(value)) === value
}
