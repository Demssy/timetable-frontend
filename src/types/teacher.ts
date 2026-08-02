export interface DanceStyleDTO {
  id: number
  name: string
}

// ─── Response DTO (mirrors backend TeacherResponse) ───────────────────────────

export interface TeacherResponse {
  id: number
  fullName: string
  email: string
  maxDailyHours: number | null
  colorCode: string | null
  qualifiedStyles: DanceStyleDTO[]
  desiredLessonsPerWeek: number | null
}

// ─── Request DTOs ─────────────────────────────────────────────────────────────

/**
 * Mirrors backend CreateTeacherRequest record.
 * Promotes an existing user to TEACHER role — no credentials needed.
 */
export interface CreateTeacherRequest {
  userId: number
  maxDailyHours: number
  colorCode: string
  qualifiedStyleIds: number[]
}

export interface UpdateTeacherRequest {
  fullName: string
  email: string
  maxDailyHours: number
  colorCode: string
  qualifiedStyleIds: number[]
}

// ─── Profile DTOs (for /api/teachers/me/profile) ──────────────────────────────

export interface UpdateTeacherProfileRequest {
  fullName: string
  maxDailyHours: number | null
  desiredLessonsPerWeek: number | null
  colorCode: string | null
  qualifiedStyleIds: number[] | null
}

