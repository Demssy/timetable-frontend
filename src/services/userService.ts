import type { User } from "@/types/user"

const API_BASE = "/api/admin/users"

class UserService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${endpoint}`

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: "include",
    })

    if (!response.ok) {
        // Simple error handling
       const errorData = await response.json().catch(() => null)
       throw new Error(errorData?.message || `Request failed: ${response.statusText}`)
    }

    // Handle empty responses (like 204 No Content)
    if (response.status === 204) {
      return {} as T
    }

    return response.json()
  }

  async getAllUsers(): Promise<User[]> {
    return this.request<User[]>(API_BASE)
  }

  async searchByEmail(query: string): Promise<User[]> {
    if (!query.trim()) return []
    return this.request<User[]>(`${API_BASE}/search?email=${encodeURIComponent(query)}`)
  }

  async updateUser(id: number, data: Partial<User>): Promise<User> {
    return this.request<User>(`${API_BASE}/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  }
}

export const userService = new UserService()

