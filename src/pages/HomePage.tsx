import {WeeklyTimetable} from "@/components/weekly-timetable.tsx";

export default function HomePage() {
  return (
    <div className="space-y-6 text-center w-full max-w-6xl">
      <h1 className="text-3xl font-bold">Weekly Timetable</h1>
      <p className="text-slate-300"></p>

    <WeeklyTimetable>

    </WeeklyTimetable>
    </div>
  )
}
