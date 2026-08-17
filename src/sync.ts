import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore'
import { db, isFirebaseConfigured } from './firebase'
import type { AppData } from './types'
import { normalizeSchedule } from './types'

const STORAGE_KEY = 'samorealizatsiya-data'
const BACKUP_KEY = 'samorealizatsiya-backup'

export type SyncStatus = 'local-only' | 'offline' | 'loading' | 'syncing' | 'synced' | 'error'

export const defaultData: AppData = {
  tasks: [],
  schedule: [],
}

export function loadLocalData(): AppData {
  const primary = readStorage(STORAGE_KEY)
  if (!isDataEmpty(primary)) return primary
  const backup = readStorage(BACKUP_KEY)
  if (!isDataEmpty(backup)) return backup
  return primary
}

function readStorage(key: string): AppData {
  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      const parsed = { ...defaultData, ...JSON.parse(raw) } as AppData
      return { ...parsed, schedule: normalizeSchedule(parsed.schedule || []) }
    }
  } catch { /* ignore */ }
  return { ...defaultData }
}

export function saveLocalData(data: AppData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  if (!isDataEmpty(data)) {
    localStorage.setItem(BACKUP_KEY, JSON.stringify(data))
  }
}

function parseCloudData(raw: unknown): AppData {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Partial<AppData>
  return {
    ...defaultData,
    ...obj,
    tasks: Array.isArray(obj.tasks) ? obj.tasks : [],
    schedule: normalizeSchedule(Array.isArray(obj.schedule) ? obj.schedule : []),
  }
}

export function subscribeToCloud(
  uid: string,
  onData: (data: AppData) => void,
  onError: (message: string) => void,
): () => void {
  if (!db) return () => {}

  const ref = doc(db, 'users', uid)
  return onSnapshot(
    ref,
    snap => {
      if (snap.exists()) onData(parseCloudData(snap.data()))
    },
    err => onError(humanizeFirebaseError(err)),
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
  await setDoc(doc(db, 'users', uid), toFirestorePayload(data), { merge: false })
}

export function isDataEmpty(data: AppData): boolean {
  return data.tasks.length === 0 && data.schedule.length === 0
}

/** Strip undefined fields — Firestore rejects them and the whole write fails. */
export function toFirestorePayload(data: AppData): Record<string, unknown> {
  return JSON.parse(JSON.stringify({
    tasks: data.tasks,
    schedule: data.schedule,
    ...(data.lastCheckInPromptDate ? { lastCheckInPromptDate: data.lastCheckInPromptDate } : {}),
    updatedAt: Date.now(),
  })) as Record<string, unknown>
}

function mergeById<T extends { id: string }>(cloud: T[], local: T[]): T[] {
  const map = new Map<string, T>()
  for (const item of cloud) map.set(item.id, item)
  for (const item of local) {
    const existing = map.get(item.id)
    if (!existing) {
      map.set(item.id, item)
      continue
    }
    map.set(item.id, { ...existing, ...item })
  }
  return [...map.values()]
}

/** Prefer keeping everything from both sides so a failed cloud write cannot wipe local tasks. */
export function mergeAppData(local: AppData, cloud: AppData): AppData {
  if (isDataEmpty(cloud) && !isDataEmpty(local)) return local
  if (isDataEmpty(local)) return cloud
  return {
    tasks: mergeById(cloud.tasks, local.tasks),
    schedule: mergeById(cloud.schedule, local.schedule),
    lastCheckInPromptDate: local.lastCheckInPromptDate || cloud.lastCheckInPromptDate,
  }
}

export function humanizeFirebaseError(err: unknown): string {
  const code = typeof err === 'object' && err && 'code' in err ? String((err as { code: string }).code) : ''
  if (code.includes('permission-denied')) {
    return 'Firestore запрещает запись. В Firebase Console → Firestore → Rules опубликуй правила (см. инструкцию).'
  }
  if (code.includes('unavailable') || code.includes('network')) {
    return 'Нет связи с облаком. Проверь интернет или отключи блокировщик рекламы.'
  }
  if (code.includes('failed-precondition') || code.includes('not-found')) {
    return 'База Firestore ещё не создана. В Firebase Console → Build → Firestore Database нажми Create database.'
  }
  const message = err instanceof Error ? err.message : 'Неизвестная ошибка синхронизации'
  return message
}

export { isFirebaseConfigured }
