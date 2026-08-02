import React, { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { ChevronRight, Plus, Pencil, Trash2, Pin, Users, User as UserIcon } from "lucide-react"
import { lessonApi } from "@/api/lessonApi"
import { danceGroupApi } from "@/api/danceGroupApi"
import { teacherService } from "@/services/teacherService"
import { userService } from "@/services/userService"
import { timeslotApi } from "@/api/timeslotApi"
import { roomApi } from "@/api/roomApi"
import type { ScheduledLessonDTO, CreateLessonRequest, TimeslotDTO, RoomDTO, DanceGroupDTO } from "@/types/schedule"
import type { TeacherResponse } from "@/types/teacher"
import type { User } from "@/types/user"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

type LessonType = "group" | "private"
type ModalMode = "create" | "edit" | null
type FilterType = "all" | "group" | "private"

interface GroupFormState {
  teacherId: number | ""
  danceGroupId: number | ""
  durationMinutes: number
  isPinned: boolean   // default true
  isActive: boolean
  timeslotId: number | ""  // required — no Auto for group lessons
  roomId: number | ""      // required — pre-selected from first room
}

interface PrivateFormState {
  teacherId: number | ""
  studentId: number | ""
  durationMinutes: number
  isPinned: boolean  // user toggle
  isActive: boolean
  timeslotId: number | ""  // required only if isPinned=true
  roomId: number | ""      // required — pre-selected from first room
}

// ─── Constants ────────────────────────────────────────────────────────────────

const fmtTime = (t: string) => t.slice(0, 5)

const DAY_ORDER = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]

const LEVEL_COLORS: Record<string, string> = {
  BEGINNER:         "bg-green-500/20 text-green-400",
  ELEMENTARY:       "bg-blue-500/20 text-blue-400",
  PRE_INTERMEDIATE: "bg-cyan-500/20 text-cyan-400",
  INTERMEDIATE:     "bg-yellow-500/20 text-yellow-400",
  ADVANCED:         "bg-orange-500/20 text-orange-400",
}

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"

// ─── Default form factories (pre-select first room) ───────────────────────────

const makeDefaultGroupForm = (rooms: RoomDTO[]): GroupFormState => ({
  teacherId: "", danceGroupId: "", durationMinutes: 60,
  isPinned: true, isActive: true, timeslotId: "", roomId: rooms[0]?.id ?? "",
})

const makeDefaultPrivateForm = (rooms: RoomDTO[]): PrivateFormState => ({
  teacherId: "", studentId: "", durationMinutes: 60,
  isPinned: false, isActive: true, timeslotId: "", roomId: rooms[0]?.id ?? "",
})

// ─── Component ────────────────────────────────────────────────────────────────

