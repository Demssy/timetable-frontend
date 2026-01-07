import { WeeklyTimetable } from "@/components/weekly-timetable"

export default function SchedulePage() {
  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">Schedule</h1>
          <p className="mt-2 text-muted-foreground">View all dance classes for this week</p>
        </header>
        <WeeklyTimetable />
      </div>
    </main>
  )
}
