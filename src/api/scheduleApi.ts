import { apiFetch } from "@/api/client"
import type { ScheduleMetadataDTO, CreateScheduleRequest } from "@/types/schedule"

/** Public base — returns PUBLISHED schedules only (all authenticated roles). */
const BASE = "/api/schedules"

/** Admin base — returns ALL schedules regardless of status (ADMIN only). */
const ADMIN_BASE = "/api/admin/schedules"

export const scheduleApi = {
  /**
   * GET /api/schedules
   * Public endpoint — returns PUBLISHED schedules only.
   * Used by the main page / weekly timetable (all roles).
   */
  getAll: () => apiFetch<ScheduleMetadataDTO[]>(BASE),

  /**
   * GET /api/admin/schedules
   * Admin-only endpoint — returns ALL schedules (DRAFT + PUBLISHED + ARCHIVED).
   * Used exclusively by the admin panel schedule list.
   */
  adminGetAll: () => apiFetch<ScheduleMetadataDTO[]>(ADMIN_BASE),

  /** POST /api/schedules — Create a new schedule (starts as DRAFT). */
  create: (data: CreateScheduleRequest) =>
    apiFetch<ScheduleMetadataDTO>(BASE, { method: "POST", body: JSON.stringify(data) }),

  /** DELETE /api/schedules/{id} */
  delete: (id: number) => apiFetch<void>(`${BASE}/${id}`, { method: "DELETE" }),

  /**
   * PATCH /api/schedules/{id}/publish
   * Transitions a DRAFT schedule to PUBLISHED.
   * Throws if another PUBLISHED schedule already covers the same date range.
   */
  publish: (id: number) =>
    apiFetch<ScheduleMetadataDTO>(`${BASE}/${id}/publish`, { method: "PATCH" }),
}
