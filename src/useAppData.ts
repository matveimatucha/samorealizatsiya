import { useState, useEffect, useCallback, useRef } from 'react'
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth'
import type { AppData, Task, ScheduleBlock, CheckIn } from './types'
import {
  auth,
  googleProvider,
  isFirebaseConfigured,
} from './firebase'
import {
  loadLocalData,
  saveLocalData,
  subscribeToCloud,
  fetchCloudData,
  saveCloudData,
  mergeAppData,
  isDataEmpty,
  type SyncStatus,
} from './sync'

export function useAppData() {
  const [data, setData] = useState<AppData>(loadLocalData)
  const [user, setUser] = useState<User | null>(null)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(
    isFirebaseConfigured ? 'offline' : 'local-only',
  )
  const [authReady, setAuthReady] = useState(!isFirebaseConfigured)

  const skipNextSave = useRef(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initialSyncDone = useRef(false)
  const dataRef = useRef(data)
  dataRef.current = data

  // Auth state
  useEffect(() => {
    if (!auth) return

    const unsub = onAuthStateChanged(auth, u => {
      setUser(u)
      setAuthReady(true)
      initialSyncDone.current = false
      if (!u) {
        setSyncStatus('offline')
        setData(loadLocalData())
      }
    })
    return unsub
  }, [])

  // Cloud subscription + initial merge
  useEffect(() => {
    if (!user) return

    setSyncStatus('loading')

    let unsubSnapshot: (() => void) | null = null

    async function init() {
      try {
        const cloud = await fetchCloudData(user!.uid)
        const local = loadLocalData()
        const next = cloud ? mergeAppData(local, cloud) : local

        skipNextSave.current = true
        setData(next)
        saveLocalData(next)

        if (!cloud || isDataEmpty(cloud) || JSON.stringify(next) !== JSON.stringify(cloud)) {
          await saveCloudData(user!.uid, next)
        }

        setSyncStatus('synced')
        initialSyncDone.current = true

        unsubSnapshot = subscribeToCloud(
          user!.uid,
          remote => {
            if (!initialSyncDone.current) return
            skipNextSave.current = true
            setData(remote)
            saveLocalData(remote)
            setSyncStatus('synced')
          },
          () => setSyncStatus('error'),
        )
      } catch {
        setSyncStatus('error')
      }
    }

    init()
    return () => unsubSnapshot?.()
  }, [user])

  // Persist changes locally + to cloud
  useEffect(() => {
    saveLocalData(data)

    if (!user || !initialSyncDone.current) return

    if (skipNextSave.current) {
      skipNextSave.current = false
      return
    }

    setSyncStatus('syncing')
    if (saveTimer.current) clearTimeout(saveTimer.current)

    saveTimer.current = setTimeout(async () => {
      try {
        await saveCloudData(user.uid, dataRef.current)
        setSyncStatus('synced')
      } catch {
        setSyncStatus('error')
      }
    }, 600)

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [data, user])

  const signIn = useCallback(async () => {
    if (!auth) return
    await signInWithPopup(auth, googleProvider)
  }, [])

  const signOut = useCallback(async () => {
    if (!auth) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    if (user) {
      try {
        await saveCloudData(user.uid, dataRef.current)
      } catch { /* keep local copy even if cloud fails */ }
    }
    await firebaseSignOut(auth)
  }, [user])

  const addTask = useCallback((title: string, deadline?: string, description?: string) => {
    const task: Task = {
      id: crypto.randomUUID(),
      title,
      createdAt: new Date().toISOString(),
      completed: false,
      checkIns: [],
    }
    if (description) task.description = description
    if (deadline) task.deadline = deadline
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
    user,
    syncStatus,
    authReady,
    cloudEnabled: isFirebaseConfigured,
    signIn,
    signOut,
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
