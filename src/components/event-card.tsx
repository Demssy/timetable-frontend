import { cn } from "@/lib/utils"
import { Pin, MapPin, Clock } from "lucide-react"
import type { ScheduledEvent } from "./weekly-timetable.tsx"

interface EventCardProps {
  event: ScheduledEvent
  onClick: () => void
  isSelected: boolean
  variant: "mobile" | "grid"
}

export function EventCard({ event, onClick, isSelected, variant }: EventCardProps) {
  const dynamicStyle = {
    borderLeftColor: event.instructorColor,
    backgroundColor: `${event.instructorColor}1A`,
  }

  // ---  ---
  if (variant === "mobile") {
    return (
        <button
            onClick={onClick}
            className={cn(
                "w-full rounded-md border border-border/50 border-l-4 p-3 text-left transition-all space-y-2.5",
                isSelected && "ring-2 ring-ring"
            )}
            style={dynamicStyle}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="font-semibold text-xs opacity-80 block">{event.instructor}</span>
              <span className="font-bold text-base" style={{ color: event.instructorColor }}>{event.title}</span>
            </div>
            <div className="flex gap-1 shrink-0 mt-0.5">
              {event.isPrivate && <span className="rounded bg-purple-500/30 text-purple-400 px-1.5 py-0.5 text-[10px] font-bold">P</span>}
              {event.isPinned && <Pin className="h-4 w-4 text-amber-400" />}
            </div>
          </div>

          <div className="flex items-center justify-between">
            {/*  */}
            {event.targetAgeRange ? (
                <span className="inline-flex rounded bg-background/50 border border-border/50 px-2 py-0.5 text-xs font-semibold text-foreground">
              {event.targetAgeRange}
            </span>
            ) : <span />}
            <span className="text-sm font-mono text-muted-foreground bg-background/50 px-2 py-1 rounded-md border border-border/50 shadow-sm">
            {event.startTime} - {event.endTime}
          </span>
          </div>

          <div className="flex justify-between items-end text-sm text-muted-foreground pt-1 border-t border-border/30">
            <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{event.room}</span>
          </div>
        </button>
    )
  }

  // ---  ---
  return (
      <button
          onClick={onClick}
          className={cn(
              "h-full w-full rounded border border-border/30 border-l-4 p-2 text-left transition-all cursor-pointer flex flex-col gap-1 overflow-hidden",
              isSelected && "ring-2 ring-ring shadow-md hover:brightness-110"
          )}
          style={dynamicStyle}
      >
        <div className="flex items-start justify-between gap-1 w-full">
          {/*  */}
          <span className="font-semibold text-[10px] sm:text-xs truncate opacity-80 text-foreground">
          {event.instructor}
        </span>
          <div className="flex gap-0.5 shrink-0">
            {event.isPrivate && <span className="rounded bg-purple-500/30 text-purple-400 px-1 text-[9px] font-bold">P</span>}
            {event.isPinned && <Pin className="h-3 w-3 text-amber-400" />}
          </div>
        </div>

        {/*  */}
        <span
            className="font-bold leading-tight text-xs sm:text-sm truncate drop-shadow-sm"
            style={{ color: event.instructorColor }}
        >
        {event.title}
      </span>

        {/*  */}
        {event.targetAgeRange && (
            <span className="inline-flex w-fit rounded bg-background/50 border border-border/30 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-foreground mt-0.5">
          {event.targetAgeRange}
        </span>
        )}

        <div className="mt-auto flex flex-col gap-0.5 text-[10px] sm:text-xs text-muted-foreground">
          {/*  */}
          <span className="flex items-center gap-1.5 truncate">
          <MapPin className="h-3 w-3 opacity-70" /> {event.room}
        </span>
          <span className="flex items-center gap-1.5 truncate opacity-80 mt-0.5">
          <Clock className="h-3 w-3" /> {event.startTime} - {event.endTime}
        </span>
        </div>
      </button>
  )
}