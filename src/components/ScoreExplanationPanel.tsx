import { Fragment, useState } from "react"
import { ChevronDown, ChevronRight, ChevronUp, BarChart2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { ScoreExplanationResponse } from "@/types/solver"

interface ScoreExplanationPanelProps {
  readonly scheduleId: number | null
  readonly hardScore: number
  readonly explanation: ScoreExplanationResponse | null
  readonly isLoading: boolean
  readonly error: string | null
  /** Called when the user clicks "Show Score Report" for the first time */
  readonly onRequestLoad: () => void
}

type FilterKey = "all" | "hard" | "soft" | "rewards"

const FILTERS: ReadonlyArray<{ key: FilterKey; label: string }> = [
  { key: "all", label: "All" },
  { key: "hard", label: "Hard Violations" },
  { key: "soft", label: "Soft Penalties" },
  { key: "rewards", label: "Rewards" },
]

function renderHardScore(score: number) {
  if (score !== 0) return <span className="text-red-400 font-semibold">{score}</span>
  return <span className="text-slate-600">—</span>
}

function renderSoftScore(score: number) {
  if (score < 0) return <span className="text-orange-400">{score}</span>
  if (score > 0) return <span className="text-green-400">+{score}</span>
  return <span className="text-slate-600">—</span>
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
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})
  const [filter, setFilter] = useState<FilterKey>("all")

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

  const filteredViolations = sortedViolations.filter(v => {
    switch (filter) {
      case "hard": return v.hardScore < 0
      case "soft": return v.softScore < 0
      case "rewards": return v.softScore > 0
      default: return true
    }
  })

  const toggleRow = (name: string) =>
    setExpandedRows(prev => ({ ...prev, [name]: !prev[name] }))

  return (
    <div className={cn(
      "rounded-xl border overflow-hidden transition-colors",
      isViolated ? "border-red-500/30 bg-red-950/20" : "border-slate-700 bg-slate-900/50",
    )}>
      {/* Header / toggle */}
      <button
        type="button"
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
              <Button type="button" variant="outline" size="sm" onClick={onRequestLoad}>Load constraint breakdown</Button>
            </div>
          )}

          {!isLoading && explanation && sortedViolations.length === 0 && (
            <p className="text-sm text-slate-500 py-3 text-center">No constraint data available yet.</p>
          )}

          {!isLoading && explanation && sortedViolations.length > 0 && (
            <div className="overflow-x-auto mt-1">
              {/* Filter pills */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {FILTERS.map(f => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setFilter(f.key)}
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-[11px] font-medium border transition-colors",
                      filter === f.key
                        ? "bg-slate-200 text-slate-900 border-slate-200"
                        : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700",
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
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
                  {filteredViolations.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-slate-500">
                        No constraints match this filter.
                      </td>
                    </tr>
                  )}
                  {filteredViolations.map((v) => {
                    const hasDetails = (v.details?.length ?? 0) > 0
                    const isExpanded = expandedRows[v.constraintName]
                    const isReward = v.hardScore === 0 && v.softScore > 0
                    return (
                      <Fragment key={v.constraintName}>
                        <tr
                          className={cn(
                            "cursor-pointer hover:bg-white/5 transition-colors",
                            v.hardScore !== 0 && "bg-red-500/5 hover:bg-red-500/10",
                          )}
                          onClick={() => toggleRow(v.constraintName)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault()
                              toggleRow(v.constraintName)
                            }
                          }}
                          tabIndex={0}
                          aria-expanded={isExpanded}
                        >
                          <td className="py-2 pr-4 font-medium text-slate-200">
                            <span className="inline-flex items-center gap-1.5">
                              {isExpanded
                                ? <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                : <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                              {v.constraintName}
                            </span>
                          </td>

                          {/* Hard impact */}
                          <td className="py-2 pr-4 text-right font-mono">
                            {renderHardScore(v.hardScore)}
                          </td>

                          {/* Soft impact */}
                          <td className="py-2 pr-4 text-right font-mono">
                            {renderSoftScore(v.softScore)}
                          </td>

                          {/* Match count */}
                          <td className="py-2 text-right text-slate-400">{v.matchCount}</td>
                        </tr>

                        {/* Expanded match details */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={4} className="p-0">
                              <div
                                className={cn(
                                  "bg-black/30 border-l-2 px-3 py-2 space-y-2 max-h-80 overflow-y-auto",
                                  isReward ? "border-emerald-500/50" : "border-red-500/50",
                                )}
                              >
                                {hasDetails ? (
                                  v.details!.map((d, i) => (
                                    <div
                                      key={`${v.constraintName}-${i}`}
                                      className="flex items-start justify-between gap-3 border-b border-white/5 last:border-0 pb-2 last:pb-0"
                                    >
                                      <div className="space-y-1 min-w-0">
                                        {d.involvedUsers.length > 0 && (
                                          <div className="flex flex-wrap gap-1">
                                            {d.involvedUsers.map((u, j) => (
                                              <span
                                                key={`${u}-${j}`}
                                                className="rounded-full px-2 py-0.5 text-[11px] bg-slate-800 text-slate-300 border border-slate-700"
                                              >
                                                {u}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                        <p className="text-slate-300">{d.description}</p>
                                        {(d.timeslotInfo || d.lessonInfo) && (
                                          <div className="flex flex-wrap gap-1">
                                            {d.timeslotInfo && (
                                              <span className="rounded px-1.5 py-0.5 text-[11px] bg-slate-800/80 text-slate-400 border border-slate-700">
                                                🕒 {d.timeslotInfo}
                                              </span>
                                            )}
                                            {d.lessonInfo && (
                                              <span className="rounded px-1.5 py-0.5 text-[11px] bg-slate-800/80 text-slate-400 border border-slate-700">
                                                📍 {d.lessonInfo}
                                              </span>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                      <div className="shrink-0 text-right font-mono space-y-0.5">
                                        {d.hardImpact !== 0 && (
                                          <div className="text-red-400">
                                            {d.hardImpact > 0 ? "+" : ""}{d.hardImpact} hard
                                          </div>
                                        )}
                                        {d.softImpact !== 0 && (
                                          <div className={d.softImpact > 0 ? "text-emerald-400" : "text-orange-400"}>
                                            {d.softImpact > 0 ? "+" : ""}{d.softImpact} soft
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-slate-500">No match details available.</p>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}