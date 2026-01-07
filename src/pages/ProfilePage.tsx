import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardTitle } from "@/components/ui/card"
import {WeeklyTimetable} from "@/components/weekly-timetable.tsx";

export default function ProfilePage() {
  const { user } = useAuth()

  return (
    <div className="space-y-2 w-full max-w-7xl flex row space-between gap-32">
      <div className="w-2/5">
      <h1 className="text-3xl font-bold text-white mb-4">Profile</h1>

      <Card className="bg-slate-900/80 border-slate-800">
        <CardContent className="p-6 space-y-4">
          <CardTitle className="text-xl text-white">User Information</CardTitle>

          <div className="space-y-3 text-slate-300">
            <div className="flex justify-between border-b border-slate-700 pb-2">
              <span className="font-semibold">Full Name:</span>
              <span>{user?.fullName}</span>
            </div>

            <div className="flex justify-between border-b border-slate-700 pb-2">
              <span className="font-semibold">Email:</span>
              <span>{user?.email}</span>
            </div>

            <div className="flex justify-between border-b border-slate-700 pb-2">
              <span className="font-semibold">Role:</span>
              <span className="capitalize">{user?.role}</span>
            </div>

            <div className="flex justify-between border-b border-slate-700 pb-2">
              <span className="font-semibold">Status:</span>
              <span className={user?.isActive ? "text-green-400" : "text-red-400"}>
                {user?.isActive ? "Active" : "Inactive"}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="font-semibold">User ID:</span>
              <span className="font-mono text-sm">{user?.id}</span>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
      <div className="w-3/5">
        <WeeklyTimetable mobileOnly />
      </div>
    </div>
  )
}

