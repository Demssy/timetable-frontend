import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { ChevronRight, Plus, Pencil, Trash2, Pin } from "lucide-react"
import { lessonApi } from "@/api/lessonApi"
import { danceGroupApi } from "@/api/danceGroupApi"
import { teacherService } from "@/services/teacherService"
import { timeslotApi } from "@/api/timeslotApi"
import { roomApi } from "@/api/roomApi"
import type { ScheduledLessonDTO, CreateLessonRequest, TimeslotDTO, RoomDTO, DanceGroupDTO } from "@/types/schedule"
import type { TeacherResponse } from "@/types/teacher"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

type ModalMode = "create" | "edit" | null

interface FormState {
  teacherId: number | ""
  danceGroupId: number | ""
  durationMinutes: number
  isPrivate: boolean
  isPinned: boolean
  isActive: boolean
  timeslotId: number | ""
  roomId: number | ""
}

const EMPTY_FORM: FormState = {
  teacherId: "", danceGroupId: "", durationMinutes: 60,
  isPrivate: false, isPinned: false, isActive: true, timeslotId: "", roomId: "",
}

const fmtTime = (t: string) => t.slice(0, 5)

const LEVEL_COLORS: Record<string, string> = {
  BEGINNER: "bg-green-500/20 text-green-400",
  ELEMENTARY: "bg-blue-500/20 text-blue-400",
  INTERMEDIATE: "bg-yellow-500/20 text-yellow-400",
  ADVANCED: "bg-orange-500/20 text-orange-400",
  PROFESSIONAL: "bg-red-500/20 text-red-400",
}

