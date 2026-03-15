import { apiFetch } from "@/api/client"
import type { ScheduleMetadataDTO, CreateScheduleRequest } from "@/types/schedule"

const BASE = "/api/schedules"

export const scheduleApi = {
  getAll: () => apiFetch<ScheduleMetadataDTO[]>(BASE),

  create: (data: CreateScheduleRequest) =>
    apiFetch<ScheduleMetadataDTO>(BASE, { method: "POST", body: JSON.stringify(data) }),

  delete: (id: number) => apiFetch<void>(`${BASE}/${id}`, { method: "DELETE" }),
}
