// src_front/components/weekly-timetable.tsx
import { useEffect, useMemo, useState } from "react"
import { addWeeks, endOfWeek, format, isWithinInterval, parseISO, startOfWeek } from "date-fns"
import { cn } from "@/lib/utils"
import { EventCard } from "./event-card.tsx"
import { Button } from "@/components/ui/button"
import { scheduleApi } from "@/api/scheduleApi"
import { solverApi } from "@/api/solverApi"
import type { ScheduleMetadataDTO, ScheduledLessonDTO } from "@/types/schedule"
import { MapPin, Clock, CalendarDays, X, LayoutGrid, Calendar } from "lucide-react"


export interface ScheduledEvent {
  id: string
  title: string
  instructor: string
  instructorId: number
  instructorColor: string
  room: string
  startTime: string
  endTime: string
  day: number
  level?: string
  isPrivate?: boolean
  isPinned?: boolean
  targetAgeRange?: string | null
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
const TIME_SLOTS = [
  "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"
]

const DAY_TO_INDEX: Record<string, number> = {
  MONDAY: 0, TUESDAY: 1, WEDNESDAY: 2, THURSDAY: 3, FRIDAY: 4, SATURDAY: 5, SUNDAY: 6,
}

function mapLessonToEvent(lesson: ScheduledLessonDTO): ScheduledEvent | null {
  if (!lesson.timeslot || !lesson.room) return null

  const day = DAY_TO_INDEX[lesson.timeslot.dayOfWeek]
  if (day === undefined) return null

  // Private lessons have no danceGroup — use student fullName or fallback as title
  const title = lesson.danceGroup?.name
    ?? lesson.student?.fullName
    ?? "Private Lesson"

  return {
    id: lesson.id.toString(),
    title,
    instructor: lesson.teacher.fullName,
    instructorId: lesson.teacher.id,
    instructorColor: lesson.teacher.colorCode || "#9ca3af",
    room: lesson.room.name,
    startTime: lesson.timeslot.startTime.slice(0, 5),
    endTime: lesson.timeslot.endTime.slice(0, 5),
    day,
    level: lesson.danceGroup?.danceLevel,
    isPrivate: lesson.isPrivate,
    isPinned: lesson.isPinned,
    targetAgeRange: lesson.danceGroup?.targetAgeRange,
  }
}

function formatWeekRange(weekStart: Date) {
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
  return `${format(weekStart, "dd MMM")} - ${format(weekEnd, "dd MMM yyyy")}`
}

function findScheduleForWeek(weekStart: Date, schedules: ScheduleMetadataDTO[]) {
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
  return schedules.find((schedule) => {
    const scheduleStart = parseISO(schedule.validFrom)
    const scheduleEnd = parseISO(schedule.validTo)
    return (
        isWithinInterval(weekStart, { start: scheduleStart, end: scheduleEnd }) ||
        isWithinInterval(weekEnd, { start: scheduleStart, end: scheduleEnd })
    )
  })
}

export function WeeklyTimetable({mobileOnly}: {mobileOnly?: boolean}) {
  const [selectedWeekStart, setSelectedWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [selectedEvent, setSelectedEvent] = useState<ScheduledEvent | null>(null)

  // Переключатель между видами "table" и "classic" (оригинальный вид)
  const [viewMode, setViewMode] = useState<"table" | "classic">("table")

  const [filter, setFilter] = useState<number | "all">("all")
  const [events, setEvents] = useState<ScheduledEvent[]>([])
  const [activeSchedule, setActiveSchedule] = useState<ScheduleMetadataDTO | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Tracks whether any schedules exist at all (vs. none for the selected week)
  const [hasAnySchedules, setHasAnySchedules] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadWeek() {
      setIsLoading(true)
      setError(null)
      setSelectedEvent(null)

      try {
        // GET /api/schedules returns only PUBLISHED schedules for all roles —
        // no client-side filtering needed.
        const publishedSchedules = await scheduleApi.getAll()

        // Inform the UI whether there are any published schedules at all
        if (!cancelled) setHasAnySchedules(publishedSchedules.length > 0)

        const scheduleForWeek = findScheduleForWeek(selectedWeekStart, publishedSchedules)

        if (!scheduleForWeek) {
          if (!cancelled) {
            setEvents([])
            setActiveSchedule(null)
          }
          return
        }

        const solution = await solverApi.getSolution(scheduleForWeek.id)
        const mappedEvents = solution.lessons
            .map((lesson) => mapLessonToEvent(lesson))
            .filter((event): event is ScheduledEvent => event !== null)

        if (!cancelled) {
          setEvents(mappedEvents)
          setActiveSchedule(scheduleForWeek)
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : "Failed to load schedule")
          setEvents([])
          setActiveSchedule(null)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadWeek()

    return () => {
      cancelled = true
    }
  }, [selectedWeekStart])

  const filteredEvents = useMemo(
      () => (filter === "all" ? events : events.filter((event) => event.instructorId === filter)),
      [events, filter],
  )

  const uniqueTeachers = useMemo(() => {
    const map = new Map<number, { id: number, name: string, color: string }>()
    events.forEach(e => {
      if (!map.has(e.instructorId)) {
        map.set(e.instructorId, { id: e.instructorId, name: e.instructor, color: e.instructorColor })
      }
    })
    return Array.from(map.values())
  }, [events])

  const timeBlocks = useMemo(() => {
    const blocks = new Map<string, { start: string, end: string }>()
    events.forEach(e => {
      const key = `${e.startTime}-${e.endTime}`
      if (!blocks.has(key)) blocks.set(key, { start: e.startTime, end: e.endTime })
    })

    return Array.from(blocks.values()).sort((a, b) => a.start.localeCompare(b.start))
  }, [events])

  const goToPreviousWeek = () => setSelectedWeekStart((prev) => addWeeks(prev, -1))
  const goToNextWeek = () => setSelectedWeekStart((prev) => addWeeks(prev, 1))
  const goToCurrentWeek = () => setSelectedWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const handleWeekInputChange = (value: string) => {
    if (!value) return
    setSelectedWeekStart(startOfWeek(parseISO(value), { weekStartsOn: 1 }))
  }

  const getEventsForDay = (dayIndex: number) => {
    return filteredEvents.filter((event) => event.day === dayIndex)
  }

  // Расчет позиции для Классического вида (Абсолютное позиционирование)
  const getEventPosition = (event: ScheduledEvent) => {
    const startHour = Number.parseInt(event.startTime.split(":")[0])
    const endHour = Number.parseInt(event.endTime.split(":")[0])
    const startMinutes = Number.parseInt(event.startTime.split(":")[1])
    const endMinutes = Number.parseInt(event.endTime.split(":")[1])

    const startOffset = (startHour - 9) * 64 + (startMinutes / 60) * 64
    const duration = (endHour - startHour) * 64 + ((endMinutes - startMinutes) / 60) * 64

    return { top: startOffset, height: Math.max(duration, 64) }
  }

  return (
      <div className="space-y-6 select-none text-left">
        {/* Шапка календаря */}
        <div className="flex flex-col xl:flex-row items-center justify-between gap-4 rounded-lg border border-border bg-card p-3">

          <div className="flex flex-col md:flex-row items-center gap-4 w-full xl:w-auto">
            <div className="shrink-0">
              <p className="text-sm font-semibold text-card-foreground">Week: {formatWeekRange(selectedWeekStart)}</p>
              <p className="text-xs text-muted-foreground">
                {activeSchedule
                    ? `Schedule: ${activeSchedule.name}`
                    : "No schedule is available"}
              </p>
            </div>

            <div className="hidden md:block h-8 w-px bg-border"></div>

            {/* Легенда учителей */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                  onClick={() => setFilter("all")}
                  className={cn(
                      "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                      filter === "all" ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card text-muted-foreground hover:bg-muted"
                  )}
              >
                All Teachers
              </button>
              {uniqueTeachers.map(t => (
                  <button
                      key={t.id}
                      onClick={() => setFilter(t.id)}
                      className={cn(
                          "rounded-full border px-3 py-1 text-xs font-semibold transition-colors flex items-center gap-1.5",
                          filter === t.id ? "border-transparent shadow-sm" : "border-border bg-card hover:bg-muted text-muted-foreground"
                      )}
                      style={filter === t.id ? { backgroundColor: t.color, color: "#fff" } : {}}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }}></span>
                    {t.name}
                  </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 w-full xl:w-auto">
            {/* ПЕРЕКЛЮЧАТЕЛЬ ВИДОВ */}
            <div className="hidden lg:flex items-center gap-1 mr-2 bg-muted/30 p-1 rounded-md border border-border">
              <button
                  onClick={() => setViewMode("table")}
                  className={cn("px-2.5 py-1.5 text-xs font-medium rounded-sm flex items-center gap-1.5 transition-all", viewMode === 'table' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}
                  title="Table View (Sockets)"
              >
                <LayoutGrid className="h-3.5 w-3.5" /> Table
              </button>
              <button
                  onClick={() => setViewMode("classic")}
                  className={cn("px-2.5 py-1.5 text-xs font-medium rounded-sm flex items-center gap-1.5 transition-all", viewMode === 'classic' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}
                  title="Classic Grid View"
              >
                <Calendar className="h-3.5 w-3.5" /> Classic
              </button>
            </div>

            <Button type="button" variant="outline" size="sm" onClick={goToPreviousWeek}>
              Prev week
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={goToCurrentWeek}>
              Current week
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={goToNextWeek}>
              Next week
            </Button>
            <input
                type="date"
                className="h-8 rounded-md border border-border bg-background px-2 text-sm text-foreground"
                value={format(selectedWeekStart, "yyyy-MM-dd")}
                onChange={(event) => handleWeekInputChange(event.target.value)}
            />
          </div>
        </div>

        {isLoading && (
            <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground text-center">
              Loading timetable...
            </div>
        )}

        {!isLoading && error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
        )}

        {!isLoading && !error && filteredEvents.length === 0 && (
            <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
              {hasAnySchedules
                ? "No classes planned for this week."
                : "No published schedules available for this week."}
            </div>
        )}

        {/* Mobile View */}
        <div className={`block ${mobileOnly ? '' : 'lg:hidden'} ${isLoading || error ? 'hidden' : ''}`}>
          <div className="space-y-4">
            {DAYS.map((day, dayIndex) => {
              const dayEvents = getEventsForDay(dayIndex)
              if (dayEvents.length === 0) return null

              return (
                  <div key={day} className="rounded-lg border border-border bg-card p-4">
                    <h3 className="mb-3 font-semibold text-card-foreground">{day}</h3>
                    <div className="space-y-2">
                      {dayEvents
                          .sort((a, b) => a.startTime.localeCompare(b.startTime))
                          .map((event) => (
                              <EventCard
                                  key={event.id}
                                  event={event}
                                  onClick={() => setSelectedEvent(event)}
                                  isSelected={selectedEvent?.id === event.id}
                                  variant="mobile"
                              />
                          ))}
                    </div>
                  </div>
              )
            })}
          </div>
        </div>

        {/* ДЕСКТОП: ТАБЛИЦА (Новый вид - Секции) */}
        {viewMode === "table" && (
            <div className={`hidden ${mobileOnly ? 'hidden' : 'lg:block'} overflow-x-auto ${isLoading || error ? 'hidden' : ''} pb-6 fade-in-0 animate-in`}>
              <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
                <table className="w-full text-sm border-collapse min-w-[1000px]">
                  <thead>
                  <tr className="bg-muted/30">
                    <th className="p-3 text-left text-muted-foreground font-medium border-b border-r border-border w-[100px]">
                      Time
                    </th>
                    {DAYS.map((day) => (
                        <th key={day} className="p-3 text-center text-foreground font-medium border-b border-r border-border min-w-[150px] last:border-r-0">
                          {day}
                        </th>
                    ))}
                  </tr>
                  </thead>
                  <tbody>
                  {timeBlocks.length > 0 ? (
                      timeBlocks.map((block) => (
                          <tr key={`${block.start}-${block.end}`} className="border-b border-border last:border-b-0">
                            <td className="p-3 border-r border-border text-muted-foreground font-mono text-xs align-top bg-muted/5">
                              <div className="font-medium text-foreground">{block.start}</div>
                              <div className="opacity-70">-{block.end}</div>
                            </td>
                            {DAYS.map((day, dayIndex) => {
                              const cellEvents = getEventsForDay(dayIndex).filter(
                                  (e) => e.startTime === block.start && e.endTime === block.end
                              )
                              return (
                                  <td key={day} className="p-2 border-r border-border last:border-r-0 align-top">
                                    {cellEvents.length > 0 ? (
                                        <div className="flex flex-col gap-2">
                                          {cellEvents.map((event) => (
                                              <EventCard
                                                  key={event.id}
                                                  event={event}
                                                  onClick={() => setSelectedEvent(event)}
                                                  isSelected={selectedEvent?.id === event.id}
                                                  variant="grid"
                                              />
                                          ))}
                                        </div>
                                    ) : (
                                        <div className="min-h-[80px]" />
                                    )}
                                  </td>
                              )
                            })}
                          </tr>
                      ))
                  ) : (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-muted-foreground">
                          No classes scheduled for this week.
                        </td>
                      </tr>
                  )}
                  </tbody>
                </table>
              </div>
            </div>
        )}

        {/* ДЕСКТОП: КЛАССИЧЕСКИЙ ВИД (Старый оригинальный фон и абсолютное позиционирование) */}
        {viewMode === "classic" && (
            <div className={`hidden ${mobileOnly ? 'hidden' : 'lg:block'} overflow-x-auto ${isLoading || error ? 'hidden' : ''} pb-6 fade-in-0 animate-in`}>
              <div className="min-w-[1000px] border border-border/50 rounded-lg overflow-hidden bg-background">

                {/* Заголовок: Пустой угол слева, Дни недели сверху */}
                <div className="flex bg-muted/20 border-b border-border/50">
                  <div className="w-[80px] shrink-0 border-r border-border/50" />
                  <div className="flex-1 grid grid-cols-7">
                    {DAYS.map((day) => (
                        <div key={day} className="p-3 text-center text-sm font-medium text-foreground border-r border-border/50 last:border-r-0">
                          {day}
                        </div>
                    ))}
                  </div>
                </div>

                {/* Сетка: Время слева, Колонки дней с уроками */}
                <div className="flex">
                  {/* Колонка времени */}
                  <div className="w-[80px] shrink-0 border-r border-border/50 bg-muted/5">
                    {TIME_SLOTS.map((time) => (
                        <div key={time} className="h-16 border-b border-border/30 pr-3 text-right text-xs font-mono text-muted-foreground flex items-start justify-end pt-2">
                          {time}
                        </div>
                    ))}
                  </div>

                  {/* Колонки дней */}
                  <div className="flex-1 grid grid-cols-7">
                    {DAYS.map((day, dayIndex) => {
                      const dayEvents = getEventsForDay(dayIndex)

                      return (
                          <div key={day} className="relative border-r border-border/50 last:border-r-0">
                            {/* Линии сетки часов (тонкие, прозрачные) */}
                            {TIME_SLOTS.map((time) => (
                                <div key={time} className="h-16 border-b border-border/20" />
                            ))}

                            {/* Уроки (Абсолютное позиционирование) */}
                            {Object.values(
                                dayEvents.reduce((acc, event) => {
                                  const key = `${event.startTime}-${event.endTime}`
                                  if (!acc[key]) acc[key] = []
                                  acc[key].push(event)
                                  return acc
                                }, {} as Record<string, ScheduledEvent[]>)
                            ).map((eventGroup) => {
                              const firstEvent = eventGroup[0]
                              const { top, height } = getEventPosition(firstEvent)

                              return (
                                  <div
                                      key={`group-${firstEvent.id}`}
                                      className="absolute left-1 right-1 flex gap-1 z-10"
                                      style={{ top: `${top}px`, height: `${height}px` }}
                                  >
                                    {eventGroup.map((event) => (
                                        <div key={event.id} className="flex-1 min-w-0 h-full">
                                          <EventCard
                                              event={event}
                                              onClick={() => setSelectedEvent(event)}
                                              isSelected={selectedEvent?.id === event.id}
                                              variant="grid"
                                          />
                                        </div>
                                    ))}
                                  </div>
                              )
                            })}
                          </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
        )}

        {/* Модальное окно */}
        {selectedEvent && (
            <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
                onClick={() => setSelectedEvent(null)}
            >
              <div
                  className="w-full max-w-sm overflow-hidden rounded-xl border border-border/50 bg-card shadow-2xl animate-in zoom-in-95 duration-200"
                  onClick={(e) => e.stopPropagation()}
              >
                <div
                    className="relative px-6 pt-6 pb-4"
                    style={{ backgroundColor: `${selectedEvent.instructorColor}1A` }} // 10% opacity
                >
                  <div className="flex items-start justify-between">
                    <div>
                  <span
                      className="inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest"
                      style={{
                        backgroundColor: `${selectedEvent.instructorColor}33`, // 20% opacity
                        color: selectedEvent.instructorColor
                      }}
                  >
                    {selectedEvent.instructor}
                  </span>
                      {selectedEvent.level && (
                          <span className="ml-2 inline-block rounded-full bg-background/50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-foreground">
                      {selectedEvent.level}
                    </span>
                      )}
                      {selectedEvent.targetAgeRange && (
                          <span className="ml-2 inline-block rounded-full border border-border bg-background/80 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-foreground">
                      {selectedEvent.targetAgeRange}
                    </span>
                      )}
                      <h2 className="mt-3 text-2xl font-bold text-foreground leading-tight">{selectedEvent.title}</h2>
                    </div>
                    <button
                        onClick={() => setSelectedEvent(null)}
                        className="rounded-full p-1.5 text-muted-foreground hover:bg-background/50 hover:text-foreground transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="p-6 space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted border border-border">
                  <span className="text-sm font-bold text-muted-foreground">
                    {selectedEvent.instructor.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                  </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{selectedEvent.instructor}</p>
                      <p className="text-xs text-muted-foreground">Instructor</p>
                    </div>
                  </div>

                  <div className="h-px w-full bg-border/50" />

                  <div className="space-y-3.5">
                    <div className="flex items-center gap-3 text-sm text-foreground">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground">
                        <CalendarDays className="h-4 w-4" />
                      </div>
                      <span className="font-medium">{DAYS[selectedEvent.day]}</span>
                    </div>

                    <div className="flex items-center gap-3 text-sm text-foreground">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                      </div>
                      <span className="font-medium">{selectedEvent.startTime} - {selectedEvent.endTime}</span>
                    </div>

                    <div className="flex items-center gap-3 text-sm text-foreground">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                      </div>
                      <span className="font-medium">{selectedEvent.room}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
        )}
      </div>
  )
}