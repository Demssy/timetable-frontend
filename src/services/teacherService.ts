import type {
  TeacherResponse,
  CreateTeacherRequest,
  UpdateTeacherRequest,
} from "@/types/teacher"

const API_BASE = "/api/admin/teachers"

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

  async getAllTeachers(): Promise<TeacherResponse[]> {
    return this.request<TeacherResponse[]>(API_BASE)
  }

  async getTeacherById(id: number): Promise<TeacherResponse> {
    return this.request<TeacherResponse>(`${API_BASE}/${id}`)
  }

  async createTeacher(data: CreateTeacherRequest): Promise<TeacherResponse> {
    return this.request<TeacherResponse>(API_BASE, {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async updateTeacher(id: number, data: UpdateTeacherRequest): Promise<TeacherResponse> {
    return this.request<TeacherResponse>(`${API_BASE}/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  }

  async deleteTeacher(id: number): Promise<void> {
    await this.request<void>(`${API_BASE}/${id}`, {
      method: "DELETE",
    })
  }
}

export const teacherService = new TeacherService()
