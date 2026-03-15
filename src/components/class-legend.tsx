"use client"

import { cn } from "@/lib/utils.ts"
import type { DanceClass } from "@/components/weekly-timetable.tsx"

interface ClassLegendProps {
  activeFilter: DanceClass | "all"
  onFilterChange: (filter: DanceClass | "all") => void
}

const CLASS_TYPES: { type: DanceClass | "all"; label: string }[] = [
  { type: "all", label: "All Classes" },
  { type: "ballet", label: "Ballet" },
  { type: "hiphop", label: "Hip Hop" },
  { type: "contemporary", label: "Contemporary" },
  { type: "jazz", label: "Jazz" },
  { type: "salsa", label: "Salsa" },
]

export function ClassLegend({ activeFilter, onFilterChange }: ClassLegendProps) {
  const getButtonStyles = (type: DanceClass | "all") => {
    const isActive = activeFilter === type

    if (type === "all") {
      return cn(
        "rounded-md px-3 py-1.5 text-sm font-medium transition-all",
        isActive ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-secondary",
      )
    }

    const colorMap = {
      ballet: isActive ? "bg-ballet text-background" : "bg-ballet/20 text-ballet hover:bg-ballet/30",
      hiphop: isActive ? "bg-hiphop text-background" : "bg-hiphop/20 text-hiphop hover:bg-hiphop/30",
      contemporary: isActive
        ? "bg-contemporary text-background"
        : "bg-contemporary/20 text-contemporary hover:bg-contemporary/30",
      jazz: isActive ? "bg-jazz text-background" : "bg-jazz/20 text-jazz hover:bg-jazz/30",
      salsa: isActive ? "bg-salsa text-background" : "bg-salsa/20 text-salsa hover:bg-salsa/30",
    }

    return cn("rounded-md px-3 py-1.5 text-sm font-medium transition-all", colorMap[type])
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {CLASS_TYPES.map(({ type, label }) => (
        <button key={type} onClick={() => onFilterChange(type)} className={getButtonStyles(type)}>
          {label}
        </button>
      ))}
    </div>
  )
}
