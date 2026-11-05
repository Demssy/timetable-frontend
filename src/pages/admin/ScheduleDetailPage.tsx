import { useCallback, useEffect, useRef, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import {
  ChevronRight, Play, Square, LayoutGrid, Pin,
  RefreshCw, CheckCircle2, AlertTriangle, Loader2, Sparkles,
} from "lucide-react"
import { solverApi } from "@/api/solverApi"
import { scheduleApi } from "@/api/scheduleApi"
import { useSolverPolling } from "@/hooks/useSolverPolling"
import { SolverStatus } from "@/types/enums"
import type { ScheduledLessonDTO, ScheduleSolutionResponse, ScheduleMetadataDTO } from "@/types/schedule"
import { getLessonCategory } from "@/types/schedule"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { SolverSettingsDialog } from "@/components/SolverSettingsDialog"

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SCORE_PATTERN = /(-?\d+)hard\/(-?\d+)soft/

function parseScore(score: string | null): { hard: number; soft: number } | null {
  if (!score) return null
  const m = SCORE_PATTERN.exec(score)
  return m ? { hard: Number(m[1]), soft: Number(m[2]) } : null
}

function getSolutionCardClassName(hasSolution: boolean, hardScore: number | undefined): string {
  if (!hasSolution) return "border-slate-700/50 opacity-70"
  if (hardScore !== undefined && hardScore < 0) return "border-red-500/40 bg-red-500/5"
  return "border-slate-700 bg-slate-900/50"
}

// ─── Solver status badge ───────────────────────────────────────────────────────

function SolverStatusBadge({ status }: { readonly status: string | null }) {
  if (!status || status === SolverStatus.NOT_SOLVING) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-700 px-3 py-1 text-sm font-medium text-slate-300">
        <span className="h-2 w-2 rounded-full bg-slate-400" />
        Idle
      </span>
    )
  }
  const label = status === SolverStatus.SOLVING_SCHEDULED ? "Scheduled" : "Solving…"
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 px-3 py-1 text-sm font-medium text-blue-400">
      <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
      {label}
    </span>
  )
}

// ─── ScheduleDetailPage ───────────────────────────────────────────────────────

