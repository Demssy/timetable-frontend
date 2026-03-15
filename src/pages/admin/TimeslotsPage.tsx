import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { ChevronRight, Plus, Pencil, Trash2 } from "lucide-react"
import { timeslotApi } from "@/api/timeslotApi"
import type { TimeslotDTO } from "@/types/schedule"
import { DayOfWeek } from "@/types/enums"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type ModalMode = "create" | "edit" | null

const DAY_ORDER = [
  DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY,
  DayOfWeek.THURSDAY, DayOfWeek.FRIDAY, DayOfWeek.SATURDAY, DayOfWeek.SUNDAY,
]

interface FormState {
  dayOfWeek: string
  startTime: string
  endTime: string
}

const EMPTY_FORM: FormState = { dayOfWeek: DayOfWeek.MONDAY, startTime: "09:00", endTime: "10:00" }

// Strip seconds when displaying — backend sends "HH:mm:ss"
const fmtTime = (t: string) => t.slice(0, 5)

// Ensure "HH:mm:ss" format for backend
const toBackendTime = (t: string) => (t.length === 5 ? `${t}:00` : t)

export function TimeslotsPage() {
  const [timeslots, setTimeslots] = useState<TimeslotDTO[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [editingSlot, setEditingSlot] = useState<TimeslotDTO | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const fetchTimeslots = async () => {
    setIsLoading(true); setError(null)
    try { setTimeslots(await timeslotApi.getAll()) }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to load timeslots") }
    finally { setIsLoading(false) }
  }

  useEffect(() => { fetchTimeslots() }, [])

  const openCreate = () => { setEditingSlot(null); setForm(EMPTY_FORM); setFormError(null); setModalMode("create") }
  const openEdit = (s: TimeslotDTO) => {
    setEditingSlot(s)
    setForm({ dayOfWeek: s.dayOfWeek, startTime: fmtTime(s.startTime), endTime: fmtTime(s.endTime) })
    setFormError(null); setModalMode("edit")
  }
  const closeModal = () => { setModalMode(null); setEditingSlot(null); setFormError(null) }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.startTime >= form.endTime) { setFormError("End time must be after start time."); return }
    setIsSaving(true); setFormError(null)
    try {
      const payload = { dayOfWeek: form.dayOfWeek as TimeslotDTO["dayOfWeek"], startTime: toBackendTime(form.startTime), endTime: toBackendTime(form.endTime) }
      if (modalMode === "create") await timeslotApi.create(payload)
      else if (editingSlot?.id) await timeslotApi.update(editingSlot.id, payload)
      await fetchTimeslots(); closeModal()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save")
    } finally { setIsSaving(false) }
  }

  const handleDelete = async (slot: TimeslotDTO) => {
    if (!window.confirm(`Delete timeslot ${slot.dayOfWeek} ${fmtTime(slot.startTime)}–${fmtTime(slot.endTime)}?`)) return
    try { await timeslotApi.delete(slot.id!); await fetchTimeslots() }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to delete") }
  }

  // Group by day
  const grouped = DAY_ORDER.reduce<Record<string, TimeslotDTO[]>>((acc, day) => {
    acc[day] = timeslots.filter(s => s.dayOfWeek === day).sort((a, b) => a.startTime.localeCompare(b.startTime))
    return acc
  }, {})

  return (
    <div className="container mx-auto py-10 space-y-8">
      <nav className="flex items-center gap-1.5 text-sm text-slate-400">
        <Link to="/admin" className="hover:text-white transition-colors">Admin Panel</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-white font-medium">Timeslots</span>
      </nav>

      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Timeslots</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchTimeslots}>Refresh</Button>
          <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Add Timeslot</Button>
        </div>
      </div>

      {error && <div className="bg-destructive/15 text-destructive p-4 rounded-md">{error}</div>}

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <div className="space-y-6">
          {DAY_ORDER.map(day => grouped[day].length > 0 && (
            <Card key={day}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{day}</CardTitle>
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm text-left">
                  <thead className="text-muted-foreground border-b">
                    <tr>
                      <th className="h-8 px-4 font-medium">ID</th>
                      <th className="h-8 px-4 font-medium">Start</th>
                      <th className="h-8 px-4 font-medium">End</th>
                      <th className="h-8 px-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grouped[day].map(slot => (
                      <tr key={slot.id} className="border-b transition-colors hover:bg-muted/50">
                        <td className="p-3 text-muted-foreground">{slot.id}</td>
                        <td className="p-3 font-mono">{fmtTime(slot.startTime)}</td>
                        <td className="p-3 font-mono">{fmtTime(slot.endTime)}</td>
                        <td className="p-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(slot)}><Pencil className="h-3.5 w-3.5 mr-1" />Edit</Button>
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(slot)}><Trash2 className="h-3.5 w-3.5 mr-1" />Delete</Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          ))}
          {timeslots.length === 0 && <p className="text-center text-muted-foreground py-10">No timeslots found.</p>}
        </div>
      )}

      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <Card className="w-full max-w-md shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <CardHeader>
              <CardTitle>{modalMode === "create" ? "Add Timeslot" : "Edit Timeslot"}</CardTitle>
            </CardHeader>
            <form onSubmit={handleSave}>
              <CardContent className="space-y-4">
                {formError && <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">{formError}</div>}
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
                    <Input type="time" value={form.startTime} onChange={e => setForm(p => ({ ...p, startTime: e.target.value }))} required />
                  </div>
                  <div className="space-y-2">
                    <Label>End Time</Label>
                    <Input type="time" value={form.endTime} onChange={e => setForm(p => ({ ...p, endTime: e.target.value }))} required />
                  </div>
                </div>
              </CardContent>
              <div className="flex justify-end gap-2 p-6 pt-0">
                <Button type="button" variant="outline" onClick={closeModal} disabled={isSaving}>Cancel</Button>
                <Button type="submit" disabled={isSaving}>{isSaving ? "Saving..." : modalMode === "create" ? "Create" : "Save"}</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
