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

export interface ScheduleBlock {
  id: string
  dayOfWeek: number // 0=Mon, 6=Sun
  startTime: string // HH:mm
  endTime: string // HH:mm
  title: string
  color: string
}

export interface AppData {
  tasks: Task[]
  schedule: ScheduleBlock[]
  lastCheckInPromptDate?: string
}

export const DAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const
export const DAY_NAMES_FULL = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'] as const

export const SCHEDULE_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#06b6d4',
] as const

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function daysUntil(deadline: string): number {
  const today = new Date(todayStr() + 'T12:00:00')
  const dl = new Date(deadline + 'T12:00:00')
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
