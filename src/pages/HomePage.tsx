import { Link } from "react-router-dom"
import { WeeklyTimetable } from "@/components/weekly-timetable"
import { useAuth } from "@/contexts/AuthContext"
import { UserRole } from "@/types/enums"
import { Button } from "@/components/ui/button"
import { CalendarDays, Users } from "lucide-react"

export default function HomePage() {
  const { user } = useAuth()
  const showMySchedule =
    user?.role === UserRole.STUDENT || user?.role === UserRole.TEACHER

  return (
    <div className="space-y-6 text-center w-full max-w-[1600px] mx-auto px-4">
      <h1 className="text-3xl font-bold">Weekly Timetable</h1>
      <p className="text-slate-300"></p>

      {showMySchedule && (
        <div className="flex justify-center gap-3">
          <Button asChild variant="default" className="gap-2">
            <Link to="/my-schedule">
              <CalendarDays className="h-4 w-4" />
              My Lessons
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2 border-slate-700 text-slate-200 hover:bg-slate-800">
            <Link to="/groups">
              <Users className="h-4 w-4" />
              Groups
            </Link>
          </Button>
        </div>
      )}

      <WeeklyTimetable />
    </div>
  )
}