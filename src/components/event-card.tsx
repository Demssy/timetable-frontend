import { cn } from "@/lib/utils"
import { Pin, MapPin } from "lucide-react"
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
    backgroundColor: `${event.instructorColor}15`, // Прозрачность 8% для фона
  }


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
              <span className="font-bold text-base text-foreground block">{event.title}</span>
              <span className="font-semibold text-xs mt-0.5 block" style={{ color: event.instructorColor }}>{event.instructor}</span>
            </div>
            <div className="flex gap-1 shrink-0 mt-0.5">
              {event.isPrivate && <span className="rounded bg-purple-500/30 text-purple-400 px-1.5 py-0.5 text-[10px] font-bold">P</span>}
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


  return (
      <button
          onClick={onClick}
          className={cn(
              "w-full rounded border border-border/30 border-l-4 p-2.5 text-left transition-all cursor-pointer flex flex-col gap-1.5",
              isSelected && "ring-2 ring-ring shadow-md hover:brightness-110"
          )}
          style={dynamicStyle}
      >
        <div className="flex items-start justify-between gap-1 w-full">
          {/*  */}
          <span className="font-bold leading-tight text-sm text-foreground">
          {event.title}
        </span>
          <div className="flex gap-0.5 shrink-0">
            {event.isPrivate && <span className="rounded bg-purple-500/30 text-purple-400 px-1 text-[10px] font-bold">P</span>}
            {event.isPinned && <Pin className="h-3 w-3 text-amber-400" />}
          </div>
        </div>

        {/*  */}
        {event.targetAgeRange && (
            <span className="inline-flex w-fit rounded bg-background/80 border border-border/30 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-foreground">
          {event.targetAgeRange}
        </span>
        )}

        {/*  */}
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