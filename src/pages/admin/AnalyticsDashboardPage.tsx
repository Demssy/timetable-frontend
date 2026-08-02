import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import {
  ChevronRight, Loader2, BarChart3, Grid3X3,
  Users, TrendingUp, RefreshCw, GraduationCap,
  BookOpen, CalendarDays,
} from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
  LineChart, Line,
  Rectangle,
} from "recharts"
import { solverApi } from "@/api/solverApi"
import { scheduleApi } from "@/api/scheduleApi"
import { roomApi } from "@/api/roomApi"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type {
  ScheduleMetadataDTO,
  ScheduleSolutionResponse,
  ScheduledLessonDTO,
  RoomDTO,
} from "@/types/schedule"
import type { TeacherResponse } from "@/types/teacher"

// ─── Types ───────────────────────────────────────────────────────────────────

interface RoomDayCell {
  room: string
  day: string
  count: number
  maxSlots: number
  percent: number
}

interface TeacherWeeklyItem {
  name: string
  hours: number
  maxHours: number
  colorCode: string
}

interface ScheduleSummary {
  id: number
  name: string
  validFrom: string
  totalLessons: number
  assignedLessons: number
  groupLessons: number
  privateLessons: number
  uniqueStudents: number
  uniqueTeachers: number
  avgRoomUtilization: number
  teacherHours: Map<string, { hours: number; color: string }>
}

type ActiveTab = "schedule" | "overall"

// ─── Constants ───────────────────────────────────────────────────────────────

const DAY_ORDER: string[] = [
  "SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY",
]
const DAY_SHORT: Record<string, string> = {
  SUNDAY: "Sun", MONDAY: "Mon", TUESDAY: "Tue", WEDNESDAY: "Wed",
  THURSDAY: "Thu", FRIDAY: "Fri", SATURDAY: "Sat",
}

const MAX_SLOTS_PER_DAY = 14

const HEATMAP_COLORS = [
  "bg-slate-800/60",
  "bg-emerald-500/20",
  "bg-emerald-500/40",
  "bg-amber-500/40",
  "bg-orange-500/50",
  "bg-red-500/50",
]

function getHeatmapClass(pct: number): string {
  if (pct === 0) return HEATMAP_COLORS[0]
  if (pct <= 25) return HEATMAP_COLORS[1]
  if (pct <= 50) return HEATMAP_COLORS[2]
  if (pct <= 75) return HEATMAP_COLORS[3]
  if (pct <= 90) return HEATMAP_COLORS[4]
  return HEATMAP_COLORS[5]
}

function getHeatmapText(pct: number): string {
  if (pct === 0) return "text-slate-600"
  if (pct <= 50) return "text-emerald-300"
  if (pct <= 75) return "text-amber-300"
  return "text-red-300"
}

const CHART_PALETTE = [
  "#818cf8", "#34d399", "#fbbf24", "#f87171",
  "#a78bfa", "#22d3ee", "#fb923c", "#e879f9",
  "#2dd4bf", "#facc15",
]

interface ColoredBarShapeProps {
  x?: number
  y?: number
  width?: number
  height?: number
  index?: number
  payload?: { colorCode?: string }
  fallbackFill: string
  palette?: string[]
}

function ColoredBarShape({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  index = 0,
  payload,
  fallbackFill,
  palette,
}: ColoredBarShapeProps) {
  const fill = payload?.colorCode || (palette ? palette[index % palette.length] : fallbackFill)

  return (
    <Rectangle
      x={x}
      y={y}
      width={width}
      height={height}
      radius={[0, 4, 4, 0]}
      fill={fill}
      fillOpacity={0.85}
    />
  )
}

// ─── Custom Tooltip ──────────────────────────────────────────────────────────

function ChartTooltip({
  active, payload, label,
}: {
  active?: boolean
  payload?: Array<{ value: number; name: string; color: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-slate-600 bg-slate-800/95 backdrop-blur px-3 py-2 shadow-xl">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm font-semibold" style={{ color: entry.color }}>
          {entry.name}: {entry.value.toFixed(1)}
        </p>
      ))}
    </div>
  )
}

// ─── Room Utilization Heatmap ────────────────────────────────────────────────

