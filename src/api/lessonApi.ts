import { apiFetch } from "@/api/client"
import { DanceLevel } from "@/types/enums"
import type { ScheduledLessonDTO, CreateLessonRequest, StudentResponse } from "@/types/schedule"
import type { TeacherResponse } from "@/types/teacher"

const BASE = "/api/admin/lessons"

type RawLesson = Partial<Omit<ScheduledLessonDTO, "student" | "teacher" | "isCancelled" | "cancelledById" | "cancelledAt" | "cancelReason">> & {
  lessonId?: number
  isActive?: boolean
  teacher?: TeacherResponse
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
  // Cancellation fields (may be absent in older responses → default to false / null)
  isCancelled?: boolean
  cancelledById?: number | null
  cancelledAt?: string | null
  cancelReason?: string | null
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
  const teacher: TeacherResponse = raw.teacher
    ? raw.teacher
    : {
        id: raw.teacherId ?? -1,
        fullName: raw.teacherName ?? raw.teacherFullName ?? UNKNOWN_TEACHER_NAME,
        email: "",
        maxDailyHours: null,
        colorCode: "#9ca3af",
        qualifiedStyles: [],
        desiredLessonsPerWeek: 3
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
          minSize: null,
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
    isCancelled: raw.isCancelled ?? false,
    cancelledById: raw.cancelledById ?? null,
    cancelledAt: raw.cancelledAt ?? null,
    cancelReason: raw.cancelReason ?? null,
  }
}

function normalizeLessons(raw: RawLesson[]): ScheduledLessonDTO[] {
  return raw.map((lesson) => normalizeLesson(lesson))
}

export const lessonApi = {
  getAll: async () => normalizeLessons(await apiFetch<RawLesson[]>(BASE)),

  getMySchedule: async () =>
    normalizeLessons(await apiFetch<RawLesson[]>("/api/lessons/my-schedule")),

  getById: async (id: number) => normalizeLesson(await apiFetch<RawLesson>(`${BASE}/${id}`)),

  create: async (data: CreateLessonRequest) =>
    normalizeLesson(await apiFetch<RawLesson>(BASE, { method: "POST", body: JSON.stringify(data) })),

  update: async (id: number, data: CreateLessonRequest) =>
    normalizeLesson(await apiFetch<RawLesson>(`${BASE}/${id}`, { method: "PUT", body: JSON.stringify(data) })),

  toggleActive: async (id: number) =>
    normalizeLesson(await apiFetch<RawLesson>(`/api/lessons/${id}/toggle-active`, { method: "PUT" })),

  delete: (id: number) => apiFetch<void>(`${BASE}/${id}`, { method: "DELETE" }),
}

// ─── Scheduled-lesson cancellation API ───────────────────────────────────────
// Base path is separate from /api/admin/lessons — no admin prefix.

const SCHEDULED_BASE = "/api/scheduled-lessons"

/**
 * Cancel a scheduled lesson snapshot.
 * TEACHER: can cancel only their own lessons.
 * ADMIN: can cancel any lesson.
 *
 * @param id     - ScheduledLesson ID from the snapshot table
 * @param reason - Optional cancellation reason
 */
export async function cancelScheduledLesson(
  id: number,
  reason?: string,
): Promise<ScheduledLessonDTO> {
  return normalizeLesson(
    await apiFetch<RawLesson>(`${SCHEDULED_BASE}/${id}/cancel`, {
      method: "PATCH",
      body: JSON.stringify({ reason: reason ?? null }),
    }),
  )
}

/**
 * Restore a previously cancelled lesson.
 * ADMIN only.
 *
 * @param id - ScheduledLesson ID
 */
export async function restoreScheduledLesson(id: number): Promise<ScheduledLessonDTO> {
  return normalizeLesson(
    await apiFetch<RawLesson>(`${SCHEDULED_BASE}/${id}/restore`, { method: "PATCH" }),
  )
}

