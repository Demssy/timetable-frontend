// Base fetch wrapper — mirrors userService/teacherService pattern.
// Uses credentials: "include" so the HTTP-only JWT cookie is sent automatically.

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
    this.name = "ApiError"
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
