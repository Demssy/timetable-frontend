import { Link, Outlet } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"

export default function Layout() {
  const { isAuthenticated, user, logout } = useAuth()

  const handleLogout = async () => {
    await logout()
  }

  return (
    <main className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col">
      <header className="py-4 px-6 border-b border-slate-800 bg-transparent">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="text-white font-bold text-lg">
            Timetable
          </Link>
          <nav className="flex items-center space-x-4">
            <Link to="/" className="text-slate-300 hover:text-white">
              Home
            </Link>
            {!isAuthenticated ? (
              <>
                <Link to="/login" className="text-slate-300 hover:text-white">
                  Login
                </Link>
                <Link to="/signup" className="text-slate-300 hover:text-white">
                  Sign Up
                </Link>
              </>
            ) : (
              <>
                <Link to="/profile" className="text-slate-300 hover:text-white">
                  Profile
                </Link>
                <span className="text-slate-300">
                  {user?.fullName} ({user?.role})
                </span>
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  size="sm"
                  className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
                >
                  Logout
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <Outlet />
      </div>

      <footer className="py-4 text-center text-slate-500">
        © {new Date().getFullYear()} Timetable
      </footer>
    </main>
  )
}

