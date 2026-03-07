import { apiFetch } from "@/api/client"
import type { RoomDTO } from "@/types/schedule"

const BASE = "/api/admin/rooms"

export const roomApi = {
  getAll: () => apiFetch<RoomDTO[]>(BASE),

  getById: (id: number) => apiFetch<RoomDTO>(`${BASE}/${id}`),

  create: (data: Omit<RoomDTO, "id">) =>
    apiFetch<RoomDTO>(BASE, { method: "POST", body: JSON.stringify(data) }),

  update: (id: number, data: Omit<RoomDTO, "id">) =>
    apiFetch<RoomDTO>(`${BASE}/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  delete: (id: number) => apiFetch<void>(`${BASE}/${id}`, { method: "DELETE" }),
}
