import { apiFetch } from "@/api/client"
import { DanceLevel } from "@/types/enums"
import type { ScheduledLessonDTO, CreateLessonRequest, StudentResponse } from "@/types/schedule"

const BASE = "/api/admin/lessons"

type RawLesson = Partial<Omit<ScheduledLessonDTO, "student">> & {
  lessonId?: number
  isActive?: boolean
  teacherId?: number
  teacherName?: string
  teacherFullName?: string
  danceGroupId?: number
  groupId?: number
  groupName?: string
  danceGroupName?: string
  danceLevel?: string
  level?: string
  // Student fields for private lessons
  student?: StudentResponse | null
  studentId?: number
  studentFullName?: string
  studentEmail?: string
  studentBirthDate?: string
  studentDanceLevel?: string | null
  studentParentContact?: string | null
}

const UNKNOWN_TEACHER_NAME = "Unknown teacher"
const UNKNOWN_GROUP_NAME = "Unknown group"

function toKnownDanceLevel(value: unknown): DanceLevel {
  if (typeof value !== "string") return DanceLevel.BEGINNER
  return (Object.values(DanceLevel) as string[]).includes(value)
    ? (value as DanceLevel)
    : DanceLevel.BEGINNER
}

/** Resolves the student summary from raw backend data. */
function resolveStudent(raw: RawLesson): StudentResponse | null {
  if (raw.student) return raw.student
  if (raw.studentId == null) return null

  // Build a minimal StudentResponse from flat fields when the backend
  // sends student data outside the nested object (legacy/flat format).
  return {
    id: raw.studentId,
    email: raw.studentEmail ?? "",
    fullName: raw.studentFullName ?? "Unknown Student",
    birthDate: raw.studentBirthDate ?? "",
    danceLevel: null,
    parentContact: raw.studentParentContact ?? null,
  }
}

function normalizeLesson(raw: RawLesson): ScheduledLessonDTO {
  const teacher = raw.teacher
    ? raw.teacher
    : {
        id: raw.teacherId ?? -1,
        fullName: raw.teacherName ?? raw.teacherFullName ?? UNKNOWN_TEACHER_NAME,
        email: "",
        maxDailyHours: 0,
        colorCode: "#9ca3af",
        qualifiedStyles: [],
      }

  // Private lessons have no dance group — use null instead of a placeholder.
  const fallbackGroupId = raw.danceGroupId ?? raw.groupId ?? -1
  const danceGroup: ScheduledLessonDTO["danceGroup"] = raw.danceGroup
    ? raw.danceGroup
    : raw.isPrivate
      ? null
      : {
          id: fallbackGroupId,
          name: raw.groupName ?? raw.danceGroupName ?? UNKNOWN_GROUP_NAME,
          danceStyleId: 0,
          danceStyleName: "",
          danceLevel: toKnownDanceLevel(raw.danceLevel ?? raw.level),
          minSize: 1,
          targetAgeRange: null,
        }

  const student: StudentResponse | null = resolveStudent(raw)

  const normalizedId = raw.id ?? raw.lessonId

  return {
    id: typeof normalizedId === "number" ? normalizedId : 0,
    teacher,
    danceGroup,
    student,
    durationMinutes: raw.durationMinutes ?? 60,
    isPrivate: raw.isPrivate ?? false,
    isPinned: raw.isPinned ?? false,
    isActive: raw.isActive ?? true,
    timeslot: raw.timeslot ?? null,
    room: raw.room ?? null,
  }
}

function normalizeLessons(raw: RawLesson[]): ScheduledLessonDTO[] {
  return raw.map((lesson) => normalizeLesson(lesson))
}

export const lessonApi = {
  getAll: async () => normalizeLessons(await apiFetch<RawLesson[]>(BASE)),

  getById: async (id: number) => normalizeLesson(await apiFetch<RawLesson>(`${BASE}/${id}`)),

  create: async (data: CreateLessonRequest) =>
    normalizeLesson(await apiFetch<RawLesson>(BASE, { method: "POST", body: JSON.stringify(data) })),

  update: async (id: number, data: CreateLessonRequest) =>
    normalizeLesson(await apiFetch<RawLesson>(`${BASE}/${id}`, { method: "PUT", body: JSON.stringify(data) })),

  toggleActive: async (id: number) =>
    normalizeLesson(await apiFetch<RawLesson>(`/api/lessons/${id}/toggle-active`, { method: "PUT" })),

  delete: (id: number) => apiFetch<void>(`${BASE}/${id}`, { method: "DELETE" }),
}
