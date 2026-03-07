import { apiFetch } from "@/api/client"
import type { TimeslotDTO } from "@/types/schedule"

const BASE = "/api/admin/timeslots"

export const timeslotApi = {
  getAll: () => apiFetch<TimeslotDTO[]>(BASE),

  getById: (id: number) => apiFetch<TimeslotDTO>(`${BASE}/${id}`),

  create: (data: Omit<TimeslotDTO, "id">) =>
    apiFetch<TimeslotDTO>(BASE, { method: "POST", body: JSON.stringify(data) }),

  update: (id: number, data: Omit<TimeslotDTO, "id">) =>
    apiFetch<TimeslotDTO>(`${BASE}/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  delete: (id: number) => apiFetch<void>(`${BASE}/${id}`, { method: "DELETE" }),
}
