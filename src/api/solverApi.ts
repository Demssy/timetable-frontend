import { apiFetch } from "@/api/client"
import type {
  SolveResponse,
  SolverStatusResponse,
  ScheduleSolutionResponse,
} from "@/types/schedule"

const BASE = "/api/admin/solver"

export const solverApi = {
  solve: (scheduleId: number) =>
    apiFetch<SolveResponse>(`${BASE}/solve/${scheduleId}`, { method: "POST" }),

  getStatus: (scheduleId: number) =>
    apiFetch<SolverStatusResponse>(`${BASE}/status/${scheduleId}`),

  stop: (scheduleId: number) =>
    apiFetch<string>(`${BASE}/stop/${scheduleId}`, { method: "POST" }),

  getSolution: (scheduleId: number) =>
    apiFetch<ScheduleSolutionResponse>(`${BASE}/solution/${scheduleId}`),
}
