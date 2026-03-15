import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { ChevronRight } from "lucide-react"
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

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Edit State
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [formData, setFormData] = useState<Partial<User>>({})
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await userService.getAllUsers()
      setUsers(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users")
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditClick = (user: User) => {
    setEditingUser(user)
    setFormData({
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      danceLevel: user.danceLevel,
      birthDate: user.birthDate,
    })
  }

  const handleCloseModal = () => {
    setEditingUser(null)
    setFormData({})
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
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
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="container mx-auto py-10 space-y-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-slate-400">
        <Link to="/admin" className="hover:text-white transition-colors">
          Admin Panel
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-white font-medium">Users</span>
      </nav>

      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">User Management</h1>
        <Button onClick={fetchUsers} variant="outline">
          Refresh List
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/15 text-destructive p-4 rounded-md">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            Manage students, teachers, and administrators.
          </CardDescription>
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
                  <tr>
                    <td colSpan={6} className="h-24 text-center">
                      Loading...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="h-24 text-center">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b transition-colors hover:bg-muted/50"
                    >
                      <td className="p-4">{user.id}</td>
                      <td className="p-4 font-medium">{user.fullName}</td>
                      <td className="p-4 text-muted-foreground">{user.email}</td>
                      <td className="p-4">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                            user.role === UserRole.ADMIN
                              ? "bg-primary text-primary-foreground"
                              : user.role === UserRole.TEACHER
                              ? "bg-secondary text-secondary-foreground"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="p-4">{user.danceLevel || "-"}</td>
                      <td className="p-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditClick(user)}
                        >
                          Edit
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Modal Overlay */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-lg shadow-lg animate-in fade-in zoom-in-95 duration-200">
            <CardHeader>
              <CardTitle>Edit User</CardTitle>
              <CardDescription>
                Update details for {editingUser.fullName}
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSave}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Full Name</label>
                  <Input
                    name="fullName"
                    value={formData.fullName || ""}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    name="email"
                    type="email"
                    value={formData.email || ""}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Role</label>
                    <select
                      name="role"
                      value={formData.role || UserRole.STUDENT}
                      onChange={handleInputChange}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      {Object.values(UserRole).map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Dance Level</label>
                    <select
                      name="danceLevel"
                      value={formData.danceLevel || ""}
                      onChange={handleInputChange}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="">None</option>
                      {Object.values(DanceLevel).map((level) => (
                        <option key={level} value={level}>
                          {level}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Birth Date</label>
                     <Input
                        name="birthDate"
                        type="date"
                        value={formData.birthDate || ""}
                        onChange={handleInputChange}
                      />
                </div>
              </CardContent>
              <div className="flex justify-end gap-2 p-6 pt-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseModal}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
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

