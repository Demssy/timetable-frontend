import { apiFetch } from "@/api/client"
import type {
  SolveResponse,
  SolverStatusResponse,
  ScheduleSolutionResponse,
} from "@/types/schedule"
import type { ScoreExplanationResponse, UnmetStudentDTO } from "@/types/solver"

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

  getScoreExplanation: (scheduleId: number) =>
    apiFetch<ScoreExplanationResponse>(`${BASE}/score-explanation/${scheduleId}`),

  getUnmetStudents: (scheduleId: number) =>
    apiFetch<UnmetStudentDTO[]>(`${BASE}/unmet-students/${scheduleId}`),
}
