"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { EventCard } from "./event-card.tsx"
import { ClassLegend } from "./class-legend.tsx"

export type DanceClass = "ballet" | "hiphop" | "contemporary" | "jazz" | "salsa"

export interface ScheduledEvent {
  id: string
  title: string
  instructor: string
  room: string
  startTime: string
  endTime: string
  day: number
  type: DanceClass
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
const TIME_SLOTS = [
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
]

const SAMPLE_EVENTS: ScheduledEvent[] = [
  {
    id: "1",
    title: "Ballet Basics",
    instructor: "Maria Santos",
    room: "Studio A",
    startTime: "09:00",
    endTime: "10:30",
    day: 0,
    type: "ballet",
  },
  {
    id: "2",
    title: "Hip Hop Crew",
    instructor: "Marcus Chen",
    room: "Studio B",
    startTime: "10:00",
    endTime: "11:30",
    day: 0,
    type: "hiphop",
  },
  {
    id: "3",
    title: "Contemporary Flow",
    instructor: "Elena Volkov",
    room: "Studio A",
    startTime: "14:00",
    endTime: "15:30",
    day: 0,
    type: "contemporary",
  },
  {
    id: "4",
    title: "Jazz Fusion",
    instructor: "James Wilson",
    room: "Studio C",
    startTime: "11:00",
    endTime: "12:00",
    day: 1,
    type: "jazz",
  },
  {
    id: "5",
    title: "Salsa Beginners",
    instructor: "Carlos Rivera",
    room: "Studio B",
    startTime: "18:00",
    endTime: "19:30",
    day: 1,
    type: "salsa",
  },
  {
    id: "6",
    title: "Ballet Intermediate",
    instructor: "Maria Santos",
    room: "Studio A",
    startTime: "09:00",
    endTime: "10:30",
    day: 2,
    type: "ballet",
  },
  {
    id: "7",
    title: "Hip Hop Foundations",
    instructor: "Marcus Chen",
    room: "Studio B",
    startTime: "15:00",
    endTime: "16:30",
    day: 2,
    type: "hiphop",
  },
  {
    id: "8",
    title: "Contemporary Expression",
    instructor: "Elena Volkov",
    room: "Studio A",
    startTime: "17:00",
    endTime: "18:30",
    day: 3,
    type: "contemporary",
  },
  {
    id: "9",
    title: "Jazz Technique",
    instructor: "James Wilson",
    room: "Studio C",
    startTime: "10:00",
    endTime: "11:00",
    day: 3,
    type: "jazz",
  },
  {
    id: "10",
    title: "Salsa Intermediate",
    instructor: "Carlos Rivera",
    room: "Studio B",
    startTime: "19:00",
    endTime: "20:30",
    day: 4,
    type: "salsa",
  },
  {
    id: "11",
    title: "Ballet Advanced",
    instructor: "Maria Santos",
    room: "Studio A",
    startTime: "10:00",
    endTime: "12:00",
    day: 5,
    type: "ballet",
  },
  {
    id: "12",
    title: "Hip Hop Battle Prep",
    instructor: "Marcus Chen",
    room: "Studio B",
    startTime: "14:00",
    endTime: "16:00",
    day: 5,
    type: "hiphop",
  },
  {
    id: "13",
    title: "Open Contemporary",
    instructor: "Elena Volkov",
    room: "Studio A",
    startTime: "11:00",
    endTime: "12:30",
    day: 6,
    type: "contemporary",
  },
]

export function WeeklyTimetable({mobileOnly}: {mobileOnly?: boolean}) {
  const [selectedEvent, setSelectedEvent] = useState<ScheduledEvent | null>(null)
  const [filter, setFilter] = useState<DanceClass | "all">("all")

  const filteredEvents = filter === "all" ? SAMPLE_EVENTS : SAMPLE_EVENTS.filter((event) => event.type === filter)

  const getEventsForDay = (dayIndex: number) => {
    return filteredEvents.filter((event) => event.day === dayIndex)
  }

  const getEventPosition = (event: ScheduledEvent) => {
    const startHour = Number.parseInt(event.startTime.split(":")[0])
    const endHour = Number.parseInt(event.endTime.split(":")[0])
    const startMinutes = Number.parseInt(event.startTime.split(":")[1])
    const endMinutes = Number.parseInt(event.endTime.split(":")[1])

    const startOffset = (startHour - 9) * 48 + (startMinutes / 60) * 48
    const duration = (endHour - startHour) * 48 + ((endMinutes - startMinutes) / 60) * 48

    return { top: startOffset, height: Math.max(duration, 48) }
  }

  return (
    <div className="space-y-6 select-none">
      <ClassLegend activeFilter={filter} onFilterChange={setFilter} />

      {/* Mobile View */}
      <div className={`block ${mobileOnly ? '' : 'lg:hidden'}`}>
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

      {/* Desktop View */}
      <div className={`hidden ${mobileOnly ? 'hidden' : 'lg:block'} overflow-x-auto`}>
        <div className="min-w-[1000px]">
          {/* Header */}
          <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-border">
            <div className="p-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">Time</div>
            {DAYS.map((day) => (
              <div key={day} className="border-l border-border p-3 text-center text-sm font-medium text-foreground">
                {day}
              </div>
            ))}
          </div>

          {/* Time Grid */}
          <div className="grid grid-cols-[80px_repeat(7,1fr)]">
            {/* Time Labels */}
            <div className="relative">
              {TIME_SLOTS.map((time) => (
                <div
                  key={time}
                  className="h-12 border-b border-border/50 pr-3 text-right text-xs font-mono text-muted-foreground"
                >
                  {time}
                </div>
              ))}
            </div>

            {/* Day Columns */}
            {DAYS.map((day, dayIndex) => (
              <div key={day} className="relative border-l border-border">
                {/* Grid lines */}
                {TIME_SLOTS.map((time) => (
                  <div key={time} className="h-12 border-b border-border/30" />
                ))}

                {/* Events */}
                {getEventsForDay(dayIndex).map((event) => {
                  const { top, height } = getEventPosition(event)
                  return (
                    <div
                      key={event.id}
                      className="absolute left-1 right-1"
                      style={{ top: `${top}px`, height: `${height}px` }}
                    >
                      <EventCard
                        event={event}
                        onClick={() => setSelectedEvent(event)}
                        isSelected={selectedEvent?.id === event.id}
                        variant="grid"
                      />
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="mx-4 w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <span
                  className={cn(
                    "inline-block rounded px-2 py-0.5 text-xs font-medium uppercase tracking-wider",
                    selectedEvent.type === "ballet" && "bg-ballet/20 text-ballet",
                    selectedEvent.type === "hiphop" && "bg-hiphop/20 text-hiphop",
                    selectedEvent.type === "contemporary" && "bg-contemporary/20 text-contemporary",
                    selectedEvent.type === "jazz" && "bg-jazz/20 text-jazz",
                    selectedEvent.type === "salsa" && "bg-salsa/20 text-salsa",
                  )}
                >
                  {selectedEvent.type.replace("hiphop", "hip hop")}
                </span>
                <h2 className="mt-2 text-xl font-semibold text-card-foreground">{selectedEvent.title}</h2>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center gap-3 text-muted-foreground">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>
                  {selectedEvent.startTime} - {selectedEvent.endTime}
                </span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                <span>{selectedEvent.instructor}</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span>{selectedEvent.room}</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span>{DAYS[selectedEvent.day]}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
