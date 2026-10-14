import { useState } from "react"
import { ChevronDown, ChevronUp, GraduationCap } from "lucide-react"
import { cn } from "@/lib/utils"
import type { TeacherWorkloadSummary } from "@/types/solver"

interface TeacherWorkloadPanelProps {
  readonly teacherWorkloads: TeacherWorkloadSummary[] | null | undefined
}

function renderDifference(difference: number) {
  if (difference > 0) {
    return <span className="text-red-400 font-semibold">+{difference} (Overloaded)</span>
  }
  if (difference < 0) {
    return <span className="text-amber-400 font-semibold">{difference} (Underloaded)</span>
  }
  return <span className="text-emerald-400 font-semibold">0 (Optimal)</span>
}

export function TeacherWorkloadPanel({ teacherWorkloads }: TeacherWorkloadPanelProps) {
  const overloaded = teacherWorkloads?.filter(t => t.difference > 0).length ?? 0
  const outside = teacherWorkloads?.filter(t => t.outsideAvailabilityCount > 0).length ?? 0
  const hasIssues = overloaded > 0 || outside > 0
  const [open, setOpen] = useState<boolean>(() => hasIssues)

  // Nothing to show when the backend sent no workload data
  if (!teacherWorkloads || teacherWorkloads.length === 0) return null

  return (
    <div
      className={cn(
        "rounded-xl border overflow-hidden",
        hasIssues ? "border-amber-500/30 bg-amber-950/10" : "border-slate-700 bg-slate-900/50",
      )}
    >
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-white/5 transition-colors"
        onClick={() => setOpen(prev => !prev)}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <GraduationCap className={cn("h-4 w-4 shrink-0", hasIssues ? "text-amber-400" : "text-slate-400")} />
          <span className={hasIssues ? "text-amber-300" : "text-slate-300"}>
            Teacher Workload &amp; Availability Report
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-bold border",
              hasIssues
                ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
            )}
          >
            {hasIssues ? `${overloaded} overloaded / ${outside} outside availability` : "✅ All within limits"}
          </span>
        </div>
        <div className="text-slate-500 shrink-0">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 text-left">
                  <th className="pb-2 pr-4 font-medium">Teacher Name</th>
                  <th className="pb-2 pr-4 font-medium">Email</th>
                  <th className="pb-2 pr-4 font-medium text-right">Wanted</th>
                  <th className="pb-2 pr-4 font-medium text-right">Got</th>
                  <th className="pb-2 pr-4 font-medium text-right">Difference / Status</th>
                  <th className="pb-2 font-medium text-right">Outside Availability</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {teacherWorkloads.map(t => (
                  <tr key={t.teacherId} className="hover:bg-white/[0.03] transition-colors">
                    <td className="py-2 pr-4 font-medium text-slate-200">{t.teacherName}</td>
                    <td className="py-2 pr-4 text-slate-400 truncate max-w-[180px]">{t.email}</td>
                    <td className="py-2 pr-4 text-right text-slate-300">{t.desiredLessons}</td>
                    <td className="py-2 pr-4 text-right font-mono text-slate-300">{t.assignedLessons}</td>
                    <td className="py-2 pr-4 text-right font-mono">{renderDifference(t.difference)}</td>
                    <td className="py-2 text-right">
                      {t.outsideAvailabilityCount > 0 ? (
                        <span className="inline-flex items-center rounded px-2 py-0.5 text-[11px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                          ⚠️ {t.outsideAvailabilityCount} outside window
                        </span>
                      ) : (
                        <span className="text-emerald-500/70">✓ Within window</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

