export interface SolverSettings {
  solverTimeLimitSeconds: number
  maxAllowedHardPenalty: number
  teacherMaxDailyLessons: number
  teacherBreakThresholdMinutes: number
  physicalConflictHardWeight: number
  weeklyAvailabilityHardWeight: number
  teacherDailyLimitHardWeight: number
  studentMultipleDailyPrivateHardWeight: number
  weeklyQuotaOverflowHardWeight: number
  privateLessonAssignmentReward: number
  primeTimeLessonReward: number
  studentUnfulfilledLessonPenalty: number
  teacherUnfulfilledLessonPenalty: number
  teacherGapPenaltyMultiplier: number
  teacherWorkloadFairnessMultiplier: number
}

export interface SolverSettingsResponse extends SolverSettings {
  defaults: SolverSettings
  activePresetId: number | null
}

export interface SolverSettingsPreset {
  id: number
  name: string
  settings: SolverSettings
}

export interface SolverSettingsPresetRequest {
  name: string
  settings: SolverSettings
}
