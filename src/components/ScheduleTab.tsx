import { useMemo, useState, useEffect, useRef } from 'react'
import type { ScheduleBlock } from '../types'
import {
  DAY_NAMES,
  DAY_NAMES_FULL,
  MONTH_NAMES,
  SCHEDULE_COLORS,
  CAL_HOUR_START,
  CAL_HOUR_END,
  CAL_HOUR_HEIGHT,
  todayStr,
  toDateStr,
  parseDateStr,
  startOfWeek,
  addDays,
  mondayDow,
  timeToMinutes,
  minutesToTime,
  eventsForDate,
} from '../types'

type ViewMode = 'day' | 'week' | 'month'

interface Props {
  blocks: ScheduleBlock[]
  onAdd: (block: Omit<ScheduleBlock, 'id'>) => void
  onUpdate: (id: string, updates: Partial<ScheduleBlock>) => void
  onDelete: (id: string) => void
}

interface DraftEvent {
  id?: string
  title: string
  date: string
  startTime: string
  endTime: string
  color: string
  recurring: boolean
}

const HOURS = Array.from(
  { length: CAL_HOUR_END - CAL_HOUR_START },
  (_, i) => CAL_HOUR_START + i,
)

function snapMinutes(mins: number, step = 30): number {
  return Math.round(mins / step) * step
}

function weekLabel(weekStart: Date): string {
  const end = addDays(weekStart, 6)
  const sameMonth = weekStart.getMonth() === end.getMonth()
  if (sameMonth) {
    return `${weekStart.getDate()}–${end.getDate()} ${MONTH_NAMES[weekStart.getMonth()]} ${weekStart.getFullYear()}`
  }
  return `${weekStart.getDate()} ${MONTH_NAMES[weekStart.getMonth()].slice(0, 3)} – ${end.getDate()} ${MONTH_NAMES[end.getMonth()].slice(0, 3)} ${end.getFullYear()}`
}

