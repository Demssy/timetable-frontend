import { apiFetch } from "@/api/client"
import type { DanceStyleDTO } from "@/types/teacher"

const CANDIDATE_ENDPOINTS = [
  "/api/admin/styles",
  "/api/admin/dance-styles",
  "/api/dance-styles",
  "/api/dictionaries/dance-styles",
]

function isNotFoundError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : ""
  return message.includes("404") || message.includes("Not Found")
}

export const danceStyleApi = {
  async getAll(): Promise<DanceStyleDTO[]> {
    for (const endpoint of CANDIDATE_ENDPOINTS) {
      try {
        return await apiFetch<DanceStyleDTO[]>(endpoint)
      } catch (error) {
        if (!isNotFoundError(error)) throw error
      }
    }

    return []
  },

  async create(name: string): Promise<DanceStyleDTO> {
    for (const endpoint of CANDIDATE_ENDPOINTS) {
      try {
        return await apiFetch<DanceStyleDTO>(endpoint, {
          method: "POST",
          body: JSON.stringify({ name }),
        })
      } catch (error) {
        if (!isNotFoundError(error)) throw error
      }
    }

    throw new Error("Dance styles endpoint is not available")
  },

  async delete(id: number): Promise<void> {
    for (const endpoint of CANDIDATE_ENDPOINTS) {
      try {
        await apiFetch<void>(`${endpoint}/${id}`, {
          method: "DELETE",
        })
        return
      } catch (error) {
        if (!isNotFoundError(error)) throw error
      }
    }

    throw new Error("Dance styles endpoint is not available")
  },
}

