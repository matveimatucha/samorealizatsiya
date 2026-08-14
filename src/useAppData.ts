import { useState, useEffect, useCallback } from 'react'
import type { AppData, Task, ScheduleBlock, CheckIn } from './types'
import { normalizeSchedule } from './types'

const STORAGE_KEY = 'samorealizatsiya-data'

const defaultData: AppData = {
  tasks: [],
  schedule: [],
}

function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = { ...defaultData, ...JSON.parse(raw) } as AppData
      return { ...parsed, schedule: normalizeSchedule(parsed.schedule || []) }
    }
  } catch { /* ignore */ }
  return { ...defaultData }
}

function saveData(data: AppData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function useAppData() {
  const [data, setData] = useState<AppData>(loadData)

  useEffect(() => {
    saveData(data)
  }, [data])

  const addTask = useCallback((title: string, deadline?: string, description?: string) => {
    const task: Task = {
      id: crypto.randomUUID(),
      title,
      description,
      createdAt: new Date().toISOString(),
      deadline,
      completed: false,
      checkIns: [],
    }
    setData(d => ({ ...d, tasks: [task, ...d.tasks] }))
  }, [])

  const toggleTask = useCallback((id: string) => {
    setData(d => ({
      ...d,
      tasks: d.tasks.map(t =>
        t.id === id
          ? { ...t, completed: !t.completed, completedAt: !t.completed ? new Date().toISOString() : undefined }
          : t
      ),
    }))
  }, [])

  const deleteTask = useCallback((id: string) => {
    setData(d => ({ ...d, tasks: d.tasks.filter(t => t.id !== id) }))
  }, [])

  const addCheckIn = useCallback((taskId: string, checkIn: CheckIn) => {
    setData(d => ({
      ...d,
      tasks: d.tasks.map(t =>
        t.id === taskId
          ? { ...t, checkIns: [...t.checkIns.filter(c => c.date !== checkIn.date), checkIn] }
          : t
      ),
    }))
  }, [])

  const addScheduleBlock = useCallback((block: Omit<ScheduleBlock, 'id'>) => {
    const newBlock: ScheduleBlock = { ...block, id: crypto.randomUUID() }
    setData(d => ({ ...d, schedule: [...d.schedule, newBlock] }))
  }, [])

  const updateScheduleBlock = useCallback((id: string, updates: Partial<ScheduleBlock>) => {
    setData(d => ({
      ...d,
      schedule: d.schedule.map(b => (b.id === id ? { ...b, ...updates } : b)),
    }))
  }, [])

  const deleteScheduleBlock = useCallback((id: string) => {
    setData(d => ({ ...d, schedule: d.schedule.filter(b => b.id !== id) }))
  }, [])

  const markCheckInPromptShown = useCallback((date: string) => {
    setData(d => ({ ...d, lastCheckInPromptDate: date }))
  }, [])

  return {
    data,
    addTask,
    toggleTask,
    deleteTask,
    addCheckIn,
    addScheduleBlock,
    updateScheduleBlock,
    deleteScheduleBlock,
    markCheckInPromptShown,
  }
}