export function ScheduleTab({ blocks, onAdd, onUpdate, onDelete }: Props) {
  const [view, setView] = useState<ViewMode>(() =>
    typeof window !== 'undefined' && window.innerWidth < 768 ? 'day' : 'week',
  )
  const [cursor, setCursor] = useState(() => parseDateStr(todayStr()))
  const [draft, setDraft] = useState<DraftEvent | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const today = todayStr()
  const weekStart = useMemo(() => startOfWeek(cursor), [cursor])
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  )

  useEffect(() => {
    if ((view === 'week' || view === 'day') && scrollRef.current) {
      const now = new Date()
      const target = Math.max(0, (now.getHours() - CAL_HOUR_START - 1) * CAL_HOUR_HEIGHT)
      scrollRef.current.scrollTop = target
    }
  }, [view])

  const goToday = () => setCursor(parseDateStr(today))
  const shift = (n: number) => {
    if (view === 'month') setCursor(d => new Date(d.getFullYear(), d.getMonth() + n, 1))
    else if (view === 'week') setCursor(d => addDays(d, n * 7))
    else setCursor(d => addDays(d, n))
  }

  const openCreate = (date: string, startTime = '09:00', endTime = '10:00') => {
    setDraft({
      title: '',
      date,
      startTime,
      endTime,
      color: SCHEDULE_COLORS[0],
      recurring: false,
    })
  }

  const openEdit = (event: ScheduleBlock, fallbackDate: string) => {
    setDraft({
      id: event.id,
      title: event.title,
      date: event.date || fallbackDate,
      startTime: event.startTime,
      endTime: event.endTime,
      color: event.color,
      recurring: !!(event.recurring || (!event.date && event.dayOfWeek !== undefined)),
    })
  }

  const handleSlotClick = (date: string, e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const minsFromStart = snapMinutes((y / CAL_HOUR_HEIGHT) * 60 + CAL_HOUR_START * 60)
    const start = Math.min(Math.max(minsFromStart, CAL_HOUR_START * 60), (CAL_HOUR_END - 1) * 60)
    const end = Math.min(start + 60, CAL_HOUR_END * 60)
    openCreate(date, minutesToTime(start), minutesToTime(end))
  }

  const saveDraft = () => {
    if (!draft || !draft.title.trim()) return
    if (timeToMinutes(draft.endTime) <= timeToMinutes(draft.startTime)) return

    const payload: Omit<ScheduleBlock, 'id'> = {
      title: draft.title.trim(),
      startTime: draft.startTime,
      endTime: draft.endTime,
      color: draft.color,
      recurring: draft.recurring,
      dayOfWeek: draft.recurring ? mondayDow(parseDateStr(draft.date)) : undefined,
      date: draft.recurring ? undefined : draft.date,
    }

    if (draft.id) onUpdate(draft.id, payload)
    else onAdd(payload)
    setDraft(null)
  }

  const headerTitle = (() => {
    if (view === 'month') return `${MONTH_NAMES[cursor.getMonth()]} ${cursor.getFullYear()}`
    if (view === 'week') return weekLabel(weekStart)
    return parseDateStr(toDateStr(cursor)).toLocaleDateString('ru-RU', {
      weekday: 'long', day: 'numeric', month: 'long',
    })
  })()

  return (
    <div className="cal">
      <div className="cal-toolbar">
        <div className="cal-toolbar__nav">
          <button type="button" className="btn btn--ghost cal-toolbar__today" onClick={goToday}>
            Сегодня
          </button>
          <button type="button" className="cal-nav-btn" onClick={() => shift(-1)} aria-label="Назад">‹</button>
          <button type="button" className="cal-nav-btn" onClick={() => shift(1)} aria-label="Вперёд">›</button>
          <h2 className="cal-toolbar__title">{headerTitle}</h2>
        </div>
        <div className="cal-toolbar__views">
          {(['day', 'week', 'month'] as const).map(v => (
            <button
              key={v}
              type="button"
              className={`cal-view-btn ${view === v ? 'cal-view-btn--active' : ''}`}
              onClick={() => setView(v)}
            >
              {v === 'day' ? 'День' : v === 'week' ? 'Неделя' : 'Месяц'}
            </button>
          ))}
          <button
            type="button"
            className="btn btn--primary cal-toolbar__add"
            onClick={() => openCreate(toDateStr(cursor))}
          >
            + Событие
          </button>
        </div>
      </div>

      {view === 'month' && (
        <MonthView
          cursor={cursor}
          today={today}
          blocks={blocks}
          onSelectDay={d => {
            setCursor(parseDateStr(d))
            setView('day')
          }}
          onCreate={openCreate}
        />
      )}

      {view === 'week' && (
        <TimeGrid
          days={weekDays}
          today={today}
          blocks={blocks}
          scrollRef={scrollRef}
          onSlotClick={handleSlotClick}
          onEventClick={openEdit}
          compact
        />
      )}

      {view === 'day' && (
        <TimeGrid
          days={[cursor]}
          today={today}
          blocks={blocks}
          scrollRef={scrollRef}
          onSlotClick={handleSlotClick}
          onEventClick={openEdit}
          compact={false}
        />
      )}

      {draft && (
        <EventModal
          draft={draft}
          setDraft={setDraft}
          onSave={saveDraft}
          onDelete={() => {
            if (draft.id) onDelete(draft.id)
            setDraft(null)
          }}
          onClose={() => setDraft(null)}
        />
      )}
    </div>
  )
}

