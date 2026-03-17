import { useCallback, useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { ChevronRight, AlertTriangle, Loader2, Pin } from "lucide-react"
import { solverApi } from "@/api/solverApi"
import type { ScheduleSolutionResponse, ScheduledLessonDTO, TimeslotDTO } from "@/types/schedule"
import { DayOfWeek, SolverStatus } from "@/types/enums"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useSolverPolling } from "@/hooks/useSolverPolling"

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAY_ORDER = [
  DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY,
  DayOfWeek.THURSDAY, DayOfWeek.FRIDAY, DayOfWeek.SATURDAY, DayOfWeek.SUNDAY,
]

const DAY_LABEL: Record<string, string> = {
  MONDAY: "Mon", TUESDAY: "Tue", WEDNESDAY: "Wed",
  THURSDAY: "Thu", FRIDAY: "Fri", SATURDAY: "Sat", SUNDAY: "Sun",
}

const LEVEL_COLORS: Record<string, string> = {
  BEGINNER: "bg-green-500/20 text-green-300",
  ELEMENTARY: "bg-blue-500/20 text-blue-300",
  INTERMEDIATE: "bg-yellow-500/20 text-yellow-300",
  ADVANCED: "bg-orange-500/20 text-orange-300",
  PROFESSIONAL: "bg-red-500/20 text-red-300",
}

const fmtTime = (t: string) => t.slice(0, 5)

// Parse score string: "0hard/-3soft" → { hard: 0, soft: -3 }
function parseScore(score: string | null): { hard: number; soft: number } | null {
  if (!score) return null
  const match = score.match(/(-?\d+)hard\/(-?\d+)soft/)
  if (!match) return null
  return { hard: Number(match[1]), soft: Number(match[2]) }
}

// ─── Lesson Card ──────────────────────────────────────────────────────────────

function LessonCard({ lesson }: { lesson: ScheduledLessonDTO }) {
  return (
    <div
      className="rounded-md border p-2 text-xs space-y-1"
      style={{ borderColor: `${lesson.teacher.colorCode}40`, backgroundColor: `${lesson.teacher.colorCode}15` }}
    >
      <div className="flex items-start justify-between gap-1">
        <span className="font-semibold leading-tight">{lesson.danceGroup.name}</span>
        <div className="flex gap-0.5 shrink-0">
          {lesson.isPrivate && <span className="rounded bg-purple-500/30 text-purple-300 px-1">P</span>}
          {lesson.isPinned && <Pin className="h-3 w-3 text-amber-400" />}
        </div>
      </div>
      <span className={cn("inline-flex rounded px-1 py-0.5 text-[10px] font-semibold", LEVEL_COLORS[lesson.danceGroup.danceLevel] ?? "bg-muted text-muted-foreground")}>
        {lesson.danceGroup.danceLevel}
      </span>
      <p style={{ color: lesson.teacher.colorCode }} className="font-medium truncate">{lesson.teacher.fullName}</p>
      {lesson.room && <p className="text-muted-foreground truncate">🚪 {lesson.room.name}</p>}
      <p className="text-muted-foreground">{lesson.durationMinutes}m</p>
    </div>
  )
}

// ─── TimetableViewPage ────────────────────────────────────────────────────────