export function LessonsPage() {
  const [lessons, setLessons] = useState<ScheduledLessonDTO[]>([])
  const [teachers, setTeachers] = useState<TeacherResponse[]>([])
  const [groups, setGroups] = useState<DanceGroupDTO[]>([])
  const [timeslots, setTimeslots] = useState<TimeslotDTO[]>([])
  const [rooms, setRooms] = useState<RoomDTO[]>([])

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [editingLesson, setEditingLesson] = useState<ScheduledLessonDTO | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set())

  type LooseLesson = ScheduledLessonDTO & {
    teacher?: ScheduledLessonDTO["teacher"] | null
    danceGroup?: ScheduledLessonDTO["danceGroup"] | null
    teacherId?: number | null
    danceGroupId?: number | null
    groupId?: number | null
    teacherName?: string | null
    groupName?: string | null
  }

  const resolveTeacher = (lesson: LooseLesson) => {
    if (lesson.teacher) return lesson.teacher
    if (typeof lesson.teacherId === "number") {
      return teachers.find((t) => t.id === lesson.teacherId) ?? null
    }
    return null
  }

  const resolveGroup = (lesson: LooseLesson) => {
    if (lesson.danceGroup) return lesson.danceGroup
    const fallbackGroupId =
      typeof lesson.danceGroupId === "number"
        ? lesson.danceGroupId
        : typeof lesson.groupId === "number"
          ? lesson.groupId
          : null

    if (fallbackGroupId !== null) {
      const byId = groups.find((g) => g.id === fallbackGroupId)
      if (byId) return byId
    }

    // Some backend responses provide only group name; map it to loaded groups
    const fallbackGroupName = lesson.groupName ?? null
    if (fallbackGroupName) {
      return groups.find((g) => g.name === fallbackGroupName) ?? null
    }

    return null
  }

  const fetchAll = async () => {
    setIsLoading(true); setError(null)
    
    try {
      // 1. Load core dependencies (Teachers, Timeslots, Rooms)
      // We separate these to ensure they load even if Lessons or Groups fail
      const [t, ts, r] = await Promise.all([
        teacherService.getAllTeachers(),
        timeslotApi.getAll(),
        roomApi.getAll(),
      ])
      setTeachers(t); setTimeslots(ts); setRooms(r)

      // 2. Load Lessons
      try {
        const l = await lessonApi.getAll()
        setLessons(l)
        console.log(l)
      } catch (e) {
        console.error("Failed to load lessons", e)
        // Don't fail the whole page, just show empty lessons
      }

      // 3. Load Dance Groups
      try {
        const g = await danceGroupApi.getAll()
        setGroups(g)
      } catch (e) {
        console.error("Failed to load dance groups", e)
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load core data")
    } finally { setIsLoading(false) }
  }

  useEffect(() => { fetchAll() }, [])

  const openCreate = () => { setEditingLesson(null); setForm(EMPTY_FORM); setFormError(null); setModalMode("create") }
  const openEdit = (rawLesson: ScheduledLessonDTO) => {
    const lesson = rawLesson as LooseLesson
    const teacher = resolveTeacher(lesson)
    const group = resolveGroup(lesson)

    setEditingLesson(rawLesson)
    setForm({
      teacherId: teacher?.id ?? (typeof lesson.teacherId === "number" ? lesson.teacherId : ""),
      danceGroupId:
        group?.id ??
        (typeof lesson.danceGroupId === "number"
          ? lesson.danceGroupId
          : typeof lesson.groupId === "number"
            ? lesson.groupId
            : ""),
      durationMinutes: lesson.durationMinutes,
      isPrivate: lesson.isPrivate,
      isPinned: lesson.isPinned,
      isActive: lesson.isActive,
      timeslotId: lesson.timeslot?.id ?? "",
      roomId: lesson.room?.id ?? "",
    })
    setFormError(null); setModalMode("edit")
  }
  const closeModal = () => { setModalMode(null); setEditingLesson(null); setFormError(null) }

  const buildPayload = (): CreateLessonRequest | null => {
    if (!form.teacherId || !form.danceGroupId) return null
    return {
      teacherId: Number(form.teacherId),
      danceGroupId: Number(form.danceGroupId),
      durationMinutes: form.durationMinutes,
      isPrivate: form.isPrivate,
      isPinned: form.isPinned,
      isActive: form.isActive,
      timeslotId: form.timeslotId !== "" ? Number(form.timeslotId) : null,
      roomId: form.roomId !== "" ? Number(form.roomId) : null,
    }
  }

  const handleToggleActive = async (lessonId: number) => {
    setError(null)
    setTogglingIds((prev) => new Set(prev).add(lessonId))

    try {
      const updatedLesson = await lessonApi.toggleActive(lessonId)
      setLessons((prev) => prev.map((lesson) => (lesson.id === lessonId ? updatedLesson : lesson)))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to toggle lesson active status")
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev)
        next.delete(lessonId)
        return next
      })
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = buildPayload()
    if (!payload) { setFormError("Teacher and Dance Group are required."); return }
    if (form.durationMinutes < 1) { setFormError("Duration must be at least 1 minute."); return }
    if (modalMode === "edit" && editingLesson && editingLesson.id <= 0) {
      setFormError("Invalid lesson id. Please refresh lessons and try again.")
      return
    }
    setIsSaving(true); setFormError(null)
    try {
      if (modalMode === "create") await lessonApi.create(payload)
      else if (editingLesson) await lessonApi.update(editingLesson.id, payload)
      await fetchAll(); closeModal()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save")
    } finally { setIsSaving(false) }
  }

  const handleDelete = async (rawLesson: ScheduledLessonDTO) => {
    const lesson = rawLesson as LooseLesson
    const group = resolveGroup(lesson)
    const groupName = group?.name ?? lesson.groupName ?? "Unknown group"

    if (!window.confirm(`Delete lesson for group "${groupName}"?`)) return
    try { await lessonApi.delete(lesson.id); await fetchAll() }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to delete") }
  }

  const selectClass = "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"

  return (
    <div className="container mx-auto py-10 space-y-8">
      <nav className="flex items-center gap-1.5 text-sm text-slate-400">
        <Link to="/admin" className="hover:text-white transition-colors">Admin Panel</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-white font-medium">Lessons</span>
      </nav>

      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Lessons</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchAll}>Refresh</Button>
          <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Add Lesson</Button>
        </div>
      </div>

      {error && <div className="bg-destructive/15 text-destructive p-4 rounded-md">{error}</div>}

      <Card>
        <CardHeader>
          <CardTitle>All Lessons</CardTitle>
          <CardDescription>Planning entities used by the solver.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-muted-foreground border-b">
                <tr>
                  <th className="h-10 px-3 font-medium">ID</th>
                  <th className="h-10 px-3 font-medium">Teacher</th>
                  <th className="h-10 px-3 font-medium">Group</th>
                  <th className="h-10 px-3 font-medium">Level</th>
                  <th className="h-10 px-3 font-medium">Duration</th>
                  <th className="h-10 px-3 font-medium">Flags</th>
                  <th className="h-10 px-3 font-medium">Timeslot</th>
                  <th className="h-10 px-3 font-medium">Room</th>
                  <th className="h-10 px-3 font-medium">Active</th>
                  <th className="h-10 px-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={10} className="h-24 text-center text-muted-foreground">Loading...</td></tr>
                ) : lessons.length === 0 ? (
                  <tr><td colSpan={10} className="h-24 text-center text-muted-foreground">No lessons found.</td></tr>
                ) : lessons.map((rawLesson) => {
                  const lesson = rawLesson as LooseLesson
                  const teacher = resolveTeacher(lesson)
                  const group = resolveGroup(lesson)
                  const teacherName = teacher?.fullName ?? lesson.teacherName ?? "Unknown teacher"
                  const teacherColor = teacher?.colorCode
                  const groupName = group?.name ?? lesson.groupName ?? "Unknown group"
                  const groupLevel = group?.danceLevel
                  console.log(group)

                  return (
                    <tr key={lesson.id} className="border-b transition-colors hover:bg-muted/50">
                      <td className="p-3 text-muted-foreground">{lesson.id}</td>
                      <td className="p-3">
                        <span className="font-medium" style={teacherColor ? { color: teacherColor } : undefined}>
                          {teacherName}
                        </span>
                      </td>
                      <td className="p-3 font-medium">{groupName}</td>
                      <td className="p-3">
                        {groupLevel ? (
                          <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold", LEVEL_COLORS[groupLevel] ?? "bg-muted text-muted-foreground")}>
                            {groupLevel}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-3">{lesson.durationMinutes}m</td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          {lesson.isPrivate && <span className="inline-flex items-center rounded-full bg-purple-500/20 text-purple-400 px-2 py-0.5 text-xs font-semibold">Private</span>}
                          {lesson.isPinned && <span title="Pinned — solver won't move" className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 text-amber-400 px-2 py-0.5 text-xs font-semibold"><Pin className="h-3 w-3" />Pinned</span>}
                        </div>
                      </td>
                      <td className="p-3 font-mono text-xs text-muted-foreground">
                        {lesson.timeslot ? `${lesson.timeslot.dayOfWeek} ${fmtTime(lesson.timeslot.startTime)}` : "—"}
                      </td>
                      <td className="p-3 text-muted-foreground">{lesson.room?.name ?? "—"}</td>
                      <td className="p-3">
                        <div className="flex items-center justify-center">
                          <Checkbox
                            checked={lesson.isActive}
                            disabled={togglingIds.has(lesson.id)}
                            onCheckedChange={() => handleToggleActive(lesson.id)}
                            aria-label={`Toggle lesson ${lesson.id} active status`}
                          />
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(lesson)}><Pencil className="h-3.5 w-3.5 mr-1" />Edit</Button>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(lesson)}><Trash2 className="h-3.5 w-3.5 mr-1" />Delete</Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <CardHeader>
              <CardTitle>{modalMode === "create" ? "Add Lesson" : "Edit Lesson"}</CardTitle>
            </CardHeader>
            <form onSubmit={handleSave}>
              <CardContent className="space-y-4">
                {formError && <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">{formError}</div>}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Teacher *</Label>
                    <select value={form.teacherId} onChange={e => setForm(p => ({ ...p, teacherId: e.target.value === "" ? "" : Number(e.target.value) }))} className={selectClass} required>
                      <option value="">Select teacher...</option>
                      {teachers.map(t => <option key={t.id} value={t.id}>{t.fullName}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Dance Group *</Label>
                    <select value={form.danceGroupId} onChange={e => setForm(p => ({ ...p, danceGroupId: e.target.value === "" ? "" : Number(e.target.value) }))} className={selectClass} required>
                      <option value="">Select group...</option>
                      {groups.map(g => <option key={g.id} value={g.id}>{g.name} ({g.danceLevel})</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Duration (minutes)</Label>
                  <Input type="number" min={15} step={15} value={form.durationMinutes} onChange={e => setForm(p => ({ ...p, durationMinutes: Number(e.target.value) }))} required />
                </div>

                <div className="flex flex-wrap gap-6">
                  <div className="flex items-center gap-2">
                    <Checkbox id="isPrivate" checked={form.isPrivate} onCheckedChange={val => setForm(p => ({ ...p, isPrivate: val === true }))} />
                    <Label htmlFor="isPrivate">Private lesson</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="isPinned" checked={form.isPinned} onCheckedChange={val => setForm(p => ({ ...p, isPinned: val === true }))} />
                    <Label htmlFor="isPinned">📌 Pin (solver won't move)</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="isActive" checked={form.isActive} onCheckedChange={val => setForm(p => ({ ...p, isActive: val === true }))} />
                    <Label htmlFor="isActive">Active Lesson (Include in schedule)</Label>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Manual assignment (optional — for pinned lessons)</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Timeslot</Label>
                    <select value={form.timeslotId} onChange={e => setForm(p => ({ ...p, timeslotId: e.target.value === "" ? "" : Number(e.target.value) }))} className={selectClass}>
                      <option value="">— Auto —</option>
                      {timeslots.sort((a, b) => a.dayOfWeek.localeCompare(b.dayOfWeek) || a.startTime.localeCompare(b.startTime)).map(ts => (
                        <option key={ts.id} value={ts.id}>{ts.dayOfWeek} {fmtTime(ts.startTime)}–{fmtTime(ts.endTime)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Room</Label>
                    <select value={form.roomId} onChange={e => setForm(p => ({ ...p, roomId: e.target.value === "" ? "" : Number(e.target.value) }))} className={selectClass}>
                      <option value="">— Auto —</option>
                      {rooms.map(r => <option key={r.id} value={r.id}>{r.name} (cap. {r.capacity})</option>)}
                    </select>
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
