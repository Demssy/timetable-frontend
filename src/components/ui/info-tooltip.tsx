import { Info } from "lucide-react"
import { cn } from "@/lib/utils"

interface InfoTooltipProps {
  text: string
  className?: string
}

/** Info icon with a hover/focus tooltip (no external dependency). */
export function InfoTooltip({ text, className }: InfoTooltipProps) {
  return (
    <span className={cn("group relative inline-flex", className)}>
      <button
        type="button"
        aria-label={text}
        className="rounded-full text-slate-400 hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <Info className="h-4 w-4" />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 w-64 -translate-x-1/2 rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-200 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {text}
      </span>
    </span>
  )
}

