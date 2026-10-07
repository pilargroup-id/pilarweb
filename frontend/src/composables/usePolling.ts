import { onMounted, onUnmounted } from 'vue'

/**
 * Runs `callback` on an interval while the tab is visible, and stops
 * automatically when the owning component unmounts.
 */
export function usePolling(callback: () => void | Promise<void>, intervalMs = 15000) {
  let timerId: ReturnType<typeof setInterval> | null = null

  function tick() {
    if (document.visibilityState === 'visible') {
      callback()
    }
  }

  onMounted(() => {
    timerId = setInterval(tick, intervalMs)
  })

  onUnmounted(() => {
    if (timerId) clearInterval(timerId)
  })
}
