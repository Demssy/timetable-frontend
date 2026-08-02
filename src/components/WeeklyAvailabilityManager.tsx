import { Trash2, PlusCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { DayOfWeek } from "@/types/enums"
import type { WeeklyAvailability } from "@/types/user"

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_ORDER = [
  DayOfWeek.SUNDAY, DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY,
  DayOfWeek.THURSDAY, DayOfWeek.FRIDAY, DayOfWeek.SATURDAY,
]

const DAY_LABELS: Record<string, string> = {
  MONDAY:    "Monday",
  TUESDAY:   "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY:  "Thursday",
  FRIDAY:    "Friday",
  SATURDAY:  "Saturday",
  SUNDAY:    "Sunday",
}

// ─── Time helpers ─────────────────────────────────────────────────────────────

/** Convert "HH:mm:ss" → "HH:mm" for <input type="time"> */
const toInputTime = (t: string) => t.slice(0, 5)

/** Convert "HH:mm" → "HH:mm:ss" for the backend */
const toApiTime = (t: string): string => (t.length === 5 ? `${t}:00` : t)

/** Returns true if startTime is strictly before endTime */
const isValidRange = (start: string, end: string): boolean => start < end

// ─── Props ────────────────────────────────────────────────────────────────────

interface WeeklyAvailabilityManagerProps {
  value: WeeklyAvailability[]
  onChange: (items: WeeklyAvailability[]) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WeeklyAvailabilityManager({ value, onChange }: WeeklyAvailabilityManagerProps) {

  const addRow = () => {
    onChange([
      ...value,
      { dayOfWeek: DayOfWeek.MONDAY, startTime: "09:00:00", endTime: "17:00:00" },
    ])
  }

  const removeRow = (index: number) => {
    onChange(value.filter((_, i) => i !== index))
  }

  const updateRow = <K extends keyof WeeklyAvailability>(
    index: number,
    field: K,
    fieldValue: WeeklyAvailability[K]
  ) => {
    onChange(
      value.map((item, i) => (i === index ? { ...item, [field]: fieldValue } : item))
    )
  }

  return (
    <div className="space-y-3">
      {value.length === 0 && (
        <p className="text-sm text-slate-500 italic">
          No weekly availability set. Click "Add" to define your regular schedule.
        </p>
      )}

      {/* Header row — only shown on larger screens when there are items */}
      {value.length > 0 && (
        <div className="hidden sm:grid grid-cols-[1fr_1fr_1fr_auto] gap-2 px-1 text-xs font-medium text-slate-400 uppercase tracking-wide">
          <span>Day</span>
          <span>Start Time</span>
          <span>End Time</span>
          <span />
        </div>
      )}

      {value.map((item, idx) => {
        const invalid = !isValidRange(item.startTime, item.endTime)
        return (
          <div
            key={idx}
            className="rounded-lg border border-slate-700 bg-slate-800/40 p-2.5 sm:p-0 sm:border-0 sm:bg-transparent sm:rounded-none"
          >
            <div className="grid grid-cols-3 sm:grid-cols-[1fr_1fr_1fr_auto] gap-1.5 sm:gap-2 sm:items-center">
              {/* Day of week select — dynamic width, same as time inputs */}
              <select
                value={item.dayOfWeek}
                onChange={e => updateRow(idx, "dayOfWeek", e.target.value as typeof item.dayOfWeek)}
                className="w-full min-w-0 h-9 rounded-md border border-slate-700 bg-slate-800 px-1.5 sm:px-3 py-1 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-slate-500"
              >
                {DAY_ORDER.map(day => (
                  <option key={day} value={day}>{DAY_LABELS[day]}</option>
                ))}
              </select>

              {/* Start time */}
              <Input
                type="time"
                value={toInputTime(item.startTime)}
                onChange={e => updateRow(idx, "startTime", toApiTime(e.target.value))}
                className={cn(
                  "w-full min-w-0 bg-slate-800 border-slate-700 text-white px-1.5 sm:px-3 text-xs sm:text-sm",
                  invalid && "border-red-500 focus-visible:border-red-500"
                )}
              />

              {/* End time */}
              <Input
                type="time"
                value={toInputTime(item.endTime)}
                onChange={e => updateRow(idx, "endTime", toApiTime(e.target.value))}
                className={cn(
                  "w-full min-w-0 bg-slate-800 border-slate-700 text-white px-1.5 sm:px-3 text-xs sm:text-sm",
                  invalid && "border-red-500 focus-visible:border-red-500"
                )}
              />

              {/* Delete button — full width row on mobile, compact icon on desktop */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeRow(idx)}
                className="col-span-3 sm:col-span-1 justify-center sm:justify-start text-slate-400 hover:text-red-400 w-full sm:w-auto sm:h-9 sm:px-2"
                title="Remove row"
              >
                <Trash2 className="h-4 w-4" />
                <span className="sm:hidden">Remove</span>
              </Button>
            </div>

            {/* Inline validation error */}
            {invalid && (
              <p className="text-xs text-red-400 mt-1.5">
                Start time must be before end time.
              </p>
            )}
          </div>
        )
      })}

      <Button type="button" variant="outline" size="sm" onClick={addRow}
        className="border-slate-700 text-slate-300 hover:text-white hover:border-slate-500">
        <PlusCircle className="h-4 w-4 mr-2" />
        Add Availability Slot
      </Button>
    </div>
  )
}