export function LessonsPage() {
  const [lessons, setLessons] = useState<ScheduledLessonDTO[]>([])
  const [teachers, setTeachers] = useState<TeacherResponse[]>([])
  const [students, setStudents] = useState<User[]>([])
  const [groups, setGroups] = useState<DanceGroupDTO[]>([])
  const [timeslots, setTimeslots] = useState<TimeslotDTO[]>([])
  const [rooms, setRooms] = useState<RoomDTO[]>([])

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [editingLesson, setEditingLesson] = useState<ScheduledLessonDTO | null>(null)

  // Lesson type controls which tab/form is shown
  const [lessonType, setLessonType] = useState<LessonType>("group")

  // Separate form states — each form only tracks its own fields
  const [groupForm, setGroupForm] = useState<GroupFormState>(makeDefaultGroupForm([]))
  const [privateForm, setPrivateForm] = useState<PrivateFormState>(makeDefaultPrivateForm([]))

  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set())

  // ── Filters ─────────────────────────────────────────────────────────────────

  const [filterType, setFilterType] = useState<FilterType>("all")
  const [filterTeacherId, setFilterTeacherId] = useState<number | "all">("all")

  /** Unique teachers present in the loaded lessons list (for the filter dropdown). */
  const teachersInLessons = useMemo(() => {
    const map = new Map<number, string>()
    lessons.forEach(l => {
      if (l.teacher && !map.has(l.teacher.id)) {
        map.set(l.teacher.id, l.teacher.fullName)
      }
    })
    return Array.from(map.entries())
      .map(([id, fullName]) => ({ id, fullName }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName))
  }, [lessons])

  /** Lessons after applying type + teacher filters, sorted by teacher name. */
  const displayedLessons = useMemo(() => {
    let result = lessons

    if (filterType === "group")   result = result.filter(l => !l.isPrivate)
    if (filterType === "private") result = result.filter(l =>  l.isPrivate)

    if (filterTeacherId !== "all") {
      result = result.filter(l => l.teacher?.id === filterTeacherId)
    }

    // When a specific teacher is selected or "sort by teacher" is active,
    // sort alphabetically by teacher name then by lesson id for stability.
    return [...result].sort((a, b) => {
      const nameCmp = (a.teacher?.fullName ?? "").localeCompare(b.teacher?.fullName ?? "")
      return nameCmp !== 0 ? nameCmp : a.id - b.id
    })
  }, [lessons, filterType, filterTeacherId])

  /** Per-tab counts for the filter toolbar. */
  const counts = useMemo(() => ({
    all:     lessons.length,
    group:   lessons.filter(l => !l.isPrivate).length,
    private: lessons.filter(l =>  l.isPrivate).length,
  }), [lessons])

  // ── Sorted timeslots ────────────────────────────────────────────────────────

  const sortedTimeslots = [...timeslots].sort((a, b) => {
    const dayDiff = DAY_ORDER.indexOf(a.dayOfWeek) - DAY_ORDER.indexOf(b.dayOfWeek)
    return dayDiff !== 0 ? dayDiff : a.startTime.localeCompare(b.startTime)
  })

  // ── Data fetching ───────────────────────────────────────────────────────────

  const fetchAll = async () => {
    setIsLoading(true); setError(null)
    try {
      const [t, ts, r, stu] = await Promise.all([
        teacherService.getAllTeachers(),
        timeslotApi.getAll(),
        roomApi.getAll(),
        userService.getStudents(),
      ])
      setTeachers(t); setTimeslots(ts); setRooms(r); setStudents(stu)

      try { setLessons(await lessonApi.getAll()) }
      catch (e) { console.error("Failed to load lessons", e) }

      try { setGroups(await danceGroupApi.getAll()) }
      catch (e) { console.error("Failed to load dance groups", e) }

    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load core data")
    } finally { setIsLoading(false) }
  }

  useEffect(() => { fetchAll() }, [])

  // ── Modal lifecycle ─────────────────────────────────────────────────────────

  const openCreate = () => {
    setLessonType("group")
    setGroupForm(makeDefaultGroupForm(rooms))
    setPrivateForm(makeDefaultPrivateForm(rooms))
    setEditingLesson(null)
    setFormError(null)
    setModalMode("create")
  }

  const openEdit = (lesson: ScheduledLessonDTO) => {
    const type: LessonType = lesson.isPrivate ? "private" : "group"
    setLessonType(type)
    setEditingLesson(lesson)

    if (type === "group") {
      setGroupForm({
        teacherId: lesson.teacher?.id ?? "",
        danceGroupId: lesson.danceGroup?.id ?? "",
        durationMinutes: lesson.durationMinutes,
        isPinned: lesson.isPinned,
        isActive: lesson.isActive,
        timeslotId: lesson.timeslot?.id ?? "",
        roomId: lesson.room?.id ?? rooms[0]?.id ?? "",
      })
    } else {
      setPrivateForm({
        teacherId: lesson.teacher?.id ?? "",
        studentId: lesson.student?.id ?? "",
        durationMinutes: lesson.durationMinutes,
        isPinned: lesson.isPinned,
        isActive: lesson.isActive,
        timeslotId: lesson.timeslot?.id ?? "",
        roomId: lesson.room?.id ?? rooms[0]?.id ?? "",
      })
    }
    setFormError(null)
    setModalMode("edit")
  }

  const closeModal = () => { setModalMode(null); setEditingLesson(null); setFormError(null) }

  /** Switch tabs in create mode — resets only the target tab's form. */
  const switchTab = (type: LessonType) => {
    if (type === "group") setGroupForm(makeDefaultGroupForm(rooms))
    else setPrivateForm(makeDefaultPrivateForm(rooms))
    setLessonType(type)
    setFormError(null)
  }

  // ── Save ────────────────────────────────────────────────────────────────────

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()

    let payload: CreateLessonRequest

    if (lessonType === "group") {
      if (!groupForm.teacherId) { setFormError("Teacher is required."); return }
      if (!groupForm.danceGroupId) { setFormError("Dance Group is required."); return }
      if (!groupForm.timeslotId) { setFormError("Timeslot is required for group lessons."); return }
      if (!groupForm.roomId) { setFormError("Room is required."); return }
      if (groupForm.durationMinutes < 1) { setFormError("Duration must be at least 1 minute."); return }

      payload = {
        teacherId: Number(groupForm.teacherId),
        danceGroupId: Number(groupForm.danceGroupId),
        studentId: null,
        durationMinutes: groupForm.durationMinutes,
        isPrivate: false,
        isPinned: groupForm.isPinned,
        isActive: groupForm.isActive,
        timeslotId: Number(groupForm.timeslotId),
        roomId: Number(groupForm.roomId),
      }
    } else {
      if (!privateForm.teacherId) { setFormError("Teacher is required."); return }
      if (privateForm.isPinned && !privateForm.timeslotId) {
        setFormError("Timeslot is required for pinned private lessons."); return
      }
      if (!privateForm.roomId) { setFormError("Room is required."); return }
      if (privateForm.durationMinutes < 1) { setFormError("Duration must be at least 1 minute."); return }

      payload = {
        teacherId: Number(privateForm.teacherId),
        danceGroupId: null,
        studentId: privateForm.studentId ? Number(privateForm.studentId) : null,
        durationMinutes: privateForm.durationMinutes,
        isPrivate: true,
        isPinned: privateForm.isPinned,
        isActive: privateForm.isActive,
        // If not pinned, solver assigns timeslot automatically
        timeslotId: privateForm.isPinned ? Number(privateForm.timeslotId) : null,
        roomId: Number(privateForm.roomId),
      }
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

  // ── Toggle active ───────────────────────────────────────────────────────────

  const handleToggleActive = async (lessonId: number) => {
    setError(null)
    setTogglingIds((prev) => new Set(prev).add(lessonId))
    try {
      const updated = await lessonApi.toggleActive(lessonId)
      setLessons((prev) => prev.map((l) => (l.id === lessonId ? updated : l)))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to toggle active status")
    } finally {
      setTogglingIds((prev) => { const next = new Set(prev); next.delete(lessonId); return next })
    }
  }

  // ── Delete ──────────────────────────────────────────────────────────────────

  const handleDelete = async (lesson: ScheduledLessonDTO) => {
    const label = lesson.isPrivate
      ? (lesson.student?.fullName ?? "open slot")
      : (lesson.danceGroup?.name ?? "group lesson")
    if (!window.confirm(`Delete lesson for "${label}"?`)) return
    try { await lessonApi.delete(lesson.id); await fetchAll() }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to delete") }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  /** Display name for a lesson's subject (group name or student name). */
  const lessonSubject = (lesson: ScheduledLessonDTO) =>
    lesson.isPrivate
      ? lesson.student?.fullName ?? "Open Slot"
      : lesson.danceGroup?.name ?? "Unknown Group"

  // ── Render ──────────────────────────────────────────────────────────────────

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

      {/* ── Lesson Table ─────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle>All Lessons</CardTitle>
              <CardDescription>Planning entities used by the solver.</CardDescription>
            </div>

            {/* Teacher filter dropdown */}
            <select
              value={filterTeacherId}
              onChange={e => setFilterTeacherId(e.target.value === "all" ? "all" : Number(e.target.value))}
              className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-full sm:w-48"
            >
              <option value="all">All teachers</option>
              {teachersInLessons.map(t => (
                <option key={t.id} value={t.id}>{t.fullName}</option>
              ))}
            </select>
          </div>

          {/* Type filter tabs */}
          <div className="flex gap-1 mt-3 p-1 bg-muted/30 rounded-lg border border-border w-fit">
            {(["all", "group", "private"] as FilterType[]).map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setFilterType(type)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all capitalize",
                  filterType === type
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {type === "group"   && <Users className="h-3 w-3" />}
                {type === "private" && <UserIcon className="h-3 w-3" />}
                {type === "all" ? "All" : type === "group" ? "Group" : "Private"}
                <span className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                  filterType === type ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                )}>
                  {counts[type]}
                </span>
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-muted-foreground border-b">
                <tr>
                  <th className="h-10 px-3 font-medium">ID</th>
                  <th className="h-10 px-3 font-medium">Type</th>
                  <th className="h-10 px-3 font-medium">Teacher</th>
                  <th className="h-10 px-3 font-medium">Group / Student</th>
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
                  <tr><td colSpan={11} className="h-24 text-center text-muted-foreground">Loading...</td></tr>
                ) : displayedLessons.length === 0 ? (
                  <tr><td colSpan={11} className="h-24 text-center text-muted-foreground">
                    {lessons.length === 0 ? "No lessons found." : "No lessons match the current filter."}
                  </td></tr>
                ) : displayedLessons.map((lesson) => {
                  const teacherColor = lesson.teacher?.colorCode
                  const groupLevel = lesson.danceGroup?.danceLevel

                  return (
                    <tr key={lesson.id} className="border-b transition-colors hover:bg-muted/50">
                      <td className="p-3 text-muted-foreground">{lesson.id}</td>
                      <td className="p-3">
                        {lesson.isPrivate
                          ? <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/20 text-purple-400 px-2 py-0.5 text-xs font-semibold"><UserIcon className="h-3 w-3" />Private</span>
                          : <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/20 text-sky-400 px-2 py-0.5 text-xs font-semibold"><Users className="h-3 w-3" />Group</span>
                        }
                      </td>
                      <td className="p-3">
                        <span className="font-medium" style={teacherColor ? { color: teacherColor } : undefined}>
                          {lesson.teacher?.fullName ?? "Unknown"}
                        </span>
                      </td>
                      <td className="p-3 font-medium">
                        {lesson.isPrivate && !lesson.student ? (
                          <span className="text-muted-foreground italic">Open Slot</span>
                        ) : (
                          lessonSubject(lesson)
                        )}
                      </td>
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
                            aria-label={`Toggle lesson ${lesson.id} active`}
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

      {/* ── Create / Edit Modal ───────────────────────────────────────────────── */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <CardHeader className="pb-4">
              {/* Tabs — only switchable in create mode */}
              {modalMode === "create" ? (
                <div className="flex gap-1 p-1 bg-muted/30 rounded-lg border border-border w-fit">
                  <button
                    type="button"
                    onClick={() => switchTab("group")}
                    className={cn(
                      "flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                      lessonType === "group"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Users className="h-3.5 w-3.5" /> Group Lesson
                  </button>
                  <button
                    type="button"
                    onClick={() => switchTab("private")}
                    className={cn(
                      "flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                      lessonType === "private"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <UserIcon className="h-3.5 w-3.5" /> Private Lesson
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
                    lessonType === "group" ? "bg-sky-500/20 text-sky-400" : "bg-purple-500/20 text-purple-400"
                  )}>
                    {lessonType === "group" ? <Users className="h-3 w-3" /> : <UserIcon className="h-3 w-3" />}
                    {lessonType === "group" ? "Group Lesson" : "Private Lesson"}
                  </span>
                  <CardTitle className="text-base">Edit Lesson</CardTitle>
                </div>
              )}
            </CardHeader>

            <form onSubmit={handleSave}>
              <CardContent className="space-y-4 pt-0">
                {formError && (
                  <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">{formError}</div>
                )}

                {/* ── GROUP LESSON FORM ──────────────────────────────────────── */}
                {lessonType === "group" && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Teacher <span className="text-destructive">*</span></Label>
                        <select
                          value={groupForm.teacherId}
                          onChange={e => setGroupForm(p => ({ ...p, teacherId: e.target.value === "" ? "" : Number(e.target.value) }))
                          }
                          className={selectClass} required
                        >
                          <option value="">Select teacher...</option>
                          {teachers.map(t => <option key={t.id} value={t.id}>{t.fullName}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label>Dance Group <span className="text-destructive">*</span></Label>
                        <select
                          value={groupForm.danceGroupId}
                          onChange={e => setGroupForm(p => ({ ...p, danceGroupId: e.target.value === "" ? "" : Number(e.target.value) }))
                          }
                          className={selectClass} required
                        >
                          <option value="">Select group...</option>
                          {groups.map(g => <option key={g.id} value={g.id}>{g.name} ({g.danceLevel})</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Duration (minutes)</Label>
                      <Input type="number" min={15} step={15} value={groupForm.durationMinutes}
                        onChange={e => setGroupForm(p => ({ ...p, durationMinutes: Number(e.target.value) }))} required />
                    </div>

                    <div className="flex flex-wrap gap-6">
                      <div className="flex items-center gap-2">
                        <Checkbox id="grp-isPinned" checked={groupForm.isPinned}
                          onCheckedChange={val => setGroupForm(p => ({ ...p, isPinned: val === true }))} />
                        <Label htmlFor="grp-isPinned">📌 Pin (solver won't move)</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox id="grp-isActive" checked={groupForm.isActive}
                          onCheckedChange={val => setGroupForm(p => ({ ...p, isActive: val === true }))} />
                        <Label htmlFor="grp-isActive">Active (include in schedule)</Label>
                      </div>
                    </div>

                    {/* Timeslot — required, no Auto for group lessons */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Timeslot <span className="text-destructive">*</span></Label>
                        <select
                          value={groupForm.timeslotId}
                          onChange={e => setGroupForm(p => ({ ...p, timeslotId: e.target.value === "" ? "" : Number(e.target.value) }))
                          }
                          className={selectClass} required
                        >
                          <option value="">Select timeslot...</option>
                          {sortedTimeslots.map(ts => (
                            <option key={ts.id} value={ts.id}>{ts.dayOfWeek} {fmtTime(ts.startTime)}–{fmtTime(ts.endTime)}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label>Room <span className="text-destructive">*</span></Label>
                        <select
                          value={groupForm.roomId}
                          onChange={e => setGroupForm(p => ({ ...p, roomId: e.target.value === "" ? "" : Number(e.target.value) }))
                          }
                          className={selectClass} required
                        >
                          <option value="">Select room...</option>
                          {rooms.map(r => <option key={r.id} value={r.id}>{r.name} (cap. {r.capacity})</option>)}
                        </select>
                      </div>
                    </div>
                  </>
                )}

                {/* ── PRIVATE LESSON FORM ────────────────────────────────────── */}
                {lessonType === "private" && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Teacher <span className="text-destructive">*</span></Label>
                        <select
                          value={privateForm.teacherId}
                          onChange={e => setPrivateForm(p => ({ ...p, teacherId: e.target.value === "" ? "" : Number(e.target.value) }))
                          }
                          className={selectClass} required
                        >
                          <option value="">Select teacher...</option>
                          {teachers.map(t => <option key={t.id} value={t.id}>{t.fullName}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label>Student</Label>
                        <select
                          value={privateForm.studentId}
                          onChange={e => setPrivateForm(p => ({ ...p, studentId: e.target.value === "" ? "" : Number(e.target.value) }))
                          }
                          className={selectClass}
                        >
                          <option value="">No student (Open Slot)</option>
                          {students.map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}
                        </select>
                        {!privateForm.studentId && (
                          <p className="text-xs text-muted-foreground">
                            Without a student this becomes an available time slot for the teacher.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Duration (minutes)</Label>
                      <Input type="number" min={15} step={15} value={privateForm.durationMinutes}
                        onChange={e => setPrivateForm(p => ({ ...p, durationMinutes: Number(e.target.value) }))} required />
                    </div>

                    <div className="flex flex-wrap gap-6">
                      <div className="flex items-center gap-2">
                        <Checkbox id="prv-isPinned" checked={privateForm.isPinned}
                          onCheckedChange={val => {
                            const pinned = val === true
                            // Clear timeslot when unpinning — solver will assign it
                            setPrivateForm(p => ({ ...p, isPinned: pinned, timeslotId: pinned ? p.timeslotId : "" }))
                          }} />
                        <Label htmlFor="prv-isPinned">📌 Pin (manually assign timeslot)</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox id="prv-isActive" checked={privateForm.isActive}
                          onCheckedChange={val => setPrivateForm(p => ({ ...p, isActive: val === true }))} />
                        <Label htmlFor="prv-isActive">Active (include in schedule)</Label>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Timeslot — shown & required only when pinned */}
                      <div className="space-y-2">
                        <Label>
                          Timeslot
                          {privateForm.isPinned && <span className="text-destructive ml-0.5">*</span>}
                        </Label>
                        {privateForm.isPinned ? (
                          <select
                            value={privateForm.timeslotId}
                            onChange={e => setPrivateForm(p => ({ ...p, timeslotId: e.target.value === "" ? "" : Number(e.target.value) }))
                            }
                            className={selectClass} required
                          >
                            <option value="">Select timeslot...</option>
                            {sortedTimeslots.map(ts => (
                              <option key={ts.id} value={ts.id}>{ts.dayOfWeek} {fmtTime(ts.startTime)}–{fmtTime(ts.endTime)}</option>
                            ))}
                          </select>
                        ) : (
                          <div className={cn(selectClass, "text-muted-foreground cursor-not-allowed opacity-60")}>
                            Auto (solver assigns)
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Room <span className="text-destructive">*</span></Label>
                        <select
                          value={privateForm.roomId}
                          onChange={e => setPrivateForm(p => ({ ...p, roomId: e.target.value === "" ? "" : Number(e.target.value) }))
                          }
                          className={selectClass} required
                        >
                          <option value="">Select room...</option>
                          {rooms.map(r => <option key={r.id} value={r.id}>{r.name} (cap. {r.capacity})</option>)}
                        </select>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>

              <div className="flex justify-end gap-2 p-6 pt-0">
                <Button type="button" variant="outline" onClick={closeModal} disabled={isSaving}>Cancel</Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Saving..." : modalMode === "create" ? "Create" : "Save"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
