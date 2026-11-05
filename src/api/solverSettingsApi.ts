import { apiFetch } from "@/api/client"
import type {
  SolverSettings,
  SolverSettingsPreset,
  SolverSettingsPresetRequest,
  SolverSettingsResponse,
} from "@/types/solverSettings"

const BASE = "/api/v1/solver/settings"

export const solverSettingsApi = {
  get: () => apiFetch<SolverSettingsResponse>(BASE),
  save: (settings: SolverSettings) =>
    apiFetch<SolverSettingsResponse>(BASE, { method: "PUT", body: JSON.stringify(settings) }),
  reset: () => apiFetch<SolverSettingsResponse>(`${BASE}/reset`, { method: "POST" }),
  getPresets: () => apiFetch<SolverSettingsPreset[]>(`${BASE}/presets`),
  createPreset: (preset: SolverSettingsPresetRequest) =>
    apiFetch<SolverSettingsPreset>(`${BASE}/presets`, { method: "POST", body: JSON.stringify(preset) }),
  updatePreset: (id: number, preset: SolverSettingsPresetRequest) =>
    apiFetch<SolverSettingsPreset>(`${BASE}/presets/${id}`, { method: "PUT", body: JSON.stringify(preset) }),
  activatePreset: (id: number) =>
    apiFetch<SolverSettingsResponse>(`${BASE}/presets/${id}/activate`, { method: "POST" }),
  deletePreset: (id: number) =>
    apiFetch<void>(`${BASE}/presets/${id}`, { method: "DELETE" }),
}