function TimeGrid({
  days,
  today,
  blocks,
  scrollRef,
  onSlotClick,
  onEventClick,
  compact,
}: {
  days: Date[]
  today: string
  blocks: ScheduleBlock[]
  scrollRef: React.RefObject<HTMLDivElement | null>
  onSlotClick: (date: string, e: React.MouseEvent<HTMLDivElement>) => void
  onEventClick: (event: ScheduleBlock, date: string) => void
  compact: boolean
}) {
  const [nowMins, setNowMins] = useState(() => {
    const n = new Date()
    return n.getHours() * 60 + n.getMinutes()
  })

  useEffect(() => {
    const id = setInterval(() => {
      const n = new Date()
      setNowMins(n.getHours() * 60 + n.getMinutes())
    }, 60_000)
    return () => clearInterval(id)
  }, [])

  const totalHeight = (CAL_HOUR_END - CAL_HOUR_START) * CAL_HOUR_HEIGHT
  const nowTop = ((nowMins - CAL_HOUR_START * 60) / 60) * CAL_HOUR_HEIGHT
  const showNow = nowMins >= CAL_HOUR_START * 60 && nowMins <= CAL_HOUR_END * 60

  return (
    <div className={`cal-grid ${compact ? 'cal-grid--week' : 'cal-grid--day'}`}>
      <div className="cal-grid__header">
        <div className="cal-grid__gutter-spacer" />
        {days.map(d => {
          const ds = toDateStr(d)
          const isToday = ds === today
          return (
            <div key={ds} className={`cal-grid__day-head ${isToday ? 'cal-grid__day-head--today' : ''}`}>
              <span className="cal-grid__dow">{DAY_NAMES[mondayDow(d)]}</span>
              <span className={`cal-grid__dom ${isToday ? 'cal-grid__dom--today' : ''}`}>{d.getDate()}</span>
            </div>
          )
        })}
      </div>

      <div className="cal-grid__body" ref={scrollRef}>
        <div className="cal-grid__inner" style={{ height: totalHeight }}>
          <div className="cal-grid__hours">
            {HOURS.map(h => (
              <div key={h} className="cal-grid__hour" style={{ height: CAL_HOUR_HEIGHT }}>
                <span>{String(h).padStart(2, '0')}:00</span>
              </div>
            ))}
          </div>

          <div className="cal-grid__cols" style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}>
            {days.map(d => {
              const ds = toDateStr(d)
              const dayEvents = eventsForDate(blocks, ds)
              const isToday = ds === today
              return (
                <div
                  key={ds}
                  className={`cal-grid__col ${isToday ? 'cal-grid__col--today' : ''}`}
                  onClick={e => onSlotClick(ds, e)}
                >
                  {HOURS.map(h => (
                    <div key={h} className="cal-grid__slot" style={{ height: CAL_HOUR_HEIGHT }} />
                  ))}

                  {dayEvents.map(ev => {
                    const top = ((timeToMinutes(ev.startTime) - CAL_HOUR_START * 60) / 60) * CAL_HOUR_HEIGHT
                    const height = Math.max(
                      22,
                      ((timeToMinutes(ev.endTime) - timeToMinutes(ev.startTime)) / 60) * CAL_HOUR_HEIGHT - 2,
                    )
                    return (
                      <button
                        key={ev.id}
                        type="button"
                        className="cal-event"
                        style={{
                          top,
                          height,
                          background: ev.color,
                        }}
                        onClick={e => {
                          e.stopPropagation()
                          onEventClick(ev, ds)
                        }}
                      >
                        <span className="cal-event__title">{ev.title}</span>
                        <span className="cal-event__time">
                          {ev.startTime}–{ev.endTime}
                          {ev.recurring || (!ev.date && ev.dayOfWeek !== undefined) ? ' · повт.' : ''}
                        </span>
                      </button>
                    )
                  })}

                  {isToday && showNow && (
                    <div className="cal-now" style={{ top: nowTop }}>
                      <span className="cal-now__dot" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function MonthView({
  cursor,
  today,
  blocks,
  onSelectDay,
  onCreate,
}: {
  cursor: Date
  today: string
  blocks: ScheduleBlock[]
  onSelectDay: (date: string) => void
  onCreate: (date: string) => void
}) {
  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const first = new Date(year, month, 1)
  const startPad = mondayDow(first)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (Date | null)[] = [
    ...Array.from({ length: startPad }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div className="cal-month">
      <div className="cal-month__head">
        {DAY_NAMES.map(n => (
          <div key={n} className="cal-month__dow">{n}</div>
        ))}
      </div>
      <div className="cal-month__grid">
        {cells.map((d, i) => {
          if (!d) return <div key={`e-${i}`} className="cal-month__cell cal-month__cell--empty" />
          const ds = toDateStr(d)
          const dayEvents = eventsForDate(blocks, ds)
          const isToday = ds === today
          return (
            <button
              key={ds}
              type="button"
              className={`cal-month__cell ${isToday ? 'cal-month__cell--today' : ''}`}
              onClick={() => onSelectDay(ds)}
              onDoubleClick={e => {
                e.preventDefault()
                onCreate(ds)
              }}
            >
              <span className={`cal-month__num ${isToday ? 'cal-month__num--today' : ''}`}>{d.getDate()}</span>
              <div className="cal-month__events">
                {dayEvents.slice(0, 3).map(ev => (
                  <span key={ev.id} className="cal-month__pill" style={{ background: ev.color }}>
                    {ev.title}
                  </span>
                ))}
                {dayEvents.length > 3 && (
                  <span className="cal-month__more">+{dayEvents.length - 3}</span>
                )}
              </div>
            </button>
          )
        })}
      </div>
      <p className="cal-month__hint">Нажми день — открыть. Двойной клик — новое событие.</p>
    </div>
  )
}

function EventModal({
  draft,
  setDraft,
  onSave,
  onDelete,
  onClose,
}: {
  draft: DraftEvent
  setDraft: (d: DraftEvent | null) => void
  onSave: () => void
  onDelete: () => void
  onClose: () => void
}) {
  const isEdit = !!draft.id
  const invalidRange = timeToMinutes(draft.endTime) <= timeToMinutes(draft.startTime)

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal cal-modal">
        <div className="cal-modal__header">
          <h3>{isEdit ? 'Редактировать событие' : 'Новое событие'}</h3>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Закрыть">×</button>
        </div>

        <div className="cal-modal__body">
          <input
            className="input"
            placeholder="Название"
            value={draft.title}
            onChange={e => setDraft({ ...draft, title: e.target.value })}
            autoFocus
          />

          <div className="schedule-form__grid">
            <label className="task-form__label">
              Дата
              <input
                type="date"
                className="input input--date"
                value={draft.date}
                onChange={e => setDraft({ ...draft, date: e.target.value })}
                disabled={draft.recurring}
              />
            </label>
            <label className="task-form__label">
              Начало
              <input
                type="time"
                className="input"
                value={draft.startTime}
                onChange={e => setDraft({ ...draft, startTime: e.target.value })}
              />
            </label>
            <label className="task-form__label">
              Конец
              <input
                type="time"
                className="input"
                value={draft.endTime}
                onChange={e => setDraft({ ...draft, endTime: e.target.value })}
              />
            </label>
          </div>

          {invalidRange && (
            <p className="cal-modal__error">Время окончания должно быть позже начала</p>
          )}

          <label className="cal-modal__check">
            <input
              type="checkbox"
              checked={draft.recurring}
              onChange={e => setDraft({ ...draft, recurring: e.target.checked })}
            />
            Повторять каждую неделю ({DAY_NAMES_FULL[mondayDow(parseDateStr(draft.date))]})
          </label>

          <div className="color-picker">
            {SCHEDULE_COLORS.map(c => (
              <button
                key={c}
                type="button"
                className={`color-picker__swatch ${draft.color === c ? 'color-picker__swatch--active' : ''}`}
                style={{ background: c }}
                onClick={() => setDraft({ ...draft, color: c })}
              />
            ))}
          </div>
        </div>

        <div className="cal-modal__actions">
          {isEdit ? (
            <button type="button" className="btn btn--danger" onClick={onDelete}>Удалить</button>
          ) : (
            <span />
          )}
          <div className="cal-modal__actions-right">
            <button type="button" className="btn btn--ghost" onClick={onClose}>Отмена</button>
            <button
              type="button"
              className="btn btn--primary"
              disabled={!draft.title.trim() || invalidRange}
              onClick={onSave}
            >
              Сохранить
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
