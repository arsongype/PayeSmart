import { useEffect, useState } from 'react'
import { getSandboxDynamicCvv } from '../utils/sandbox-card'

const ROTATION_INTERVAL_MS = 30 * 60 * 1000

export function useSandboxDynamicCvv(userId: number): string {
  const [windowStart, setWindowStart] = useState(() => Math.floor(Date.now() / ROTATION_INTERVAL_MS))

  useEffect(() => {
    let timeoutId: number
    const updateWindow = () => {
      setWindowStart(Math.floor(Date.now() / ROTATION_INTERVAL_MS))
    }
    const scheduleRotation = () => {
      const delay = ROTATION_INTERVAL_MS - (Date.now() % ROTATION_INTERVAL_MS) + 10
      timeoutId = window.setTimeout(() => {
        updateWindow()
        scheduleRotation()
      }, delay)
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') updateWindow()
    }

    scheduleRotation()
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      window.clearTimeout(timeoutId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [userId])

  return getSandboxDynamicCvv(userId, windowStart * ROTATION_INTERVAL_MS)
}
