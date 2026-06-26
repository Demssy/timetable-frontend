import { useEffect, useState } from "react"
import { Save, CheckCircle, Heart, HeartOff, Users, Loader2, AlertCircle, ChevronDown, CalendarDays, X, Clock } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { WeeklyAvailabilityManager } from "@/components/WeeklyAvailabilityManager"
import { OneTimeUnavailabilityManager } from "@/components/OneTimeUnavailabilityManager"
import { userService } from "@/services/userService"
import { teacherService } from "@/services/teacherService"
import type { WeeklyAvailability, OneTimeUnavailability, StudentResponse } from "@/types/user"
import type { TeacherResponse } from "@/types/teacher"
import { UserRole } from "@/types/enums"
import { cn } from "@/lib/utils"

export default function ProfilePage() {
  const { user, refreshUser } = useAuth()

  // ─── Availability state ────────────────────────────────────────────────────
  const [weeklyAvailabilities, setWeeklyAvailabilities] = useState<WeeklyAvailability[]>([])
  const [oneTimeUnavailabilities, setOneTimeUnavailabilities] = useState<OneTimeUnavailability[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // ─── Collapse state (collapsed by default) ────────────────────────────────
  const [isWeeklyOpen, setIsWeeklyOpen] = useState(false)
  const [isExceptionsOpen, setIsExceptionsOpen] = useState(false)

  // ─── Preference state (STUDENT role) ──────────────────────────────────────
  const [allTeachers, setAllTeachers] = useState<TeacherResponse[]>([])
  const [preferredTeacherIds, setPreferredTeacherIds] = useState<Set<number>>(new Set())

  // ─── Private students state (TEACHER role) ────────────────────────────────
  const [privateStudents, setPrivateStudents] = useState<StudentResponse[]>([])

  // ─── Desired lessons per week ──────────────────────────────────────────────
  const [desiredLessonsPerWeek, setDesiredLessonsPerWeek] = useState<string>("")
  const [loadedStudentProfile, setLoadedStudentProfile] = useState<StudentResponse | null>(null)
  const [loadedTeacherProfile, setLoadedTeacherProfile] = useState<TeacherResponse | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileSuccess, setProfileSuccess] = useState(false)

  // ─── Student availability modal (TEACHER role) ────────────────────────────
  const [availabilityModalStudent, setAvailabilityModalStudent] = useState<StudentResponse | null>(null)
  const [studentAvailabilities, setStudentAvailabilities] = useState<WeeklyAvailability[]>([])
  const [isLoadingStudentAvailability, setIsLoadingStudentAvailability] = useState(false)
  const [studentAvailabilityError, setStudentAvailabilityError] = useState<string | null>(null)

  // ─── Shared async state for preference section ────────────────────────────
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(false)
  const [preferenceError, setPreferenceError] = useState<string | null>(null)
  const [togglingTeacherId, setTogglingTeacherId] = useState<number | null>(null)

  // Sync availability from AuthContext on user identity change
  useEffect(() => {
    if (user) {
      setWeeklyAvailabilities(user.weeklyAvailabilities ?? [])
      setOneTimeUnavailabilities(user.oneTimeUnavailabilities ?? [])
    }
  }, [user?.id])

  // Load role-specific data
  useEffect(() => {
    if (!user) return

    setPreferenceError(null)
    setIsLoadingPreferences(true)

    if (user.role === UserRole.STUDENT) {
      Promise.all([
        teacherService.getAllTeachers(),
        userService.getPreferredTeachers(),
      ])
        .then(([teachers, preferred]) => {
          setAllTeachers(teachers)
          setPreferredTeacherIds(new Set(preferred.map((t) => t.id)))
        })
        .catch((err) => setPreferenceError(err instanceof Error ? err.message : "Failed to load teachers."))
        .finally(() => setIsLoadingPreferences(false))
    } else if (user.role === UserRole.TEACHER) {
      teacherService
        .getMyPrivateStudents()
        .then(setPrivateStudents)
        .catch((err) => setPreferenceError(err instanceof Error ? err.message : "Failed to load students."))
        .finally(() => setIsLoadingPreferences(false))
    } else {
      setIsLoadingPreferences(false)
    }
  }, [user?.id, user?.role])

  // Load desiredLessonsPerWeek from profile endpoint
  useEffect(() => {
    if (!user) return
    if (user.role !== UserRole.STUDENT && user.role !== UserRole.TEACHER) return

    setProfileLoading(true)
    setProfileError(null)

    if (user.role === UserRole.STUDENT) {
      userService.getStudentProfile()
        .then((profile) => {
          setLoadedStudentProfile(profile)
          setDesiredLessonsPerWeek(
            profile.desiredLessonsPerWeek != null ? String(profile.desiredLessonsPerWeek) : ""
          )
        })
        .catch((err) => setProfileError(err instanceof Error ? err.message : "Failed to load profile."))
        .finally(() => setProfileLoading(false))
    } else {
      teacherService.getMyTeacherProfile()
        .then((profile) => {
          setLoadedTeacherProfile(profile)
          setDesiredLessonsPerWeek(
            profile.desiredLessonsPerWeek != null ? String(profile.desiredLessonsPerWeek) : ""
          )
        })
        .catch((err) => setProfileError(err instanceof Error ? err.message : "Failed to load profile."))
        .finally(() => setProfileLoading(false))
    }
  }, [user?.id, user?.role])

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const hasValidationErrors =
    weeklyAvailabilities.some((w) => w.startTime >= w.endTime) ||
    oneTimeUnavailabilities.some((o) => o.startTime >= o.endTime)

  const handleSave = async () => {
    if (hasValidationErrors) {
      setSaveError("Please fix the time range errors before saving.")
      return
    }
    setIsSaving(true)
    setSaveError(null)
    setSaveSuccess(false)
    try {
      await userService.updateAvailability({ weeklyAvailabilities, oneTimeUnavailabilities })
      await refreshUser()
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save schedule.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleTeacher = async (teacherId: number) => {
    setTogglingTeacherId(teacherId)
    setPreferenceError(null)
    try {
      if (preferredTeacherIds.has(teacherId)) {
        await userService.removePreferredTeacher(teacherId)
        setPreferredTeacherIds((prev) => {
          const next = new Set(prev)
          next.delete(teacherId)
          return next
        })
      } else {
        await userService.addPreferredTeacher(teacherId)
        setPreferredTeacherIds((prev) => new Set(prev).add(teacherId))
      }
    } catch (err) {
      setPreferenceError(err instanceof Error ? err.message : "Failed to update preference.")
    } finally {
      setTogglingTeacherId(null)
    }
  }

  const isStudent = user?.role === UserRole.STUDENT
  const isTeacher = user?.role === UserRole.TEACHER

  const handleSaveProfile = async () => {
    if (!user) return

    // Validate: must be empty or a non-negative integer
    const parsed = desiredLessonsPerWeek.trim() === "" ? null : parseInt(desiredLessonsPerWeek, 10)
    if (parsed !== null && (isNaN(parsed) || parsed < 0)) {
      setProfileError("Desired lessons per week must be a whole number ≥ 0.")
      return
    }

    setProfileSaving(true)
    setProfileError(null)
    setProfileSuccess(false)
    try {
      if (isStudent && loadedStudentProfile) {
        await userService.updateStudentProfile({
          fullName: loadedStudentProfile.fullName,
          birthDate: loadedStudentProfile.birthDate,
          danceLevel: loadedStudentProfile.danceLevel,
          parentContact: loadedStudentProfile.parentContact,
          desiredLessonsPerWeek: parsed,
        })
      } else if (isTeacher && loadedTeacherProfile) {
        await teacherService.updateMyTeacherProfile({
          fullName: loadedTeacherProfile.fullName,
          maxDailyHours: loadedTeacherProfile.maxDailyHours,
          desiredLessonsPerWeek: parsed,
          colorCode: loadedTeacherProfile.colorCode,
          qualifiedStyleIds: loadedTeacherProfile.qualifiedStyles.map((s) => s.id),
        })
      } else {
        setProfileError("Profile data is still loading. Please wait and try again.")
        return
      }
      setProfileSuccess(true)
      setTimeout(() => setProfileSuccess(false), 3000)
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Failed to save profile.")
    } finally {
      setProfileSaving(false)
    }
  }

  // ─── View student availability ─────────────────────────────────────────────
  const handleViewAvailability = async (student: StudentResponse) => {
    setAvailabilityModalStudent(student)
    setStudentAvailabilities([])
    setStudentAvailabilityError(null)
    setIsLoadingStudentAvailability(true)
    try {
      const data = await teacherService.getStudentAvailability(student.id)
      setStudentAvailabilities(data.weeklyAvailabilities ?? [])
    } catch (err) {
      setStudentAvailabilityError(err instanceof Error ? err.message : "Failed to load availability.")
    } finally {
      setIsLoadingStudentAvailability(false)
    }
  }

  return (
    <>
    <div className="w-full max-w-7xl flex flex-col lg:flex-row gap-8">
      {/* ─── Left column: User Information ───────────────────────────────── */}
      <div className="w-full lg:w-2/5 space-y-4">
        <h1 className="text-3xl font-bold text-white">Profile</h1>

        <Card className="bg-slate-900/80 border-slate-800">
          <CardContent className="p-6 space-y-4">
            <CardTitle className="text-xl text-white">User Information</CardTitle>

            <div className="space-y-3 text-slate-300">
              <div className="flex justify-between border-b border-slate-700 pb-2">
                <span className="font-semibold">Full Name:</span>
                <span>{user?.fullName}</span>
              </div>
              <div className="flex justify-between border-b border-slate-700 pb-2">
                <span className="font-semibold">Email:</span>
                <span>{user?.email}</span>
              </div>
              <div className="flex justify-between border-b border-slate-700 pb-2">
                <span className="font-semibold">Role:</span>
                <span className="capitalize">{user?.role}</span>
              </div>
              <div className="flex justify-between border-b border-slate-700 pb-2">
                <span className="font-semibold">Status:</span>
                <span className={user?.isActive ? "text-green-400" : "text-red-400"}>
                  {user?.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">User ID:</span>
                <span className="font-mono text-sm">{user?.id}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ─── Lesson Preferences card (STUDENT & TEACHER only) ─────────── */}
        {(isStudent || isTeacher) && (
          <Card className="bg-slate-900/80 border-slate-800">
            <CardContent className="p-6 space-y-4">
              <CardTitle className="text-xl text-white">Lesson Preferences</CardTitle>
              <CardDescription>
                Tell the solver how many lessons per week you'd like to have scheduled.
              </CardDescription>

              {profileSuccess && (
                <div className="flex items-center gap-2 rounded-lg bg-green-500/15 border border-green-500/30 px-3 py-2 text-sm text-green-400">
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  Saved successfully.
                </div>
              )}
              {profileError && (
                <div className="flex items-center gap-2 rounded-lg bg-red-500/15 border border-red-500/30 px-3 py-2 text-sm text-red-400">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {profileError}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300" htmlFor="desired-lessons">
                  Desired lessons per week
                  <span className="ml-1 text-slate-500 font-normal">(optional)</span>
                </label>
                {profileLoading ? (
                  <div className="flex items-center gap-2 text-slate-400 py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Loading…</span>
                  </div>
                ) : (
                  <input
                    id="desired-lessons"
                    type="number"
                    min={0}
                    step={1}
                    placeholder="e.g. 3"
                    value={desiredLessonsPerWeek}
                    onChange={(e) => {
                      setDesiredLessonsPerWeek(e.target.value)
                      setProfileError(null)
                    }}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/60 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                )}
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleSaveProfile}
                  disabled={profileSaving || profileLoading || (isStudent ? !loadedStudentProfile : !loadedTeacherProfile)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {profileSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Preferences
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ─── Right column: Availability + Role-specific sections ─────────── */}
      <div className="w-full lg:w-3/5 space-y-6">
        <h2 className="text-3xl font-bold text-white">Availability &amp; Schedule</h2>

        {/* Feedback banners */}
        {saveSuccess && (
          <div className="flex items-center gap-2 rounded-lg bg-green-500/15 border border-green-500/30 px-4 py-3 text-sm text-green-400">
            <CheckCircle className="h-4 w-4 shrink-0" />
            Schedule saved successfully.
          </div>
        )}
        {saveError && (
          <div className="rounded-lg bg-destructive/15 border border-destructive/30 px-4 py-3 text-sm text-red-400">
            {saveError}
          </div>
        )}

        {/* Weekly availability card */}
        <Card className="bg-slate-900/80 border-slate-800">
          {/* Clickable header */}
          <button
            type="button"
            onClick={() => setIsWeeklyOpen(prev => !prev)}
            className="w-full flex items-center justify-between p-6 text-left"
          >
            <div>
              <CardTitle className="text-lg text-white">Weekly Availability</CardTitle>
              <CardDescription className="mt-1">
                Define your regular weekly schedule. The solver uses this to avoid conflicts.
              </CardDescription>
            </div>
            <ChevronDown
              className={cn(
                "h-5 w-5 shrink-0 text-slate-400 transition-transform duration-300 ml-4",
                isWeeklyOpen && "rotate-180"
              )}
            />
          </button>

          {/* Collapsible body — CSS grid trick for smooth animation */}
          <div className={cn(
            "grid transition-all duration-300 ease-in-out",
            isWeeklyOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          )}>
            <div className="overflow-hidden">
              <div className="px-6 pb-6">
                <WeeklyAvailabilityManager
                  value={weeklyAvailabilities}
                  onChange={setWeeklyAvailabilities}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* One-time unavailability card */}
        <Card className="bg-slate-900/80 border-slate-800">
          {/* Clickable header */}
          <button
            type="button"
            onClick={() => setIsExceptionsOpen(prev => !prev)}
            className="w-full flex items-center justify-between p-6 text-left"
          >
            <div>
              <CardTitle className="text-lg text-white">Exception Days</CardTitle>
              <CardDescription className="mt-1">
                Mark specific dates when you are unavailable (holidays, sick leave, etc.).
              </CardDescription>
            </div>
            <ChevronDown
              className={cn(
                "h-5 w-5 shrink-0 text-slate-400 transition-transform duration-300 ml-4",
                isExceptionsOpen && "rotate-180"
              )}
            />
          </button>

          {/* Collapsible body */}
          <div className={cn(
            "grid transition-all duration-300 ease-in-out",
            isExceptionsOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          )}>
            <div className="overflow-hidden">
              <div className="px-6 pb-6">
                <OneTimeUnavailabilityManager
                  value={oneTimeUnavailabilities}
                  onChange={setOneTimeUnavailabilities}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Save button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={isSaving || hasValidationErrors}
            className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-36"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving…" : "Save Schedule"}
          </Button>
        </div>

        {/* ── STUDENT: Preferred Teachers for Private Lessons ────────────── */}
        {isStudent && (
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white">Private Lesson Preferences</h2>
            <p className="text-slate-400 text-sm">
              Select teachers you'd like to take private lessons with. The solver will prioritise these pairings.
            </p>

            {preferenceError && (
              <div className="flex items-center gap-2 rounded-lg bg-red-500/15 border border-red-500/30 px-4 py-3 text-sm text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {preferenceError}
              </div>
            )}

            {isLoadingPreferences ? (
              <div className="flex items-center justify-center py-12 text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                Loading teachers…
              </div>
            ) : allTeachers.length === 0 ? (
              <p className="text-slate-500 text-sm py-4">No teachers available at the moment.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {allTeachers.map((teacher) => {
                  const isPreferred = preferredTeacherIds.has(teacher.id)
                  const isToggling = togglingTeacherId === teacher.id
                  return (
                    <Card
                      key={teacher.id}
                      className={cn(
                        "bg-slate-900/80 border transition-colors",
                        isPreferred ? "border-indigo-500/60" : "border-slate-800 hover:border-slate-600"
                      )}
                    >
                      <CardContent className="p-4 flex items-start gap-3">
                        {/* Color swatch */}
                        <div
                          className="mt-1 h-4 w-4 rounded-full shrink-0 ring-1 ring-white/20"
                          style={{ backgroundColor: teacher.colorCode ?? undefined }}
                        />

                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white truncate">{teacher.fullName}</p>
                          <p className="text-xs text-slate-400 truncate">{teacher.email}</p>
                          {teacher.qualifiedStyles.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {teacher.qualifiedStyles.map((style) => (
                                <span
                                  key={style.id}
                                  className="inline-block rounded px-1.5 py-0.5 text-[10px] font-medium bg-slate-700 text-slate-300"
                                >
                                  {style.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={isToggling}
                          onClick={() => handleToggleTeacher(teacher.id)}
                          className={cn(
                            "shrink-0 gap-1.5 text-xs",
                            isPreferred
                              ? "text-indigo-400 hover:text-red-400 hover:bg-red-500/10"
                              : "text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10"
                          )}
                          title={isPreferred ? "Remove from preferences" : "Add to preferences"}
                        >
                          {isToggling ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : isPreferred ? (
                            <>
                              <HeartOff className="h-4 w-4" />
                              Remove
                            </>
                          ) : (
                            <>
                              <Heart className="h-4 w-4" />
                              Select
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </section>
        )}

        {/* ── TEACHER: My Private Lesson Students ───────────────────────── */}
        {isTeacher && (
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white">My Private Lesson Students</h2>
            <p className="text-slate-400 text-sm">
              Students who have selected you for private lessons. The solver uses this list during scheduling.
            </p>

            {preferenceError && (
              <div className="flex items-center gap-2 rounded-lg bg-red-500/15 border border-red-500/30 px-4 py-3 text-sm text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {preferenceError}
              </div>
            )}

            <Card className="bg-slate-900/80 border-slate-800">
              <CardContent className="p-4 space-y-0">
                {isLoadingPreferences ? (
                  <div className="flex items-center justify-center py-10 text-slate-400">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Loading students…
                  </div>
                ) : privateStudents.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-10 text-slate-500">
                    <Users className="h-8 w-8" />
                    <p className="text-sm">No students have selected you yet.</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-800">
                    {privateStudents.map((student) => (
                      <li key={student.id} className="flex items-center justify-between py-3 gap-4">
                        <div className="min-w-0">
                          <p className="font-medium text-white truncate">{student.fullName}</p>
                          <p className="text-xs text-slate-400 truncate">{student.email}</p>
                          {student.parentContact && (
                            <p className="text-xs text-slate-500 mt-0.5">
                              Parent: {student.parentContact}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="flex flex-col items-end gap-1">
                            <span className="inline-block rounded-full px-2 py-0.5 text-[11px] font-medium bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500/30">
                              {student.danceLevel}
                            </span>
                            {student.birthDate && (
                              <span className="text-[11px] text-slate-500">
                                DOB: {student.birthDate}
                              </span>
                            )}
                          </div>
                          {/* Availability button */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewAvailability(student)}
                            className="border-slate-700 text-slate-300 hover:text-white hover:border-emerald-500/60 hover:bg-emerald-500/10 gap-1.5"
                            title="View student's weekly availability"
                          >
                            <CalendarDays className="h-3.5 w-3.5 text-emerald-400" />
                            <span className="text-xs">Availability</span>
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </section>
        )}
      </div>
    </div>

    {/* ── Student Availability Modal ──────────────────────────────────────── */}
    {availabilityModalStudent && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        onClick={() => setAvailabilityModalStudent(null)}
      >
        <div
          className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 shadow-2xl flex flex-col max-h-[85vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4 p-5 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-500/15 border border-emerald-500/30 p-2">
                <CalendarDays className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-base leading-tight">
                  {availabilityModalStudent.fullName}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Weekly availability</p>
              </div>
            </div>
            <button
              onClick={() => setAvailabilityModalStudent(null)}
              className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto p-5 space-y-3 flex-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full">
            {isLoadingStudentAvailability ? (
              <div className="flex items-center justify-center py-12 gap-2 text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Loading availability…</span>
              </div>
            ) : studentAvailabilityError ? (
              <div className="flex items-center gap-2 rounded-lg bg-red-500/15 border border-red-500/30 px-4 py-3 text-sm text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {studentAvailabilityError}
              </div>
            ) : studentAvailabilities.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-slate-500">
                <CalendarDays className="h-8 w-8 opacity-40" />
                <p className="text-sm">No weekly availability set by this student.</p>
              </div>
            ) : (
              (() => {
                const DAY_ORDER_LIST = ["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY","SUNDAY"]
                const DAY_LABELS: Record<string, string> = {
                  MONDAY: "Monday", TUESDAY: "Tuesday", WEDNESDAY: "Wednesday",
                  THURSDAY: "Thursday", FRIDAY: "Friday", SATURDAY: "Saturday", SUNDAY: "Sunday",
                }
                const grouped = DAY_ORDER_LIST.reduce<Record<string, WeeklyAvailability[]>>((acc, day) => {
                  const slots = studentAvailabilities.filter(a => a.dayOfWeek === day)
                  if (slots.length > 0) acc[day] = slots
                  return acc
                }, {})

                return (
                  <div className="space-y-2">
                    {DAY_ORDER_LIST.filter(d => grouped[d]).map(day => (
                      <div
                        key={day}
                        className="rounded-xl border border-white/10 bg-slate-800/50 px-4 py-3 flex items-start gap-3"
                      >
                        <div className="w-24 shrink-0">
                          <span className={cn(
                            "text-xs font-semibold uppercase tracking-wide",
                            day === "SATURDAY" || day === "SUNDAY" ? "text-violet-400" : "text-slate-300"
                          )}>
                            {DAY_LABELS[day]}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {grouped[day].map((slot, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300"
                            >
                              <Clock className="h-3 w-3 opacity-70" />
                              {slot.startTime.slice(0, 5)} – {slot.endTime.slice(0, 5)}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-white/10 px-5 py-3 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAvailabilityModalStudent(null)}
              className="border-slate-700 text-slate-300 hover:text-white"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}

