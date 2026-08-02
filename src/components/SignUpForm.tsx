import type React from "react"
import { useState, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { cn } from "@/lib/utils"
import { DanceLevel, UserRole } from "@/types/enums"
import type { DanceStyleDTO } from "@/types/teacher"
import { teacherService } from "@/services/teacherService"

// ── helpers ──────────────────────────────────────────────────────────────────

const DANCE_LEVEL_LABELS: Record<string, string> = {
  BEGINNER: "Beginner",
  ELEMENTARY: "Elementary",
  PRE_INTERMEDIATE: "Pre-Intermediate",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
}

type Mode = "STUDENT" | "TEACHER"

// ── component ─────────────────────────────────────────────────────────────────

export function SignupForm() {
  // ── shared ─────────────────────────────────────────────────────────────────
  const [mode, setMode] = useState<Mode>("STUDENT")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [birthDate, setBirthDate] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  // ── student-specific ───────────────────────────────────────────────────────
  const [danceLevel, setDanceLevel] = useState<string>("")
  const [parentContact, setParentContact] = useState("")
  const [desiredLessons, setDesiredLessons] = useState<string>("")

  // ── teacher-specific ──────────────────────────────────────────────────────
  const [phone, setPhone] = useState("")
  const [bio, setBio] = useState("")
  const [specialization, setSpecialization] = useState<number[]>([])
  const [availableStyles, setAvailableStyles] = useState<DanceStyleDTO[]>([])
  const [isLoadingStyles, setIsLoadingStyles] = useState(false)
  const [stylesError, setStylesError] = useState("")

  const navigate = useNavigate()
  const { register } = useAuth()

  /** Show parent contact field only when student is a minor (< 18 years) */
  const isMinor = useMemo(() => {
    if (!birthDate) return false
    const birth = new Date(birthDate)
    const today = new Date()
    const age = today.getFullYear() - birth.getFullYear() -
      (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0)
    return age < 18
  }, [birthDate])

  const toggleStyle = (styleId: number) => {
    setSpecialization((prev) =>
      prev.includes(styleId) ? prev.filter((id) => id !== styleId) : [...prev, styleId]
    )
  }

  useEffect(() => {
    if (mode !== "TEACHER" || availableStyles.length > 0 || isLoadingStyles || !!stylesError) return

    const loadDanceStyles = async () => {
      setIsLoadingStyles(true)
      setStylesError("")
      try {
        const styles = await teacherService.getDanceStyles()
        setAvailableStyles(styles)
      } catch (err) {
        setStylesError(err instanceof Error ? err.message : "Failed to load dance styles")
      } finally {
        setIsLoadingStyles(false)
      }
    }

    void loadDanceStyles()
  }, [mode, availableStyles.length, isLoadingStyles, stylesError])

  const isFormValid = useMemo(() => {
    const base = name && email && birthDate && password && confirmPassword
    if (!base) return false
    if (mode === "STUDENT") return true
    if (mode === "TEACHER") return specialization.length > 0
    return true
  }, [name, email, birthDate, password, confirmPassword, mode, specialization])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }
    if (new Date(birthDate) >= new Date()) {
      setError("Birth date must be in the past")
      return
    }
    if (mode === "TEACHER" && specialization.length === 0) {
      setError("Please select at least one dance style")
      return
    }

    setIsLoading(true)
    try {
      await register({
        email,
        password,
        fullName: name,
        birthDate,
        role: UserRole[mode],
        // student
        ...(mode === "STUDENT" && {
          danceLevel: danceLevel as typeof DanceLevel[keyof typeof DanceLevel] || undefined,
          parentContact: isMinor ? parentContact || null : null,
          desiredLessonsPerWeek: desiredLessons ? Number(desiredLessons) : null,
        }),
        // teacher
        ...(mode === "TEACHER" && {
          phone: phone || null,
          qualifiedStyleIds: specialization,
          bio: bio || null,
        }),
      })
      navigate("/", { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // ── render ─────────────────────────────────────────────────────────────────
  const inputClass = "bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500"

  return (
    <div className="w-full max-w-md">
      <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-sm">
        <div className="p-8 space-y-6">

          {/* ── Header ─────────────────────────────────────────────────── */}
          <div className="space-y-2 text-center">
            <div className="inline-flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">T</span>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white">Create an account</h1>
            <p className="text-sm text-slate-400">Get started with your timetable</p>
          </div>

          {/* ── Mode toggle ────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-800 rounded-xl">
            {(["STUDENT", "TEACHER"] as Mode[]).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError("") }}
                className={cn(
                  "py-2 rounded-lg text-sm font-semibold transition-all duration-200",
                  mode === m
                    ? "bg-blue-600 text-white shadow"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                {m === "STUDENT" ? "🎓 Student" : "🎤 Teacher"}
              </button>
            ))}
          </div>

          {/* ── Form ───────────────────────────────────────────────────── */}
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* shared fields */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-slate-300">Full Name</Label>
              <Input id="name" type="text" placeholder="John Doe"
                value={name} onChange={e => setName(e.target.value)}
                required className={inputClass} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com"
                value={email} onChange={e => setEmail(e.target.value)}
                required className={inputClass} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="birthDate" className="text-slate-300">Birth Date</Label>
              <Input id="birthDate" type="date"
                value={birthDate} onChange={e => setBirthDate(e.target.value)}
                required max={new Date().toISOString().split("T")[0]}
                className={inputClass} />
            </div>

            {/* ── Student-only fields ──────────────────────────────────── */}
            {mode === "STUDENT" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="danceLevel" className="text-slate-300">
                    Dance Level <span className="text-slate-500 text-xs">(optional)</span>
                  </Label>
                  <select
                    id="danceLevel"
                    value={danceLevel}
                    onChange={e => setDanceLevel(e.target.value)}
                    className={cn(
                      "w-full h-9 rounded-md border px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500",
                      inputClass
                    )}
                  >
                    <option value="">— Select level —</option>
                    {Object.keys(DanceLevel).map(key => (
                      <option key={key} value={key}>{DANCE_LEVEL_LABELS[key]}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="desiredLessons" className="text-slate-300">
                    Desired lessons / week <span className="text-slate-500 text-xs">(optional)</span>
                  </Label>
                  <Input id="desiredLessons" type="number" min="1" max="14"
                    placeholder="e.g. 3"
                    value={desiredLessons}
                    onChange={e => setDesiredLessons(e.target.value)}
                    className={inputClass} />
                </div>

                {isMinor && (
                  <div className="space-y-2">
                    <Label htmlFor="parentContact" className="text-slate-300">
                      Parent / Guardian contact
                      <span className="ml-1 text-xs text-amber-400">Required for minors</span>
                    </Label>
                    <Input id="parentContact" type="text"
                      placeholder="+1 555 000 0000 / parent@email.com"
                      value={parentContact}
                      onChange={e => setParentContact(e.target.value)}
                      required
                      className={inputClass} />
                  </div>
                )}
              </>
            )}

            {/* ── Teacher-only fields ──────────────────────────────────── */}
            {mode === "TEACHER" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-slate-300">
                    Phone <span className="text-slate-500 text-xs">(optional)</span>
                  </Label>
                  <Input id="phone" type="tel" placeholder="+1 555 000 0000"
                    value={phone} onChange={e => setPhone(e.target.value)}
                    className={inputClass} />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">
                    Dance categories
                    <span className="ml-1 text-xs text-blue-400">*</span>
                  </Label>
                  {isLoadingStyles && (
                    <p className="text-xs text-slate-500">Loading dance styles...</p>
                  )}
                  {stylesError && (
                    <div className="space-y-2">
                      <p className="text-xs text-red-400">{stylesError}</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setAvailableStyles([])
                          setStylesError("")
                        }}
                      >
                        Retry loading styles
                      </Button>
                    </div>
                  )}
                  {!isLoadingStyles && !stylesError && availableStyles.length === 0 && (
                    <p className="text-xs text-slate-500">No dance styles available.</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {availableStyles.map((style) => (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => toggleStyle(style.id)}
                        className={cn(
                          "px-3 py-1 rounded-full text-xs font-medium border transition-all duration-150",
                          specialization.includes(style.id)
                            ? "bg-blue-600 border-blue-500 text-white"
                            : "bg-slate-800 border-slate-600 text-slate-400 hover:border-blue-500 hover:text-slate-200"
                        )}
                      >
                        {style.name}
                      </button>
                    ))}
                  </div>
                  {specialization.length === 0 && (
                    <p className="text-xs text-slate-500">Select at least one category</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio" className="text-slate-300">
                    Bio / Teaching experience <span className="text-slate-500 text-xs">(optional)</span>
                  </Label>
                  <textarea
                    id="bio"
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    placeholder="Tell students a bit about your background..."
                    rows={3}
                    className={cn(
                      "w-full rounded-md border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500",
                      inputClass
                    )}
                  />
                </div>
              </>
            )}

            {/* ── Password fields ──────────────────────────────────────── */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300">Password</Label>
              <Input id="password" type="password" placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)}
                required className={inputClass} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-slate-300">Confirm Password</Label>
              <Input id="confirmPassword" type="password" placeholder="••••••••"
                value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                required className={inputClass} />
            </div>

            {/* ── Error ────────────────────────────────────────────────── */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* ── Submit ───────────────────────────────────────────────── */}
            <Button
              type="submit"
              disabled={isLoading || !isFormValid}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2"
            >
              {isLoading
                ? "Creating account…"
                : mode === "STUDENT" ? "Register as Student" : "Register as Teacher"}
            </Button>
          </form>

          {/* ── Footer ─────────────────────────────────────────────────── */}
          <div className="text-center text-sm text-slate-400">
            Already have an account?{" "}
            <Link to="/login" className="text-blue-400 hover:text-blue-300 font-semibold">
              Sign in
            </Link>
          </div>

        </div>
      </Card>
    </div>
  )
}
