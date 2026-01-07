// Enums matching Backend Enums
// Must be kept in sync with Java enums

export const DanceLevel = {
  BEGINNER: "BEGINNER",
  ELEMENTARY: "ELEMENTARY",
  INTERMEDIATE: "INTERMEDIATE",
  ADVANCED: "ADVANCED",
  PROFESSIONAL: "PROFESSIONAL"
} as const

export type DanceLevel = typeof DanceLevel[keyof typeof DanceLevel]

export const DayOfWeek = {
  MONDAY: "MONDAY",
  TUESDAY: "TUESDAY",
  WEDNESDAY: "WEDNESDAY",
  THURSDAY: "THURSDAY",
  FRIDAY: "FRIDAY",
  SATURDAY: "SATURDAY",
  SUNDAY: "SUNDAY"
} as const

export type DayOfWeek = typeof DayOfWeek[keyof typeof DayOfWeek]

export const UserRole = {
  STUDENT: "STUDENT",
  TEACHER: "TEACHER",
  ADMIN: "ADMIN"
} as const

export type UserRole = typeof UserRole[keyof typeof UserRole]

