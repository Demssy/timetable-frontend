import type { DayOfWeek, DanceLevel, SolverStatus } from "@/types/enums"

// ─── Core DTOs ────────────────────────────────────────────────────────────────

export interface RoomDTO {
  id?: number
  name: string
  capacity: number
  allowsParallelPrivate: boolean
}

export interface TimeslotDTO {
  id?: number
  dayOfWeek: DayOfWeek
  startTime: string   // "HH:mm:ss"
  endTime: string     // "HH:mm:ss"
}

export interface TeacherSummary {
  id: number
  fullName: string
  email: string
  maxDailyHours: number
  colorCode: string
  qualifiedStyles: string[]
}

export interface DanceGroupDTO {
  id: number
  name: string
  danceLevel: DanceLevel
  size: number
}

export interface ScheduledLessonDTO {
  id: number
  teacher: TeacherSummary
  danceGroup: DanceGroupDTO
  durationMinutes: number
  isPrivate: boolean
  isPinned: boolean
  timeslot: TimeslotDTO | null
  room: RoomDTO | null
}

// ─── Request DTOs ─────────────────────────────────────────────────────────────

export interface CreateLessonRequest {
  teacherId: number
  danceGroupId: number
  durationMinutes: number
  isPrivate: boolean
  isPinned: boolean
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
  status?: ScheduleStatus
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
}

export interface SolverStatusResponse {
  scheduleId: number
  status: SolverStatus
}

export interface ScheduleSolutionResponse {
  scheduleId: number
  score: string | null
  fullyAssigned: boolean
  lessons: ScheduledLessonDTO[]
}
