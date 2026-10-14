import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description: string
  actionLabel?: string
  actionTo?: string
  secondaryActionLabel?: string
  secondaryActionTo?: string
  className?: string
}

/** Friendly zero-data state with an optional primary call-to-action. */
export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionTo,
  secondaryActionLabel,
  secondaryActionTo,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 px-6 py-14 text-center",
        className
      )}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-500/15 text-indigo-300">
        {icon}
      </div>
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <p className="max-w-md text-sm text-slate-400">{description}</p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        {actionLabel && actionTo && (
          <Button asChild>
            <Link to={actionTo}>{actionLabel}</Link>
          </Button>
        )}
        {secondaryActionLabel && secondaryActionTo && (
          <Button asChild variant="outline" className="border-slate-700 text-slate-200 hover:bg-slate-800">
            <Link to={secondaryActionTo}>{secondaryActionLabel}</Link>
          </Button>
        )}
      </div>
    </div>
  )
}

