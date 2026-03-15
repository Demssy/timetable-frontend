import { apiFetch } from "@/api/client"
import { DanceLevel } from "@/types/enums"
import type { ScheduledLessonDTO, CreateLessonRequest } from "@/types/schedule"

const BASE = "/api/admin/lessons"

type RawLesson = Partial<ScheduledLessonDTO> & {
  lessonId?: number
  teacherId?: number
  teacherName?: string
  teacherFullName?: string
  danceGroupId?: number
  groupId?: number
  groupName?: string
  danceGroupName?: string
  danceLevel?: string
  level?: string
}

const UNKNOWN_TEACHER_NAME = "Unknown teacher"
const UNKNOWN_GROUP_NAME = "Unknown group"

function toKnownDanceLevel(value: unknown): ScheduledLessonDTO["danceGroup"]["danceLevel"] {
  if (typeof value !== "string") return DanceLevel.BEGINNER
  return (Object.values(DanceLevel) as string[]).includes(value)
    ? (value as ScheduledLessonDTO["danceGroup"]["danceLevel"])
    : DanceLevel.BEGINNER
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

  const fallbackGroupId = raw.danceGroupId ?? raw.groupId ?? -1
  const danceGroup = raw.danceGroup
    ? raw.danceGroup
    : {
        id: fallbackGroupId,
        name: raw.groupName ?? raw.danceGroupName ?? UNKNOWN_GROUP_NAME,
        danceStyleId: 0,
        danceStyleName: "",
        danceLevel: toKnownDanceLevel(raw.danceLevel ?? raw.level),
        minSize: 1,
        targetAgeRange: null,
      }

  const normalizedId = raw.id ?? raw.lessonId

  return {
    id: typeof normalizedId === "number" ? normalizedId : 0,
    teacher,
    danceGroup,
    durationMinutes: raw.durationMinutes ?? 60,
    isPrivate: raw.isPrivate ?? false,
    isPinned: raw.isPinned ?? false,
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

  delete: (id: number) => apiFetch<void>(`${BASE}/${id}`, { method: "DELETE" }),
}
