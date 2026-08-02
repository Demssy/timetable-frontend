import { Link, Outlet } from "react-router-dom"
import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { UserRole } from "@/types/enums"
import { LayoutGrid, Home, User, ShieldCheck, LogIn, UserPlus, LogOut, X, ChevronDown, Loader2, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { teacherService } from "@/services/teacherService"
import type { DanceStyleDTO, TeacherResponse } from "@/types/teacher"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export default function Layout() {
  const { isAuthenticated, user, logout, refreshUser } = useAuth()
  const [isNavOpen, setIsNavOpen] = useState(false)
  const [isUserInfoOpen, setIsUserInfoOpen] = useState(false)
  const [isTeacherEditOpen, setIsTeacherEditOpen] = useState(false)
  const [availableStyles, setAvailableStyles] = useState<DanceStyleDTO[]>([])
  const [selectedStyleIds, setSelectedStyleIds] = useState<number[]>([])
  const [teacherColor, setTeacherColor] = useState("#3498DB")
  const [teacherProfile, setTeacherProfile] = useState<TeacherResponse | null>(null)
  const [isTeacherDataLoading, setIsTeacherDataLoading] = useState(false)
  const [isTeacherSaving, setIsTeacherSaving] = useState(false)
  const [teacherFormError, setTeacherFormError] = useState<string | null>(null)
  const [teacherFormSuccess, setTeacherFormSuccess] = useState<string | null>(null)

  const handleLogout = async () => {
    setIsNavOpen(false)
    setIsUserInfoOpen(false)
    await logout()
  }

  const closeNav = () => {
    setIsNavOpen(false)
    setIsUserInfoOpen(false)
  }

  useEffect(() => {
    if (!isTeacherEditOpen || user?.role !== UserRole.TEACHER) return

    let cancelled = false

    const loadTeacherSettings = async () => {
      setIsTeacherDataLoading(true)
      setTeacherFormError(null)
      try {
        const [profile, styles] = await Promise.all([
          teacherService.getMyTeacherProfile(),
          teacherService.getDanceStyles(),
        ])

        if (cancelled) return

        const mergedStyles = Array.from(
          new Map([...styles, ...profile.qualifiedStyles].map((style) => [style.id, style])).values()
        ).sort((a, b) => a.name.localeCompare(b.name))

        setTeacherProfile(profile)
        setAvailableStyles(mergedStyles)
        setSelectedStyleIds(profile.qualifiedStyles.map((style) => style.id))
        setTeacherColor(profile.colorCode ?? "#3498DB")
      } catch (err) {
        if (cancelled) return
        setTeacherFormError(err instanceof Error ? err.message : "Failed to load teacher settings")
      } finally {
        if (!cancelled) setIsTeacherDataLoading(false)
      }
    }

    void loadTeacherSettings()

    return () => {
      cancelled = true
    }
  }, [isTeacherEditOpen, user?.role])

  const toggleStyle = (styleId: number) => {
    setSelectedStyleIds((prev) => (
      prev.includes(styleId)
        ? prev.filter((id) => id !== styleId)
        : [...prev, styleId]
    ))
  }

  const handleSaveTeacherSettings = async () => {
    if (!teacherProfile) return

    if (selectedStyleIds.length === 0) {
      setTeacherFormError("Select at least one dance style.")
      return
    }

    setIsTeacherSaving(true)
    setTeacherFormError(null)
    setTeacherFormSuccess(null)
    try {
      await teacherService.updateMyTeacherProfile({
        fullName: teacherProfile.fullName,
        maxDailyHours: teacherProfile.maxDailyHours,
        desiredLessonsPerWeek: teacherProfile.desiredLessonsPerWeek,
        colorCode: teacherColor,
        qualifiedStyleIds: selectedStyleIds,
      })

      await refreshUser()
      setTeacherFormSuccess("Teacher settings updated.")
    } catch (err) {
      setTeacherFormError(err instanceof Error ? err.message : "Failed to update teacher settings")
    } finally {
      setIsTeacherSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col">
      <header className="py-4 px-6 border-b border-slate-800 bg-transparent">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="text-white font-bold text-lg">
            Timetable
          </Link>

          {/* Nav trigger */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsNavOpen((prev) => !prev)}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200",
                "border border-slate-700 bg-slate-800/60 text-slate-300",
                "hover:bg-slate-700/80 hover:text-white hover:border-slate-600",
                isNavOpen && "bg-slate-700/80 text-white border-slate-600"
              )}
            >
              {isNavOpen ? (
                <X className="h-4 w-4" />
              ) : (
                <LayoutGrid className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">
                {isAuthenticated && user ? user.fullName : "Menu"}
              </span>
            </button>

            {/* Dropdown */}
            {isNavOpen && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={closeNav}
                />
                {/* Panel */}
                <div className="absolute right-0 mt-2 z-20 w-64 rounded-2xl border border-slate-700 bg-slate-900/95 backdrop-blur-md shadow-2xl shadow-black/40 overflow-hidden">
                  <div className="p-1.5 space-y-0.5">
                    {isAuthenticated && user && (
                      <>
                        {/* Username trigger — reveals full user info on click */}
                        <button
                          type="button"
                          onClick={() => setIsUserInfoOpen((prev) => !prev)}
                          className="w-full flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                        >
                          <span className="flex flex-col items-start min-w-0">
                            <span className="text-sm font-medium text-white truncate max-w-[9.5rem]">
                              {user.fullName}
                            </span>
                            <span className="text-[11px] text-slate-500 capitalize">{user.role}</span>
                          </span>
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 shrink-0 text-slate-500 transition-transform",
                              isUserInfoOpen && "rotate-180"
                            )}
                          />
                        </button>

                        {isUserInfoOpen && (
                          <div className="px-3 py-2 space-y-1.5 text-slate-300 bg-slate-800/50 rounded-xl">
                            <div className="flex justify-between gap-2 border-b border-slate-700 pb-1.5">
                              <span className="font-semibold text-xs">Email:</span>
                              <span className="text-xs truncate">{user.email}</span>
                            </div>
                            <div className="flex justify-between gap-2 border-b border-slate-700 pb-1.5">
                              <span className="font-semibold text-xs">Status:</span>
                              <span className={cn("text-xs", user.isActive ? "text-green-400" : "text-red-400")}>
                                {user.isActive ? "Active" : "Inactive"}
                              </span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span className="font-semibold text-xs">User ID:</span>
                              <span className="font-mono text-xs">{user.id}</span>
                            </div>

                            {user.role === UserRole.TEACHER && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="w-full mt-2 border-slate-600 text-slate-200 hover:text-white"
                                onClick={() => {
                                  setTeacherFormError(null)
                                  setTeacherFormSuccess(null)
                                  setIsTeacherEditOpen(true)
                                }}
                              >
                                <Sparkles className="h-3.5 w-3.5 mr-1" />
                                Edit categories & color
                              </Button>
                            )}
                          </div>
                        )}

                        <div className="my-1 border-t border-slate-800" />
                      </>
                    )}

                    <Link
                      to="/"
                      onClick={closeNav}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                      <Home className="h-4 w-4 text-slate-400" />
                      Home
                    </Link>

                    {!isAuthenticated ? (
                      <>
                        <Link
                          to="/login"
                          onClick={closeNav}
                          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                        >
                          <LogIn className="h-4 w-4 text-slate-400" />
                          Login
                        </Link>
                        <Link
                          to="/signup"
                          onClick={closeNav}
                          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                        >
                          <UserPlus className="h-4 w-4 text-slate-400" />
                          Sign Up
                        </Link>
                      </>
                    ) : (
                      <>
                        {user?.role === UserRole.ADMIN && (
                          <Link
                            to="/admin"
                            onClick={closeNav}
                            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                          >
                            <ShieldCheck className="h-4 w-4 text-slate-400" />
                            Admin
                          </Link>
                        )}
                        <Link
                          to="/profile"
                          onClick={closeNav}
                          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                        >
                          <User className="h-4 w-4 text-slate-400" />
                          Profile
                        </Link>

                        <button
                          type="button"
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                        >
                          <LogOut className="h-4 w-4" />
                          Logout
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <Outlet />
      </div>

      <Dialog
        open={isTeacherEditOpen}
        onOpenChange={(open) => {
          if (isTeacherSaving) return
          setIsTeacherEditOpen(open)
          if (!open) {
            setTeacherFormError(null)
            setTeacherFormSuccess(null)
          }
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Teacher Settings</DialogTitle>
            <DialogDescription>
              Update your dance styles and teacher color.
            </DialogDescription>
          </DialogHeader>

          {isTeacherDataLoading ? (
            <div className="flex items-center gap-2 py-8 text-slate-300">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading teacher settings...
            </div>
          ) : (
            <div className="space-y-4">
              {teacherFormError && (
                <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {teacherFormError}
                </div>
              )}

              {teacherFormSuccess && (
                <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
                  {teacherFormSuccess}
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="teacherColor" className="text-sm font-medium text-slate-200">
                  Teacher Color
                </label>
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="teacherColor"
                    className="flex h-9 w-10 shrink-0 cursor-pointer items-center justify-center rounded-md border border-slate-600 overflow-hidden p-0.5"
                    style={{ backgroundColor: teacherColor }}
                  >
                    <input
                      id="teacherColor"
                      type="color"
                      value={teacherColor}
                      onChange={(e) => setTeacherColor(e.target.value)}
                      className="sr-only"
                    />
                  </label>
                  <Input
                    value={teacherColor}
                    onChange={(e) => setTeacherColor(e.target.value)}
                    placeholder="#3498DB"
                    className="font-mono"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-200">Dance Categories</p>
                <div className="grid grid-cols-2 gap-2 rounded-md border border-slate-700 p-3 max-h-56 overflow-y-auto">
                  {availableStyles.length === 0 ? (
                    <p className="col-span-2 text-sm text-slate-400">No dance categories available.</p>
                  ) : (
                    availableStyles.map((style) => {
                      const isChecked = selectedStyleIds.includes(style.id)
                      return (
                        <label
                          key={style.id}
                          className={cn(
                            "flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm transition-colors select-none",
                            isChecked
                              ? "bg-indigo-500/15 text-indigo-200"
                              : "hover:bg-slate-800/60 text-slate-300"
                          )}
                        >
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => toggleStyle(style.id)}
                          />
                          {style.name}
                        </label>
                      )
                    })
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsTeacherEditOpen(false)}
                  disabled={isTeacherSaving}
                >
                  Cancel
                </Button>
                <Button type="button" onClick={handleSaveTeacherSettings} disabled={isTeacherSaving || isTeacherDataLoading}>
                  {isTeacherSaving ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <footer className="py-4 text-center text-slate-500">
        © {new Date().getFullYear()} Timetable
      </footer>
    </main>
  )
}
