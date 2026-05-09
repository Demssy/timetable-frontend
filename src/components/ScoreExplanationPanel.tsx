import { useState } from "react"
import { ChevronDown, ChevronUp, BarChart2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { ScoreExplanationResponse } from "@/types/solver"

interface ScoreExplanationPanelProps {
  scheduleId: number | null
  hardScore: number
  explanation: ScoreExplanationResponse | null
  isLoading: boolean
  error: string | null
  /** Called when the user clicks "Show Score Report" for the first time */
  onRequestLoad: () => void
}

export function ScoreExplanationPanel({
  hardScore,
  explanation,
  isLoading,
  error,
  onRequestLoad,
}: ScoreExplanationPanelProps) {
  const [open, setOpen] = useState<boolean>(() => hardScore < 0)
  const isViolated = hardScore < 0

  const handleToggle = () => {
    if (!open && !explanation && !isLoading) onRequestLoad()
    setOpen(prev => !prev)
  }

  const sortedViolations = explanation
    ? [...explanation.violations]
        .filter(v => v.hardScore !== 0 || v.softScore !== 0)
        .sort((a, b) => {
          if (a.hardScore !== 0 && b.hardScore === 0) return -1
          if (a.hardScore === 0 && b.hardScore !== 0) return 1
          return a.hardScore - b.hardScore
        })
    : []

  return (
    <div className={cn(
      "rounded-xl border overflow-hidden transition-colors",
      isViolated ? "border-red-500/30 bg-red-950/20" : "border-slate-700 bg-slate-900/50",
    )}>
      {/* Header / toggle */}
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-white/5 transition-colors"
        onClick={handleToggle}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <BarChart2 className={cn("h-4 w-4 shrink-0", isViolated ? "text-red-400" : "text-slate-400")} />
          <span className={isViolated ? "text-red-300" : "text-slate-300"}>
            Score Report
          </span>

          {/* Total score badge */}
          {explanation?.totalScore && (
            <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              {explanation.totalScore}
            </span>
          )}

          {/* Status badge */}
          {isViolated ? (
            <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
              ⚠ Hard violations detected
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-bold bg-green-500/20 text-green-400 border border-green-500/30">
              ✅ Feasible solution
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-slate-500 shrink-0">
          {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {/* Collapsible body */}
      {open && (
        <div className="px-4 pb-4">
          {isLoading && (
            <div className="flex items-center gap-2 py-6 justify-center text-slate-400 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading constraint breakdown…
            </div>
          )}

          {error && !isLoading && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-400">{error}</div>
          )}

          {!isLoading && !error && !explanation && (
            <div className="py-4 text-center">
              <Button variant="outline" size="sm" onClick={onRequestLoad}>Load constraint breakdown</Button>
            </div>
          )}

          {!isLoading && explanation && sortedViolations.length === 0 && (
            <p className="text-sm text-slate-500 py-3 text-center">No constraint data available yet.</p>
          )}

          {!isLoading && explanation && sortedViolations.length > 0 && (
            <div className="overflow-x-auto mt-1">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 text-left">
                    <th className="pb-2 pr-4 font-medium">Constraint Name</th>
                    <th className="pb-2 pr-4 font-medium text-right">Hard Impact</th>
                    <th className="pb-2 pr-4 font-medium text-right">Soft Impact</th>
                    <th className="pb-2 font-medium text-right">Matches</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {sortedViolations.map((v, idx) => (
                    <tr
                      key={idx}
                      className={cn(
                        "transition-colors",
                        v.hardScore !== 0 ? "bg-red-500/5 hover:bg-red-500/10" : "hover:bg-white/[0.03]",
                      )}
                    >
                      <td className="py-2 pr-4 font-medium text-slate-200">{v.constraintName}</td>

                      {/* Hard impact */}
                      <td className="py-2 pr-4 text-right font-mono">
                        {v.hardScore !== 0
                          ? <span className="text-red-400 font-semibold">{v.hardScore}</span>
                          : <span className="text-slate-600">—</span>}
                      </td>

                      {/* Soft impact */}
                      <td className="py-2 pr-4 text-right font-mono">
                        {v.softScore < 0
                          ? <span className="text-orange-400">{v.softScore}</span>
                          : v.softScore > 0
                            ? <span className="text-green-400">+{v.softScore}</span>
                            : <span className="text-slate-600">—</span>}
                      </td>

                      {/* Match count */}
                      <td className="py-2 text-right text-slate-400">{v.matchCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}