import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { authService } from "@/services/authService"
import type { User, LoginRequest, RegisterRequest } from "@/types/user"
import { UserRole, type AvailabilityRole } from "@/types/enums"


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
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [roleSelection, setRoleSelection] = useState<{ userId: number; role: AvailabilityRole } | null>(null)



  // Check if user is authenticated on mount
  useEffect(() => {
    const initAuth = async () => {
        try {
          const currentUser = await authService.getCurrentUser()
          setUser(currentUser)
        } catch (error) {
          console.error("Failed to fetch user:", error)
          // User not authenticated, no need to logout
        }
      setIsLoading(false)
    }

    initAuth()
  }, [])

  // Login/register responses may omit `roles`, so always reload the full profile from /user/me.
  // Without `roles` a dual-role user is treated as single-role and student lessons are never requested.
  const loadFullUser = async (fallback: User): Promise<User> => {
    try {
      return await authService.getCurrentUser()
    } catch {
      return fallback
    }
  }

  const login = async (credentials: LoginRequest) => {
    try {
      const loggedInUser  = await authService.login(credentials)
      setRoleSelection(null)
      setUser(await loadFullUser(loggedInUser))

    } catch (error) {
      console.error("Login failed:", error)
      throw error
    }
  }

  const register = async (data: RegisterRequest) => {
    try {
      const registeredUser = await authService.register(data)
      setRoleSelection(null)
      setUser(await loadFullUser(registeredUser))
    } catch (error) {
      console.error("Registration failed:", error)
      throw error
    }
  }

  const logout = async (): Promise<void> => {
    await authService.logout()
    setUser(null)
    setRoleSelection(null)
  }

  const refreshUser = async () => {
    try {
      const currentUser = await authService.getCurrentUser()
      setUser(currentUser)
    } catch (error) {
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
