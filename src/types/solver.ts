// Types for Timefold score explanation and post-solve reports

export interface ConstraintViolationSummary {
  constraintName: string
  hardScore: number
  softScore: number
  matchCount: number
}

export interface ScoreExplanationResponse {
  scheduleId: number
  totalScore: string | null
  violations: ConstraintViolationSummary[]
}

export interface UnmetStudentDTO {
  studentId: number
  studentName: string
  studentEmail: string
  desiredSlots: number
  assignedLessons: number
  missingLessons: number
}