export function ScheduleDetailPage() {
  const { id } = useParams<{ id: string }>()
  const scheduleId = id ? Number(id) : null
  const navigate = useNavigate()

  // Schedule metadata (name, status)
  const [schedule, setSchedule] = useState<ScheduleMetadataDTO | null>(null)

  // Solution data (populated after solving)
  const [solution, setSolution] = useState<ScheduleSolutionResponse | null>(null)
  const [isLoadingSolution, setIsLoadingSolution] = useState(true)

  const [error, setError] = useState<string | null>(null)
  const [solveError, setSolveError] = useState<string | null>(null)
  const [wasSolving, setWasSolving] = useState(false)
  const [isStartingSolver, setIsStartingSolver] = useState(false)
  const [isStoppingSolver, setIsStoppingSolver] = useState(false)
  const [solverFinished, setSolverFinished] = useState(false)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { status, isPolling, error: statusError, startPolling } = useSolverPolling(scheduleId)

  const isSolving = status === SolverStatus.SOLVING_ACTIVE || status === SolverStatus.SOLVING_SCHEDULED
  const hasSolution = solution !== null && !!solution.lessons.length
  // ── CRITICAL: Reset all state immediately when navigating to a new schedule ─
  // This runs synchronously before any fetch, so the user never sees ghost data.
  useEffect(() => {
    setSchedule(null)
    setSolution(null)
    setError(null)
    setSolveError(null)
    setIsLoadingSolution(true)
    setWasSolving(false)
    setIsStartingSolver(false)
    setIsStoppingSolver(false)
    setSolverFinished(false)
    // Clear any active polling interval from the previous schedule
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
  }, [id]) // ← triggers on every schedule ID change

  // ── Fetch schedule metadata ────────────────────────────────────────────────
  const fetchSchedule = useCallback(async () => {
    if (!scheduleId) return
    try {
      const data = await scheduleApi.getById(scheduleId)
      setSchedule(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load schedule.")
    }
  }, [scheduleId])

  // ── Fetch solver solution (assignment data + score) ────────────────────────
  const fetchSolution = useCallback(async () => {
    if (!scheduleId) return
    setIsLoadingSolution(true)
    try {
      const data = await solverApi.getSolution(scheduleId)
      setSolution(data)
    } catch {
      setSolution(null) // no solution yet — clean state
    } finally {
      setIsLoadingSolution(false)
    }
  }, [scheduleId])

  // Initial load — triggers whenever scheduleId changes (i.e. new fetch callbacks created)
  useEffect(() => {
    fetchSchedule()
    fetchSolution()
  }, [fetchSchedule, fetchSolution])

  // Poll solution data while solver is running (live counter updates)
  useEffect(() => {
    if (isSolving) {
      pollIntervalRef.current = setInterval(() => { fetchSolution() }, 2500)
    } else if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    return () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current) }
  }, [isSolving, fetchSolution])

  useEffect(() => {
    if (isSolving) setWasSolving(true)
  }, [isSolving])

  // When solver finishes → refresh everything
  useEffect(() => {
    if (wasSolving && status === SolverStatus.NOT_SOLVING && !isPolling) {
      void Promise.all([fetchSchedule(), fetchSolution()])
      setSolverFinished(true)
      setWasSolving(false)
    }
  }, [status, isPolling, wasSolving, fetchSchedule, fetchSolution])

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleStartSolving = async () => {
    if (!scheduleId || schedule?.status !== "DRAFT" || isSolving || isStartingSolver) return
    setSolveError(null)
    setSolverFinished(false)
    setIsStartingSolver(true)
    try {
      await solverApi.solve(scheduleId)
      setWasSolving(true)
      startPolling()
    } catch (err) {
      setSolveError(err instanceof Error ? err.message : "Failed to start solver")
    } finally { setIsStartingSolver(false) }
  }

  const handleRegenerate = async () => {
    if (!window.confirm("Re-generate the timetable? The existing solution will be replaced.")) return
    handleStartSolving()
  }

  const handleStop = async () => {
    if (!scheduleId || !isSolving || isStoppingSolver) return
    setIsStoppingSolver(true)
    try { await solverApi.stop(scheduleId) }
    catch (err) { setSolveError(err instanceof Error ? err.message : "Failed to stop solver") }
    finally { setIsStoppingSolver(false) }
  }

  // ── Derived stats ──────────────────────────────────────────────────────────
  const displayLessons: ScheduledLessonDTO[] = solution?.lessons ?? []
  const assignedCount   = displayLessons.filter(l => l.timeslot !== null && l.room !== null).length
  const unassignedCount = displayLessons.length - assignedCount
  const pinnedCount     = displayLessons.filter(l => l.isPinned).length
  const groupCount      = displayLessons.filter(l => getLessonCategory(l) === "group").length
  const privateMatched  = displayLessons.filter(l => getLessonCategory(l) === "private-matched").length
  const privateAvailable = displayLessons.filter(l => getLessonCategory(l) === "private-available").length
  const parsedScore     = parseScore(solution?.score ?? null)

  // ── Loading / error screens ────────────────────────────────────────────────
  const isInitialLoading = isLoadingSolution && !schedule

  if (isInitialLoading) {
    return (
      <div className="container mx-auto py-10 space-y-6 max-w-4xl">
        <nav className="flex items-center gap-1.5 text-sm text-slate-400">
          <Link to="/admin" className="hover:text-white transition-colors">Admin Panel</Link>
          <ChevronRight className="h-4 w-4" />
          <Link to="/admin/schedules" className="hover:text-white transition-colors">Schedules</Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-slate-500">#{id}</span>
        </nav>
        <div className="flex items-center gap-3 text-muted-foreground py-12 justify-center">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading schedule…</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-10 max-w-4xl">
        <nav className="flex items-center gap-1.5 text-sm text-slate-400 mb-6">
          <Link to="/admin" className="hover:text-white transition-colors">Admin Panel</Link>
          <ChevronRight className="h-4 w-4" />
          <Link to="/admin/schedules" className="hover:text-white transition-colors">Schedules</Link>
        </nav>
        <div className="rounded-lg bg-destructive/15 border border-destructive/30 p-4 text-destructive text-sm">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10 space-y-6 max-w-4xl">
      <nav className="flex items-center gap-1.5 text-sm text-slate-400">
        <Link to="/admin" className="hover:text-white transition-colors">Admin Panel</Link>
        <ChevronRight className="h-4 w-4" />
        <Link to="/admin/schedules" className="hover:text-white transition-colors">Schedules</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-white font-medium">Schedule #{id}</span>
      </nav>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">
            {schedule?.name ?? `Schedule #${id}`}
          </h1>
          {schedule?.validFrom && (
            <p className="text-sm text-slate-400 mt-1">
              {schedule.validFrom} → {schedule.validTo}
            </p>
          )}
          {solution?.score === "N/A" && (
            <span className="text-xs text-slate-400">No saved solver score is available.</span>
          )}
        </div>
      </div>

      {/* ─── Solver Control ──────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Solver Control</CardTitle>
          <CardDescription>Start the constraint solver to automatically assign lessons to timeslots and rooms.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {solveError && (
            <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">{solveError}</div>
          )}
          {solverFinished && (
            <p className="text-sm text-slate-400" role="status">
              Solver is no longer running. The displayed snapshots and score are the current server state; result application is not separately confirmed.
            </p>
          )}

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status:</span>
            <SolverStatusBadge status={status} />
            {statusError && (
              <span role="status" className="text-xs text-amber-400">{statusError} — retrying…</span>
            )}
            {isSolving && isLoadingSolution && (
              <Loader2 className="h-3.5 w-3.5 text-slate-500 animate-spin ml-1" />
            )}
          </div>

          <div className="flex gap-3 flex-wrap">
            <SolverSettingsDialog />
            {!isSolving && !hasSolution && (
              <Button type="button" onClick={handleStartSolving} disabled={schedule?.status !== "DRAFT" || status === null || isStartingSolver} className="bg-green-600 hover:bg-green-700">
                {isStartingSolver ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}{isStartingSolver ? "Starting…" : "Start Solving"}
              </Button>
            )}

            {!isSolving && hasSolution && (
              <>
                <Button type="button" onClick={handleRegenerate} disabled={schedule?.status !== "DRAFT" || status === null || isStartingSolver} className="bg-green-600 hover:bg-green-700">
                  {isStartingSolver ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}{isStartingSolver ? "Starting…" : "Re-generate"}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate(`/admin/schedules/${id}/timetable`)}>
                  <LayoutGrid className="h-4 w-4 mr-2" />View Timetable
                </Button>
              </>
            )}

            {isSolving && (
              <>
                <Button type="button" variant="destructive" onClick={handleStop} disabled={isStoppingSolver}>
                  {isStoppingSolver ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Square className="h-4 w-4 mr-2" />}{isStoppingSolver ? "Stopping…" : "Stop"}
                </Button>
                <Button type="button" variant="outline" disabled={!hasSolution}
                  onClick={() => navigate(`/admin/schedules/${id}/timetable`)}>
                  <LayoutGrid className="h-4 w-4 mr-2" />View Timetable
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ─── Solution Status ─────────────────────────────────────────────── */}
      <Card className={cn(
        "border transition-colors",
        getSolutionCardClassName(hasSolution, parsedScore?.hard)
      )}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-yellow-400" />
              Timetable Solution
            </CardTitle>
            {hasSolution && parsedScore && (
              <Button type="button" variant="ghost" size="sm" onClick={fetchSolution} disabled={isLoadingSolution}
                className="text-slate-400 hover:text-white h-7 px-2">
                <RefreshCw className={cn("h-3.5 w-3.5", isLoadingSolution && "animate-spin")} />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingSolution && !hasSolution ? (
            <div className="flex items-center gap-2 text-slate-400 text-sm py-1">
              <Loader2 className="h-4 w-4 animate-spin" />Checking…
            </div>
          ) : !hasSolution ? (
            <p className="text-slate-500 text-sm">
              {solution?.lessons.length === 0
                ? "This schedule has no lessons. Assignment completeness does not confirm that publication will be accepted."
                : "No saved solution is available yet. Start solving to create a timetable."}
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-4">
              {solution?.fullyAssigned ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/20 border border-green-500/30 px-3 py-1 text-xs font-semibold text-green-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />All lessons assigned
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 border border-amber-500/30 px-3 py-1 text-xs font-semibold text-amber-400">
                  <AlertTriangle className="h-3.5 w-3.5" />{unassignedCount} unassigned
                </span>
              )}

              {solution?.score && solution.score !== "N/A" && (
                <span className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold",
                  parsedScore?.hard !== undefined && parsedScore.hard < 0
                    ? "bg-red-500/20 border-red-500/30 text-red-400"
                    : "bg-slate-500/20 border-slate-500/30 text-slate-300"
                )}>
                  {parsedScore?.hard !== undefined && parsedScore.hard < 0 ? "❌" : ""}
                  {parsedScore
                    ? `${parsedScore.hard} hard / ${parsedScore.soft} soft`
                    : `Saved score: ${solution.score}`}
                </span>
              )}

              {displayLessons.length > 0 && (
                <div className="flex-1 min-w-40">
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>{assignedCount}/{displayLessons.length} assigned</span>
                    <span>{Math.round(assignedCount / displayLessons.length * 100)}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        solution?.fullyAssigned ? "bg-green-500" : "bg-amber-500"
                      )}
                      style={{ width: `${Math.round(assignedCount / displayLessons.length * 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
          {hasSolution && (
            <p className="mt-3 text-xs text-slate-500">
              Assignment completeness and solver score do not guarantee that the server will accept publication.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ─── Lessons Summary ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Lessons Summary</CardTitle>
              <CardDescription>Overview of planning entities for this schedule.</CardDescription>
            </div>
            {(isSolving && isLoadingSolution) && (
              <Loader2 className="h-4 w-4 text-slate-500 animate-spin" />
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 text-center">
              <p className="text-3xl font-bold text-white">{displayLessons.length}</p>
              <p className="text-sm text-muted-foreground mt-1">Total Lessons</p>
            </div>
            <div className={cn(
              "rounded-lg border p-4 text-center",
              hasSolution ? "border-green-700/50 bg-green-900/20" : "border-slate-700 bg-slate-800/50"
            )}>
              <p className="text-3xl font-bold text-green-400">{assignedCount}</p>
              <p className="text-sm text-muted-foreground mt-1">Assigned</p>
            </div>
            <div className={cn(
              "rounded-lg border p-4 text-center",
              hasSolution && unassignedCount > 0 ? "border-amber-700/50 bg-amber-900/20" : "border-slate-700 bg-slate-800/50"
            )}>
              <p className={cn("text-3xl font-bold", unassignedCount > 0 && hasSolution ? "text-amber-400" : "text-slate-400")}>
                {unassignedCount}
              </p>
              <p className="text-sm text-muted-foreground mt-1">Unassigned</p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 text-center">
              <p className="text-3xl font-bold text-blue-400">{groupCount}</p>
              <p className="text-sm text-muted-foreground mt-1">Group Lessons</p>
            </div>
            <div className="rounded-lg border border-purple-700/50 bg-purple-900/20 p-4 text-center">
              <p className="text-3xl font-bold text-purple-400">{privateMatched}</p>
              <p className="text-sm text-muted-foreground mt-1">Private (matched)</p>
            </div>
            <div className={cn(
              "rounded-lg border p-4 text-center",
              privateAvailable > 0 ? "border-yellow-700/50 bg-yellow-900/20" : "border-slate-700 bg-slate-800/50",
            )}>
              <p className={cn("text-3xl font-bold", privateAvailable > 0 ? "text-yellow-400" : "text-slate-400")}>
                {privateAvailable}
              </p>
              <p className="text-sm text-muted-foreground mt-1">Available Slots</p>
            </div>
            <div className="rounded-lg border border-amber-700/50 bg-amber-500/10 p-4 text-center">
              <div className="flex items-center justify-center gap-1">
                <Pin className="h-4 w-4 text-amber-400" />
                <p className="text-3xl font-bold text-amber-400">{pinnedCount}</p>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Pinned</p>
            </div>

            {/* Solver score cards — only shown after solving */}
            {hasSolution && solution?.score === "N/A" && (
              <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 text-center">
                <p className="text-3xl font-bold text-slate-400">N/A</p>
                <p className="text-sm text-muted-foreground mt-1">Saved score unavailable</p>
              </div>
            )}
            {hasSolution && solution?.score !== "N/A" && (
              <>
                <div className={cn(
                  "rounded-lg border p-4 text-center",
                  (solution?.hardScore ?? 0) < 0 ? "border-red-700/50 bg-red-900/20" : "border-green-700/50 bg-green-900/20"
                )}>
                  <p className={cn("text-3xl font-bold", (solution?.hardScore ?? 0) < 0 ? "text-red-400" : "text-green-400")}>
                    {solution?.hardScore ?? 0}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Hard Score</p>
                </div>
                <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 text-center">
                  <p className="text-3xl font-bold text-yellow-400">{solution?.softScore ?? 0}</p>
                  <p className="text-sm text-muted-foreground mt-1">Quality Score</p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
