export interface CheckIn {
  date: string // YYYY-MM-DD
  feeling: number // 0-100
}

export interface Task {
  id: string
  title: string
  description?: string
  createdAt: string // ISO
  deadline?: string // YYYY-MM-DD
  completed: boolean
  completedAt?: string
  checkIns: CheckIn[]
}

/** Calendar event — one-time by date, or weekly by weekday */
export interface ScheduleBlock {
  id: string
  title: string
  startTime: string // HH:mm
  endTime: string // HH:mm
  color: string
  /** One-time event date YYYY-MM-DD */
  date?: string
  /** Repeat every week on dayOfWeek */
  recurring?: boolean
  /** 0=Mon … 6=Sun (used when recurring, or legacy) */
  dayOfWeek?: number
}

export interface AppData {
  tasks: Task[]
  schedule: ScheduleBlock[]
  lastCheckInPromptDate?: string
}

export const DAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const
export const DAY_NAMES_FULL = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'] as const
export const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
] as const

export const SCHEDULE_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#06b6d4',
] as const

export const CAL_HOUR_START = 6
export const CAL_HOUR_END = 23
export const CAL_HOUR_HEIGHT = 56

export function todayStr(): string {
  const d = new Date()
  return toDateStr(d)
}

export function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseDateStr(dateStr: string): Date {
  return new Date(dateStr + 'T12:00:00')
}

/** Monday-based weekday: 0=Mon … 6=Sun */
export function mondayDow(d: Date): number {
  return (d.getDay() + 6) % 7
}

export function startOfWeek(d: Date): Date {
  const result = new Date(d)
  result.setHours(12, 0, 0, 0)
  result.setDate(result.getDate() - mondayDow(result))
  return result
}

export function addDays(d: Date, n: number): Date {
  const result = new Date(d)
  result.setDate(result.getDate() + n)
  return result
}

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function formatDate(dateStr: string): string {
  const d = parseDateStr(dateStr)
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function daysUntil(deadline: string): number {
  const today = parseDateStr(todayStr())
  const dl = parseDateStr(deadline)
  return Math.ceil((dl.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export function getLatestFeeling(task: Task): number | null {
  if (task.checkIns.length === 0) return null
  const sorted = [...task.checkIns].sort((a, b) => b.date.localeCompare(a.date))
  return sorted[0].feeling
}

export function needsCheckInToday(task: Task): boolean {
  if (task.completed) return false
  const today = todayStr()
  return !task.checkIns.some(c => c.date === today)
}

/** Does this event appear on a given calendar date? */
export function eventOccursOn(event: ScheduleBlock, dateStr: string): boolean {
  if (event.date === dateStr) return true
  if (event.recurring || (!event.date && event.dayOfWeek !== undefined)) {
    const dow = mondayDow(parseDateStr(dateStr))
    return event.dayOfWeek === dow
  }
  return false
}

export function eventsForDate(events: ScheduleBlock[], dateStr: string): ScheduleBlock[] {
  return events
    .filter(e => eventOccursOn(e, dateStr))
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))
}

/** Migrate legacy dayOfWeek-only blocks to recurring weekly events */
export function normalizeSchedule(blocks: ScheduleBlock[]): ScheduleBlock[] {
  return blocks.map(b => {
    if (b.date || b.recurring) return b
    if (b.dayOfWeek !== undefined) {
      return { ...b, recurring: true }
    }
    return b
  })
}