function RoomUtilizationHeatmap({
  cells, rooms, days,
}: {
  cells: Map<string, RoomDayCell>; rooms: string[]; days: string[]
}) {
  return (
    <Card className="border-slate-700 bg-slate-800/50">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20">
            <Grid3X3 className="h-4 w-4 text-emerald-400" />
          </div>
          <CardTitle className="text-white text-base">Room Utilization by Day</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {rooms.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-sm text-slate-500">No room data</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left text-xs font-semibold text-slate-400 pb-2 pr-3 min-w-[120px]">Room</th>
                  {days.map(d => (
                    <th key={d} className="text-center text-xs font-semibold text-slate-400 pb-2 px-1 min-w-[64px]">
                      {DAY_SHORT[d] ?? d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rooms.map(room => (
                  <tr key={room}>
                    <td className="text-sm text-slate-300 font-medium py-1 pr-3 truncate max-w-[160px]">{room}</td>
                    {days.map(day => {
                      const cell = cells.get(`${room}__${day}`)
                      const pct = cell?.percent ?? 0
                      return (
                        <td key={day} className="py-1 px-1">
                          <div className={cn("rounded-md h-10 flex items-center justify-center transition-all duration-300", getHeatmapClass(pct))}>
                            <span className={cn("text-xs font-bold", getHeatmapText(pct))}>
                              {pct > 0 ? `${Math.round(pct)}%` : "—"}
                            </span>
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-700/50">
              <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Load:</span>
              {[
                { label: "0%", cls: HEATMAP_COLORS[0] },
                { label: "≤25%", cls: HEATMAP_COLORS[1] },
                { label: "≤50%", cls: HEATMAP_COLORS[2] },
                { label: "≤75%", cls: HEATMAP_COLORS[3] },
                { label: "≤90%", cls: HEATMAP_COLORS[4] },
                { label: ">90%", cls: HEATMAP_COLORS[5] },
              ].map(({ label, cls }) => (
                <div key={label} className="flex items-center gap-1">
                  <div className={cn("w-4 h-4 rounded", cls)} />
                  <span className="text-[10px] text-slate-400">{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Teacher Weekly Hours Chart ──────────────────────────────────────────────

function TeacherWeeklyChart({ data }: { data: TeacherWeeklyItem[] }) {
  return (
    <Card className="border-slate-700 bg-slate-800/50">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/20">
            <Users className="h-4 w-4 text-violet-400" />
          </div>
          <CardTitle className="text-white text-base">Teacher Hours This Week</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-sm text-slate-500">No teacher data</div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(220, data.length * 48 + 40)}>
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 10 }} unit="h" />
              <YAxis type="category" dataKey="name" width={140} tick={{ fill: "#cbd5e1", fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.06)' }} />
              <Legend wrapperStyle={{ fontSize: 12, color: "#94a3b8" }} />
              <Bar
                dataKey="hours"
                name="Scheduled Hours"
                radius={[0, 4, 4, 0]}
                shape={(props) => <ColoredBarShape {...props} fallbackFill="#8b5cf6" />}
              />
              <Bar dataKey="maxHours" name="Max Daily Hours" fill="#475569" fillOpacity={0.4} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Overall: Room Utilization Trend ─────────────────────────────────────────

interface UtilizationTrendPoint {
  schedule: string
  [roomName: string]: string | number
}

function RoomUtilizationTrendChart({ data, roomNames }: { data: UtilizationTrendPoint[]; roomNames: string[] }) {
  return (
    <Card className="border-slate-700 bg-slate-800/50">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/20">
            <TrendingUp className="h-4 w-4 text-cyan-400" />
          </div>
          <div>
            <CardTitle className="text-white text-base">Room Utilization Trend</CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">Average daily utilization % per room across schedules — track growth week over week</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {data.length < 1 ? (
          <div className="h-[280px] flex items-center justify-center text-sm text-slate-500">Not enough schedule data</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data} margin={{ top: 10, right: 20, left: -5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="schedule" tick={{ fill: "#94a3b8", fontSize: 10 }} angle={-20} textAnchor="end" height={50} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} unit="%" domain={[0, 100]} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: "#94a3b8" }} />
              {roomNames.map((room, i) => (
                <Line
                  key={room} type="monotone" dataKey={room} name={room}
                  stroke={CHART_PALETTE[i % CHART_PALETTE.length]} strokeWidth={2.5}
                  dot={{ r: 4, fill: CHART_PALETTE[i % CHART_PALETTE.length], stroke: "#1e293b", strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Overall: Total Teacher Hours ────────────────────────────────────────────

interface TeacherTotalItem {
  name: string
  totalHours: number
  scheduleCount: number
  colorCode: string
}

function TeacherTotalChart({ data }: { data: TeacherTotalItem[] }) {
  return (
    <Card className="border-slate-700 bg-slate-800/50">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20">
            <GraduationCap className="h-4 w-4 text-indigo-400" />
          </div>
          <div>
            <CardTitle className="text-white text-base">Total Teacher Hours (All Schedules)</CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">Cumulative teaching hours across all solved schedules</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-sm text-slate-500">No data</div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(220, data.length * 48 + 40)}>
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 10 }} unit="h" />
              <YAxis type="category" dataKey="name" width={140} tick={{ fill: "#cbd5e1", fontSize: 11 }} />
              <Tooltip content={<ChartTooltip/>} cursor={{ fill: 'rgba(148, 163, 184, 0.06)' }} />
              <Bar
                dataKey="totalHours"
                name="Total Hours"
                radius={[0, 4, 4, 0]}
                shape={(props) => <ColoredBarShape {...props} fallbackFill="#8b5cf6" palette={CHART_PALETTE} />}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function computeRoomHeatmap(lessons: ScheduledLessonDTO[], rooms: RoomDTO[]): {
  cells: Map<string, RoomDayCell>; roomNames: string[]; days: string[]
} {
  const days = DAY_ORDER
  const roomNames = rooms.map(r => r.name).sort()
  const cells = new Map<string, RoomDayCell>()
  for (const room of roomNames) {
    for (const day of days) {
      cells.set(`${room}__${day}`, { room, day, count: 0, maxSlots: MAX_SLOTS_PER_DAY, percent: 0 })
    }
  }
  for (const l of lessons) {
    if (!l.timeslot || !l.room) continue
    const key = `${l.room.name}__${l.timeslot.dayOfWeek}`
    const cell = cells.get(key)
    if (cell) {
      cell.count++
      cell.percent = Math.min(100, (cell.count / cell.maxSlots) * 100)
    }
  }
  return { cells, roomNames, days }
}

function computeTeacherWeekly(lessons: ScheduledLessonDTO[]): TeacherWeeklyItem[] {
  const map = new Map<number, { teacher: TeacherResponse; totalMinutes: number }>()
  for (const l of lessons) {
    if (!l.timeslot) continue
    const existing = map.get(l.teacher.id)
    if (existing) existing.totalMinutes += l.durationMinutes
    else map.set(l.teacher.id, { teacher: l.teacher, totalMinutes: l.durationMinutes })
  }
  return Array.from(map.values())
    .map(({ teacher, totalMinutes }) => ({
      name: teacher.fullName,
      hours: Math.round((totalMinutes / 60) * 10) / 10,
      maxHours: teacher.maxDailyHours ?? 8,
      colorCode: teacher.colorCode || "#8b5cf6",
    }))
    .sort((a, b) => b.hours - a.hours)
}

function buildScheduleSummary(meta: ScheduleMetadataDTO, sol: ScheduleSolutionResponse): ScheduleSummary {
  const assigned = sol.lessons.filter(l => l.timeslot && l.room)
  const studentIds = new Set<number>()
  const teacherIds = new Set<number>()
  const teacherHours = new Map<string, { hours: number; color: string }>()

  for (const l of sol.lessons) {
    teacherIds.add(l.teacher.id)
    if (l.student) studentIds.add(l.student.id)
    if (l.timeslot) {
      const prev = teacherHours.get(l.teacher.fullName)
      const hrs = l.durationMinutes / 60
      if (prev) prev.hours += hrs
      else teacherHours.set(l.teacher.fullName, { hours: hrs, color: l.teacher.colorCode || "#8b5cf6" })
    }
  }

  const roomDayCounts = new Map<string, number>()
  for (const l of assigned) {
    const key = `${l.room!.name}__${l.timeslot!.dayOfWeek}`
    roomDayCounts.set(key, (roomDayCounts.get(key) ?? 0) + 1)
  }
  const utilizations = Array.from(roomDayCounts.values()).map(c => Math.min(100, (c / MAX_SLOTS_PER_DAY) * 100))
  const avgUtil = utilizations.length > 0 ? Math.round(utilizations.reduce((a, b) => a + b, 0) / utilizations.length) : 0

  return {
    id: meta.id, name: meta.name, validFrom: meta.validFrom,
    totalLessons: sol.lessons.length, assignedLessons: assigned.length,
    groupLessons: sol.lessons.filter(l => !l.isPrivate).length,
    privateLessons: sol.lessons.filter(l => l.isPrivate).length,
    uniqueStudents: studentIds.size, uniqueTeachers: teacherIds.size,
    avgRoomUtilization: avgUtil, teacherHours,
  }
}

function buildUtilizationTrend(
  summaries: ScheduleSummary[],
  allSolutions: Map<number, ScheduleSolutionResponse>,
  rooms: RoomDTO[],
): { data: UtilizationTrendPoint[]; roomNames: string[] } {
  const roomNames = rooms.map(r => r.name).sort()
  const data: UtilizationTrendPoint[] = []
  for (const s of summaries) {
    const sol = allSolutions.get(s.id)
    if (!sol) continue
    const point: UtilizationTrendPoint = { schedule: s.name }
    for (const rn of roomNames) {
      let totalCount = 0
      for (const day of DAY_ORDER) {
        totalCount += sol.lessons.filter(l => l.timeslot?.dayOfWeek === day && l.room?.name === rn).length
      }
      point[rn] = Math.round((totalCount / (DAY_ORDER.length * MAX_SLOTS_PER_DAY)) * 1000) / 10
    }
    data.push(point)
  }
  return { data, roomNames }
}

function buildTeacherTotals(summaries: ScheduleSummary[]): TeacherTotalItem[] {
  const totals = new Map<string, { totalHours: number; scheduleCount: number; color: string }>()
  for (const s of summaries) {
    for (const [name, { hours, color }] of s.teacherHours) {
      const prev = totals.get(name)
      if (prev) { prev.totalHours += hours; prev.scheduleCount++ }
      else totals.set(name, { totalHours: hours, scheduleCount: 1, color })
    }
  }
  return Array.from(totals.entries())
    .map(([name, { totalHours, scheduleCount, color }]) => ({
      name, totalHours: Math.round(totalHours * 10) / 10, scheduleCount, colorCode: color,
    }))
    .sort((a, b) => b.totalHours - a.totalHours)
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, iconColor, label, value, sub }: {
  icon: React.ElementType; iconColor: string; label: string; value: string | number; sub?: string
}) {
  return (
    <div className="rounded-xl border border-slate-700 bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn("h-4 w-4", iconColor)} />
        <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// ─── Main Page ───────────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════

export function AnalyticsDashboardPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("schedule")
  const [schedules, setSchedules] = useState<ScheduleMetadataDTO[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(true)

  const [solution, setSolution] = useState<ScheduleSolutionResponse | null>(null)
  const [rooms, setRooms] = useState<RoomDTO[]>([])
  const [isLoadingData, setIsLoadingData] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [allSolutions, setAllSolutions] = useState<Map<number, ScheduleSolutionResponse>>(new Map())
  const [overallSummaries, setOverallSummaries] = useState<ScheduleSummary[]>([])
  const [isLoadingOverall, setIsLoadingOverall] = useState(false)

  useEffect(() => {
    scheduleApi.adminGetAll()
      .then(data => { setSchedules(data); if (data.length > 0) setSelectedId(data[0].id) })
      .catch(() => setError("Failed to load schedules"))
      .finally(() => setIsLoadingSchedules(false))
  }, [])

  const loadAnalytics = useCallback(async (id: number) => {
    setIsLoadingData(true); setError(null)
    try {
      const [sol, rm] = await Promise.all([solverApi.getSolution(id), roomApi.getAll()])
      setSolution(sol); setRooms(rm)
    } catch { setError("Failed to load analytics. Make sure the solver has been run for this schedule.") }
    finally { setIsLoadingData(false) }
  }, [])

  useEffect(() => {
    if (selectedId && activeTab === "schedule") loadAnalytics(selectedId)
  }, [selectedId, activeTab, loadAnalytics])

  const loadOverall = useCallback(async () => {
    setIsLoadingOverall(true); setError(null)
    try {
      const rm = await roomApi.getAll(); setRooms(rm)
      const solutionMap = new Map<number, ScheduleSolutionResponse>()
      const summaries: ScheduleSummary[] = []
      const batches: ScheduleMetadataDTO[][] = []
      for (let i = 0; i < schedules.length; i += 6) batches.push(schedules.slice(i, i + 6))
      for (const batch of batches) {
        const results = await Promise.allSettled(batch.map(s => solverApi.getSolution(s.id)))
        results.forEach((r, idx) => {
          if (r.status === "fulfilled") {
            const meta = batch[idx]
            solutionMap.set(meta.id, r.value)
            summaries.push(buildScheduleSummary(meta, r.value))
          }
        })
      }
      summaries.sort((a, b) => a.validFrom.localeCompare(b.validFrom))
      setAllSolutions(solutionMap); setOverallSummaries(summaries)
    } catch { setError("Failed to load overall analytics data.") }
    finally { setIsLoadingOverall(false) }
  }, [schedules])

  useEffect(() => {
    if (activeTab === "overall" && overallSummaries.length === 0 && schedules.length > 0) loadOverall()
  }, [activeTab, schedules, overallSummaries.length, loadOverall])

  // Per-schedule computed
  const { cells: heatmapCells, roomNames, days: heatmapDays } = solution
    ? computeRoomHeatmap(solution.lessons, rooms)
    : { cells: new Map<string, RoomDayCell>(), roomNames: [] as string[], days: DAY_ORDER }
  const teacherWeekly = solution ? computeTeacherWeekly(solution.lessons) : []
  const totalLessons = solution?.lessons.length ?? 0
  const assignedLessons = solution?.lessons.filter(l => l.timeslot && l.room).length ?? 0
  const assignRate = totalLessons > 0 ? Math.round((assignedLessons / totalLessons) * 100) : 0
  const uniqueStudents = new Set(solution?.lessons.filter(l => l.student).map(l => l.student!.id) ?? []).size
  const uniqueTeachers = new Set(solution?.lessons.map(l => l.teacher.id) ?? []).size

  // Overall computed
  const { data: trendData, roomNames: trendRoomNames } = buildUtilizationTrend(overallSummaries, allSolutions, rooms)
  const teacherTotals = buildTeacherTotals(overallSummaries)
  const overallTotalLessons = overallSummaries.reduce((a, s) => a + s.totalLessons, 0)
  const overallTotalStudents = new Set(overallSummaries.flatMap(s => {
    const sol = allSolutions.get(s.id); return sol?.lessons.filter(l => l.student).map(l => l.student!.id) ?? []
  })).size
  const overallTotalTeachers = new Set(overallSummaries.flatMap(s => {
    const sol = allSolutions.get(s.id); return sol?.lessons.map(l => l.teacher.id) ?? []
  })).size
  const overallAvgUtil = overallSummaries.length > 0
    ? Math.round(overallSummaries.reduce((a, s) => a + s.avgRoomUtilization, 0) / overallSummaries.length) : 0

  if (isLoadingSchedules) {
    return (
      <div className="container mx-auto py-10 flex items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading…
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10 space-y-6 max-w-7xl">
      <nav className="flex items-center gap-1.5 text-sm text-slate-400">
        <Link to="/admin" className="hover:text-white transition-colors">Admin Panel</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-white font-medium">Analytics</span>
      </nav>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/25">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            Analytics Dashboard
          </h1>
          <p className="text-slate-400">Schedule insights, teacher workload &amp; room utilization</p>
        </div>
        <Button variant="outline" size="icon"
          onClick={() => { if (activeTab === "schedule" && selectedId) loadAnalytics(selectedId); else loadOverall() }}
          disabled={isLoadingData || isLoadingOverall} title="Refresh">
          <RefreshCw className={cn("h-4 w-4", (isLoadingData || isLoadingOverall) && "animate-spin")} />
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-slate-800/80 border border-slate-700 w-fit">
        {([
          { key: "schedule" as const, label: "Per Schedule", icon: CalendarDays },
          { key: "overall" as const, label: "Overall Statistics", icon: BarChart3 },
        ]).map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={cn("flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200",
              activeTab === key ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-slate-400 hover:text-white hover:bg-slate-700/50")}>
            <Icon className="h-4 w-4" />{label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
      )}

      {/* ═══ Per Schedule ═══ */}
      {activeTab === "schedule" && (
        <>
          <div className="flex items-center gap-3">
            <select value={selectedId ?? ""} onChange={e => setSelectedId(Number(e.target.value))}
              className="rounded-lg border border-slate-600 bg-slate-800 text-white text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/50">
              {schedules.map(s => <option key={s.id} value={s.id}>{s.name} (#{s.id})</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <StatCard icon={BookOpen} iconColor="text-blue-400" label="Total Lessons" value={totalLessons} sub={`${assignRate}% assigned`} />
            <StatCard icon={Users} iconColor="text-emerald-400" label="Students" value={uniqueStudents} />
            <StatCard icon={GraduationCap} iconColor="text-violet-400" label="Teachers" value={uniqueTeachers} />
            <StatCard icon={Grid3X3} iconColor="text-amber-400" label="Rooms Used" value={roomNames.length} />
            <StatCard icon={BarChart3} iconColor="text-cyan-400" label="Assigned" value={`${assignRate}%`} sub={`${assignedLessons}/${totalLessons}`} />
          </div>

          {isLoadingData && (
            <div className="flex items-center justify-center py-12 gap-3 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading analytics…
            </div>
          )}

          {!isLoadingData && solution && (
            <div className="space-y-6">
              <RoomUtilizationHeatmap cells={heatmapCells} rooms={roomNames} days={heatmapDays} />
              <TeacherWeeklyChart data={teacherWeekly} />
            </div>
          )}
        </>
      )}

      {/* ═══ Overall ═══ */}
      {activeTab === "overall" && (
        <>
          {isLoadingOverall ? (
            <div className="flex items-center justify-center py-12 gap-3 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading overall statistics…
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                <StatCard icon={CalendarDays} iconColor="text-indigo-400" label="Schedules" value={overallSummaries.length} />
                <StatCard icon={BookOpen} iconColor="text-blue-400" label="Total Lessons" value={overallTotalLessons} />
                <StatCard icon={Users} iconColor="text-emerald-400" label="Unique Students" value={overallTotalStudents} />
                <StatCard icon={GraduationCap} iconColor="text-violet-400" label="Unique Teachers" value={overallTotalTeachers} />
                <StatCard icon={Grid3X3} iconColor="text-amber-400" label="Avg Room Util." value={`${overallAvgUtil}%`} />
              </div>

              {/* Schedule breakdown table */}
              <Card className="border-slate-700 bg-slate-800/50">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20">
                      <CalendarDays className="h-4 w-4 text-indigo-400" />
                    </div>
                    <CardTitle className="text-white text-base">Schedule Breakdown</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {overallSummaries.length === 0 ? (
                    <div className="h-32 flex items-center justify-center text-sm text-slate-500">No solved schedules found</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-700">
                            {["Schedule", "From", "Lessons", "Group", "Private", "Students", "Teachers", "Avg Util."].map(h => (
                              <th key={h} className="text-left text-xs font-semibold text-slate-400 pb-2 pr-4">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {overallSummaries.map(s => (
                            <tr key={s.id} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                              <td className="py-2.5 pr-4 font-medium text-white">{s.name}</td>
                              <td className="py-2.5 pr-4 text-slate-400">{s.validFrom}</td>
                              <td className="py-2.5 pr-4 text-slate-300">{s.assignedLessons}/{s.totalLessons}</td>
                              <td className="py-2.5 pr-4 text-blue-400">{s.groupLessons}</td>
                              <td className="py-2.5 pr-4 text-purple-400">{s.privateLessons}</td>
                              <td className="py-2.5 pr-4 text-emerald-400">{s.uniqueStudents}</td>
                              <td className="py-2.5 pr-4 text-violet-400">{s.uniqueTeachers}</td>
                              <td className="py-2.5 pr-4">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-2 rounded-full bg-slate-700 max-w-[80px]">
                                    <div className={cn("h-2 rounded-full transition-all",
                                      s.avgRoomUtilization > 75 ? "bg-red-500" : s.avgRoomUtilization > 50 ? "bg-amber-500" : "bg-emerald-500")}
                                      style={{ width: `${Math.min(100, s.avgRoomUtilization)}%` }} />
                                  </div>
                                  <span className="text-slate-300 text-xs font-medium w-9">{s.avgRoomUtilization}%</span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

              <RoomUtilizationTrendChart data={trendData} roomNames={trendRoomNames} />
              <TeacherTotalChart data={teacherTotals} />
            </>
          )}
        </>
      )}
    </div>
  )
}

