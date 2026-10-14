import { cn } from "@/lib/utils"

export interface SegmentedTabOption<T extends string> {
  value: T
  label: string
}

interface SegmentedTabsProps<T extends string> {
  options: SegmentedTabOption<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
  "aria-label"?: string
}

/** Lightweight segmented control used as a tab switcher. */
export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
  className,
  "aria-label": ariaLabel,
}: SegmentedTabsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn("inline-flex gap-1 rounded-xl bg-slate-800 p-1", className)}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors",
            value === option.value
              ? "bg-blue-600 text-white shadow"
              : "text-slate-400 hover:text-slate-200",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

