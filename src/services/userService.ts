import type { User, UpdateAvailabilityRequest } from "@/types/user"
import type { TeacherResponse } from "@/types/teacher"

const API_BASE = "/api/admin/users"
const USER_API = "/api/user"
const STUDENT_API = "/api/students"

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

  /**
   * Fetches the full profile of a single user (including weeklyAvailabilities).
   * Endpoint: GET /api/admin/users/{id}
   */
  async getUserById(id: number): Promise<User> {
    return this.request<User>(`${API_BASE}/${id}`)
  }

  async getStudents(): Promise<User[]> {
    const all = await this.getAllUsers()
    return all.filter((u) => u.role === "STUDENT")
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

  /**
   * Permanently deletes a user by ID.
   * Endpoint: DELETE /api/admin/users/{id}
   */
  async deleteUser(id: number): Promise<void> {
    return this.request<void>(`${API_BASE}/${id}`, {
      method: "DELETE",
    })
  }

  /**
   * Bulk-replaces the current user's weekly availability and one-time unavailabilities.
   * Endpoint: PUT /api/user/me/availability
   */
  async updateAvailability(data: UpdateAvailabilityRequest): Promise<User> {
    return this.request<User>(`${USER_API}/me/availability`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  }

  // ─── Student: Private Lesson Teacher Preferences ───────────────────────────

  /**
   * Returns the list of teachers the current student has selected for private lessons.
   * Endpoint: GET /api/students/me/preferred-teachers
   */
  async getPreferredTeachers(): Promise<TeacherResponse[]> {
    return this.request<TeacherResponse[]>(`${STUDENT_API}/me/preferred-teachers`)
  }

  /**
   * Adds a teacher to the current student's preference list.
   * Endpoint: POST /api/students/me/preferred-teachers/{teacherId}
   */
  async addPreferredTeacher(teacherId: number): Promise<void> {
    return this.request<void>(`${STUDENT_API}/me/preferred-teachers/${teacherId}`, {
      method: "POST",
    })
  }

  /**
   * Removes a teacher from the current student's preference list.
   * Endpoint: DELETE /api/students/me/preferred-teachers/{teacherId}
   */
  async removePreferredTeacher(teacherId: number): Promise<void> {
    return this.request<void>(`${STUDENT_API}/me/preferred-teachers/${teacherId}`, {
      method: "DELETE",
    })
  }
}

export const userService = new UserService()

