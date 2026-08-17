import type { User } from 'firebase/auth'
import type { SyncStatus } from '../sync'

interface Props {
  user: User | null
  syncStatus: SyncStatus
  cloudEnabled: boolean
  authReady: boolean
  onSignIn: () => void
  onSignOut: () => void
}

const STATUS_LABELS: Record<SyncStatus, string> = {
  'local-only': 'Только на этом устройстве',
  offline: 'Не в сети — данные локально',
  loading: 'Загрузка…',
  syncing: 'Сохранение…',
  synced: 'Синхронизировано',
  error: 'Ошибка синхронизации',
}

export function SyncBar({ user, syncStatus, cloudEnabled, authReady, onSignIn, onSignOut }: Props) {
  if (!cloudEnabled) {
    return (
      <div className="sync-bar sync-bar--hint">
        <span className="sync-bar__dot sync-bar__dot--muted" />
        <span>Облако не настроено — данные только на этом устройстве</span>
      </div>
    )
  }

  if (!authReady) {
    return (
      <div className="sync-bar">
        <span className="sync-bar__dot sync-bar__dot--loading" />
        <span>Проверка входа…</span>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="sync-bar">
        <span className="sync-bar__dot sync-bar__dot--muted" />
        <span className="sync-bar__text">Войди, чтобы синхронизировать телефон и компьютер</span>
        <button type="button" className="btn btn--ghost sync-bar__btn" onClick={onSignIn}>
          Войти через Google
        </button>
      </div>
    )
  }

  const dotClass =
    syncStatus === 'synced' ? 'synced'
    : syncStatus === 'error' ? 'error'
    : syncStatus === 'loading' || syncStatus === 'syncing' ? 'loading'
    : 'muted'

  return (
    <div className="sync-bar">
      <span className={`sync-bar__dot sync-bar__dot--${dotClass}`} />
      <span className="sync-bar__text">
        {STATUS_LABELS[syncStatus]}
        <span className="sync-bar__email">{user.email}</span>
      </span>
      <button type="button" className="btn btn--ghost sync-bar__btn" onClick={onSignOut}>
        Выйти
      </button>
    </div>
  )
}
