import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { ChevronRight, Plus, Pencil, Trash2, Clock } from "lucide-react"
import { timeslotApi } from "@/api/timeslotApi"
import type { TimeslotDTO } from "@/types/schedule"
import { DayOfWeek } from "@/types/enums"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

// ─── Grid configuration ───────────────────────────────────────────────────────
const GRID_START_MIN = 7 * 60 + 30  // 07:30
const GRID_END_MIN   = 22 * 60  // 22:00
const ROW_MINUTES    = 30       // each row = 30 min
const ROW_HEIGHT_PX  = 44       // px per row
const TOTAL_ROWS     = (GRID_END_MIN - GRID_START_MIN) / ROW_MINUTES  // 30 rows
const TIME_COL_W     = 64       // px — width of the time-label column

const DAY_ORDER = [
  DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY,
  DayOfWeek.THURSDAY, DayOfWeek.FRIDAY, DayOfWeek.SATURDAY, DayOfWeek.SUNDAY,
]
const DAY_LABELS: Record<string, string> = {
  MONDAY: "Mon", TUESDAY: "Tue", WEDNESDAY: "Wed",
  THURSDAY: "Thu", FRIDAY: "Fri", SATURDAY: "Sat", SUNDAY: "Sun",
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const toMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number)
  return h * 60 + (m || 0)
}
const toTimeStr = (minutes: number) => {
  const h = Math.floor(minutes / 60).toString().padStart(2, "0")
  const m = (minutes % 60).toString().padStart(2, "0")
  return `${h}:${m}`
}
const fmtTime = (t: string) => t.slice(0, 5)
const toBackendTime = (t: string) => (t.length === 5 ? `${t}:00` : t)

// ─── Types ────────────────────────────────────────────────────────────────────
type ModalMode = "create" | "edit" | null
interface FormState { dayOfWeek: string; startTime: string; endTime: string }
const EMPTY_FORM: FormState = { dayOfWeek: DayOfWeek.MONDAY, startTime: "09:00", endTime: "10:00" }

// Popover position anchored to the click event
interface PopoverPos { x: number; y: number }

