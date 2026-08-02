import { Trash2, PlusCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { OneTimeUnavailability } from "@/types/user"

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toInputTime = (t: string) => t.slice(0, 5)
const toApiTime = (t: string): string => (t.length === 5 ? `${t}:00` : t)
const isValidRange = (start: string, end: string): boolean => start < end
const todayStr = (): string => new Date().toISOString().slice(0, 10)

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  value: OneTimeUnavailability[]
  onChange: (items: OneTimeUnavailability[]) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function OneTimeUnavailabilityManager({ value, onChange }: Props) {
  const addRow = () => {
    onChange([...value, { date: todayStr(), startTime: "09:00:00", endTime: "18:00:00", reason: "" }])
  }

  const removeRow = (index: number) => onChange(value.filter((_, i) => i !== index))

  const updateRow = <K extends keyof OneTimeUnavailability>(
    index: number,
    field: K,
    fieldValue: OneTimeUnavailability[K]
  ) => onChange(value.map((item, i) => (i === index ? { ...item, [field]: fieldValue } : item)))

  return (
    <div className="space-y-3">
      {value.length === 0 && (
        <p className="text-sm text-slate-500 italic">
          No exceptions added. Click "Add" to mark a specific day as unavailable.
        </p>
      )}

      {value.map((item, idx) => {
        const invalid = !isValidRange(item.startTime, item.endTime)
        return (
          <div key={idx} className="rounded-lg border border-slate-700 bg-slate-800/50 p-3 space-y-2">
            <div className="grid grid-cols-2 sm:grid-cols-[1fr_1fr_1fr_auto] gap-2 sm:items-end">
              <div className="space-y-1 col-span-2 sm:col-span-1">
                <label className="text-xs text-slate-400">Date</label>
                <Input
                  type="date"
                  value={item.date}
                  onChange={e => updateRow(idx, "date", e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white w-full"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Start</label>
                <Input
                  type="time"
                  value={toInputTime(item.startTime)}
                  onChange={e => updateRow(idx, "startTime", toApiTime(e.target.value))}
                  className={cn("bg-slate-800 border-slate-700 text-white w-full", invalid && "border-red-500")}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400">End</label>
                <Input
                  type="time"
                  value={toInputTime(item.endTime)}
                  onChange={e => updateRow(idx, "endTime", toApiTime(e.target.value))}
                  className={cn("bg-slate-800 border-slate-700 text-white w-full", invalid && "border-red-500")}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeRow(idx)}
                className="text-slate-400 hover:text-red-400 justify-center sm:justify-start w-full sm:w-auto sm:h-9 sm:px-2"
                title="Remove"
              >
                <Trash2 className="h-4 w-4" />
                <span className="sm:hidden">Remove</span>
              </Button>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-400">Reason (optional)</label>
              <Input
                type="text"
                placeholder="e.g. Vacation, Doctor's appointment"
                value={item.reason ?? ""}
                onChange={e => updateRow(idx, "reason", e.target.value)}
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-600"
              />
            </div>

            {invalid && (
              <p className="text-xs text-red-400">Start time must be before end time.</p>
            )}
          </div>
        )
      })}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addRow}
        className="border-slate-700 text-slate-300 hover:text-white hover:border-slate-500"
      >
        <PlusCircle className="h-4 w-4 mr-2" />
        Add Exception Day
      </Button>
    </div>
  )
}

