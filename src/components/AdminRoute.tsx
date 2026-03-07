import { ProtectedRoute } from "@/components/ProtectedRoute"
import { UserRole } from "@/types/enums"

export function AdminRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRole={UserRole.ADMIN}>{children}</ProtectedRoute>
  )
}
