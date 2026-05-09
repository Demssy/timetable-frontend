import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { ChevronRight, Plus, Pencil, Trash2 } from "lucide-react"
import { danceGroupApi } from "@/api/danceGroupApi"
import { danceStyleApi } from "@/api/danceStyleApi"
import { DanceLevel } from "@/types/enums"
import type { DanceGroupDTO } from "@/types/schedule"
import type { DanceStyleDTO } from "@/types/teacher"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

type ModalMode = "create" | "edit" | null

interface FormState {
  name: string
  danceStyleId: number
  danceLevel: DanceGroupDTO["danceLevel"]
  minSize: number
  targetAgeRange: string
}

const EMPTY_FORM: FormState = {
  name: "",
  danceStyleId: 1,
  danceLevel: DanceLevel.BEGINNER,
  minSize: 1,
  targetAgeRange: "",
}

const LEVEL_COLORS: Record<string, string> = {
  BEGINNER:         "bg-green-500/20 text-green-400",
  ELEMENTARY:       "bg-blue-500/20 text-blue-400",
  PRE_INTERMEDIATE: "bg-cyan-500/20 text-cyan-400",
  INTERMEDIATE:     "bg-yellow-500/20 text-yellow-400",
  ADVANCED:         "bg-orange-500/20 text-orange-400",
}

const DANCE_LEVELS = Object.values(DanceLevel)


