import { apiFetch } from "@/api/client"
import type { DanceGroupDTO, UpsertDanceGroupRequest } from "@/types/schedule"

const BASE = "/api/admin/groups"

export const danceGroupApi = {
  getAll: () => apiFetch<DanceGroupDTO[]>(BASE),

  getById: (id: number) => apiFetch<DanceGroupDTO>(`${BASE}/${id}`),

  create: (data: UpsertDanceGroupRequest) =>
    apiFetch<DanceGroupDTO>(BASE, { method: "POST", body: JSON.stringify(data) }),

  update: (id: number, data: UpsertDanceGroupRequest) =>
    apiFetch<DanceGroupDTO>(`${BASE}/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  delete: (id: number) => apiFetch<void>(`${BASE}/${id}`, { method: "DELETE" }),
}

