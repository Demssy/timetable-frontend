import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { ChevronRight, Plus, Trash2, FolderOpen } from "lucide-react"
import { format, addDays, parseISO } from "date-fns"
import { scheduleApi } from "@/api/scheduleApi"
import type { ScheduleMetadataDTO, CreateScheduleRequest } from "@/types/schedule"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function SchedulesPage() {
  const navigate = useNavigate()
  const [schedules, setSchedules] = useState<ScheduleMetadataDTO[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: "", validFrom: "" })
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const fetchSchedules = async () => {
    setIsLoading(true); setError(null)
    try { setSchedules(await scheduleApi.getAll()) }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to load schedules") }
    finally { setIsLoading(false) }
  }

  useEffect(() => { fetchSchedules() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setFormError("Name is required."); return }
    if (!form.validFrom) { setFormError("Start date is required."); return }
    setIsSaving(true); setFormError(null)
    try {
      const validFromDate = parseISO(form.validFrom)
      const validToDate = addDays(validFromDate, 6)
      const payload: CreateScheduleRequest = {
        name: form.name,
        validFrom: form.validFrom,
        validTo: format(validToDate, "yyyy-MM-dd")
      }
      const created = await scheduleApi.create(payload)
      await fetchSchedules()
      setShowModal(false)
      setForm({ name: "", validFrom: "" })
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
          <Button onClick={() => { setFormError(null); setShowModal(true) }}>
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
                  <th className="h-10 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={4} className="h-24 text-center text-muted-foreground">Loading...</td></tr>
                ) : schedules.length === 0 ? (
                  <tr><td colSpan={4} className="h-24 text-center text-muted-foreground">No schedules yet. Create one!</td></tr>
                ) : schedules.map(s => (
                  <tr key={s.id} className="border-b transition-colors hover:bg-muted/50">
                    <td className="p-4 text-muted-foreground">{s.id}</td>
                    <td className="p-4 font-medium">{s.name}</td>
                    <td className="p-4 font-mono text-muted-foreground">
                      {s.validFrom} <span className="text-slate-600">to</span> {s.validTo}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/schedules/${s.id}`)}>
                          <FolderOpen className="h-3.5 w-3.5 mr-1" />Open
                        </Button>
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
              <CardContent className="space-y-4">
                {formError && <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">{formError}</div>}
                <div className="space-y-2">
                  <Label>Schedule Name</Label>
                  <Input placeholder="Week 1 — Spring 2026" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input type="date" value={form.validFrom} onChange={e => setForm(p => ({ ...p, validFrom: e.target.value }))} required />
                  <p className="text-xs text-muted-foreground">Valid for 7 days from this date.</p>
                </div>
              </CardContent>
              <div className="flex justify-end gap-2 p-6 pt-0">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)} disabled={isSaving}>Cancel</Button>
                <Button type="submit" disabled={isSaving}>{isSaving ? "Creating..." : "Create"}</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
