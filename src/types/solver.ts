// Types for Timefold score explanation and post-solve reports

export interface ConstraintMatchDetail {
  hardImpact: number
  softImpact: number
  description: string
  involvedUsers: string[]
  lessonInfo?: string | null
  timeslotInfo?: string | null
}

export interface ConstraintViolationSummary {
  constraintName: string
  hardScore: number
  softScore: number
  matchCount: number
  details?: ConstraintMatchDetail[]
}

export interface TeacherWorkloadSummary {
  teacherId: number
  teacherName: string
  email: string
  desiredLessons: number
  assignedLessons: number
  difference: number
  outsideAvailabilityCount: number
}

export interface ScoreExplanationResponse {
  scheduleId: number
  totalScore: string | null
  violations: ConstraintViolationSummary[]
  teacherWorkloads?: TeacherWorkloadSummary[]
}

export interface UnmetStudentDTO {
  studentId: number
  studentName: string
  studentEmail: string
  desiredSlots: number
  assignedLessons: number
  missingLessons: number
}