export function DanceGroupsPage() {
  const [groups, setGroups] = useState<DanceGroupDTO[]>([])
  const [danceStyles, setDanceStyles] = useState<DanceStyleDTO[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [editingGroup, setEditingGroup] = useState<DanceGroupDTO | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const fetchGroups = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [groupData, styleData] = await Promise.all([
        danceGroupApi.getAll(),
        danceStyleApi.getAll().catch(() => [] as DanceStyleDTO[]),
      ])

      const stylesFromGroups = groupData
        .filter((group) => group.danceStyleId > 0)
        .map((group) => ({
          id: group.danceStyleId,
          name: group.danceStyleName || `Style #${group.danceStyleId}`,
        }))

      const mergedStyles = [ ...styleData, ...stylesFromGroups]
      const uniqueStyles = Array.from(new Map(mergedStyles.map((style) => [style.id, style])).values())
        .sort((a, b) => a.id - b.id)
      console.log(styleData)
      setGroups(groupData)
      setDanceStyles(uniqueStyles)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dance groups")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchGroups()
  }, [])

  const openCreate = () => {
    setEditingGroup(null)
    const defaultStyleId = danceStyles[0]?.id ?? EMPTY_FORM.danceStyleId
    setForm({ ...EMPTY_FORM, danceStyleId: defaultStyleId })
    setFormError(null)
    setModalMode("create")
  }

  const openEdit = (group: DanceGroupDTO) => {
    setEditingGroup(group)
    setForm({
      name: group.name,
      danceStyleId: group.danceStyleId,
      danceLevel: group.danceLevel,
      minSize: group.minSize ?? 1,
      targetAgeRange: group.targetAgeRange ?? "",
    })
    setFormError(null)
    setModalMode("edit")
  }

  const closeModal = () => {
    setModalMode(null)
    setEditingGroup(null)
    setFormError(null)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setFormError("Name is required.")
      return
    }
    if (danceStyles.length === 0) {
      setFormError("Dance styles are unavailable. Please refresh the page.")
      return
    }
    if (form.danceStyleId < 1) {
      setFormError("Dance style is required.")
      return
    }
    if (form.minSize < 1) {
      setFormError("Min size must be at least 1.")
      return
    }

    setIsSaving(true)
    setFormError(null)
    try {
      const payload = {
        name: form.name.trim(),
        danceStyleId: form.danceStyleId,
        danceLevel: form.danceLevel,
        minSize: form.minSize,
        targetAgeRange: form.targetAgeRange.trim() || null,
      }

      if (modalMode === "create") {
        await danceGroupApi.create(payload)
      } else if (editingGroup) {
        await danceGroupApi.update(editingGroup.id, payload)
      }

      await fetchGroups()
      closeModal()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (group: DanceGroupDTO) => {
    if (!window.confirm(`Delete dance group "${group.name}"?`)) return
    try {
      await danceGroupApi.delete(group.id)
      await fetchGroups()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete")
    }
  }

  const selectClass = "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"

  return (
    <div className="container mx-auto py-10 space-y-8">
      <nav className="flex items-center gap-1.5 text-sm text-slate-400">
        <Link to="/admin" className="hover:text-white transition-colors">Admin Panel</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-white font-medium">Dance Groups</span>
      </nav>

      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Dance Groups</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchGroups}>Refresh</Button>
          <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Add Group</Button>
        </div>
      </div>

      {error && <div className="bg-destructive/15 text-destructive p-4 rounded-md">{error}</div>}

      <Card>
        <CardHeader>
          <CardTitle>All Dance Groups</CardTitle>
          <CardDescription>Manage student groups used in schedule planning.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-muted-foreground border-b">
                <tr>
                  <th className="h-10 px-4 font-medium">ID</th>
                  <th className="h-10 px-4 font-medium">Name</th>
                  <th className="h-10 px-4 font-medium">Style</th>
                  <th className="h-10 px-4 font-medium">Level</th>
                  <th className="h-10 px-4 font-medium">Min Size</th>
                  <th className="h-10 px-4 font-medium">Target Age</th>
                  <th className="h-10 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={7} className="h-24 text-center text-muted-foreground">Loading...</td></tr>
                ) : groups.length === 0 ? (
                  <tr><td colSpan={7} className="h-24 text-center text-muted-foreground">No dance groups found.</td></tr>
                ) : groups.map((group) => (
                  <tr key={group.id} className="border-b transition-colors hover:bg-muted/50">
                    <td className="p-4 text-muted-foreground">{group.id}</td>
                    <td className="p-4 font-medium">{group.name}</td>
                    <td className="p-4 text-muted-foreground">{group.danceStyleName || `#${group.danceStyleId}`}</td>
                    <td className="p-4">
                      <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold", LEVEL_COLORS[group.danceLevel] ?? "bg-muted text-muted-foreground")}>
                        {group.danceLevel}
                      </span>
                    </td>
                    <td className="p-4">{group.minSize}</td>
                    <td className="p-4 text-muted-foreground">{group.targetAgeRange ?? "-"}</td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(group)}>
                          <Pencil className="h-3.5 w-3.5 mr-1" />Edit
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(group)}>
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
              <CardTitle>{modalMode === "create" ? "Add Dance Group" : "Edit Dance Group"}</CardTitle>
            </CardHeader>
            <form onSubmit={handleSave}>
              <CardContent className="space-y-4">
                {formError && <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">{formError}</div>}
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={form.name}
                    onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Beginner Salsa Group A"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Dance Style</Label>
                  <select
                    value={form.danceStyleId}
                    onChange={e => setForm(prev => ({ ...prev, danceStyleId: Number(e.target.value) }))}
                    className={selectClass}
                    disabled={danceStyles.length === 0}
                    required
                  >
                    {danceStyles.map((style) => (
                      <option key={style.id} value={style.id}>
                        {style.name}
                      </option>
                    ))}
                  </select>
                  {danceStyles.length === 0 && (
                    <p className="text-xs text-destructive">Dance styles are not loaded. Click Refresh and try again.</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Dance Level</Label>
                  <select
                    value={form.danceLevel}
                    onChange={e => setForm(prev => ({ ...prev, danceLevel: e.target.value as DanceGroupDTO["danceLevel"] }))}
                    className={selectClass}
                  >
                    {DANCE_LEVELS.map(level => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Min Size</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.minSize}
                    onChange={e => setForm(prev => ({ ...prev, minSize: Number(e.target.value) }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Target Age Range</Label>
                  <Input
                    value={form.targetAgeRange}
                    onChange={e => setForm(prev => ({ ...prev, targetAgeRange: e.target.value }))}
                    placeholder="16-25"
                  />
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



