import type {LoginRequest, RegisterRequest, User} from "@/types/user"
import { ApiError, apiFetch } from "@/api/client"

class AuthService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `/api${endpoint}`

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: "include", // Important: send cookies with request
    })

    if (response.status === 401) {
      throw new ApiError("Session expired. Please login again.", 401)
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      console.error('=== SERVER ERROR ===')
      console.error('Status:', response.status)
      console.error('Status Text:', response.statusText)
      console.error('Error Data:', errorData)
      throw new Error(errorData?.message || `Request failed: ${response.statusText}`)
    }

    return response.json()
  }

  async login(credentials: LoginRequest): Promise<User> {
    return await this.request<User>(
        "/auth/login",
        {
          method: "POST",
          body: JSON.stringify(credentials),
        }
    )
  }

  async register(data: RegisterRequest): Promise<User> {
    return await this.request<User>(
        "/auth/register",
        {
          method: "POST",
          body: JSON.stringify(data),
        }
    )
  }

  async getCurrentUser(): Promise<User> {

    return this.request<User>("/user/me")
  }

  async logout(): Promise<void> {
    try {
      await apiFetch<void>("/api/auth/logout", {
        method: "GET",
      })
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }
}

export const authService = new AuthService()