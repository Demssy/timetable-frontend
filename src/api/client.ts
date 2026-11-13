// src/api/client.ts

export const AUTH_EXPIRED_EVENT = "auth:session-expired"
let isRedirectingToLogin = false

export function expireSession(): void {
  window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT))
  if (!isRedirectingToLogin && window.location.pathname !== "/login") {
    isRedirectingToLogin = true
    window.location.replace("/login?expired=true")
  }
}

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

export async function apiFetch<T>(
    path: string,
    options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    },
    credentials: "include",
  })

  if (response.status === 401 && !path.startsWith("/api/auth/")) {
    expireSession()
    // Keep promise pending during redirect so active components do not flash error banners
    return new Promise<T>(() => {})
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "")
    let message: string | undefined
    if (body) {
      try {
        const errorData: unknown = JSON.parse(body)
        if (errorData && typeof errorData === "object" && "message" in errorData &&
            typeof errorData.message === "string" && errorData.message.trim()) {
          message = errorData.message
        } else if (typeof errorData === "string" && errorData.trim()) {
          message = errorData
        }
      } catch {
        const plainText = body.trim()
        message = plainText.startsWith("<") ? undefined : plainText || undefined
      }
    }
    throw new ApiError(message || `Request failed: ${response.status} ${response.statusText}`.trim(), response.status)
  }

  if (response.status === 204) return {} as T

  const text = await response.text()
  if (!text) return {} as T
  return JSON.parse(text) as T
}