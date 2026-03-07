import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { ChevronRight, Plus, Pencil, Trash2 } from "lucide-react"
import { roomApi } from "@/api/roomApi"
import type { RoomDTO } from "@/types/schedule"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

type ModalMode = "create" | "edit" | null

interface FormState {
  name: string
  capacity: number
  allowsParallelPrivate: boolean
}

const EMPTY_FORM: FormState = { name: "", capacity: 20, allowsParallelPrivate: false }

export function RoomsPage() {
  const [rooms, setRooms] = useState<RoomDTO[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [editingRoom, setEditingRoom] = useState<RoomDTO | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const fetchRooms = async () => {
    setIsLoading(true); setError(null)
    try { setRooms(await roomApi.getAll()) }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to load rooms") }
    finally { setIsLoading(false) }
  }

  useEffect(() => { fetchRooms() }, [])

  const openCreate = () => { setEditingRoom(null); setForm(EMPTY_FORM); setFormError(null); setModalMode("create") }
  const openEdit = (r: RoomDTO) => { setEditingRoom(r); setForm({ name: r.name, capacity: r.capacity, allowsParallelPrivate: r.allowsParallelPrivate }); setFormError(null); setModalMode("edit") }
  const closeModal = () => { setModalMode(null); setEditingRoom(null); setFormError(null) }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setFormError("Name is required."); return }
    if (form.capacity < 1) { setFormError("Capacity must be at least 1."); return }
    setIsSaving(true); setFormError(null)
    try {
      if (modalMode === "create") await roomApi.create(form)
      else if (editingRoom?.id) await roomApi.update(editingRoom.id, form)
      await fetchRooms(); closeModal()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save")
    } finally { setIsSaving(false) }
  }

  const handleDelete = async (room: RoomDTO) => {
    if (!window.confirm(`Delete room "${room.name}"?`)) return
    try { await roomApi.delete(room.id!); await fetchRooms() }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to delete") }
  }

  return (
    <div className="container mx-auto py-10 space-y-8">
      <nav className="flex items-center gap-1.5 text-sm text-slate-400">
        <Link to="/admin" className="hover:text-white transition-colors">Admin Panel</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-white font-medium">Rooms</span>
      </nav>

      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Rooms</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchRooms}>Refresh</Button>
          <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Add Room</Button>
        </div>
      </div>

      {error && <div className="bg-destructive/15 text-destructive p-4 rounded-md">{error}</div>}

      <Card>
        <CardHeader>
          <CardTitle>All Rooms</CardTitle>
          <CardDescription>Dance halls available for scheduling.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-muted-foreground border-b">
                <tr>
                  <th className="h-10 px-4 font-medium">ID</th>
                  <th className="h-10 px-4 font-medium">Name</th>
                  <th className="h-10 px-4 font-medium">Capacity</th>
                  <th className="h-10 px-4 font-medium">Parallel Private</th>
                  <th className="h-10 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={5} className="h-24 text-center text-muted-foreground">Loading...</td></tr>
                ) : rooms.length === 0 ? (
                  <tr><td colSpan={5} className="h-24 text-center text-muted-foreground">No rooms found.</td></tr>
                ) : rooms.map((room) => (
                  <tr key={room.id} className="border-b transition-colors hover:bg-muted/50">
                    <td className="p-4 text-muted-foreground">{room.id}</td>
                    <td className="p-4 font-medium">{room.name}</td>
                    <td className="p-4">{room.capacity}</td>
                    <td className="p-4">
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
                        room.allowsParallelPrivate ? "bg-green-500/20 text-green-400" : "bg-muted text-muted-foreground"
                      )}>
                        {room.allowsParallelPrivate ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(room)}>
                          <Pencil className="h-3.5 w-3.5 mr-1" />Edit
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(room)}>
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

      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <Card className="w-full max-w-md shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <CardHeader>
              <CardTitle>{modalMode === "create" ? "Add Room" : "Edit Room"}</CardTitle>
            </CardHeader>
            <form onSubmit={handleSave}>
              <CardContent className="space-y-4">
                {formError && <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">{formError}</div>}
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Main Hall" required />
                </div>
                <div className="space-y-2">
                  <Label>Capacity</Label>
                  <Input type="number" min={1} value={form.capacity} onChange={e => setForm(p => ({ ...p, capacity: Number(e.target.value) }))} required />
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="allowsParallel"
                    checked={form.allowsParallelPrivate}
                    onCheckedChange={(val) => setForm(p => ({ ...p, allowsParallelPrivate: val === true }))}
                  />
                  <Label htmlFor="allowsParallel">Allows parallel private lessons</Label>
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
