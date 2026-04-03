import type {
  TeacherResponse,
  CreateTeacherRequest,
  UpdateTeacherRequest,
  DanceStyleDTO,
} from "@/types/teacher"
import type { StudentResponse, WeeklyAvailability as WeeklyAvailabilityDTO } from "@/types/user"

const API_BASE = "/api/teachers"
const LEGACY_API_BASE = "/api/admin/teachers"

class TeacherService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(endpoint, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string>),
      },
      credentials: "include",
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      throw new Error(errorData?.message || `Request failed: ${response.statusText}`)
    }

    if (response.status === 204) {
      return {} as T
    }

    return response.json()
  }

  private async requestWithLegacyFallback<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    try {
      return await this.request<T>(endpoint, options)
    } catch (error) {
      const isNotFound = error instanceof Error && (error.message.includes("404") || error.message.includes("Not Found"))
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
        const isNotFound = error instanceof Error && (error.message.includes("404") || error.message.includes("Not Found"))
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
}

export const teacherService = new TeacherService()
