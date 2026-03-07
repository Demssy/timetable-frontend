import { useCallback, useEffect, useRef, useState } from "react"
import { solverApi } from "@/api/solverApi"
import { SolverStatus } from "@/types/enums"
import type { SolverStatus as SolverStatusType } from "@/types/enums"

const POLL_INTERVAL_MS = 2000

interface UseSolverPollingReturn {
  status: SolverStatusType | null
  isPolling: boolean
  startPolling: () => void
  stopPolling: () => void
}

export function useSolverPolling(scheduleId: number | null): UseSolverPollingReturn {
  const [status, setStatus] = useState<SolverStatusType | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setIsPolling(false)
  }, [])

  const poll = useCallback(async () => {
    if (!scheduleId) return
    try {
      const res = await solverApi.getStatus(scheduleId)
      setStatus(res.status)
      // Auto-stop when solver finishes
      if (res.status === SolverStatus.NOT_SOLVING) {
        clearPolling()
      }
    } catch {
      // Keep polling on transient errors — backend may be briefly unavailable
    }
  }, [scheduleId, clearPolling])

  const startPolling = useCallback(() => {
    if (!scheduleId || isPolling) return
    setIsPolling(true)
    poll() // immediate first call
    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS)
  }, [scheduleId, isPolling, poll])

  const stopPolling = useCallback(() => {
    clearPolling()
  }, [clearPolling])

  // Cleanup on unmount or scheduleId change
  useEffect(() => {
    return () => {
      clearPolling()
    }
  }, [clearPolling])

  return { status, isPolling, startPolling, stopPolling }
}
