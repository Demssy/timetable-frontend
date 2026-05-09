import { useCallback, useEffect, useRef, useState } from "react"
import { lessonApi, cancelScheduledLesson, restoreScheduledLesson } from "@/api/lessonApi"
import { DayOfWeek, UserRole } from "@/types/enums"
import type { ScheduledLessonDTO } from "@/types/schedule"
import type { DayOfWeek as DayOfWeekType } from "@/types/enums"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_ORDER: DayOfWeekType[] = [
  DayOfWeek.MONDAY,
  DayOfWeek.TUESDAY,
  DayOfWeek.WEDNESDAY,
  DayOfWeek.THURSDAY,
  DayOfWeek.FRIDAY,
  DayOfWeek.SATURDAY,
  DayOfWeek.SUNDAY,
]

const DAY_LABELS: Record<DayOfWeekType, string> = {
  MONDAY: "Mon",
  TUESDAY: "Tue",
  WEDNESDAY: "Wed",
  THURSDAY: "Thu",
  FRIDAY: "Fri",
  SATURDAY: "Sat",
  SUNDAY: "Sun",
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(time: string): string {
  return time.slice(0, 5) // "HH:mm:ss" → "HH:mm"
}

function formatDateTime(isoString: string): string {
  try {
    return new Date(isoString).toLocaleString()
  } catch {
    return isoString
  }
}

// ─── Cancel Dialog ────────────────────────────────────────────────────────────

interface CancelDialogProps {
  lesson: ScheduledLessonDTO
  onConfirm: (reason: string) => void
  onClose: () => void
  isLoading: boolean
}

function CancelDialog({ lesson, onConfirm, onClose, isLoading }: CancelDialogProps) {
  const [reason, setReason] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose()
    if (e.key === "Enter" && !isLoading) onConfirm(reason.trim())
  }

  const timeslot = lesson.timeslot
  const timeLabel = timeslot
    ? `${DAY_LABELS[timeslot.dayOfWeek]} ${formatTime(timeslot.startTime)}–${formatTime(timeslot.endTime)}`
    : "unscheduled"

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-slate-800 border border-slate-700 p-6 shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <h2 className="text-lg font-semibold text-white">Cancel Lesson</h2>
        <p className="text-slate-400 text-sm">
          You are about to cancel{" "}
          <span className="text-white font-medium">
            {lesson.teacher.fullName} · {timeLabel}
          </span>
          . This action can be undone by an admin.
        </p>

        <label className="block text-sm text-slate-300">
          Reason <span className="text-slate-500">(optional)</span>
          <input
            ref={inputRef}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Teacher is sick"
            className="mt-1 w-full rounded-lg bg-slate-700 border border-slate-600 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </label>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Keep lesson
          </Button>
          <Button
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={() => onConfirm(reason.trim())}
            disabled={isLoading}
          >
            {isLoading ? "Cancelling…" : "Cancel lesson"}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Lesson Card ──────────────────────────────────────────────────────────────

interface LessonCardProps {
  lesson: ScheduledLessonDTO
  isTeacher: boolean
  isAdmin: boolean
  currentUserId?: number
  onCancel: (lesson: ScheduledLessonDTO) => void
  onRestore: (lesson: ScheduledLessonDTO) => void
  actionLoadingId: number | null
}

function LessonCard({
  lesson,
  isTeacher,
  isAdmin,
  currentUserId,
  onCancel,
  onRestore,
  actionLoadingId,
}: LessonCardProps) {
  const { timeslot, teacher, danceGroup, student, isPrivate, isCancelled, cancelledAt, cancelReason } = lesson

  if (!timeslot) return null

  const timeRange = `${formatTime(timeslot.startTime)} – ${formatTime(timeslot.endTime)}`
  const lessonType = isPrivate ? "Individual" : `Group: ${danceGroup?.name ?? "—"}`
  const participantLine =
    isTeacher || isAdmin
      ? isPrivate
        ? student?.fullName ?? "—"
        : danceGroup?.name ?? "—"
      : null

  const canCancel =
    !isCancelled && (isAdmin || (isTeacher && teacher.id === currentUserId))
  const canRestore = isCancelled && isAdmin
  const isActing = actionLoadingId === lesson.id

  return (
    <div
      className={cn(
        "rounded-lg border border-slate-700 bg-slate-800 p-3 text-sm space-y-1 transition-opacity",
        isCancelled && "opacity-50",
      )}
    >
      {isCancelled && (
        <span className="inline-block rounded-full bg-red-700 px-2 py-0.5 text-xs font-semibold text-white">
          Cancelled
        </span>
      )}

      <p className={cn("font-semibold text-white", isCancelled && "line-through")}>{timeRange}</p>
      <p className={cn("text-slate-300", isCancelled && "line-through")}>{lessonType}</p>
      <p className="text-slate-400">Teacher: {teacher.fullName}</p>

      {participantLine && (
        <p className="text-slate-400">
          {isPrivate ? "Student" : "Group"}: {participantLine}
        </p>
      )}

      {isCancelled && (
        <div className="mt-1 space-y-0.5 text-xs text-slate-500">
          {cancelReason && <p>Reason: {cancelReason}</p>}
          {cancelledAt && <p>At: {formatDateTime(cancelledAt)}</p>}
        </div>
      )}

      {canCancel && (
        <Button
          size="sm"
          variant="outline"
          className="mt-2 w-full border-red-700 text-red-400 hover:bg-red-900/30 text-xs"
          disabled={isActing}
          onClick={() => onCancel(lesson)}
        >
          {isActing ? "Cancelling…" : "Cancel lesson"}
        </Button>
      )}

      {canRestore && (
        <Button
          size="sm"
          variant="outline"
          className="mt-2 w-full border-green-700 text-green-400 hover:bg-green-900/30 text-xs"
          disabled={isActing}
          onClick={() => onRestore(lesson)}
        >
          {isActing ? "Restoring…" : "Restore"}
        </Button>
      )}
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export function MySchedulePage() {
  const { user } = useAuth()
  const [lessons, setLessons] = useState<ScheduledLessonDTO[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [cancelTarget, setCancelTarget] = useState<ScheduledLessonDTO | null>(null)
  const [cancelActionLoading, setCancelActionLoading] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null)
  const [showCancelled, setShowCancelled] = useState(true)

  const isTeacher = user?.role === UserRole.TEACHER
  const isAdmin = user?.role === UserRole.ADMIN

  useEffect(() => {
    let aborted = false
    setIsLoading(true)
    setError(null)

    lessonApi
      .getMySchedule()
      .then((data: ScheduledLessonDTO[]) => {
        if (!aborted) setLessons(data)
      })
      .catch((err: unknown) => {
        if (!aborted) setError(err instanceof Error ? err.message : "Failed to load schedule")
      })
      .finally(() => {
        if (!aborted) setIsLoading(false)
      })

    return () => {
      aborted = true
    }
  }, [])

  const handleConfirmCancel = useCallback(
    async (reason: string) => {
      if (!cancelTarget) return
      setCancelActionLoading(true)
      try {
        const updated = await cancelScheduledLesson(cancelTarget.id, reason || undefined)
        setLessons((prev) => prev.map((l) => (l.id === updated.id ? updated : l)))
        setCancelTarget(null)
      } catch (err) {
        alert(err instanceof Error ? err.message : "Failed to cancel lesson")
      } finally {
        setCancelActionLoading(false)
      }
    },
    [cancelTarget],
  )

  const handleRestore = useCallback(async (lesson: ScheduledLessonDTO) => {
    setActionLoadingId(lesson.id)
    try {
      const updated = await restoreScheduledLesson(lesson.id)
      setLessons((prev) => prev.map((l) => (l.id === updated.id ? updated : l)))
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to restore lesson")
    } finally {
      setActionLoadingId(null)
    }
  }, [])

  const visibleLessons = showCancelled ? lessons : lessons.filter((l) => !l.isCancelled)

  const lessonsByDay = DAY_ORDER.reduce<Record<DayOfWeekType, ScheduledLessonDTO[]>>(
    (acc, day) => {
      acc[day] = visibleLessons
        .filter((l) => l.timeslot?.dayOfWeek === day)
        .sort((a, b) => (a.timeslot!.startTime > b.timeslot!.startTime ? 1 : -1))
      return acc
    },
    {} as Record<DayOfWeekType, ScheduledLessonDTO[]>,
  )

  const cancelledCount = lessons.filter((l) => l.isCancelled).length

  return (
    <div className="space-y-6 w-full max-w-[1400px] mx-auto px-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-white">My Lessons</h1>
          <p className="text-slate-400 mt-1">Your personal weekly schedule</p>
        </div>

        {cancelledCount > 0 && (
          <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-slate-300">
            <input
              type="checkbox"
              className="accent-indigo-500 h-4 w-4"
              checked={showCancelled}
              onChange={(e) => setShowCancelled(e.target.checked)}
            />
            Show cancelled lessons
            <span className="rounded-full bg-red-700 px-2 py-0.5 text-xs font-semibold text-white">
              {cancelledCount}
            </span>
          </label>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-600 border-t-indigo-500" />
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-900/40 border border-red-700 p-4 text-red-300">
          {error}
        </div>
      )}

      {!isLoading && !error && lessons.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-2">
          <p className="text-xl font-medium">Schedule not published yet</p>
          <p className="text-sm">Check back later — the admin has not assigned lessons yet</p>
        </div>
      )}

      {!isLoading && !error && lessons.length > 0 && (
        <div className="grid grid-cols-7 gap-3">
          {DAY_ORDER.map((day) => (
            <div key={day} className="flex flex-col gap-2">
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="pb-1 pt-3 px-3">
                  <CardTitle className="text-center text-slate-200 text-sm font-semibold tracking-wide">
                    {DAY_LABELS[day]}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-2 pb-3 space-y-2">
                  {lessonsByDay[day].length === 0 ? (
                    <p className="text-center text-slate-600 text-xs py-2">—</p>
                  ) : (
                    lessonsByDay[day].map((lesson) => (
                      <LessonCard
                        key={lesson.id}
                        lesson={lesson}
                        isTeacher={isTeacher}
                        isAdmin={isAdmin}
                        currentUserId={user?.id}
                        onCancel={setCancelTarget}
                        onRestore={handleRestore}
                        actionLoadingId={
                          cancelActionLoading && cancelTarget?.id === lesson.id
                            ? lesson.id
                            : actionLoadingId
                        }
                      />
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}

      {cancelTarget && (
        <CancelDialog
          lesson={cancelTarget}
          onConfirm={handleConfirmCancel}
          onClose={() => setCancelTarget(null)}
          isLoading={cancelActionLoading}
        />
      )}
    </div>
  )
}
