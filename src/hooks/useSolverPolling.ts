import { useCallback, useEffect, useRef, useState } from "react"
import { solverApi } from "@/api/solverApi"
import { SolverStatus } from "@/types/enums"
import type { SolverStatus as SolverStatusType } from "@/types/enums"

const POLL_INTERVAL_MS = 2000

interface UseSolverPollingReturn {
  status: SolverStatusType | null
  isPolling: boolean
  error: string | null
  startPolling: () => void
  stopPolling: () => void
}

export function useSolverPolling(scheduleId: number | null): UseSolverPollingReturn {
  const [status, setStatus] = useState<SolverStatusType | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollingRef = useRef(false)
  const requestInFlightRef = useRef(false)
  const requestIdRef = useRef(0)

  const clearPolling = useCallback(() => {
    pollingRef.current = false
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setIsPolling(false)
  }, [])

  const poll = useCallback(async () => {
    if (!scheduleId || requestInFlightRef.current) return
    const requestId = requestIdRef.current
    requestInFlightRef.current = true
    try {
      const res = await solverApi.getStatus(scheduleId)
      if (requestId !== requestIdRef.current) return
      setError(null)
      setStatus(res.status)
      // Auto-stop when solver finishes
      if (res.status === SolverStatus.NOT_SOLVING) {
        clearPolling()
      }
    } catch (reason) {
      if (requestId === requestIdRef.current) {
        setError(reason instanceof Error ? reason.message : "Failed to check solver status")
      }
    } finally {
      if (requestId === requestIdRef.current) requestInFlightRef.current = false
    }
  }, [scheduleId, clearPolling])

  const startPolling = useCallback(() => {
    if (!scheduleId || pollingRef.current) return
    pollingRef.current = true
    setError(null)
    setIsPolling(true)
    poll() // immediate first call
    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS)
  }, [scheduleId, poll])

  const stopPolling = useCallback(() => {
    clearPolling()
  }, [clearPolling])

  // Cleanup on unmount or scheduleId change
  useEffect(() => {
    requestIdRef.current += 1
    requestInFlightRef.current = false
    setStatus(null)
    setError(null)
    clearPolling()
    if (scheduleId) startPolling()
    return () => {
      requestIdRef.current += 1
      clearPolling()
    }
  }, [scheduleId, clearPolling, startPolling])

  return { status, isPolling, error, startPolling, stopPolling }
}
