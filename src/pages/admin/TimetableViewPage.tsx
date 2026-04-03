import { useCallback, useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { ChevronRight, AlertTriangle, Loader2, Pin } from "lucide-react"
import { solverApi } from "@/api/solverApi"
import type { ScheduleSolutionResponse, ScheduledLessonDTO } from "@/types/schedule"
import { DayOfWeek, SolverStatus } from "@/types/enums"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useSolverPolling } from "@/hooks/useSolverPolling"

// ─── Grid configuration (mirrors TimeslotsPage exactly) ─────────────────────
const GRID_START_MIN = 7 * 60 + 30   // 07:30
const GRID_END_MIN   = 22 * 60        // 22:00
const ROW_MINUTES    = 30             // each row = 30 min
const ROW_HEIGHT_PX  = 44             // px per row
const TIME_COL_W     = 64             // px — width of the time-label column
const TOTAL_ROWS     = (GRID_END_MIN - GRID_START_MIN) / ROW_MINUTES  // 29 rows

// ─── Static data ──────────────────────────────────────────────────────────────
const DAY_ORDER = [
  DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY,
  DayOfWeek.THURSDAY, DayOfWeek.FRIDAY, DayOfWeek.SATURDAY, DayOfWeek.SUNDAY,
]

const DAY_LABEL: Record<string, string> = {
  MONDAY: "Mon", TUESDAY: "Tue", WEDNESDAY: "Wed",
  THURSDAY: "Thu", FRIDAY: "Fri", SATURDAY: "Sat", SUNDAY: "Sun",
}

const LEVEL_STYLE: Record<string, string> = {
  BEGINNER:         "bg-green-500/20 text-green-300 border-green-500/30",
  ELEMENTARY:       "bg-blue-500/20 text-blue-300 border-blue-500/30",
  PRE_INTERMEDIATE: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  INTERMEDIATE:     "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  ADVANCED:         "bg-orange-500/20 text-orange-300 border-orange-500/30",
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const toMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number)
  return h * 60 + (m || 0)
}

const toTimeStr = (minutes: number) => {
  const h = Math.floor(minutes / 60).toString().padStart(2, "0")
  const m = (minutes % 60).toString().padStart(2, "0")
  return `${h}:${m}`
}


function parseScore(score: string | null): { hard: number; soft: number } | null {
  if (!score) return null
  const match = score.match(/(-?\d+)hard\/(-?\d+)soft/)
  if (!match) return null
  return { hard: Number(match[1]), soft: Number(match[2]) }
}

