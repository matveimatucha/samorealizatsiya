import type { Task } from '../types'
import { formatDate, formatDateTime, daysUntil, getLatestFeeling } from '../types'

interface Props {
  task: Task
  onToggle: (id: string) => void
  onDelete: (id: string) => void
}

function feelingLabel(v: number): string {
  if (v >= 80) return 'Отлично'
  if (v >= 60) return 'Хорошо'
  if (v >= 40) return 'Средне'
  if (v >= 20) return 'Слабо'
  return 'Не начал'
}

function deadlineClass(deadline: string, completed: boolean): string {
  if (completed) return 'deadline--done'
  const days = daysUntil(deadline)
  if (days < 0) return 'deadline--overdue'
  if (days <= 2) return 'deadline--soon'
  return ''
}

export function TaskCard({ task, onToggle, onDelete }: Props) {
  const feeling = getLatestFeeling(task)
  const deadlineText = task.deadline
    ? (() => {
        const days = daysUntil(task.deadline!)
        if (task.completed) return `Дедлайн: ${formatDate(task.deadline)}`
        if (days < 0) return `Просрочено на ${Math.abs(days)} дн.`
        if (days === 0) return 'Дедлайн сегодня!'
        if (days === 1) return 'Дедлайн завтра'
        return `Дедлайн через ${days} дн. (${formatDate(task.deadline!)})`
      })()
    : null

  return (
    <article className={`task-card ${task.completed ? 'task-card--done' : ''}`}>
      <div className="task-card__top">
        <button
          className={`checkbox ${task.completed ? 'checkbox--checked' : ''}`}
          onClick={() => onToggle(task.id)}
          aria-label={task.completed ? 'Отметить невыполненной' : 'Отметить выполненной'}
        >
          {task.completed && '✓'}
        </button>
        <div className="task-card__body">
          <h3 className="task-card__title">{task.title}</h3>
          <p className="task-card__meta">
            Поставлена {formatDateTime(task.createdAt)}
          </p>
          {deadlineText && (
            <p className={`task-card__deadline ${task.deadline ? deadlineClass(task.deadline, task.completed) : ''}`}>
              {deadlineText}
            </p>
          )}
        </div>
        <button className="task-card__delete" onClick={() => onDelete(task.id)} aria-label="Удалить">
          ×
        </button>
      </div>

      {!task.completed && feeling !== null && (
        <div className="task-card__feeling">
          <div className="feeling-bar">
            <div className="feeling-bar__fill" style={{ width: `${feeling}%` }} />
          </div>
          <span className="feeling-bar__label">
            Ощущение: {feeling}% — {feelingLabel(feeling)}
          </span>
        </div>
      )}

      {!task.completed && task.checkIns.length > 0 && (
        <details className="task-card__history">
          <summary>История оценок ({task.checkIns.length})</summary>
          <ul>
            {[...task.checkIns].sort((a, b) => b.date.localeCompare(a.date)).map(c => (
              <li key={c.date}>
                {formatDate(c.date)} — {c.feeling}% ({feelingLabel(c.feeling)})
              </li>
            ))}
          </ul>
        </details>
      )}
    </article>
  )
}
