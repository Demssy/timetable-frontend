// Base fetch wrapper — mirrors userService/teacherService pattern.
// Uses credentials: "include" so the HTTP-only JWT cookie is sent automatically.

const BASE_URL = "http://localhost:8080"

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    },
    credentials: "include",
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => null)
    throw new Error(errorData?.message || `Request failed: ${response.status} ${response.statusText}`)
  }

  if (response.status === 204) return {} as T

  return response.json()
}