// ─── Lesson Block ─────────────────────────────────────────────────────────────
function LessonBlock({
  lesson,
  topPx,
  heightPx,
}: {
  lesson: ScheduledLessonDTO
  topPx: number
  heightPx: number
}) {
  const subject  = lesson.danceGroup?.name ?? lesson.student?.fullName ?? "Private Lesson"
  const level    = lesson.danceGroup?.danceLevel ?? null
  const compact  = heightPx < 68   // less than ~1.5 rows — hide secondary info

  return (
    <div
      className="absolute left-1 right-1 rounded-lg overflow-hidden border cursor-pointer select-none z-10 hover:z-20 transition-all duration-200 hover:shadow-xl group"
      style={{
        top:             topPx + 2,
        height:          Math.max(heightPx - 4, 22),
        borderColor:     `${lesson.teacher.colorCode}55`,
        backgroundColor: `${lesson.teacher.colorCode}18`,
      }}
    >
      {/* Left accent stripe */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ backgroundColor: lesson.teacher.colorCode }}
      />

      <div className="pl-3 pr-2 py-1.5 h-full flex flex-col gap-0.5 overflow-hidden">

        {/* Subject + badges */}
        <div className="flex items-start justify-between gap-1">
          <span className="font-semibold text-[11px] leading-tight text-white/90 truncate">
            {subject}
          </span>
          <div className="flex gap-0.5 shrink-0 mt-px">
            {lesson.isPrivate && (
              <span className="rounded px-1 py-px text-[9px] font-bold bg-purple-500/30 text-purple-300 border border-purple-500/30">
                P
              </span>
            )}
            {lesson.isPinned && <Pin className="h-2.5 w-2.5 text-amber-400" />}
          </div>
        </div>

        {/* Dance level badge */}
        {!compact && level && (
          <span className={cn(
            "inline-flex self-start rounded border px-1 py-px text-[9px] font-bold",
            LEVEL_STYLE[level] ?? "bg-slate-500/20 text-slate-300 border-slate-500/30"
          )}>
            {level.replace("_", " ")}
          </span>
        )}

        {/* Teacher */}
        <span
          className="text-[10px] font-semibold truncate leading-none"
          style={{ color: lesson.teacher.colorCode }}
        >
          {lesson.teacher.fullName}
        </span>

        {/* Room — only if enough height */}
        {!compact && lesson.room && (
          <span className="text-[10px] text-slate-400 truncate leading-none">
            🚪 {lesson.room.name}
          </span>
        )}
      </div>
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
    return () => { stopPolling() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | undefined
    if (isSolving) {
      intervalId = setInterval(() => { fetchSolution() }, 2000)
    }
    return () => { if (intervalId) clearInterval(intervalId) }
  }, [isSolving, fetchSolution])

  // ── Loading / Error ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="container mx-auto py-10 flex items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading timetable…
      </div>
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

  // ── Data preparation ───────────────────────────────────────────────────────
  const assigned   = solution.lessons.filter(l => l.timeslot !== null && l.room !== null)
  const unassigned = solution.lessons.filter(l => l.timeslot === null || l.room === null)

  // Always show all 7 days — same as TimeslotsPage
  const gridDays = DAY_ORDER

  // Fixed grid boundaries — 07:30 … 22:00, same as TimeslotsPage
  const timeBoundaries = Array.from({ length: TOTAL_ROWS + 1 }, (_, i) => GRID_START_MIN + i * ROW_MINUTES)
  const timeLabels     = Array.from({ length: TOTAL_ROWS },     (_, i) => GRID_START_MIN + i * ROW_MINUTES)

  const parsedScore = parseScore(solution.score)

  const lessonsByDay = DAY_ORDER.reduce<Record<string, ScheduledLessonDTO[]>>((acc, day) => {
    acc[day] = assigned.filter(l => l.timeslot?.dayOfWeek === day)
    return acc
  }, {})

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

      {/* Status / Score banners */}
      <div className="flex flex-wrap gap-3 items-center">
        {isSolving && (
          <div className="flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            {status === SolverStatus.SOLVING_SCHEDULED ? "Solving scheduled…" : "Solving in progress…"}
          </div>
        )}
        {solution.score && (
          <div className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium border",
            parsedScore && parsedScore.hard < 0
              ? "bg-red-500/15 text-red-400 border-red-500/30"
              : "bg-green-500/15 text-green-400 border-green-500/30"
          )}>
            {parsedScore && parsedScore.hard < 0 ? "❌" : "✅"}
            <span>Score: {parsedScore ? `${parsedScore.hard} hard / ${parsedScore.soft} soft` : solution.score}</span>
            {parsedScore && parsedScore.hard < 0 && (
              <span className="text-red-300">(Hard constraint violated!)</span>
            )}
            {parsedScore && parsedScore.hard === 0 && parsedScore.soft < 0 && (
              <span className="text-yellow-400">({Math.abs(parsedScore.soft)} soft penalties)</span>
            )}
          </div>
        )}
        {!solution.fullyAssigned && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-400">
            <AlertTriangle className="h-4 w-4" />
            Not all lessons could be assigned
          </div>
        )}
      </div>

      {/* ── Calendar grid ──────────────────────────────────────────────────── */}
      {solution.lessons.length > 0 ? (
        <div className="rounded-xl border border-white/10 bg-slate-900/60 backdrop-blur overflow-hidden">

          {/* Scrollable area — same constraints as TimeslotsPage */}
          <div className="overflow-y-auto max-h-[680px] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full">

              {/* Sticky day-header row */}
              <div
                className="grid border-b border-white/10 sticky top-0 z-30 bg-slate-900"
                style={{ gridTemplateColumns: `${TIME_COL_W}px repeat(${gridDays.length}, 1fr)` }}
              >
                <div className="h-11" />
                {gridDays.map(day => (
                  <div
                    key={day}
                    className={cn(
                      "h-11 flex items-center justify-center text-xs font-semibold tracking-wider uppercase border-l border-white/10",
                      day === DayOfWeek.SATURDAY || day === DayOfWeek.SUNDAY
                        ? "text-violet-400"
                        : "text-slate-300"
                    )}
                  >
                    {DAY_LABEL[day]}
                  </div>
                ))}
              </div>

              {/* Grid body */}
              <div className="relative" style={{ height: TOTAL_ROWS * ROW_HEIGHT_PX }}>

                {/* Background layer: time labels + horizontal dividers */}
                <div
                  className="absolute inset-0 pointer-events-none grid"
                  style={{ gridTemplateColumns: `${TIME_COL_W}px repeat(${gridDays.length}, 1fr)` }}
                >
                  <div className="relative">
                    {timeBoundaries.map((min, i) =>
                      min % 60 === 0 ? (
                        <div
                          key={min}
                          className="absolute right-3 text-[10px] text-slate-500 leading-none -translate-y-1/2 select-none"
                          style={{ top: i * ROW_HEIGHT_PX }}
                        >
                          {toTimeStr(min)}
                        </div>
                      ) : null
                    )}
                  </div>
                  {gridDays.map(day => (
                    <div key={day} className="border-l border-white/5">
                      {timeLabels.map((min, i) => (
                        <div
                          key={i}
                          className={cn("border-b", min % 60 === 0 ? "border-white/10" : "border-white/4")}
                          style={{ height: ROW_HEIGHT_PX }}
                        />
                      ))}
                    </div>
                  ))}
                </div>

                {/* Lesson blocks layer */}
                <div
                  className="absolute inset-0 grid pointer-events-none"
                  style={{ gridTemplateColumns: `${TIME_COL_W}px repeat(${gridDays.length}, 1fr)` }}
                >
                  <div />
                  {gridDays.map(day => (
                    <div key={day} className="relative pointer-events-auto">
                      {(lessonsByDay[day] ?? []).map(lesson => {
                        const startMin = toMinutes(lesson.timeslot!.startTime)
                        const endMin   = toMinutes(lesson.timeslot!.endTime)
                        const topPx    = (startMin - GRID_START_MIN) / ROW_MINUTES * ROW_HEIGHT_PX
                        const heightPx = (endMin   - startMin)       / ROW_MINUTES * ROW_HEIGHT_PX
                        return (
                          <LessonBlock
                            key={lesson.id}
                            lesson={lesson}
                            topPx={topPx}
                            heightPx={heightPx}
                          />
                        )
                      })}
                    </div>
                  ))}
                </div>

              </div>

          </div>{/* /Scrollable area */}

          {/* Legend */}
          <div className="border-t border-white/10 px-4 py-2.5 flex items-center gap-4 flex-wrap bg-slate-900/80">
            <span className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">Legend:</span>
            {Object.entries(LEVEL_STYLE).map(([level, cls]) => (
              <span key={level} className={cn("rounded border px-2 py-0.5 text-[10px] font-bold", cls)}>
                {level.replace("_", " ")}
              </span>
            ))}
            <span className="rounded border px-2 py-0.5 text-[10px] font-bold bg-purple-500/20 text-purple-300 border-purple-500/30">
              P — Private
            </span>
            <span className="flex items-center gap-1 text-[10px] text-amber-400">
              <Pin className="h-2.5 w-2.5" /> Pinned
            </span>
          </div>

        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No assigned lessons in the solution.
          </CardContent>
        </Card>
      )}

      {/* Unassigned lessons */}
      {unassigned.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-amber-400 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Unassigned Lessons ({unassigned.length})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {unassigned.map(lesson => {
              const subject = lesson.danceGroup?.name ?? lesson.student?.fullName ?? "Private"
              return (
                <div
                  key={lesson.id}
                  className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs space-y-1.5"
                >
                  <p className="font-semibold text-white/80 truncate">{subject}</p>
                  <p className="font-medium truncate" style={{ color: lesson.teacher.colorCode }}>
                    {lesson.teacher.fullName}
                  </p>
                  <p className="text-muted-foreground">{lesson.durationMinutes} min</p>
                  <div className="flex gap-1 flex-wrap">
                    {!lesson.timeslot && (
                      <span className="rounded bg-red-500/20 text-red-400 border border-red-500/30 px-1 py-px">No slot</span>
                    )}
                    {!lesson.room && (
                      <span className="rounded bg-red-500/20 text-red-400 border border-red-500/30 px-1 py-px">No room</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
