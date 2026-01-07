import type {LoginRequest, RegisterRequest, User} from "@/types/user"

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

    // Handle token expiration
    if (response.status === 401) {
      const refreshed = await this.refreshAccessToken()
      if (refreshed) {
        // Retry original request
        const retryResponse = await fetch(url, {
          ...options,
          headers,
          credentials: "include",
        })

        if (!retryResponse.ok) {
          throw new Error(`Request failed: ${retryResponse.statusText}`)
        }

        return retryResponse.json()
      } else {
        // Refresh failed, redirect to login
        throw new Error("Session expired. Please login again.")
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
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
    const response = await this.request<{ user: User }>(
      "/auth/register",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    )

    return response.user
  }

  async getCurrentUser(): Promise<User> {

    return this.request<User>("/user/me")
  }

  async refreshAccessToken(): Promise<boolean> {
    try {
      await fetch(`/api/auth/refresh`, {
        method: "POST",
        credentials: "include", // Send refresh token cookie
      })

      return true
    } catch (error) {
      console.error("Failed to refresh token:", error)
      return false
    }
  }

  async logout(): Promise<void> {
    try {
      await fetch(`/api/auth/logout`, {
        method: "GET",
        credentials: "include",
      })
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }
}

export const authService = new AuthService()