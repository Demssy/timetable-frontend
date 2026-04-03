import type { DanceLevel, UserRole, DayOfWeek } from "./enums"

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
}

// ─── Availability DTOs ────────────────────────────────────────────────────────

export interface WeeklyAvailability {
  id?: number
  dayOfWeek: DayOfWeek
  startTime: string  // format: "HH:mm:ss"
  endTime: string    // format: "HH:mm:ss"
}

export interface OneTimeUnavailability {
  id?: number
  date: string       // format: "YYYY-MM-DD"
  startTime: string  // format: "HH:mm:ss"
  endTime: string    // format: "HH:mm:ss"
  reason?: string
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
  role: UserRole | string
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

export interface RegisterRequest {
  email: string
  password: string
  fullName: string
  birthDate: string
}

