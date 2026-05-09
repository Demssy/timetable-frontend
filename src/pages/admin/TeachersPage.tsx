import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { ChevronRight, Plus, Trash2, Pencil, Search, X } from "lucide-react"
import { teacherService } from "@/services/teacherService"
import { userService } from "@/services/userService"
import type { TeacherResponse, CreateTeacherRequest, UpdateTeacherRequest, DanceStyleDTO } from "@/types/teacher"
import type { User } from "@/types/user"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

type ModalMode = "create" | "edit" | null

interface CreateFormState {
  userId: number | null
  maxDailyHours: number
  colorCode: string
  qualifiedStyleIds: number[]
}

interface EditFormState {
  fullName: string
  email: string
  maxDailyHours: number
  colorCode: string
  qualifiedStyleIds: number[]
}

const EMPTY_CREATE_FORM: CreateFormState = {
  userId: null,
  maxDailyHours: 6,
  colorCode: "#3498DB",
  qualifiedStyleIds: [],
}

// Fallback dictionary aligned with current backend dance_styles table.
const DEFAULT_DANCE_STYLES: DanceStyleDTO[] = [
  { id: 1, name: "Salsa" },
  { id: 2, name: "Bachata" },
  { id: 3, name: "Kizomba" },
  { id: 4, name: "Hip Hop" },
  { id: 5, name: "Contemporary" },
  { id: 6, name: "Jazz Funk" },
  { id: 7, name: "Ballroom" },
  { id: 8, name: "Latin" },
]

// ─── UserAutocomplete ─────────────────────────────────────────────────────────

interface UserAutocompleteProps {
  selectedUser: User | null
  onSelect: (user: User | null) => void
}

