import { ref } from 'vue'
import type { ActivityLogRecord } from '@/service/api'

export type LiveNotification = Partial<ActivityLogRecord> & {
  id: string | number
  created_at: string
}

type PushNotificationInput = Partial<Omit<LiveNotification, 'id' | 'created_at'>> & {
  id?: string | number
  created_at?: string
}

const liveNotifications = ref<LiveNotification[]>([])
const hasUnseen = ref(false)

function pushNotification(entry: PushNotificationInput) {
  liveNotifications.value.unshift({
    status: 'SUCCESS',
    ...entry,
    id: entry.id ?? `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    created_at: entry.created_at ?? new Date().toISOString(),
  })
  hasUnseen.value = true
}

function markSeen() {
  hasUnseen.value = false
}

/**
 * Drops optimistic local entries once the server has a real record for the
 * same entity (matched by entity_reference), so a just-created item doesn't
 * show up twice after the next fetch confirms it.
 */
function reconcileWithServer(serverRows: Array<Partial<ActivityLogRecord>>) {
  const serverRefs = new Set(
    serverRows.map((row) => row.entity_reference).filter((ref): ref is string => Boolean(ref)),
  )
  if (!serverRefs.size) return
  liveNotifications.value = liveNotifications.value.filter(
    (notification) => !(notification.entity_reference && serverRefs.has(notification.entity_reference)),
  )
}

export function useNotificationCenter() {
  return { liveNotifications, hasUnseen, pushNotification, markSeen, reconcileWithServer }
}
