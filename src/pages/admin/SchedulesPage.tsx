import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { ChevronRight, ChevronLeft, Plus, Trash2, FolderOpen, Globe, CalendarRange } from "lucide-react"
import { format, addDays, addWeeks, startOfWeek, endOfWeek } from "date-fns"
import { scheduleApi } from "@/api/scheduleApi"
import type { ScheduleMetadataDTO, CreateScheduleRequest } from "@/types/schedule"
import { ScheduleStatus } from "@/types/schedule"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

/** Visual badge that reflects the schedule's lifecycle status. */
function StatusBadge({ status }: { status: ScheduleStatus | undefined }) {
  if (!status) return <span className="text-muted-foreground text-xs">—</span>

  const styles: Record<ScheduleStatus, string> = {
    DRAFT:     "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    PUBLISHED: "bg-green-500/15 text-green-400 border-green-500/30",
    ARCHIVED:  "bg-slate-500/15 text-slate-400 border-slate-500/30",
  }

  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold", styles[status])}>
      {status}
    </span>
  )
}

export function SchedulesPage() {
  const navigate = useNavigate()
  const [schedules, setSchedules] = useState<ScheduleMetadataDTO[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: "" })
  // Week picker state — Monday of the selected week
  const [selectedWeek, setSelectedWeek] = useState<Date>(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [publishingId, setPublishingId] = useState<number | null>(null)

  const fetchSchedules = async () => {
    setIsLoading(true); setError(null)
    try {
      // Use admin endpoint to get ALL schedules (including DRAFT and ARCHIVED)
      setSchedules(await scheduleApi.adminGetAll())
    }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to load schedules") }
    finally { setIsLoading(false) }
  }

  useEffect(() => { fetchSchedules() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setFormError("Name is required."); return }
    setIsSaving(true); setFormError(null)
    try {
      const payload: CreateScheduleRequest = {
        name: form.name,
        validFrom: format(selectedWeek, "yyyy-MM-dd"),
        validTo: format(addDays(selectedWeek, 6), "yyyy-MM-dd"),
      }
      const created = await scheduleApi.create(payload)
      await fetchSchedules()
      setShowModal(false)
      setForm({ name: "" })
      navigate(`/admin/schedules/${created.id}`)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create")
    } finally { setIsSaving(false) }
  }

  const handleDelete = async (s: ScheduleMetadataDTO) => {
    if (!window.confirm(`Delete schedule "${s.name}"? This will remove all its lessons.`)) return
    try { await scheduleApi.delete(s.id); await fetchSchedules() }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to delete") }
  }

  /** Publish a DRAFT schedule; optimistically updates the list on success. */
  const handlePublish = async (s: ScheduleMetadataDTO) => {
    if (!window.confirm(`Publish schedule "${s.name}"? Students and teachers will be able to see it.`)) return
    setPublishingId(s.id)
    setError(null)
    try {
      const updated = await scheduleApi.publish(s.id)
      // Replace the old entry with the updated one (status → PUBLISHED)
      setSchedules(prev => prev.map(item => (item.id === updated.id ? updated : item)))
    } catch (err) {
      // The backend returns a descriptive message for uniqueness violations —
      // e.g. "Cannot publish schedule id=X: another PUBLISHED schedule already covers the same date range"
      // Display it directly so the admin knows exactly what went wrong.
      const message = err instanceof Error ? err.message : "Failed to publish schedule"
      setError(`Publish failed: ${message}`)
    } finally {
      setPublishingId(null)
    }
  }

  return (
    <div className="container mx-auto py-10 space-y-8">
      <nav className="flex items-center gap-1.5 text-sm text-slate-400">
        <Link to="/admin" className="hover:text-white transition-colors">Admin Panel</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-white font-medium">Schedules</span>
      </nav>

      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Schedules</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchSchedules}>Refresh</Button>
          <Button onClick={() => {
            setFormError(null)
            setForm({ name: "" })
            setSelectedWeek(startOfWeek(new Date(), { weekStartsOn: 1 }))
            setShowModal(true)
          }}>
            <Plus className="h-4 w-4 mr-2" />Create Schedule
          </Button>
        </div>
      </div>

      {error && <div className="bg-destructive/15 text-destructive p-4 rounded-md">{error}</div>}

      <Card>
        <CardHeader>
          <CardTitle>All Schedules</CardTitle>
          <CardDescription>Weekly timetables for the dance school.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-muted-foreground border-b">
                <tr>
                  <th className="h-10 px-4 font-medium">ID</th>
                  <th className="h-10 px-4 font-medium">Name</th>
                  <th className="h-10 px-4 font-medium">Validity Period</th>
                  <th className="h-10 px-4 font-medium">Status</th>
                  <th className="h-10 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={5} className="h-24 text-center text-muted-foreground">Loading...</td></tr>
                ) : schedules.length === 0 ? (
                  <tr><td colSpan={5} className="h-24 text-center text-muted-foreground">No schedules yet. Create one!</td></tr>
                ) : schedules.map(s => (
                  <tr key={s.id} className="border-b transition-colors hover:bg-muted/50">
                    <td className="p-4 text-muted-foreground">{s.id}</td>
                    <td className="p-4 font-medium">{s.name}</td>
                    <td className="p-4 font-mono text-muted-foreground">
                      {s.validFrom} <span className="text-slate-600">to</span> {s.validTo}
                    </td>
                    <td className="p-4">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/schedules/${s.id}`)}>
                          <FolderOpen className="h-3.5 w-3.5 mr-1" />Open
                        </Button>
                        {/* Publish button — only visible for DRAFT schedules */}
                        {s.status === ScheduleStatus.DRAFT && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-green-500 hover:text-green-400 hover:bg-green-500/10"
                            onClick={() => handlePublish(s)}
                            disabled={publishingId === s.id}
                          >
                            <Globe className="h-3.5 w-3.5 mr-1" />
                            {publishingId === s.id ? "Publishing..." : "Publish"}
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(s)}>
                          <Trash2 className="h-3.5 w-3.5 mr-1" />Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <Card className="w-full max-w-md shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <CardHeader>
              <CardTitle>Create Schedule</CardTitle>
              <CardDescription>Define a new weekly timetable.</CardDescription>
            </CardHeader>
            <form onSubmit={handleCreate}>
              <CardContent className="space-y-5">
                {formError && <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">{formError}</div>}

                {/* Schedule name */}
                <div className="space-y-2">
                  <Label>Schedule Name</Label>
                  <Input
                    placeholder={`Week of ${format(selectedWeek, "dd MMM yyyy")}`}
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    required
                  />
                </div>

                {/* Week picker */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <CalendarRange className="h-3.5 w-3.5" />
                    Week
                  </Label>

                  {/* Week range display */}
                  <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 text-center">
                    <p className="text-base font-semibold text-foreground">
                      {format(selectedWeek, "dd MMM")}
                      <span className="mx-2 text-muted-foreground">—</span>
                      {format(endOfWeek(selectedWeek, { weekStartsOn: 1 }), "dd MMM yyyy")}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Mon {format(selectedWeek, "yyyy-MM-dd")} → Sun {format(addDays(selectedWeek, 6), "yyyy-MM-dd")}
                    </p>
                  </div>

                  {/* Navigation buttons */}
                  <div className="flex gap-1.5">
                    <Button
                      type="button" variant="outline" size="sm"
                      className="flex-1 gap-1"
                      onClick={() => setSelectedWeek(prev => addWeeks(prev, -1))}
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />Prev
                    </Button>
                    <Button
                      type="button" variant="outline" size="sm"
                      className="flex-1"
                      onClick={() => setSelectedWeek(startOfWeek(new Date(), { weekStartsOn: 1 }))}
                    >
                      Current
                    </Button>
                    <Button
                      type="button" variant="outline" size="sm"
                      className="flex-1 gap-1"
                      onClick={() => setSelectedWeek(prev => addWeeks(prev, 1))}
                    >
                      Next<ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* Direct date jump — snaps to Monday of the picked date */}
                  <input
                    type="date"
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    value={format(selectedWeek, "yyyy-MM-dd")}
                    onChange={e => {
                      if (!e.target.value) return
                      const picked = new Date(e.target.value + "T00:00:00")
                      setSelectedWeek(startOfWeek(picked, { weekStartsOn: 1 }))
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Pick any day — the schedule will cover the full week (Mon–Sun).
                  </p>
                </div>
              </CardContent>

              <div className="flex justify-end gap-2 p-6 pt-0">
                <Button
                  type="button" variant="outline"
                  onClick={() => setShowModal(false)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Creating…" : "Create"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