export function TimetableViewPage() {
  const { id } = useParams<{ id: string }>()
  const scheduleId = id ? Number(id) : null

  const [solution, setSolution] = useState<ScheduleSolutionResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { status, startPolling, stopPolling } = useSolverPolling(scheduleId)
  const isSolving = status === SolverStatus.SOLVING_ACTIVE || status === SolverStatus.SOLVING_SCHEDULED

  const fetchSolution = useCallback(async () => {
    if (!scheduleId) return
    try {
      const data = await solverApi.getSolution(scheduleId)
      setSolution(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load solution")
    } finally {
      setIsLoading(false)
    }
  }, [scheduleId])

  useEffect(() => {
    fetchSolution()
    startPolling()

    return () => {
      stopPolling()
    }
    // Intentionally run only once on mount to avoid request loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | undefined

    if (status === SolverStatus.SOLVING_ACTIVE || status === SolverStatus.SOLVING_SCHEDULED) {
      intervalId = setInterval(() => {
        fetchSolution()
      }, 2000)
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [status, fetchSolution])

  if (isLoading) {
    return (
      <div className="container mx-auto py-10 text-center text-muted-foreground">Loading timetable...</div>
    )
  }

  if (error || !solution) {
    return (
      <div className="container mx-auto py-10">
        <div className="bg-destructive/15 text-destructive p-4 rounded-md">
          {error ?? "No solution available for this schedule."}
        </div>
      </div>
    )
  }

  // ── Split assigned vs unassigned ──────────────────────────────────────────
  const assigned = solution.lessons.filter(l => l.timeslot !== null && l.room !== null)
  const unassigned = solution.lessons.filter(l => l.timeslot === null || l.room === null)

  // ── Build sorted timeslot list ────────────────────────────────────────────
  const timeslotMap = new Map<string, TimeslotDTO>()
  assigned.forEach(l => {
    if (l.timeslot) {
      const key = `${l.timeslot.dayOfWeek}-${l.timeslot.startTime}`
      if (!timeslotMap.has(key)) timeslotMap.set(key, l.timeslot)
    }
  })
  const sortedTimeslots = Array.from(timeslotMap.values()).sort((a, b) => {
    const dayDiff = DAY_ORDER.indexOf(a.dayOfWeek) - DAY_ORDER.indexOf(b.dayOfWeek)
    return dayDiff !== 0 ? dayDiff : a.startTime.localeCompare(b.startTime)
  })
  // Unique start times (rows)
  const uniqueStartTimes = [...new Set(sortedTimeslots.map(s => s.startTime))].sort()

  // ── Score analysis ────────────────────────────────────────────────────────
  const parsedScore = parseScore(solution.score)

  // Cell lookup: dayOfWeek + startTime → lessons
  const cellKey = (day: string, startTime: string) => `${day}|${startTime}`
  const cellMap = new Map<string, ScheduledLessonDTO[]>()
  assigned.forEach(l => {
    if (l.timeslot) {
      const key = cellKey(l.timeslot.dayOfWeek, l.timeslot.startTime)
      const existing = cellMap.get(key) ?? []
      cellMap.set(key, [...existing, l])
    }
  })

  // Which days are actually used?
  const usedDays = DAY_ORDER.filter(day =>
    assigned.some(l => l.timeslot?.dayOfWeek === day)
  )

  return (
    <div className="container mx-auto py-10 space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-slate-400">
        <Link to="/admin" className="hover:text-white transition-colors">Admin Panel</Link>
        <ChevronRight className="h-4 w-4" />
        <Link to="/admin/schedules" className="hover:text-white transition-colors">Schedules</Link>
        <ChevronRight className="h-4 w-4" />
        <Link to={`/admin/schedules/${id}`} className="hover:text-white transition-colors">#{id}</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-white font-medium">Timetable</span>
      </nav>

      <h1 className="text-3xl font-bold text-white">Timetable — Schedule #{id}</h1>

      {/* Score banner */}
      <div className="flex flex-wrap gap-3 items-center">
        {isSolving && (
          <div className="flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/20 px-4 py-2 text-sm font-medium text-blue-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            {status === SolverStatus.SOLVING_SCHEDULED ? "Solving scheduled..." : "Solving in progress..."}
          </div>
        )}
        {solution.score && (
          <div className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium",
            parsedScore && parsedScore.hard < 0
              ? "bg-red-500/20 text-red-400 border border-red-500/30"
              : "bg-green-500/20 text-green-400 border border-green-500/30"
          )}>
            {parsedScore && parsedScore.hard < 0 ? "❌" : "✅"}
            Score: {parsedScore ? `${parsedScore.hard} hard / ${parsedScore.soft} soft` : solution.score}
            {parsedScore && parsedScore.hard < 0 && <span className="ml-1 text-red-300">(Hard constraint violated!)</span>}
            {parsedScore && parsedScore.hard === 0 && parsedScore.soft < 0 && <span className="ml-1 text-yellow-400">({Math.abs(parsedScore.soft)} soft penalties)</span>}
          </div>
        )}
        {!solution.fullyAssigned && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-400">
            <AlertTriangle className="h-4 w-4" />
            Not all lessons could be assigned
          </div>
        )}
      </div>

      {/* Grid */}
      {usedDays.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-slate-700">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-800">
                <th className="p-3 text-left text-muted-foreground font-medium border-b border-r border-slate-700 min-w-20">
                  Time
                </th>
                {usedDays.map(day => (
                  <th key={day} className="p-3 text-center text-white font-medium border-b border-r border-slate-700 min-w-[140px]">
                    {DAY_LABEL[day]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {uniqueStartTimes.map(startTime => {
                // Find matching timeslot to display end time
                const sample = sortedTimeslots.find(s => s.startTime === startTime)
                return (
                  <tr key={startTime} className="border-b border-slate-700">
                    <td className="p-3 border-r border-slate-700 text-muted-foreground font-mono text-xs align-top whitespace-nowrap">
                      <div>{fmtTime(startTime)}</div>
                      {sample && <div className="text-slate-600">–{fmtTime(sample.endTime)}</div>}
                    </td>
                    {usedDays.map(day => {
                      const cellLessons = cellMap.get(cellKey(day, startTime)) ?? []
                      return (
                        <td key={day} className="p-2 border-r border-slate-700 align-top">
                          {cellLessons.length === 0 ? (
                            <div className="h-8" />
                          ) : (
                            <div className="space-y-1">
                              {cellLessons.map(l => <LessonCard key={l.id} lesson={l} />)}
                            </div>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No assigned lessons in the solution.
          </CardContent>
        </Card>
      )}

      {/* Unassigned section */}
      {unassigned.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-amber-400 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Unassigned Lessons ({unassigned.length})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {unassigned.map(lesson => (
              <div key={lesson.id} className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs space-y-1">
                <p className="font-semibold">{lesson.danceGroup.name}</p>
                <p style={{ color: lesson.teacher.colorCode }}>{lesson.teacher.fullName}</p>
                <p className="text-muted-foreground">{lesson.durationMinutes}m</p>
                <div className="flex gap-1">
                  {!lesson.timeslot && <span className="rounded bg-red-500/20 text-red-400 px-1">No slot</span>}
                  {!lesson.room && <span className="rounded bg-red-500/20 text-red-400 px-1">No room</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
