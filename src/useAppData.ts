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
  humanizeFirebaseError,
  type SyncStatus,
} from './sync'

export function useAppData() {
  const [data, setData] = useState<AppData>(loadLocalData)
  const [user, setUser] = useState<User | null>(null)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(
    isFirebaseConfigured ? 'offline' : 'local-only',
  )
  const [syncError, setSyncError] = useState<string | null>(null)
  const [authReady, setAuthReady] = useState(!isFirebaseConfigured)

  const skipNextSave = useRef(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initialSyncDone = useRef(false)
  const dataRef = useRef(data)
  dataRef.current = data

  const applyData = useCallback((next: AppData, fromCloud = false) => {
    if (fromCloud && isDataEmpty(next) && !isDataEmpty(dataRef.current)) return
    if (fromCloud) skipNextSave.current = true
    setData(next)
    saveLocalData(next)
  }, [])

  useEffect(() => {
    if (!auth) return

    const unsub = onAuthStateChanged(auth, u => {
      setUser(u)
      setAuthReady(true)
      initialSyncDone.current = false
      if (!u) {
        setSyncStatus('offline')
        setSyncError(null)
        setData(loadLocalData())
      }
    })
    return unsub
  }, [])

  useEffect(() => {
    if (!user) return

    setSyncStatus('loading')
    setSyncError(null)

    let cancelled = false
    let unsubSnapshot: (() => void) | null = null

    async function init() {
      try {
        const cloud = await fetchCloudData(user!.uid)
        if (cancelled) return

        const local = loadLocalData()
        const next = cloud ? mergeAppData(local, cloud) : local

        skipNextSave.current = true
        setData(next)
        saveLocalData(next)

        try {
          await saveCloudData(user!.uid, next)
        } catch (err) {
          if (cancelled) return
          setSyncStatus('error')
          setSyncError(humanizeFirebaseError(err))
          initialSyncDone.current = true
          return
        }

        if (cancelled) return
        setSyncStatus('synced')
        setSyncError(null)
        initialSyncDone.current = true

        unsubSnapshot = subscribeToCloud(
          user!.uid,
          remote => {
            if (cancelled) return
            if (isDataEmpty(remote) && !isDataEmpty(dataRef.current)) {
              void saveCloudData(user!.uid, dataRef.current).catch(() => {})
              return
            }
            applyData(remote, true)
            setSyncStatus('synced')
          },
          message => {
            setSyncStatus('error')
            setSyncError(message)
          },
        )
      } catch (err) {
        if (cancelled) return
        setSyncStatus('error')
        setSyncError(humanizeFirebaseError(err))
        initialSyncDone.current = true
      }
    }

    init()
    return () => {
      cancelled = true
      unsubSnapshot?.()
    }
  }, [user, applyData])

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
        setSyncError(null)
      } catch (err) {
        setSyncStatus('error')
        setSyncError(humanizeFirebaseError(err))
      }
    }, 400)

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [data, user])

  const signIn = useCallback(async () => {
    if (!auth) return
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (err) {
      setSyncStatus('error')
      setSyncError(humanizeFirebaseError(err))
    }
  }, [])

  const signOut = useCallback(async () => {
    if (!auth) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    if (user && !isDataEmpty(dataRef.current)) {
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
    syncError,
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
