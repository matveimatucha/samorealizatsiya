import { useState } from 'react'
import type { Task } from '../types'

interface Props {
  tasks: Task[]
  onSubmit: (taskId: string, feeling: number) => void
  onClose: () => void
}

const FEELING_EMOJIS = ['😴', '😐', '🙂', '😊', '🔥'] as const

function emojiForFeeling(v: number): string {
  if (v <= 20) return FEELING_EMOJIS[0]
  if (v <= 40) return FEELING_EMOJIS[1]
  if (v <= 60) return FEELING_EMOJIS[2]
  if (v <= 80) return FEELING_EMOJIS[3]
  return FEELING_EMOJIS[4]
}

export function DailyCheckIn({ tasks, onSubmit, onClose }: Props) {
  const [index, setIndex] = useState(0)
  const [feeling, setFeeling] = useState(50)

  const task = tasks[index]
  const isLast = index >= tasks.length - 1

  const handleNext = () => {
    onSubmit(task.id, feeling)
    if (isLast) {
      onClose()
    } else {
      setIndex(i => i + 1)
      setFeeling(50)
    }
  }

  const handleSkip = () => {
    if (isLast) {
      onClose()
    } else {
      setIndex(i => i + 1)
      setFeeling(50)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal checkin-modal">
        <div className="checkin-modal__header">
          <span className="checkin-modal__step">{index + 1} / {tasks.length}</span>
          <button className="modal__close" onClick={onClose} aria-label="Закрыть">×</button>
        </div>

        <div className="checkin-modal__emoji">{emojiForFeeling(feeling)}</div>
        <h2 className="checkin-modal__title">Как ты ощущаешь прогресс?</h2>
        <p className="checkin-modal__task">«{task.title}»</p>

        <div className="checkin-slider">
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={feeling}
            onChange={e => setFeeling(Number(e.target.value))}
            className="checkin-slider__input"
          />
          <div className="checkin-slider__labels">
            <span>0%</span>
            <span className="checkin-slider__value">{feeling}%</span>
            <span>100%</span>
          </div>
        </div>

        <p className="checkin-modal__hint">
          {feeling <= 20 && 'Пока не начал или застрял'}
          {feeling > 20 && feeling <= 40 && 'Есть движение, но мало'}
          {feeling > 40 && feeling <= 60 && 'Идёт процесс, на полпути'}
          {feeling > 60 && feeling <= 80 && 'Хороший прогресс!'}
          {feeling > 80 && 'Почти готово или уже сделано!'}
        </p>

        <div className="checkin-modal__actions">
          <button className="btn btn--ghost" onClick={handleSkip}>Пропустить</button>
          <button className="btn btn--primary" onClick={handleNext}>
            {isLast ? 'Готово' : 'Далее →'}
          </button>
        </div>
      </div>
    </div>
  )
}
