import { useState } from "react"
import { ChevronDown, ChevronUp, Users, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { UnmetStudentDTO } from "@/types/solver"

interface UnmetStudentsPanelProps {
  unmetStudents: UnmetStudentDTO[] | null   // null = not loaded yet
  isLoading: boolean
  error: string | null
}

export function UnmetStudentsPanel({
  unmetStudents,
  isLoading,
  error,
}: UnmetStudentsPanelProps) {
  // Auto-open if there are unmet students; stay closed when fully served
  const hasUnmet = (unmetStudents?.length ?? 0) > 0
  const [open, setOpen] = useState<boolean>(() => hasUnmet)

  // Still loading — show inline spinner without collapsible body
  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-3 flex items-center gap-2 text-sm text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading student assignment report…
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-950/10 px-4 py-3 text-sm text-red-400">
        Failed to load student report: {error}
      </div>
    )
  }

  // Not loaded yet (null) — don't render
  if (unmetStudents === null) return null

  // ── All students served ──────────────────────────────────────────────────
  if (!hasUnmet) {
    return (
      <div className="rounded-xl border border-green-500/20 bg-green-950/10 px-4 py-3 flex items-center gap-2 text-sm font-medium text-green-400">
        <Users className="h-4 w-4 shrink-0" />
        ✅ All students received all their requested lessons.
      </div>
    )
  }

  // ── Some students unmet ──────────────────────────────────────────────────
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-950/10 overflow-hidden">
      {/* Header / toggle */}
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-white/5 transition-colors"
        onClick={() => setOpen(prev => !prev)}
      >
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-amber-400 shrink-0" />
          <span className="text-amber-300">Student Assignment Report</span>
          <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
            ⚠ {unmetStudents.length} student{unmetStudents.length > 1 ? "s" : ""} not fully served
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
                  <th className="pb-2 pr-4 font-medium">Student Name</th>
                  <th className="pb-2 pr-4 font-medium">Email</th>
                  <th className="pb-2 pr-4 font-medium text-right">Wanted</th>
                  <th className="pb-2 pr-4 font-medium text-right">Got</th>
                  <th className="pb-2 font-medium text-right">Missing</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {unmetStudents.map(s => (
                  <tr key={s.studentId} className="hover:bg-white/[0.03] transition-colors">
                    <td className="py-2 pr-4 font-medium text-slate-200">{s.studentName}</td>
                    <td className="py-2 pr-4 text-slate-400 truncate max-w-[180px]">{s.studentEmail}</td>

                    {/* Wanted */}
                    <td className="py-2 pr-4 text-right text-slate-300">{s.desiredSlots}</td>

                    {/* Got — green if fully served, orange otherwise */}
                    <td className="py-2 pr-4 text-right font-mono">
                      <span className={cn(
                        "font-semibold",
                        s.assignedLessons === s.desiredSlots ? "text-green-400" : "text-orange-400",
                      )}>
                        {s.assignedLessons}
                      </span>
                    </td>

                    {/* Missing — always red bold */}
                    <td className="py-2 text-right font-mono">
                      <span className="text-red-400 font-bold">{s.missingLessons}</span>
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
