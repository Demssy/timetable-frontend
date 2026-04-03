// src_front/components/event-card.tsx

import { cn } from "@/lib/utils"
import { Pin, MapPin, Clock, UserX } from "lucide-react"
import type { ScheduledEvent } from "./weekly-timetable.tsx"

interface EventCardProps {
  event: ScheduledEvent
  onClick: () => void
  isSelected: boolean
  variant: "mobile" | "grid" | "horizontal"
}

/** Returns variant-specific styles depending on the lesson category. */
function getCategoryStyles(event: ScheduledEvent) {
  if (event.category === "private-available") {
    return {
      borderLeftColor: "#9ca3af",
      backgroundColor: "rgba(156,163,175,0.08)",
      extraClass: "border-dashed opacity-75",
    }
  }
  if (event.category === "private-matched") {
    return {
      borderLeftColor: event.instructorColor,
      backgroundColor: `${event.instructorColor}20`,
      extraClass: "",
    }
  }
  // group — default
  return {
    borderLeftColor: event.instructorColor,
    backgroundColor: `${event.instructorColor}15`,
    extraClass: "",
  }
}

export function EventCard({ event, onClick, isSelected, variant }: EventCardProps) {
  const { borderLeftColor, backgroundColor, extraClass } = getCategoryStyles(event)
  const dynamicStyle = { borderLeftColor, backgroundColor }
  const isAvailableSlot = event.category === "private-available"

  // --- МОБИЛЬНАЯ ВЕРСИЯ ---
  if (variant === "mobile") {
    return (
        <button
            onClick={onClick}
            className={cn(
                "w-full rounded-md border border-border/50 border-l-4 p-3 text-left transition-all space-y-2.5",
                isSelected && "ring-2 ring-ring",
                extraClass,
            )}
            style={dynamicStyle}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className={cn("font-bold text-base block", isAvailableSlot ? "text-muted-foreground italic" : "text-foreground")}>
                {event.title}
              </span>
              <span className="font-semibold text-xs mt-0.5 block" style={{ color: event.instructorColor }}>{event.instructor}</span>
            </div>
            <div className="flex gap-1 shrink-0 mt-0.5">
              {isAvailableSlot && (
                <span className="rounded bg-gray-500/30 text-gray-400 px-1.5 py-0.5 text-[10px] font-bold flex items-center gap-0.5">
                  <UserX className="h-3 w-3" /> No student
                </span>
              )}
              {event.isPrivate && !isAvailableSlot && <span className="rounded bg-purple-500/30 text-purple-400 px-1.5 py-0.5 text-[10px] font-bold">P</span>}
              {event.isPinned && <Pin className="h-4 w-4 text-amber-400" />}
            </div>
          </div>

          <div className="flex items-center justify-between">
            {event.targetAgeRange ? (
                <span className="inline-flex rounded bg-background/50 border border-border/50 px-2 py-0.5 text-xs font-semibold text-foreground">
              {event.targetAgeRange}
            </span>
            ) : <span />}
            <span className="text-sm font-mono text-muted-foreground bg-background/50 px-2 py-1 rounded-md border border-border/50 shadow-sm">
            {event.startTime} - {event.endTime}
          </span>
          </div>
        </button>
    )
  }

  // --- ДЕСКТОП: ГОРИЗОНТАЛЬНЫЙ ТАЙМЛАЙН ---
  if (variant === "horizontal") {
    return (
        <button
            onClick={onClick}
            className={cn(
                "h-full w-full rounded border border-border/30 border-l-4 p-2 text-left transition-all cursor-pointer flex items-center justify-between gap-2 overflow-hidden",
                isSelected && "ring-2 ring-ring shadow-md hover:brightness-110",
                extraClass,
            )}
            style={dynamicStyle}
        >
          <div className="flex flex-col justify-center min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
            <span className="font-semibold text-[10px] truncate opacity-80 text-foreground">
              {event.instructor}
            </span>
              {isAvailableSlot && (
                <span className="rounded bg-gray-500/30 text-gray-400 px-1 text-[9px] font-bold">Open</span>
              )}
              {event.isPrivate && !isAvailableSlot && <span className="rounded bg-purple-500/30 text-purple-400 px-1 text-[9px] font-bold">P</span>}
              {event.isPinned && <Pin className="h-3 w-3 text-amber-400" />}
            </div>

            <span
              className={cn("font-bold leading-tight text-xs sm:text-sm truncate drop-shadow-sm mt-0.5", isAvailableSlot && "italic text-muted-foreground")}
              style={isAvailableSlot ? undefined : { color: event.instructorColor }}
            >
            {event.title}
          </span>

            {event.targetAgeRange && (
                <span className="inline-flex w-fit rounded bg-background/50 border border-border/30 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-foreground mt-1">
              {event.targetAgeRange}
            </span>
            )}
          </div>

          <div className="hidden xl:flex flex-col items-end shrink-0 gap-1 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1.5 truncate">
            <MapPin className="h-3 w-3 opacity-70" /> {event.room}
          </span>
            <span className="flex items-center gap-1.5 truncate opacity-80">
            <Clock className="h-3 w-3" /> {event.startTime}-{event.endTime}
          </span>
          </div>
        </button>
    )
  }

  // --- ДЕСКТОП: ЯЧЕЙКА ТАБЛИЦЫ (По умолчанию) ---
  return (
      <button
          onClick={onClick}
          className={cn(
              "w-full h-full rounded border border-border/30 border-l-4 p-2.5 text-left transition-all cursor-pointer flex flex-col gap-1.5",
              isSelected && "ring-2 ring-ring shadow-md hover:brightness-110",
              extraClass,
          )}
          style={dynamicStyle}
      >
        <div className="flex items-start justify-between gap-1 w-full">
          <span className={cn("font-bold leading-tight text-sm", isAvailableSlot ? "text-muted-foreground italic" : "text-foreground")}>
            {event.title}
          </span>
          <div className="flex gap-0.5 shrink-0">
            {isAvailableSlot && (
              <span className="rounded bg-gray-500/30 text-gray-400 px-1 text-[10px] font-bold">Open</span>
            )}
            {event.isPrivate && !isAvailableSlot && <span className="rounded bg-purple-500/30 text-purple-400 px-1 text-[10px] font-bold">P</span>}
            {event.isPinned && <Pin className="h-3 w-3 text-amber-400" />}
          </div>
        </div>

        {event.targetAgeRange && (
            <span className="inline-flex w-fit rounded bg-background/80 border border-border/30 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-foreground">
          {event.targetAgeRange}
        </span>
        )}

        <span className="font-semibold text-xs mt-0.5" style={{ color: event.instructorColor }}>
          {event.instructor}
        </span>

        <div className="mt-auto flex flex-col gap-0.5 text-xs text-muted-foreground pt-1">
          <span className="flex items-center gap-1.5 truncate">
            <MapPin className="h-3 w-3 opacity-70" /> {event.room}
          </span>
        </div>
      </button>
  )
}