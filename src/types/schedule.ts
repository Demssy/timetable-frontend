// Schedule and Solver related types matching Backend DTOs

export interface ScheduledLesson {
  lessonId: number
  teacherName: string
  groupName: string
  dayOfWeek: string
  startTime: string
  endTime: string
  roomName: string
  isPrivate: boolean
  isPinned: boolean
}

export interface Room {
  id: number
  name: string
  capacity: number
}

export interface DanceStyle {
  id: number
  name: string
}

export type SolverStatus = "NOT_SOLVING" | "SOLVING" | "SOLVED" | "FAILED"

export interface SolverStatusResponse {
  scheduleId: number
  status: SolverStatus
  scoreExplanation?: string
}

