import { apiFetch } from "@/api/client"
import type { ScheduledLessonDTO, CreateLessonRequest } from "@/types/schedule"

const BASE = "/api/admin/lessons"

export const lessonApi = {
  getAll: () => apiFetch<ScheduledLessonDTO[]>(BASE),

  getById: (id: number) => apiFetch<ScheduledLessonDTO>(`${BASE}/${id}`),

  create: (data: CreateLessonRequest) =>
    apiFetch<ScheduledLessonDTO>(BASE, { method: "POST", body: JSON.stringify(data) }),

  update: (id: number, data: CreateLessonRequest) =>
    apiFetch<ScheduledLessonDTO>(`${BASE}/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  delete: (id: number) => apiFetch<void>(`${BASE}/${id}`, { method: "DELETE" }),
}
