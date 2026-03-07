import type { DanceStyle } from "@/types/enums"

// ─── Response DTO (mirrors backend TeacherResponse) ───────────────────────────

export interface TeacherResponse {
  id: number
  fullName: string
  email: string
  maxDailyHours: number
  colorCode: string
  qualifiedStyles: DanceStyle[]
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
  qualifiedStyles: DanceStyle[]
}

export interface UpdateTeacherRequest {
  fullName: string
  email: string
  maxDailyHours: number
  colorCode: string
  qualifiedStyles: DanceStyle[]
}