// ─── Component ────────────────────────────────────────────────────────────────
export function TimeslotsPage() {
  const [timeslots, setTimeslots]   = useState<TimeslotDTO[]>([])
  const [isLoading, setIsLoading]   = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [modalMode, setModalMode]   = useState<ModalMode>(null)
  const [editingSlot, setEditingSlot] = useState<TimeslotDTO | null>(null)
  const [form, setForm]             = useState<FormState>(EMPTY_FORM)
  const [isSaving, setIsSaving]     = useState(false)
  const [formError, setFormError]   = useState<string | null>(null)
  const [activeSlot, setActiveSlot] = useState<TimeslotDTO | null>(null)
  const [popoverPos, setPopoverPos] = useState<PopoverPos | null>(null)

  // ── Data fetching ──────────────────────────────────────────────────────────
  const fetchTimeslots = async () => {
    setIsLoading(true); setError(null)
    try { setTimeslots(await timeslotApi.getAll()) }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to load timeslots") }
    finally { setIsLoading(false) }
  }
  useEffect(() => { fetchTimeslots() }, [])

  // ── Modal helpers ──────────────────────────────────────────────────────────
  const openCreate = (day?: string, startMin?: number) => {
    const startTime = startMin !== undefined ? toTimeStr(startMin) : "09:00"
    const endTime   = startMin !== undefined ? toTimeStr(Math.min(startMin + 60, GRID_END_MIN)) : "10:00"
    setEditingSlot(null)
    setForm({ dayOfWeek: day ?? DayOfWeek.MONDAY, startTime, endTime })
    setFormError(null)
    setModalMode("create")
    closePopover()
  }

  const openEdit = (s: TimeslotDTO) => {
    setEditingSlot(s)
    setForm({ dayOfWeek: s.dayOfWeek, startTime: fmtTime(s.startTime), endTime: fmtTime(s.endTime) })
    setFormError(null)
    setModalMode("edit")
    closePopover()
  }

  const closeModal   = () => { setModalMode(null); setEditingSlot(null); setFormError(null) }
  const closePopover = () => { setActiveSlot(null); setPopoverPos(null) }

  // ── Save / Delete ──────────────────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.startTime >= form.endTime) { setFormError("End time must be after start time."); return }
    setIsSaving(true); setFormError(null)
    try {
      const payload = {
        dayOfWeek: form.dayOfWeek as TimeslotDTO["dayOfWeek"],
        startTime: toBackendTime(form.startTime),
        endTime:   toBackendTime(form.endTime),
      }
      if (modalMode === "create") await timeslotApi.create(payload)
      else if (editingSlot?.id)   await timeslotApi.update(editingSlot.id, payload)
      await fetchTimeslots(); closeModal()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save")
    } finally { setIsSaving(false) }
  }

  const handleDelete = async (slot: TimeslotDTO) => {
    if (!window.confirm(`Delete timeslot ${slot.dayOfWeek} ${fmtTime(slot.startTime)}–${fmtTime(slot.endTime)}?`)) return
    try { await timeslotApi.delete(slot.id!); await fetchTimeslots(); closePopover() }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to delete") }
  }

  // ── Grouped by day ─────────────────────────────────────────────────────────
  const grouped = DAY_ORDER.reduce<Record<string, TimeslotDTO[]>>((acc, day) => {
    acc[day] = timeslots.filter(s => s.dayOfWeek === day)
    return acc
  }, {})

  // ── Time rows (one per 30-min slot) and hour boundaries (for labels) ────────
  const timeLabels   = Array.from({ length: TOTAL_ROWS },     (_, i) => GRID_START_MIN + i * ROW_MINUTES)
  const timeBoundaries = Array.from({ length: TOTAL_ROWS + 1 }, (_, i) => GRID_START_MIN + i * ROW_MINUTES)

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="container mx-auto py-10 space-y-8" onClick={closePopover}>

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-slate-400">
        <Link to="/admin" className="hover:text-white transition-colors">Admin Panel</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-white font-medium">Timeslots</span>
      </nav>

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-white">Timeslots</h1>
          <p className="text-slate-400 text-sm mt-1">
            Click an empty cell to add · Click a block to edit or delete
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchTimeslots}>Refresh</Button>
          <Button onClick={() => openCreate()}>
            <Plus className="h-4 w-4 mr-2" />Add Timeslot
          </Button>
        </div>
      </div>

      {error && <div className="bg-destructive/15 text-destructive p-4 rounded-md">{error}</div>}

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground animate-pulse">Loading...</p>
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-slate-900/60 backdrop-blur overflow-hidden">

          {/* ── Scrollable wrapper (header + body share one scroll context) ─── */}
          <div className="overflow-y-auto max-h-[680px] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full">

          {/* ── Day headers — sticky inside the scroll container ─────────── */}
          <div
            className="grid border-b border-white/10 sticky top-0 z-30 bg-slate-900"
            style={{ gridTemplateColumns: `${TIME_COL_W}px repeat(7, 1fr)` }}
          >
            <div className="h-11" />
            {DAY_ORDER.map(day => (
              <div
                key={day}
                className={cn(
                  "h-11 flex items-center justify-center text-xs font-semibold tracking-wider uppercase border-l border-white/10",
                  day === DayOfWeek.SATURDAY || day === DayOfWeek.SUNDAY
                    ? "text-violet-400"
                    : "text-slate-300"
                )}
              >
                {DAY_LABELS[day]}
              </div>
            ))}
          </div>

          {/* ── Grid body ───────────────────────────────────────────────────── */}
            <div
              className="relative"
              style={{ height: TOTAL_ROWS * ROW_HEIGHT_PX }}
            >

              {/* ── Background: time labels + horizontal lines ─────────────── */}
              <div
                className="absolute inset-0 pointer-events-none grid"
                style={{ gridTemplateColumns: `${TIME_COL_W}px repeat(7, 1fr)` }}
              >
                {/* Time labels — rendered at hour boundaries */}
                <div className="relative">
                  {timeBoundaries.map((min, i) =>
                    min % 60 === 0 ? (
                      <div
                        key={min}
                        className="absolute right-3 text-[10px] text-slate-500 leading-none -translate-y-1/2 select-none"
                        style={{ top: i * ROW_HEIGHT_PX }}
                      >
                        {toTimeStr(min)}
                      </div>
                    ) : null
                  )}
                </div>

                {/* Columns with hour/half-hour dividers */}
                {DAY_ORDER.map(day => (
                  <div key={day} className="border-l border-white/5">
                    {timeLabels.map((min, i) => (
                      <div
                        key={i}
                        className={cn(
                          "border-b",
                          min % 60 === 0 ? "border-white/10" : "border-white/[0.04]"
                        )}
                        style={{ height: ROW_HEIGHT_PX }}
                      />
                    ))}
                  </div>
                ))}
              </div>

              {/* ── Clickable empty cells ──────────────────────────────────── */}
              <div
                className="absolute inset-0 grid"
                style={{ gridTemplateColumns: `${TIME_COL_W}px repeat(7, 1fr)` }}
              >
                <div className="pointer-events-none" />
                {DAY_ORDER.map(day => {
                  const daySlots = grouped[day]
                  return (
                    <div key={day} className="relative">
                      {timeLabels.map((slotStart, rowIdx) => {
                        const slotEnd = slotStart + ROW_MINUTES
                        const covered = daySlots.some(s => {
                          const sMin = toMinutes(s.startTime)
                          const eMin = toMinutes(s.endTime)
                          return sMin < slotEnd && eMin > slotStart
                        })
                        if (covered) return null
                        return (
                          <div
                            key={rowIdx}
                            className="absolute w-full group cursor-pointer"
                            style={{ top: rowIdx * ROW_HEIGHT_PX, height: ROW_HEIGHT_PX }}
                            onClick={(e) => { e.stopPropagation(); openCreate(day, slotStart) }}
                          >
                            <div className="h-full mx-1 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-150 group-hover:bg-white/[0.03] border border-transparent group-hover:border-white/10">
                              <Plus className="h-3.5 w-3.5 text-slate-500" />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>

              {/* ── Timeslot blocks ────────────────────────────────────────── */}
              <div
                className="absolute inset-0 grid pointer-events-none"
                style={{ gridTemplateColumns: `${TIME_COL_W}px repeat(7, 1fr)` }}
              >
                <div />
                {DAY_ORDER.map(day => (
                  <div key={day} className="relative pointer-events-auto">
                    {grouped[day].map(slot => {
                      const startMin = toMinutes(slot.startTime)
                      const endMin   = toMinutes(slot.endTime)
                      const topPx    = (startMin - GRID_START_MIN) / ROW_MINUTES * ROW_HEIGHT_PX
                      const heightPx = (endMin - startMin)          / ROW_MINUTES * ROW_HEIGHT_PX
                      const isActive = activeSlot?.id === slot.id

                      return (
                        <div
                          key={slot.id}
                          className={cn(
                            "absolute left-1 right-1 rounded-lg overflow-hidden cursor-pointer select-none",
                            "border transition-all duration-200",
                            isActive
                              ? "bg-emerald-500/25 border-emerald-400 shadow-lg shadow-emerald-500/20 z-20 scale-[1.01]"
                              : "bg-emerald-600/15 border-emerald-500/30 hover:bg-emerald-600/25 hover:border-emerald-400/60 z-10"
                          )}
                          style={{ top: topPx + 2, height: Math.max(heightPx - 4, 20) }}
                          onClick={(e) => {
                            e.stopPropagation()
                            if (isActive) { closePopover(); return }
                            setActiveSlot(slot)
                            setPopoverPos({ x: e.clientX, y: e.clientY })
                          }}
                        >
                          <div className="px-2 py-1 h-full flex flex-col justify-center gap-0.5">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-emerald-400 flex-shrink-0" />
                              <span className="text-[11px] font-semibold text-emerald-300 leading-none">
                                {fmtTime(slot.startTime)}
                              </span>
                            </div>
                            {heightPx >= 52 && (
                              <span className="text-[10px] text-emerald-500 leading-none ml-4">
                                {fmtTime(slot.endTime)}
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>

            </div>

          </div>
        </div>
      )}

      {/* ── Floating popover (fixed position, always in viewport) ──────────── */}
      {activeSlot && popoverPos && (
        <div
          className="fixed z-50 bg-slate-800/95 backdrop-blur border border-white/15 rounded-xl shadow-2xl p-1 min-w-40"
          style={{
            left: Math.min(popoverPos.x, window.innerWidth - 168),
            top:  popoverPos.y + 12,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-2 text-xs text-slate-300 font-medium border-b border-white/10 flex items-center gap-1.5">
            <Clock className="h-3 w-3 text-emerald-400" />
            {fmtTime(activeSlot.startTime)} – {fmtTime(activeSlot.endTime)}
          </div>
          <div className="p-1 space-y-0.5">
            <button
              className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-slate-200 hover:bg-white/10 rounded-lg transition-colors"
              onClick={() => openEdit(activeSlot)}
            >
              <Pencil className="h-3.5 w-3.5 text-blue-400" /> Edit
            </button>
            <button
              className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              onClick={() => handleDelete(activeSlot)}
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          </div>
        </div>
      )}

      {/* ── Create / Edit modal ────────────────────────────────────────────── */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <Card className="w-full max-w-md shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <CardHeader>
              <CardTitle>{modalMode === "create" ? "Add Timeslot" : "Edit Timeslot"}</CardTitle>
            </CardHeader>
            <form onSubmit={handleSave}>
              <CardContent className="space-y-4">
                {formError && (
                  <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">{formError}</div>
                )}
                <div className="space-y-2">
                  <Label>Day of Week</Label>
                  <select
                    value={form.dayOfWeek}
                    onChange={e => setForm(p => ({ ...p, dayOfWeek: e.target.value }))}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {DAY_ORDER.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Time</Label>
                    <Input
                      type="time"
                      value={form.startTime}
                      onChange={e => setForm(p => ({ ...p, startTime: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Time</Label>
                    <Input
                      type="time"
                      value={form.endTime}
                      onChange={e => setForm(p => ({ ...p, endTime: e.target.value }))}
                      required
                    />
                  </div>
                </div>
              </CardContent>
              <div className="flex justify-end gap-2 p-6 pt-0">
                <Button type="button" variant="outline" onClick={closeModal} disabled={isSaving}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Saving…" : modalMode === "create" ? "Create" : "Save"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
