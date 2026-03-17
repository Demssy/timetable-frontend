import { WeeklyTimetable } from "@/components/weekly-timetable"

export default function HomePage() {
  return (
    <div className="space-y-6 text-center w-full max-w-[1600px] mx-auto px-4">
      <h1 className="text-3xl font-bold">Weekly Timetable</h1>
      <p className="text-slate-300"></p>

      <WeeklyTimetable />
    </div>
  )
}