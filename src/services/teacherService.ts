import type {
  TeacherResponse,
  CreateTeacherRequest,
  UpdateTeacherRequest,
  UpdateTeacherProfileRequest,
  DanceStyleDTO,
} from "@/types/teacher"
import type { StudentResponse, WeeklyAvailability as WeeklyAvailabilityDTO } from "@/types/user"
import { ApiError, apiFetch } from "@/api/client"

const API_BASE = "/api/teachers"
const LEGACY_API_BASE = "/api/admin/teachers"

class TeacherService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    return apiFetch<T>(endpoint, options)
  }

  private async requestWithLegacyFallback<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    try {
      return await this.request<T>(endpoint, options)
    } catch (error) {
      const isNotFound = error instanceof ApiError && error.status === 404
      const canFallback = endpoint.startsWith(API_BASE)
      if (!isNotFound || !canFallback) throw error

      return this.request<T>(endpoint.replace(API_BASE, LEGACY_API_BASE), options)
    }
  }

  async getAllTeachers(): Promise<TeacherResponse[]> {
    return this.requestWithLegacyFallback<TeacherResponse[]>(API_BASE)
  }

  async getDanceStyles(): Promise<DanceStyleDTO[]> {
    const candidates = ["/api/dance-styles", "/api/admin/dance-styles", "/api/dictionaries/dance-styles"]

    for (const endpoint of candidates) {
      try {
        return await this.request<DanceStyleDTO[]>(endpoint)
      } catch (error) {
        const isNotFound = error instanceof ApiError && error.status === 404
        if (!isNotFound) throw error
      }
    }

    return []
  }

  async getTeacherById(id: number): Promise<TeacherResponse> {
    return this.requestWithLegacyFallback<TeacherResponse>(`${API_BASE}/${id}`)
  }

  async createTeacher(data: CreateTeacherRequest): Promise<TeacherResponse> {
    return this.requestWithLegacyFallback<TeacherResponse>(API_BASE, {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async updateTeacher(id: number, data: UpdateTeacherRequest): Promise<TeacherResponse> {
    return this.requestWithLegacyFallback<TeacherResponse>(`${API_BASE}/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  }

  /** Admin: PUT /api/teachers/{id} with a full profile payload */
  async updateTeacherProfileById(id: number, data: UpdateTeacherProfileRequest): Promise<TeacherResponse> {
    return this.requestWithLegacyFallback<TeacherResponse>(`${API_BASE}/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  }

  async deleteTeacher(id: number): Promise<void> {
    await this.requestWithLegacyFallback<void>(`${API_BASE}/${id}`, {
      method: "DELETE",
    })
  }

  /**
   * Returns the list of students who selected the authenticated teacher for private lessons.
   * Endpoint: GET /api/teachers/me/students
   * Requires TEACHER role.
   */
  async getMyPrivateStudents(): Promise<StudentResponse[]> {
    return this.request<StudentResponse[]>(`${API_BASE}/me/students`)
  }

  /**
   * Returns the weekly availability of a specific student who selected the authenticated teacher.
   * Endpoint: GET /api/teachers/me/students/{studentId}/availability
   * Requires TEACHER role. Backend verifies the student belongs to this teacher.
   */
  async getStudentAvailability(studentId: number): Promise<{ weeklyAvailabilities: WeeklyAvailabilityDTO[] }> {
    return this.request<{ weeklyAvailabilities: WeeklyAvailabilityDTO[] }>(
      `${API_BASE}/me/students/${studentId}/availability`
    )
  }

  // ─── Teacher: Profile ──────────────────────────────────────────────────────

  /**
   * Returns the current teacher's full profile including desiredLessonsPerWeek.
   * Endpoint: GET /api/teachers/me/profile
   */
  async getMyTeacherProfile(): Promise<TeacherResponse> {
    return this.request<TeacherResponse>(`${API_BASE}/me/profile`)
  }

  /**
   * Updates the current teacher's profile.
   * Endpoint: PUT /api/teachers/me/profile
   */
  async updateMyTeacherProfile(data: UpdateTeacherProfileRequest): Promise<TeacherResponse> {
    return this.request<TeacherResponse>(`${API_BASE}/me/profile`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  }
}

export const teacherService = new TeacherService()
