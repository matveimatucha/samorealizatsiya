import { useState } from 'react'
import type { Task } from '../types'
import { TaskCard } from './TaskCard'

interface Props {
  tasks: Task[]
  onAdd: (title: string, deadline?: string, description?: string) => void
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onAddCheckIn: (taskId: string, checkIn: { date: string; feeling: number }) => void
  onOpenCheckIn: () => void
  pendingCheckIns: number
}

export function TodoTab({ tasks, onAdd, onToggle, onDelete, onOpenCheckIn, pendingCheckIns }: Props) {
  const [title, setTitle] = useState('')
  const [deadline, setDeadline] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState<'active' | 'done' | 'all'>('active')

  const active = tasks.filter(t => !t.completed)
  const done = tasks.filter(t => t.completed)
  const filtered = filter === 'active' ? active : filter === 'done' ? done : tasks

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    onAdd(title.trim(), deadline || undefined)
    setTitle('')
    setDeadline('')
    setShowForm(false)
  }

  return (
    <div className="todo">
      {pendingCheckIns > 0 && (
        <button className="checkin-banner" onClick={onOpenCheckIn}>
          <span className="checkin-banner__emoji">🌅</span>
          <span>
            Как дела с задачами сегодня?
            <strong> {pendingCheckIns} {pendingCheckIns === 1 ? 'задача' : pendingCheckIns < 5 ? 'задачи' : 'задач'} ждут оценки</strong>
          </span>
        </button>
      )}

      {!showForm ? (
        <button className="add-btn" onClick={() => setShowForm(true)}>
          + Новая задача
        </button>
      ) : (
        <form className="task-form" onSubmit={handleSubmit}>
          <input
            className="input"
            placeholder="Что нужно сделать?"
            value={title}
            onChange={e => setTitle(e.target.value)}
            autoFocus
          />
          <div className="task-form__row">
            <label className="task-form__label">
              Дедлайн
              <input
                type="date"
                className="input input--date"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
              />
            </label>
          </div>
          <div className="task-form__actions">
            <button type="button" className="btn btn--ghost" onClick={() => setShowForm(false)}>
              Отмена
            </button>
            <button type="submit" className="btn btn--primary" disabled={!title.trim()}>
              Добавить
            </button>
          </div>
        </form>
      )}

      <div className="filter-bar">
        {(['active', 'done', 'all'] as const).map(f => (
          <button
            key={f}
            className={`filter-bar__btn ${filter === f ? 'filter-bar__btn--active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'active' ? `Активные (${active.length})` : f === 'done' ? `Готово (${done.length})` : `Все (${tasks.length})`}
          </button>
        ))}
      </div>

      <div className="task-list">
        {filtered.length === 0 ? (
          <div className="empty">
            <span className="empty__icon">{filter === 'done' ? '🎉' : '📝'}</span>
            <p>{filter === 'active' ? 'Нет активных задач — добавь первую!' : filter === 'done' ? 'Пока ничего не выполнено' : 'Список пуст'}</p>
          </div>
        ) : (
          filtered.map(task => (
            <TaskCard key={task.id} task={task} onToggle={onToggle} onDelete={onDelete} />
          ))
        )}
      </div>
    </div>
  )
}
