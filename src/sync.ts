import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore'
import { db, isFirebaseConfigured } from './firebase'
import type { AppData } from './types'
import { normalizeSchedule } from './types'

const STORAGE_KEY = 'samorealizatsiya-data'

export type SyncStatus = 'local-only' | 'offline' | 'loading' | 'syncing' | 'synced' | 'error'

export const defaultData: AppData = {
  tasks: [],
  schedule: [],
}

export function loadLocalData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = { ...defaultData, ...JSON.parse(raw) } as AppData
      return { ...parsed, schedule: normalizeSchedule(parsed.schedule || []) }
    }
  } catch { /* ignore */ }
  return { ...defaultData }
}

export function saveLocalData(data: AppData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function parseCloudData(raw: unknown): AppData {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Partial<AppData>
  return {
    ...defaultData,
    ...obj,
    schedule: normalizeSchedule(obj.schedule || []),
  }
}

export function subscribeToCloud(
  uid: string,
  onData: (data: AppData) => void,
  onError: () => void,
): () => void {
  if (!db) return () => {}

  const ref = doc(db, 'users', uid)
  return onSnapshot(
    ref,
    snap => {
      if (snap.exists()) {
        onData(parseCloudData(snap.data()))
      }
    },
    () => onError(),
  )
}

export async function fetchCloudData(uid: string): Promise<AppData | null> {
  if (!db) return null
  const snap = await getDoc(doc(db, 'users', uid))
  if (!snap.exists()) return null
  return parseCloudData(snap.data())
}

export async function saveCloudData(uid: string, data: AppData): Promise<void> {
  if (!db) return
  await setDoc(doc(db, 'users', uid), data, { merge: false })
}

export function hasLocalData(): boolean {
  const data = loadLocalData()
  return data.tasks.length > 0 || data.schedule.length > 0
}

export { isFirebaseConfigured }