function UserAutocomplete({ selectedUser, onSelect }: UserAutocompleteProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<User[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    setIsOpen(true)

    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (value.trim().length < 2) {
      setResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const users = await userService.searchByEmail(value)
        setResults(users)
      } catch {
        setResults([])
      } finally {
        setIsSearching(false)
      }
    }, 300)
  }

  const handleSelect = (user: User) => {
    onSelect(user)
    setQuery("")
    setResults([])
    setIsOpen(false)
  }

  const handleClear = () => {
    onSelect(null)
    setQuery("")
    setResults([])
  }

  // ── Render: user already selected ──────────────────────────────────────────
  if (selectedUser) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-input bg-muted/40 px-3 py-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{selectedUser.fullName}</p>
          <p className="text-xs text-muted-foreground truncate">{selectedUser.email}</p>
        </div>
        <span className="text-xs text-muted-foreground shrink-0">ID: {selectedUser.id}</span>
        <button
          type="button"
          onClick={handleClear}
          className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Clear selected user"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    )
  }

  // ── Render: search input + dropdown ────────────────────────────────────────
  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          type="email"
          placeholder="Search user by email..."
          value={query}
          onChange={handleQueryChange}
          onFocus={() => query.trim().length >= 2 && setIsOpen(true)}
          className="pl-9"
          autoComplete="off"
        />
      </div>

      {isOpen && (query.trim().length >= 2) && (
        <div className="absolute z-10 mt-1 w-full rounded-md border border-input bg-popover shadow-lg overflow-hidden">
          {isSearching ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">Searching...</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">No users found.</p>
          ) : (
            <ul className="max-h-48 overflow-y-auto divide-y divide-border">
              {results.map((user) => (
                <li key={user.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(user)}
                    className="w-full flex items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                  >
                    <span>
                      <span className="font-medium">{user.fullName}</span>
                      <span className="ml-2 text-muted-foreground">{user.email}</span>
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0 ml-2">
                      ID: {user.id}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

// ─── StyleCheckboxGrid ────────────────────────────────────────────────────────

interface StyleCheckboxGridProps {
  styles: DanceStyleDTO[]
  selected: number[]
  onToggle: (styleId: number) => void
}

function StyleCheckboxGrid({ styles, selected, onToggle }: StyleCheckboxGridProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">
        Qualified Styles
        <span className="ml-1 text-muted-foreground font-normal">
          ({selected.length} selected)
        </span>
      </label>
      <div className="grid grid-cols-2 gap-2 rounded-md border border-input p-3">
        {styles.map((style) => {
          const isChecked = selected.includes(style.id)
          return (
            <label
              key={style.id}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm transition-colors select-none",
                isChecked
                  ? "bg-primary/15 text-primary font-medium"
                  : "hover:bg-muted/50 text-muted-foreground"
              )}
            >
              <input
                type="checkbox"
                className="accent-primary"
                checked={isChecked}
                onChange={() => onToggle(style.id)}
              />
              {style.name}
            </label>
          )
        })}
      </div>
    </div>
  )
}

// ─── TeachersPage ─────────────────────────────────────────────────────────────

export function TeachersPage() {
  const [teachers, setTeachers] = useState<TeacherResponse[]>([])
  const [availableStyles, setAvailableStyles] = useState<DanceStyleDTO[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [editingTeacher, setEditingTeacher] = useState<TeacherResponse | null>(null)

  // Separate form states for create vs edit
  const [createForm, setCreateForm] = useState<CreateFormState>(EMPTY_CREATE_FORM)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [editForm, setEditForm] = useState<EditFormState>({
    fullName: "", email: "", maxDailyHours: 6, colorCode: "#3498DB", qualifiedStyleIds: [],
  })

  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // ─── Data fetching ────────────────────────────────────────────────────────

  const fetchTeachers = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [data, styleDictionary] = await Promise.all([
        teacherService.getAllTeachers(),
        teacherService.getDanceStyles().catch(() => [] as DanceStyleDTO[]),
      ])

      const stylesFromTeachers = data.flatMap((teacher) => teacher.qualifiedStyles)
      const mergedStyles = [...DEFAULT_DANCE_STYLES, ...styleDictionary, ...stylesFromTeachers]
      const uniqueStyles = Array.from(new Map(mergedStyles.map((style) => [style.id, style])).values())
        .sort((a, b) => a.id - b.id)

      setTeachers(data)
      setAvailableStyles(uniqueStyles)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load teachers")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchTeachers() }, [])

  // ─── Modal helpers ────────────────────────────────────────────────────────

  const openCreateModal = () => {
    setCreateForm(EMPTY_CREATE_FORM)
    setSelectedUser(null)
    setFormError(null)
    setModalMode("create")
  }

  const openEditModal = (teacher: TeacherResponse) => {
    setEditingTeacher(teacher)
    setEditForm({
      fullName: teacher.fullName,
      email: teacher.email,
      maxDailyHours: teacher.maxDailyHours ?? 6,
      colorCode: teacher.colorCode ?? "#3498DB",
      qualifiedStyleIds: teacher.qualifiedStyles.map((style) => style.id),
    })

    setAvailableStyles((prev) => {
      const merged = [...prev, ...teacher.qualifiedStyles]
      return Array.from(new Map(merged.map((style) => [style.id, style])).values())
    })

    setFormError(null)
    setModalMode("edit")
  }

  const closeModal = () => {
    setModalMode(null)
    setEditingTeacher(null)
    setFormError(null)
  }

  // ─── Form handlers ────────────────────────────────────────────────────────

  const handleUserSelect = (user: User | null) => {
    setSelectedUser(user)
    setCreateForm((prev) => ({ ...prev, userId: user?.id ?? null }))
  }

  const handleCreateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target
    setCreateForm((prev) => ({
      ...prev,
      [name]: type === "number" ? Number(value) : value,
    }))
  }

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target
    setEditForm((prev) => ({
      ...prev,
      [name]: type === "number" ? Number(value) : value,
    }))
  }

  const handleCreateStyleToggle = (styleId: number) => {
    setCreateForm((prev) => ({
      ...prev,
      qualifiedStyleIds: prev.qualifiedStyleIds.includes(styleId)
        ? prev.qualifiedStyleIds.filter((id) => id !== styleId)
        : [...prev.qualifiedStyleIds, styleId],
    }))
  }

  const handleEditStyleToggle = (styleId: number) => {
    setEditForm((prev) => ({
      ...prev,
      qualifiedStyleIds: prev.qualifiedStyleIds.includes(styleId)
        ? prev.qualifiedStyleIds.filter((id) => id !== styleId)
        : [...prev.qualifiedStyleIds, styleId],
    }))
  }

  // ─── Validation ───────────────────────────────────────────────────────────

  const validateCreate = (): string | null => {
    if (!createForm.userId) return "Please select a user from the search."
    if (createForm.maxDailyHours < 1 || createForm.maxDailyHours > 12) return "Max daily hours must be between 1 and 12."
    if (!/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(createForm.colorCode)) return "Invalid color code format."
    if (createForm.qualifiedStyleIds.length === 0) return "Select at least one dance style."
    return null
  }

  const validateEdit = (): string | null => {
    if (editForm.fullName.trim().length < 2) return "Full name must be at least 2 characters."
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email)) return "Please enter a valid email."
    if (editForm.maxDailyHours < 1 || editForm.maxDailyHours > 12) return "Max daily hours must be between 1 and 12."
    if (editForm.qualifiedStyleIds.length === 0) return "Select at least one dance style."
    return null
  }

  // ─── CRUD handlers ────────────────────────────────────────────────────────

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()

    const validationError = modalMode === "create" ? validateCreate() : validateEdit()
    if (validationError) { setFormError(validationError); return }

    setIsSaving(true)
    setFormError(null)
    try {
      if (modalMode === "create") {
        const payload: CreateTeacherRequest = {
          userId: createForm.userId!,
          maxDailyHours: createForm.maxDailyHours,
          colorCode: createForm.colorCode,
          qualifiedStyleIds: createForm.qualifiedStyleIds,
        }
        await teacherService.createTeacher(payload)
      } else if (modalMode === "edit" && editingTeacher) {
        const payload: UpdateTeacherRequest = {
          fullName: editForm.fullName,
          email: editForm.email,
          maxDailyHours: editForm.maxDailyHours,
          colorCode: editForm.colorCode,
          qualifiedStyleIds: editForm.qualifiedStyleIds,
        }
        await teacherService.updateTeacher(editingTeacher.id, payload)
      }
      await fetchTeachers()
      closeModal()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save teacher")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (teacher: TeacherResponse) => {
    if (!window.confirm(`Delete teacher "${teacher.fullName}"? This action cannot be undone.`)) return
    try {
      await teacherService.deleteTeacher(teacher.id)
      await fetchTeachers()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete teacher")
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="container mx-auto py-10 space-y-8">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-slate-400">
        <Link to="/admin" className="hover:text-white transition-colors">Admin Panel</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-white font-medium">Teachers</span>
      </nav>

      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Teacher Management</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchTeachers}>Refresh</Button>
          <Button onClick={openCreateModal}>
            <Plus className="h-4 w-4 mr-2" />
            Add Teacher
          </Button>
        </div>
      </div>

      {/* Global error */}
      {error && (
        <div className="bg-destructive/15 text-destructive p-4 rounded-md">{error}</div>
      )}

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Teachers</CardTitle>
          <CardDescription>Manage teacher profiles, their schedules and dance styles.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-muted-foreground border-b">
                <tr>
                  <th className="h-10 px-4 font-medium">ID</th>
                  <th className="h-10 px-4 font-medium">Full Name</th>
                  <th className="h-10 px-4 font-medium">Email</th>
                  <th className="h-10 px-4 font-medium">Max Daily Hours</th>
                  <th className="h-10 px-4 font-medium">Color</th>
                  <th className="h-10 px-4 font-medium">Qualified Styles</th>
                  <th className="h-10 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={7} className="h-24 text-center text-muted-foreground">Loading...</td></tr>
                ) : teachers.length === 0 ? (
                  <tr><td colSpan={7} className="h-24 text-center text-muted-foreground">No teachers found.</td></tr>
                ) : (
                  teachers.map((teacher) => (
                    <tr key={teacher.id} className="border-b transition-colors hover:bg-muted/50">
                      <td className="p-4 text-muted-foreground">{teacher.id}</td>
                      <td className="p-4 font-medium">{teacher.fullName}</td>
                      <td className="p-4 text-muted-foreground">{teacher.email}</td>
                      <td className="p-4">{teacher.maxDailyHours}h</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block h-5 w-5 rounded border border-slate-600 shrink-0"
                            style={{ backgroundColor: teacher.colorCode ?? undefined }}
                            title={teacher.colorCode ?? undefined}
                          />
                          <span className="text-muted-foreground text-xs font-mono">{teacher.colorCode}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {teacher.qualifiedStyles.map((style) => (
                            <span key={style.id} className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                              {style.name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEditModal(teacher)}>
                            <Pencil className="h-3.5 w-3.5 mr-1" />Edit
                          </Button>
                          <Button
                            variant="ghost" size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(teacher)}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── CREATE Modal ───────────────────────────────────────────────────── */}
      {modalMode === "create" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <CardHeader>
              <CardTitle>Add New Teacher</CardTitle>
              <CardDescription>
                Select an existing user to promote to the Teacher role.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSave}>
              <CardContent className="space-y-4">
                {formError && (
                  <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">{formError}</div>
                )}

                {/* User autocomplete */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    User
                    <span className="ml-1 text-muted-foreground font-normal">(type email to search)</span>
                  </label>
                  <UserAutocomplete selectedUser={selectedUser} onSelect={handleUserSelect} />
                </div>

                {/* Max Daily Hours + Color */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Max Daily Hours</label>
                    <Input
                      name="maxDailyHours"
                      type="number"
                      min={1}
                      max={12}
                      value={createForm.maxDailyHours}
                      onChange={handleCreateInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Color Code</label>
                    <div className="flex items-center gap-2">
                      <label
                        htmlFor="createColorPicker"
                        className="flex h-9 w-10 shrink-0 cursor-pointer items-center justify-center rounded-md border border-input overflow-hidden p-0.5"
                        style={{ backgroundColor: createForm.colorCode }}
                      >
                        <input
                          id="createColorPicker"
                          name="colorCode"
                          type="color"
                          value={createForm.colorCode}
                          onChange={handleCreateInputChange}
                          className="sr-only"
                        />
                      </label>
                      <Input
                        name="colorCode"
                        placeholder="#3498DB"
                        value={createForm.colorCode}
                        onChange={handleCreateInputChange}
                        className="font-mono"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Qualified Styles */}
                <StyleCheckboxGrid
                  styles={availableStyles}
                  selected={createForm.qualifiedStyleIds}
                  onToggle={handleCreateStyleToggle}
                />
              </CardContent>
              <div className="flex justify-end gap-2 p-6 pt-0">
                <Button type="button" variant="outline" onClick={closeModal} disabled={isSaving}>Cancel</Button>
                <Button type="submit" disabled={isSaving || !createForm.userId}>
                  {isSaving ? "Saving..." : "Create Teacher"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* ── EDIT Modal ─────────────────────────────────────────────────────── */}
      {modalMode === "edit" && editingTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <CardHeader>
              <CardTitle>Edit Teacher</CardTitle>
              <CardDescription>Updating details for {editingTeacher.fullName}</CardDescription>
            </CardHeader>
            <form onSubmit={handleSave}>
              <CardContent className="space-y-4">
                {formError && (
                  <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">{formError}</div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium">Full Name</label>
                  <Input name="fullName" value={editForm.fullName} onChange={handleEditInputChange} required minLength={2} />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input name="email" type="email" value={editForm.email} onChange={handleEditInputChange} required />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Max Daily Hours</label>
                    <Input name="maxDailyHours" type="number" min={1} max={12} value={editForm.maxDailyHours} onChange={handleEditInputChange} required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Color Code</label>
                    <div className="flex items-center gap-2">
                      <label
                        htmlFor="editColorPicker"
                        className="flex h-9 w-10 shrink-0 cursor-pointer items-center justify-center rounded-md border border-input overflow-hidden p-0.5"
                        style={{ backgroundColor: editForm.colorCode }}
                      >
                        <input
                          id="editColorPicker"
                          name="colorCode"
                          type="color"
                          value={editForm.colorCode}
                          onChange={handleEditInputChange}
                          className="sr-only"
                        />
                      </label>
                      <Input name="colorCode" placeholder="#3498DB" value={editForm.colorCode} onChange={handleEditInputChange} className="font-mono" required />
                    </div>
                  </div>
                </div>

                <StyleCheckboxGrid styles={availableStyles} selected={editForm.qualifiedStyleIds} onToggle={handleEditStyleToggle} />
              </CardContent>
              <div className="flex justify-end gap-2 p-6 pt-0">
                <Button type="button" variant="outline" onClick={closeModal} disabled={isSaving}>Cancel</Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
