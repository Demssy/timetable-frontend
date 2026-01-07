"use client"

import { cn } from "@/lib/utils.ts"
import type { ScheduledEvent } from "@/components/weekly-timetable.tsx"

interface EventCardProps {
  event: ScheduledEvent
  onClick: () => void
  isSelected: boolean
  variant: "mobile" | "grid"
}

export function EventCard({ event, onClick, isSelected, variant }: EventCardProps) {
  const typeStyles = {
    ballet: "border-l-ballet bg-ballet/10 hover:bg-ballet/20",
    hiphop: "border-l-hiphop bg-hiphop/10 hover:bg-hiphop/20",
    contemporary: "border-l-contemporary bg-contemporary/10 hover:bg-contemporary/20",
    jazz: "border-l-jazz bg-jazz/10 hover:bg-jazz/20",
    salsa: "border-l-salsa bg-salsa/10 hover:bg-salsa/20",
  }

  const textStyles = {
    ballet: "text-ballet",
    hiphop: "text-hiphop",
    contemporary: "text-contemporary",
    jazz: "text-jazz",
    salsa: "text-salsa",
  }

  if (variant === "mobile") {
    return (
      <button
        onClick={onClick}
        className={cn(
          "w-full rounded-md border-l-4 p-3 text-left transition-all",
          typeStyles[event.type],
          isSelected && "ring-2 ring-ring",
        )}
      >
        <div className="flex items-center justify-between">
          <span className={cn("text-sm font-medium", textStyles[event.type])}>{event.title}</span>
          <span className="text-xs font-mono text-muted-foreground">
            {event.startTime} - {event.endTime}
          </span>
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          {event.instructor} • {event.room}
        </div>
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        "h-full w-full rounded border-l-2 px-2 py-0.5 text-left transition-all cursor-pointer",
        typeStyles[event.type],
        isSelected && "ring-2 ring-ring",
      )}
    >
      <div className={cn("text-xs font-medium leading-tight truncate", textStyles[event.type])}>{event.title}</div>
      <div className="mt-0.5 text-[10px] text-muted-foreground truncate">{event.instructor}</div>
      <div className="mt-0.5 text-[10px] font-mono text-muted-foreground">{event.startTime}</div>
    </button>
  )
}
