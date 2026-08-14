import { useState, useEffect } from 'react'
import { useAppData } from './useAppData'
import { TodoTab } from './components/TodoTab'
import { ScheduleTab } from './components/ScheduleTab'
import { DailyCheckIn } from './components/DailyCheckIn'
import { todayStr, needsCheckInToday } from './types'

type Tab = 'tasks' | 'schedule'

export default function App() {
  const [tab, setTab] = useState<Tab>('tasks')
  const app = useAppData()
  const [showCheckIn, setShowCheckIn] = useState(false)

  const activeTasksNeedingCheckIn = app.data.tasks.filter(needsCheckInToday)

  useEffect(() => {
    const today = todayStr()
    const alreadyShown = app.data.lastCheckInPromptDate === today
    if (!alreadyShown && activeTasksNeedingCheckIn.length > 0) {
      const timer = setTimeout(() => setShowCheckIn(true), 800)
      return () => clearTimeout(timer)
    }
  }, [app.data.lastCheckInPromptDate, activeTasksNeedingCheckIn.length])

  const handleCheckInClose = () => {
    app.markCheckInPromptShown(todayStr())
    setShowCheckIn(false)
  }

  return (
    <div className="app">
      <header className="header">
        <h1 className="header__title">Самореализация</h1>
        <p className="header__subtitle">Твои задачи и ритм жизни</p>
      </header>

      <nav className="tabs">
        <button
          className={`tabs__btn ${tab === 'tasks' ? 'tabs__btn--active' : ''}`}
          onClick={() => setTab('tasks')}
        >
          <span className="tabs__icon">✓</span>
          Задачи
          {activeTasksNeedingCheckIn.length > 0 && (
            <span className="tabs__badge">{activeTasksNeedingCheckIn.length}</span>
          )}
        </button>
        <button
          className={`tabs__btn ${tab === 'schedule' ? 'tabs__btn--active' : ''}`}
          onClick={() => setTab('schedule')}
        >
          <span className="tabs__icon">📅</span>
          Календарь
        </button>
      </nav>

      <main className="main">
        {tab === 'tasks' ? (
          <TodoTab
            tasks={app.data.tasks}
            onAdd={app.addTask}
            onToggle={app.toggleTask}
            onDelete={app.deleteTask}
            onAddCheckIn={app.addCheckIn}
            onOpenCheckIn={() => setShowCheckIn(true)}
            pendingCheckIns={activeTasksNeedingCheckIn.length}
          />
        ) : (
          <ScheduleTab
            blocks={app.data.schedule}
            onAdd={app.addScheduleBlock}
            onUpdate={app.updateScheduleBlock}
            onDelete={app.deleteScheduleBlock}
          />
        )}
      </main>

      {showCheckIn && (
        <DailyCheckIn
          tasks={activeTasksNeedingCheckIn}
          onSubmit={(taskId, feeling) => app.addCheckIn(taskId, { date: todayStr(), feeling })}
          onClose={handleCheckInClose}
        />
      )}
    </div>
  )
}
