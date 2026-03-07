import { useCallback, useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { ChevronRight, Play, Square, LayoutGrid, Pin } from "lucide-react"
import { solverApi } from "@/api/solverApi"
import { lessonApi } from "@/api/lessonApi"
import { useSolverPolling } from "@/hooks/useSolverPolling"
import { SolverStatus } from "@/types/enums"
import type { ScheduledLessonDTO } from "@/types/schedule"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// ─── Status Badge ─────────────────────────────────────────────────────────────

function SolverStatusBadge({ status }: { status: string | null }) {
  if (!status || status === SolverStatus.NOT_SOLVING) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-700 px-3 py-1 text-sm font-medium text-slate-300">
        <span className="h-2 w-2 rounded-full bg-slate-400" />
        Idle
      </span>
    )
  }
  if (status === SolverStatus.SOLVING_SCHEDULED || status === SolverStatus.SOLVING_ACTIVE) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 px-3 py-1 text-sm font-medium text-blue-400">
        <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
        Solving...
      </span>
    )
  }
  return null
}

// ─── ScheduleDetailPage ───────────────────────────────────────────────────────

export function ScheduleDetailPage() {
  const { id } = useParams<{ id: string }>()
  const scheduleId = id ? Number(id) : null
  const navigate = useNavigate()

  const [lessons, setLessons] = useState<ScheduledLessonDTO[]>([])
  const [isLoadingLessons, setIsLoadingLessons] = useState(true)
  const [hasSolution, setHasSolution] = useState(false)
  const [solveError, setSolveError] = useState<string | null>(null)
  const [wasSolving, setWasSolving] = useState(false)

  const { status, isPolling, startPolling, stopPolling } = useSolverPolling(scheduleId)

  // Fetch lessons summary
  const fetchLessons = useCallback(async () => {
    setIsLoadingLessons(true)
    try {
      const data = await lessonApi.getAll()
      setLessons(data)
    } catch { /* non-critical */ }
    finally { setIsLoadingLessons(false) }
  }, [])

  // Check if solution already exists
  const checkSolution = useCallback(async () => {
    if (!scheduleId) return
    try {
      await solverApi.getSolution(scheduleId)
      setHasSolution(true)
    } catch { setHasSolution(false) }
  }, [scheduleId])

  useEffect(() => {
    fetchLessons()
    checkSolution()
  }, [fetchLessons, checkSolution])

  // When polling stops (solver finished) → refresh solution flag
  useEffect(() => {
    if (wasSolving && status === SolverStatus.NOT_SOLVING && !isPolling) {
      checkSolution()
      setWasSolving(false)
    }
  }, [status, isPolling, wasSolving, checkSolution])

  const handleStartSolving = async () => {
    if (!scheduleId) return
    setSolveError(null)
    try {
      await solverApi.solve(scheduleId)
      setWasSolving(true)
      startPolling()
    } catch (err) {
      setSolveError(err instanceof Error ? err.message : "Failed to start solver")
    }
  }

  const handleStop = async () => {
    if (!scheduleId) return
    try {
      await solverApi.stop(scheduleId)
      stopPolling()
    } catch (err) {
      setSolveError(err instanceof Error ? err.message : "Failed to stop solver")
    }
  }

  const isSolving = status === SolverStatus.SOLVING_ACTIVE || status === SolverStatus.SOLVING_SCHEDULED

  const assignedCount = lessons.filter(l => l.timeslot !== null && l.room !== null).length

  return (
    <div className="container mx-auto py-10 space-y-8 max-w-4xl">
      <nav className="flex items-center gap-1.5 text-sm text-slate-400">
        <Link to="/admin" className="hover:text-white transition-colors">Admin Panel</Link>
        <ChevronRight className="h-4 w-4" />
        <Link to="/admin/schedules" className="hover:text-white transition-colors">Schedules</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-white font-medium">Schedule #{id}</span>
      </nav>

      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Schedule #{id}</h1>
      </div>

      {/* ─── Solver Control ──────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Solver Control</CardTitle>
          <CardDescription>Start the constraint solver to automatically assign lessons to timeslots and rooms.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {solveError && <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">{solveError}</div>}

          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status:</span>
              <SolverStatusBadge status={status} />
            </div>
          </div>

          <div className="flex gap-3 flex-wrap">
            <Button
              onClick={handleStartSolving}
              disabled={isSolving}
              className={cn(!isSolving && "bg-green-600 hover:bg-green-700")}
            >
              <Play className="h-4 w-4 mr-2" />
              Start Solving
            </Button>

            {isSolving && (
              <Button variant="destructive" onClick={handleStop}>
                <Square className="h-4 w-4 mr-2" />
                Stop
              </Button>
            )}

            <Button
              variant="outline"
              disabled={!hasSolution}
              onClick={() => navigate(`/admin/schedules/${id}/timetable`)}
              title={!hasSolution ? "No solution available yet" : undefined}
            >
              <LayoutGrid className="h-4 w-4 mr-2" />
              View Timetable
            </Button>
          </div>

          {status === SolverStatus.NOT_SOLVING && hasSolution && !isPolling && (
            <p className="text-sm text-green-400">✓ Solution is available. You can view the timetable.</p>
          )}
        </CardContent>
      </Card>

      {/* ─── Lessons Summary ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Lessons Summary</CardTitle>
          <CardDescription>Overview of planning entities for this schedule.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingLessons ? (
            <p className="text-muted-foreground text-sm">Loading...</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 text-center">
                <p className="text-3xl font-bold text-white">{lessons.length}</p>
                <p className="text-sm text-muted-foreground mt-1">Total Lessons</p>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 text-center">
                <p className="text-3xl font-bold text-green-400">{assignedCount}</p>
                <p className="text-sm text-muted-foreground mt-1">Assigned</p>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 text-center">
                <p className="text-3xl font-bold text-amber-400">{lessons.length - assignedCount}</p>
                <p className="text-sm text-muted-foreground mt-1">Unassigned</p>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 text-center">
                <p className="text-3xl font-bold text-purple-400">{lessons.filter(l => l.isPrivate).length}</p>
                <p className="text-sm text-muted-foreground mt-1">Private</p>
              </div>
              <div className="rounded-lg border border-amber-700/50 bg-amber-500/10 p-4 text-center">
                <div className="flex items-center justify-center gap-1">
                  <Pin className="h-4 w-4 text-amber-400" />
                  <p className="text-3xl font-bold text-amber-400">{lessons.filter(l => l.isPinned).length}</p>
                </div>
                <p className="text-sm text-muted-foreground mt-1">Pinned</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
