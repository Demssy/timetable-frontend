import type { DanceLevel, UserRole, DayOfWeek, AvailabilityRole } from "./enums"

// ─── Student DTO (mirrors backend StudentResponse) ────────────────────────────

/**
 * Returned by GET /api/teachers/me/students
 * Represents a student who selected the authenticated teacher for private lessons.
 */
export interface StudentResponse {
  id: number
  email: string
  fullName: string
  birthDate: string        // ISO 8601: "YYYY-MM-DD"
  danceLevel: DanceLevel
  parentContact: string | null
  desiredLessonsPerWeek: number | null
}

// ─── Student Profile DTOs (for /api/students/me/profile) ─────────────────────

export interface UpdateStudentProfileRequest {
  fullName: string
  birthDate: string
  danceLevel: DanceLevel | string
  parentContact: string | null
  desiredLessonsPerWeek: number | null
}

// ─── Availability DTOs ────────────────────────────────────────────────────────

export interface WeeklyAvailability {
  id?: number
  dayOfWeek: DayOfWeek
  startTime: string  // format: "HH:mm:ss"
  endTime: string    // format: "HH:mm:ss"
  /** Role this slot belongs to; entries of both roles may be returned together */
  availabilityRole?: AvailabilityRole
}

export interface OneTimeUnavailability {
  id?: number
  date: string       // format: "YYYY-MM-DD"
  startTime: string  // format: "HH:mm:ss"
  endTime: string    // format: "HH:mm:ss"
  reason?: string
  /** Role this exception belongs to */
  availabilityRole?: AvailabilityRole
}

export interface UpdateAvailabilityRequest {
  weeklyAvailabilities: WeeklyAvailability[]
  oneTimeUnavailabilities: OneTimeUnavailability[]
}

// ─── User ─────────────────────────────────────────────────────────────────────

export interface User {
  id: number
  email: string
  fullName: string
  /** Legacy primary role (e.g. 'TEACHER') */
  role: UserRole | string
  /** All authorities, e.g. ['ROLE_TEACHER', 'ROLE_STUDENT']; may be missing for stale sessions */
  roles?: string[]
  birthDate?: string
  danceLevel?: DanceLevel | string
  isActive: boolean
  // Optional because some endpoints (e.g. login) may not include these arrays
  weeklyAvailabilities?: WeeklyAvailability[]
  oneTimeUnavailabilities?: OneTimeUnavailability[]
}

// ─── Auth Request DTOs ────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string
  password: string
}

/** Sent to POST /api/auth/register */
export interface RegisterRequest {
  email: string
  password: string
  fullName: string
  birthDate: string
  /** STUDENT | TEACHER — determines which extra fields are used */
  role: UserRole

  // ── Student-only ──────────────────────────────────────────────────────────
  /** Initial dance level (students only) */
  danceLevel?: DanceLevel
  /** Contact for parent/guardian — required when student is a minor */
  parentContact?: string | null
  /** How many lessons per week the student desires */
  desiredLessonsPerWeek?: number | null

  // ── Teacher-only ──────────────────────────────────────────────────────────
  /** Phone number for scheduling coordination */
  phone?: string | null
  /** Dance style IDs the teacher can teach */
  qualifiedStyleIds?: number[]
  /** Short biography / teaching experience */
  bio?: string | null

  // ── Teacher who is also a student ─────────────────────────────────────────
  /** True when a teacher also registers as a student (role stays TEACHER) */
  alsoStudent?: boolean
  /** Student dance level (only when alsoStudent is true) */
  studentLevel?: DanceLevel
  /** Preferred dance style IDs as a student (only when alsoStudent is true) */
  studentPreferredStyleIds?: number[]
}

