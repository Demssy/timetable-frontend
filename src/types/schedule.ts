import type { DayOfWeek, DanceLevel, SolverStatus } from "@/types/enums"
import type { TeacherResponse } from "@/types/teacher"

// ─── Core DTOs ────────────────────────────────────────────────────────────────

export interface RoomDTO {
  id: number
  name: string
  capacity: number
  allowsParallelPrivate: boolean
}

export interface TimeslotDTO {
  id: number
  dayOfWeek: DayOfWeek
  startTime: string   // "HH:mm:ss"
  endTime: string     // "HH:mm:ss"
}

/** Mirrors backend StudentResponse.java — embedded in private lesson DTOs. */
export interface StudentResponse {
  id: number
  email: string
  fullName: string
  birthDate: string           // ISO date: "YYYY-MM-DD"
  danceLevel: DanceLevel | null
  parentContact: string | null
}

export interface DanceGroupDTO {
  id: number
  name: string
  danceStyleId: number
  danceStyleName: string
  danceLevel: DanceLevel
  minSize: number | null
  targetAgeRange: string | null
}


export interface UpsertDanceGroupRequest {
  name: string
  danceStyleId: number
  danceLevel: DanceLevel
  minSize: number
  targetAgeRange: string | null
}

export interface ScheduledLessonDTO {
  id: number
  teacher: TeacherResponse
  /** null for private lessons (student-based). */
  danceGroup: DanceGroupDTO | null
  /** null for group lessons AND unmatched private lessons. */
  student: StudentResponse | null
  durationMinutes: number
  isPrivate: boolean
  isPinned: boolean
  isActive: boolean
  timeslot: TimeslotDTO | null
  room: RoomDTO | null
  // ── Cancellation fields ───────────────────────────────────────────────────
  isCancelled: boolean
  /** ID of the user (teacher or admin) who cancelled this lesson. */
  cancelledById: number | null
  /** ISO-8601 datetime string, e.g. "2026-05-07T18:30:00". */
  cancelledAt: string | null
  cancelReason: string | null
}

// ─── Lesson Category (3-way classification) ──────────────────────────────────

export type LessonCategory = "group" | "private-matched" | "private-available"

/** Classify a lesson into one of the three visual categories. */
export function getLessonCategory(lesson: ScheduledLessonDTO): LessonCategory {
  if (!lesson.isPrivate) return "group"
  if (lesson.student != null) return "private-matched"
  return "private-available"
}

// ─── Request DTOs ─────────────────────────────────────────────────────────────

export interface CreateLessonRequest {
  teacherId: number
  /** Required for group lessons; null for private lessons. */
  danceGroupId?: number | null
  /** Required for private lessons; null for group lessons. */
  studentId?: number | null
  durationMinutes: number
  isPrivate: boolean
  isPinned: boolean
  isActive: boolean
  timeslotId?: number | null
  roomId?: number | null
}

// ─── Schedule Metadata ────────────────────────────────────────────────────────

export const ScheduleStatus = {
  DRAFT: "DRAFT",
  PUBLISHED: "PUBLISHED",
  ARCHIVED: "ARCHIVED"
} as const

export type ScheduleStatus = (typeof ScheduleStatus)[keyof typeof ScheduleStatus]

export interface ScheduleMetadataDTO {
  id: number
  name: string
  validFrom: string   // "YYYY-MM-DD"
  validTo: string     // "YYYY-MM-DD"
  createdAt?: string
  status: ScheduleStatus
}

export interface CreateScheduleRequest {
  name: string
  validFrom: string
  validTo: string
}

// ─── Solver ───────────────────────────────────────────────────────────────────

export interface SolveResponse {
  scheduleId: number
  message: string
  statusUrl: string   // informational only — use correct base path
}

export interface SolverStatusResponse {
  scheduleId: number
  status: SolverStatus
  message: string
}

export interface ScheduleSolutionResponse {
  scheduleId: number
  score: string | null
  hardScore: number
  softScore: number
  fullyAssigned: boolean
  lessons: ScheduledLessonDTO[]
}
