import type { User, UpdateAvailabilityRequest, StudentResponse, UpdateStudentProfileRequest } from "@/types/user"
import type { TeacherResponse } from "@/types/teacher"
import type { AvailabilityRole } from "@/types/enums"
import { apiFetch } from "@/api/client"

const API_BASE = "/api/admin/users"
const USER_API = "/api/user"
const STUDENT_API = "/api/students"

class UserService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    return apiFetch<T>(endpoint, options)
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
    return all.filter(
        (u) => u.role === "STUDENT" || (u.roles?.includes("ROLE_STUDENT") ?? false)
    )
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
   * Replaces the current user's availability for ONE role (the other role is untouched).
   * Endpoint: PUT /api/user/me/availability?role=TEACHER|STUDENT
   * The role is always sent explicitly; a role the user does not have yields 400.
   */
  async updateAvailability(data: UpdateAvailabilityRequest, role: AvailabilityRole): Promise<User> {
    return this.request<User>(`${USER_API}/me/availability?role=${role}`, {
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

  // ─── Student: Profile ──────────────────────────────────────────────────────

  /**
   * Returns the current student's full profile including desiredLessonsPerWeek.
   * Endpoint: GET /api/students/me/profile
   */
  async getStudentProfile(): Promise<StudentResponse> {
    return this.request<StudentResponse>(`${STUDENT_API}/me/profile`)
  }

  /**
   * Updates the current student's profile.
   * Endpoint: PUT /api/students/me/profile
   */
  async updateStudentProfile(data: UpdateStudentProfileRequest): Promise<StudentResponse> {
    return this.request<StudentResponse>(`${STUDENT_API}/me/profile`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  }
  /** Admin: GET /api/students/{id} */
  async getStudentById(id: number): Promise<StudentResponse> {
    return this.request<StudentResponse>(`${STUDENT_API}/${id}`)
  }

  /** Admin: PUT /api/students/{id} — full profile update */
  async updateStudentById(
    id: number,
    data: UpdateStudentProfileRequest & { email: string },
  ): Promise<StudentResponse> {
    return this.request<StudentResponse>(`${STUDENT_API}/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  }
}

export const userService = new UserService()
