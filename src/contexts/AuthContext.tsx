import { createContext, useCallback, useContext, useState, useEffect, useRef, type ReactNode } from "react"
import { useNavigate } from "react-router-dom"
import { ApiError, AUTH_EXPIRED_EVENT, expireSession } from "@/api/client"
import { authService } from "@/services/authService"
import type { User, LoginRequest, RegisterRequest } from "@/types/user"
import { UserRole, type AvailabilityRole } from "@/types/enums"

const SESSION_TTL_MS = 60 * 60 * 1000
const EXPIRES_AT_KEY = "auth_session_expires_at"

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  isTeacher: boolean
  isStudent: boolean
  isDualRole: boolean
  activeRole: AvailabilityRole | null
  setActiveRole: (role: AvailabilityRole) => void
  login: (credentials: LoginRequest) => Promise<void>
  register: (data: RegisterRequest) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [roleSelection, setRoleSelection] = useState<{ userId: number; role: AvailabilityRole } | null>(null)
  const sessionVersion = useRef(0)

  const clearSessionState = useCallback(() => {
    sessionVersion.current += 1
    localStorage.removeItem(EXPIRES_AT_KEY)
    setUser(null)
    setRoleSelection(null)
  }, [])

  useEffect(() => {
    window.addEventListener(AUTH_EXPIRED_EVENT, clearSessionState)
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, clearSessionState)
  }, [clearSessionState])

  // Check if user is authenticated on mount
  useEffect(() => {
    let active = true
    const version = sessionVersion.current
    const initAuth = async () => {
      try {
        const currentUser = await authService.getCurrentUser()
        if (active && version === sessionVersion.current) {
          setUser(currentUser)
        }
      } catch (error) {
        if (active && version === sessionVersion.current) {
          if (error instanceof ApiError && error.status === 401 && localStorage.getItem(EXPIRES_AT_KEY)) {
            expireSession()
          } else if (!(error instanceof ApiError && error.status === 401)) {
            console.error("Failed to fetch user:", error)
          }
        }
      } finally {
        if (active) setIsLoading(false)
      }
    }

    void initAuth()
    return () => { active = false }
  }, [])

  // Login/register responses may omit `roles`, so always reload the full profile from /user/me.
  // Without `roles` a dual-role user is treated as single-role and student lessons are never requested.
  const loadFullUser = async (fallback: User): Promise<User> => {
    try {
      return await authService.getCurrentUser()
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) throw error
      return fallback
    }
  }

  const login = async (credentials: LoginRequest) => {
    const version = ++sessionVersion.current
    try {
      const loggedInUser  = await authService.login(credentials)
      if (version !== sessionVersion.current) return new Promise<void>(() => {})
      localStorage.setItem(EXPIRES_AT_KEY, String(Date.now() + SESSION_TTL_MS))
      setRoleSelection(null)
      const currentUser = await loadFullUser(loggedInUser)
      if (version !== sessionVersion.current) return new Promise<void>(() => {})
      setUser(currentUser)

    } catch (error) {
      if (version !== sessionVersion.current) return new Promise<void>(() => {})
      if (error instanceof ApiError && error.status === 401) clearSessionState()
      console.error("Login failed:", error)
      throw error
    }
  }

  const register = async (data: RegisterRequest) => {
    const version = ++sessionVersion.current
    try {
      const registeredUser = await authService.register(data)
      if (version !== sessionVersion.current) return new Promise<void>(() => {})
      localStorage.setItem(EXPIRES_AT_KEY, String(Date.now() + SESSION_TTL_MS))
      setRoleSelection(null)
      const currentUser = await loadFullUser(registeredUser)
      if (version !== sessionVersion.current) return new Promise<void>(() => {})
      setUser(currentUser)
    } catch (error) {
      if (version !== sessionVersion.current) return new Promise<void>(() => {})
      if (error instanceof ApiError && error.status === 401) clearSessionState()
      console.error("Registration failed:", error)
      throw error
    }
  }

  const logout = useCallback(async (): Promise<void> => {
    clearSessionState()
    await authService.logout()
  }, [clearSessionState])

  useEffect(() => {
    if (!user) return

    const storedExpiry = localStorage.getItem(EXPIRES_AT_KEY)
    let expiresAt = storedExpiry === null ? NaN : Number(storedExpiry)
    if (!Number.isFinite(expiresAt)) {
      expiresAt = Date.now() + SESSION_TTL_MS
      localStorage.setItem(EXPIRES_AT_KEY, String(expiresAt))
    }

    const expire = () => {
      navigate("/login?expired=true", { replace: true })
      void logout()
    }
    const remainingMs = expiresAt - Date.now()
    if (remainingMs <= 0) {
      expire()
      return
    }

    const timer = window.setTimeout(expire, remainingMs)
    return () => window.clearTimeout(timer)
  }, [user, logout, navigate])

  const refreshUser = async () => {
    const version = sessionVersion.current
    try {
      const currentUser = await authService.getCurrentUser()
      if (version !== sessionVersion.current) return
      setUser(currentUser)
    } catch (error) {
      if (version !== sessionVersion.current) return
      if (error instanceof ApiError && error.status === 401) {
        expireSession()
        return new Promise<void>(() => {})
      }
      console.error("Failed to refresh user:", error)
      await logout()
    }
  }

  // Null-safe: roles may be missing for stale sessions
  const isTeacher = (user?.roles?.includes("ROLE_TEACHER") ?? false) || user?.role === UserRole.TEACHER
  const isStudent = (user?.roles?.includes("ROLE_STUDENT") ?? false) || user?.role === UserRole.STUDENT
  const isDualRole = user?.role !== UserRole.ADMIN && isTeacher && isStudent
  const activeRole: AvailabilityRole | null = !user || user.role === UserRole.ADMIN
    ? null
    : isDualRole && roleSelection?.userId === user.id
      ? roleSelection.role
      : isTeacher ? "TEACHER" : isStudent ? "STUDENT" : null
  const setActiveRole = (role: AvailabilityRole) => {
    if (user && isDualRole) setRoleSelection({ userId: user.id, role })
  }

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    isTeacher,
    isStudent,
    isDualRole,
    activeRole,
    setActiveRole,
    login,
    register,
    logout,
    refreshUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
