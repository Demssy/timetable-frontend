import { useEffect, useState, useMemo } from "react"
import { Link } from "react-router-dom"
import { ChevronRight, Users, GraduationCap, ShieldCheck, Search, Trash2 } from "lucide-react"
import { userService } from "@/services/userService"
import type { User } from "@/types/user"
import { DanceLevel, UserRole } from "@/types/enums"
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
import { useAuth } from "@/contexts/AuthContext"

// ─── Role filter config ───────────────────────────────────────────────────────

type RoleFilter = "ALL" | "STUDENT" | "TEACHER" | "ADMIN"

const ROLE_TABS: { value: RoleFilter; label: string; icon: React.ElementType }[] = [
  { value: "ALL",     label: "All",      icon: Users         },
  { value: "STUDENT", label: "Students", icon: GraduationCap },
  { value: "TEACHER", label: "Teachers", icon: Users         },
  { value: "ADMIN",   label: "Admins",   icon: ShieldCheck   },
]

const ROLE_BADGE: Record<string, string> = {
  ADMIN:   "bg-primary/15 text-primary border border-primary/30",
  TEACHER: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
  STUDENT: "bg-slate-500/15 text-slate-300 border border-slate-500/30",
}

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter & search
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL")
  const [searchQuery, setSearchQuery] = useState("")

  // Edit state
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [formData, setFormData] = useState<Partial<User>>({})
  const [isSaving, setIsSaving] = useState(false)

  // Delete state — tracks which user ID is pending deletion
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)

  useEffect(() => { fetchUsers() }, [])

  const fetchUsers = async () => {
    setIsLoading(true); setError(null)
    try {
      setUsers(await userService.getAllUsers())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users")
    } finally {
      setIsLoading(false)
    }
  }

  // ─── Derived data ──────────────────────────────────────────────────────────

  const roleCounts = useMemo<Record<RoleFilter, number>>(() => ({
    ALL:     users.length,
    STUDENT: users.filter(u => u.role === UserRole.STUDENT).length,
    TEACHER: users.filter(u => u.role === UserRole.TEACHER).length,
    ADMIN:   users.filter(u => u.role === UserRole.ADMIN).length,
  }), [users])

  const filteredUsers = useMemo(() => {
    let result = roleFilter === "ALL"
      ? users
      : users.filter(u => u.role === roleFilter)

    const q = searchQuery.trim().toLowerCase()
    if (q) {
      result = result.filter(
        u => u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      )
    }
    return result
  }, [users, roleFilter, searchQuery])

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleEditClick = (user: User) => {
    setEditingUser(user)
    setFormData({ fullName: user.fullName, email: user.email, role: user.role, danceLevel: user.danceLevel, birthDate: user.birthDate })
  }

  const handleCloseModal = () => { setEditingUser(null); setFormData({}) }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return
    setIsSaving(true)
    try {
      await userService.updateUser(editingUser.id, formData)
      await fetchUsers()
      handleCloseModal()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update user")
    } finally { setIsSaving(false) }
  }

  const handleDelete = async (userId: number) => {
    setDeletingId(userId)
    setConfirmDeleteId(null)
    try {
      await userService.deleteUser(userId)
      setUsers(prev => prev.filter(u => u.id !== userId))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete user")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="container mx-auto py-10 space-y-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-slate-400">
        <Link to="/admin" className="hover:text-white transition-colors">Admin Panel</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-white font-medium">Users</span>
      </nav>

      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">User Management</h1>
        <Button onClick={fetchUsers} variant="outline">Refresh List</Button>
      </div>

      {error && <div className="bg-destructive/15 text-destructive p-4 rounded-md">{error}</div>}

      <Card>
        <CardHeader className="space-y-4">
          <div>
            <CardTitle>All Users</CardTitle>
            <CardDescription>Manage students, teachers, and administrators.</CardDescription>
          </div>

          {/* ── Role filter tabs ─────────────────────────────────── */}
          <div className="flex flex-wrap gap-2">
            {ROLE_TABS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setRoleFilter(value)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                  roleFilter === value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
                <span className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ml-0.5",
                  roleFilter === value
                    ? "bg-white/20 text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}>
                  {roleCounts[value]}
                </span>
              </button>
            ))}
          </div>

          {/* ── Search ───────────────────────────────────────────── */}
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search by name or email…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-muted-foreground border-b">
                <tr>
                  <th className="h-10 px-4 font-medium">ID</th>
                  <th className="h-10 px-4 font-medium">Full Name</th>
                  <th className="h-10 px-4 font-medium">Email</th>
                  <th className="h-10 px-4 font-medium">Role</th>
                  <th className="h-10 px-4 font-medium">Dance Level</th>
                  <th className="h-10 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="h-24 text-center text-muted-foreground">Loading…</td></tr>
                ) : filteredUsers.length === 0 ? (
                  <tr><td colSpan={6} className="h-24 text-center text-muted-foreground">
                    {searchQuery ? "No users match your search." : "No users found."}
                  </td></tr>
                ) : filteredUsers.map(user => (
                  <tr key={user.id} className="border-b transition-colors hover:bg-muted/50">
                    <td className="p-4 text-muted-foreground">{user.id}</td>
                    <td className="p-4 font-medium">{user.fullName}</td>
                    <td className="p-4 text-muted-foreground">{user.email}</td>
                    <td className="p-4">
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        ROLE_BADGE[user.role] ?? "bg-muted text-muted-foreground border border-border"
                      )}>
                        {user.role}
                      </span>
                    </td>
                    <td className="p-4 text-muted-foreground">{user.danceLevel || "—"}</td>
                    <td className="p-4 text-right">
                      {confirmDeleteId === user.id ? (
                        /* ── Inline confirmation ── */
                        <div className="inline-flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground mr-1">Sure?</span>
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={deletingId === user.id}
                            onClick={() => handleDelete(user.id)}
                          >
                            {deletingId === user.id ? "Deleting…" : "Yes, delete"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirmDeleteId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        /* ── Normal action buttons ── */
                        <div className="inline-flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditClick(user)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={user.id === currentUser?.id}
                            title={user.id === currentUser?.id ? "Cannot delete your own account" : "Delete user"}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 disabled:opacity-30"
                            onClick={() => setConfirmDeleteId(user.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!isLoading && (
            <p className="mt-3 text-xs text-muted-foreground text-right">
              Showing {filteredUsers.length} of {users.length} users
            </p>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-lg shadow-lg animate-in fade-in zoom-in-95 duration-200">
            <CardHeader>
              <CardTitle>Edit User</CardTitle>
              <CardDescription>Update details for {editingUser.fullName}</CardDescription>
            </CardHeader>
            <form onSubmit={handleSave}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Full Name</label>
                  <Input name="fullName" value={formData.fullName || ""} onChange={handleInputChange} required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input name="email" type="email" value={formData.email || ""} onChange={handleInputChange} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Role</label>
                    <select name="role" value={formData.role || UserRole.STUDENT} onChange={handleInputChange}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                      {Object.values(UserRole).map(role => <option key={role} value={role}>{role}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Dance Level</label>
                    <select name="danceLevel" value={formData.danceLevel || ""} onChange={handleInputChange}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                      <option value="">None</option>
                      {Object.values(DanceLevel).map(level => <option key={level} value={level}>{level}</option>)}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Birth Date</label>
                  <Input name="birthDate" type="date" value={formData.birthDate || ""} onChange={handleInputChange} />
                </div>
              </CardContent>
              <div className="flex justify-end gap-2 p-6 pt-0">
                <Button type="button" variant="outline" onClick={handleCloseModal} disabled={isSaving}>Cancel</Button>
                <Button type="submit" disabled={isSaving}>{isSaving ? "Saving…" : "Save Changes"}</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}

