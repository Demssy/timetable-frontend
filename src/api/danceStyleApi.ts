import { apiFetch } from "@/api/client"
import type { DanceStyleDTO } from "@/types/teacher"

const CANDIDATE_ENDPOINTS = "/api/admin/styles"

export const danceStyleApi = {
  async getAll(): Promise<DanceStyleDTO[]> {
      try {
        return await apiFetch<DanceStyleDTO[]>(CANDIDATE_ENDPOINTS)
      } catch (error) {
        const message = error instanceof Error ? error.message : ""
        const isNotFound = message.includes("404") || message.includes("Not Found")
        if (!isNotFound) throw error
      }
    return []
  },
}

