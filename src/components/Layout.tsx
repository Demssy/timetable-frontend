import { Link, Outlet } from "react-router-dom"

export default function Layout() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col">
      <header className="py-4 px-6 border-b border-slate-800 bg-transparent">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="text-white font-bold text-lg">
            Timetable
          </Link>
          <nav className="space-x-4">
            <Link to="/" className="text-slate-300 hover:text-white">
              Главная
            </Link>
            <Link to="/login" className="text-slate-300 hover:text-white">
              Войти
            </Link>
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

