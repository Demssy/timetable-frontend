import { apiFetch } from "@/api/client"
import type { ScheduleMetadataDTO, CreateScheduleRequest } from "@/types/schedule"

/** Public base — returns PUBLISHED schedules only (all authenticated roles). */
const BASE = "/api/schedules"

/** Admin base — returns ALL schedules regardless of status (ADMIN only). */
const ADMIN_BASE = "/api/admin/schedules"

export const scheduleApi = {
  getAll: () => apiFetch<ScheduleMetadataDTO[]>(BASE),

  adminGetAll: () => apiFetch<ScheduleMetadataDTO[]>(ADMIN_BASE),

  /**
   * GET /api/admin/schedules/{id}
   * Uses ADMIN_BASE so DRAFT schedules are also accessible.
   */
  getById: (id: number) => apiFetch<ScheduleMetadataDTO>(`${ADMIN_BASE}/${id}`),

  /** POST /api/schedules — Create a new schedule (starts as DRAFT). */
  create: (data: CreateScheduleRequest) =>
    apiFetch<ScheduleMetadataDTO>(BASE, { method: "POST", body: JSON.stringify(data) }),

  /** DELETE /api/schedules/{id} */
  delete: (id: number) => apiFetch<void>(`${BASE}/${id}`, { method: "DELETE" }),

  /** PATCH /api/schedules/{id}/publish → transitions DRAFT → PUBLISHED */
  publish: (id: number) =>
    apiFetch<ScheduleMetadataDTO>(`${BASE}/${id}/publish`, { method: "PATCH" }),

  /** PATCH /api/schedules/{id}/archive → transitions any status → ARCHIVED */
  archive: (id: number) =>
    apiFetch<ScheduleMetadataDTO>(`${BASE}/${id}/archive`, { method: "PATCH" }),

  /** PATCH /api/admin/schedules/{id}/draft → reverts back to DRAFT */
  revertToDraft: (id: number) =>
    apiFetch<ScheduleMetadataDTO>(`${ADMIN_BASE}/${id}/draft`, { method: "PATCH" }),
}
