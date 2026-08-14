import { useState } from 'react'
import type { ScheduleBlock } from '../types'
import { DAY_NAMES, DAY_NAMES_FULL, SCHEDULE_COLORS } from '../types'

interface Props {
  blocks: ScheduleBlock[]
  onAdd: (block: Omit<ScheduleBlock, 'id'>) => void
  onDelete: (id: string) => void
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function formatTimeRange(start: string, end: string): string {
  return `${start} – ${end}`
}

export function ScheduleTab({ blocks, onAdd, onDelete }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    title: '',
    dayOfWeek: 0,
    startTime: '09:00',
    endTime: '10:00',
    color: SCHEDULE_COLORS[0] as string,
  })

  const todayDow = (new Date().getDay() + 6) % 7 // Mon=0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    onAdd({
      title: form.title.trim(),
      dayOfWeek: form.dayOfWeek,
      startTime: form.startTime,
      endTime: form.endTime,
      color: form.color,
    })
    setForm(f => ({ ...f, title: '' }))
    setShowForm(false)
  }

  const openAddForDay = (day: number) => {
    setForm(f => ({ ...f, dayOfWeek: day }))
    setShowForm(true)
  }

  const blocksForDay = (day: number) =>
    blocks
      .filter(b => b.dayOfWeek === day)
      .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))

  return (
    <div className="schedule">
      <p className="schedule__intro">
        Твоё расписание по дням недели. Сегодня — <strong>{DAY_NAMES_FULL[todayDow]}</strong>.
      </p>

      {!showForm ? (
        <button className="add-btn" onClick={() => setShowForm(true)}>
          + Добавить блок
        </button>
      ) : (
        <form className="schedule-form" onSubmit={handleSubmit}>
          <input
            className="input"
            placeholder="Название (работа, спорт, учёба...)"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            autoFocus
          />
          <div className="schedule-form__grid">
            <label className="task-form__label">
              День
              <select
                className="input"
                value={form.dayOfWeek}
                onChange={e => setForm(f => ({ ...f, dayOfWeek: Number(e.target.value) }))}
              >
                {DAY_NAMES_FULL.map((name, i) => (
                  <option key={i} value={i}>{name}</option>
                ))}
              </select>
            </label>
            <label className="task-form__label">
              Начало
              <input
                type="time"
                className="input"
                value={form.startTime}
                onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
              />
            </label>
            <label className="task-form__label">
              Конец
              <input
                type="time"
                className="input"
                value={form.endTime}
                onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
              />
            </label>
          </div>
          <div className="color-picker">
            {SCHEDULE_COLORS.map(c => (
              <button
                key={c}
                type="button"
                className={`color-picker__swatch ${form.color === c ? 'color-picker__swatch--active' : ''}`}
                style={{ background: c }}
                onClick={() => setForm(f => ({ ...f, color: c }))}
              />
            ))}
          </div>
          <div className="task-form__actions">
            <button type="button" className="btn btn--ghost" onClick={() => setShowForm(false)}>
              Отмена
            </button>
            <button type="submit" className="btn btn--primary" disabled={!form.title.trim()}>
              Добавить
            </button>
          </div>
        </form>
      )}

      <div className="week-grid">
        {DAY_NAMES.map((name, day) => {
          const dayBlocks = blocksForDay(day)
          const isToday = day === todayDow
          return (
            <div key={day} className={`day-column ${isToday ? 'day-column--today' : ''}`}>
              <div className="day-column__header">
                <span className="day-column__name">{name}</span>
                {isToday && <span className="day-column__badge">сегодня</span>}
                <button
                  className="day-column__add"
                  onClick={() => openAddForDay(day)}
                  aria-label={`Добавить на ${DAY_NAMES_FULL[day]}`}
                >
                  +
                </button>
              </div>
              <div className="day-column__blocks">
                {dayBlocks.length === 0 ? (
                  <p className="day-column__empty">—</p>
                ) : (
                  dayBlocks.map(block => (
                    <div
                      key={block.id}
                      className="schedule-block"
                      style={{ borderLeftColor: block.color }}
                    >
                      <div className="schedule-block__time">
                        {formatTimeRange(block.startTime, block.endTime)}
                      </div>
                      <div className="schedule-block__title">{block.title}</div>
                      <button
                        className="schedule-block__delete"
                        onClick={() => onDelete(block.id)}
                        aria-label="Удалить"
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Mobile: list view for selected day */}
      <div className="week-list">
        {DAY_NAMES.map((_name, day) => {
          const dayBlocks = blocksForDay(day)
          if (dayBlocks.length === 0) return null
          const isToday = day === todayDow
          return (
            <section key={day} className={`week-list__day ${isToday ? 'week-list__day--today' : ''}`}>
              <h3 className="week-list__header">
                {DAY_NAMES_FULL[day]}
                {isToday && <span className="day-column__badge">сегодня</span>}
              </h3>
              {dayBlocks.map(block => (
                <div
                  key={block.id}
                  className="schedule-block schedule-block--list"
                  style={{ borderLeftColor: block.color }}
                >
                  <div className="schedule-block__time">
                    {formatTimeRange(block.startTime, block.endTime)}
                  </div>
                  <div className="schedule-block__title">{block.title}</div>
                  <button
                    className="schedule-block__delete"
                    onClick={() => onDelete(block.id)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </section>
          )
        })}
        {blocks.length === 0 && (
          <div className="empty">
            <span className="empty__icon">📅</span>
            <p>Расписание пусто — добавь первый блок!</p>
          </div>
        )}
      </div>
    </div>
  )
}
