import { useRef, useState } from "react"
import { Bookmark, Gauge, Info, Loader2, RotateCcw, Settings2, ShieldAlert, Sparkles } from "lucide-react"
import { solverSettingsApi } from "@/api/solverSettingsApi"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { SolverSettings, SolverSettingsPreset, SolverSettingsResponse } from "@/types/solverSettings"

type SettingsKey = keyof SolverSettings
type SettingsForm = Record<SettingsKey, string>
type SyncMode = "active" | "preserve"
type SettingsTab = "general" | "hard" | "soft" | "presets"

interface FieldDefinition {
  key: SettingsKey
  label: string
  min: number
  max: number
  description: string
}

interface FieldGroup {
  id: Exclude<SettingsTab, "presets">
  title: string
  description: string
  fields: FieldDefinition[]
}

const INT_MAX = 2147483647
const FIELD_GROUPS: FieldGroup[] = [
  {
    id: "general",
    title: "General settings",
    description: "Set the solver runtime and the thresholds used when validating schedules.",
    fields: [
      { key: "solverTimeLimitSeconds", label: "Solver time limit (seconds)", min: 5, max: 300, description: "Maximum duration of a new solver run." },
      { key: "maxAllowedHardPenalty", label: "Allowed hard penalty for publication", min: 0, max: INT_MAX, description: "Total weighted penalty points, not the number of violations." },
      { key: "teacherMaxDailyLessons", label: "Maximum teacher lessons per day", min: 1, max: INT_MAX, description: "Threshold for the daily limit." },
      { key: "teacherBreakThresholdMinutes", label: "Teacher gap threshold (minutes)", min: 0, max: INT_MAX, description: "Threshold used to calculate the gap penalty." },
    ],
  },
  {
    id: "hard",
    title: "Hard penalties",
    description: "Control the penalty points assigned to hard constraint violations.",
    fields: [
      { key: "physicalConflictHardWeight", label: "Physical conflict weight", min: 1, max: 50, description: "Hard penalty." },
      { key: "weeklyAvailabilityHardWeight", label: "Weekly availability violation weight", min: 1, max: 20, description: "Hard penalty." },
      { key: "teacherDailyLimitHardWeight", label: "Teacher daily limit weight", min: 0, max: 20, description: "Zero disables this penalty." },
      { key: "studentMultipleDailyPrivateHardWeight", label: "Multiple private lessons per student per day weight", min: 0, max: 20, description: "Zero disables this penalty." },
      { key: "weeklyQuotaOverflowHardWeight", label: "Weekly quota overflow weight", min: 1, max: 20, description: "Hard penalty." },
    ],
  },
  {
    id: "soft",
    title: "Soft penalties and rewards",
    description: "Fine-tune preferences. Soft settings do not replace hard constraints.",
    fields: [
      { key: "privateLessonAssignmentReward", label: "Student assignment reward", min: 0, max: 100, description: "Soft reward." },
      { key: "primeTimeLessonReward", label: "Prime-time lesson reward", min: 0, max: 100, description: "Soft reward." },
      { key: "studentUnfulfilledLessonPenalty", label: "Unfulfilled student request penalty", min: 0, max: 100, description: "Soft penalty." },
      { key: "teacherUnfulfilledLessonPenalty", label: "Unfulfilled teacher request penalty", min: 0, max: 100, description: "Soft penalty." },
      { key: "teacherGapPenaltyMultiplier", label: "Teacher gap penalty multiplier", min: 0, max: 100, description: "Soft penalty." },
      { key: "teacherWorkloadFairnessMultiplier", label: "Teacher workload imbalance multiplier", min: 0, max: 100, description: "Soft penalty." },
    ],
  },
]
const FIELDS = FIELD_GROUPS.flatMap(group => group.fields)
const TABS: { id: SettingsTab; label: string; icon: typeof Gauge }[] = [
  { id: "general", label: "General", icon: Gauge },
  { id: "hard", label: "Hard penalties", icon: ShieldAlert },
  { id: "soft", label: "Soft settings", icon: Sparkles },
  { id: "presets", label: "Presets", icon: Bookmark },
]
const SLIDER_STEPS = 1000

function toForm(settings: SolverSettings): SettingsForm {
  return Object.fromEntries(FIELDS.map(({ key }) => [key, String(settings[key])])) as SettingsForm
}

function validateField(value: string, field: FieldDefinition): string | null {
  if (!value.trim()) return "This field is required."
  if (!/^\d+$/.test(value)) return "Enter a whole number."
  const number = Number(value)
  if (!Number.isSafeInteger(number) || number < field.min || number > field.max) {
    return `Enter a value between ${field.min} and ${field.max}.`
  }
  return null
}

function toSettings(form: SettingsForm): SolverSettings {
  return {
    solverTimeLimitSeconds: Number(form.solverTimeLimitSeconds),
    maxAllowedHardPenalty: Number(form.maxAllowedHardPenalty),
    teacherMaxDailyLessons: Number(form.teacherMaxDailyLessons),
    teacherBreakThresholdMinutes: Number(form.teacherBreakThresholdMinutes),
    physicalConflictHardWeight: Number(form.physicalConflictHardWeight),
    weeklyAvailabilityHardWeight: Number(form.weeklyAvailabilityHardWeight),
    teacherDailyLimitHardWeight: Number(form.teacherDailyLimitHardWeight),
    studentMultipleDailyPrivateHardWeight: Number(form.studentMultipleDailyPrivateHardWeight),
    weeklyQuotaOverflowHardWeight: Number(form.weeklyQuotaOverflowHardWeight),
    privateLessonAssignmentReward: Number(form.privateLessonAssignmentReward),
    primeTimeLessonReward: Number(form.primeTimeLessonReward),
    studentUnfulfilledLessonPenalty: Number(form.studentUnfulfilledLessonPenalty),
    teacherUnfulfilledLessonPenalty: Number(form.teacherUnfulfilledLessonPenalty),
    teacherGapPenaltyMultiplier: Number(form.teacherGapPenaltyMultiplier),
    teacherWorkloadFairnessMultiplier: Number(form.teacherWorkloadFairnessMultiplier),
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "An unexpected error occurred."
}

interface SettingsSliderProps {
  field: FieldDefinition
  value: string
  defaultValue: number
  disabled: boolean
  onChange: (value: string) => void
}

function SettingsSlider({ field, value, defaultValue, disabled, onChange }: SettingsSliderProps) {
  const [exactValueOpen, setExactValueOpen] = useState(false)
  const error = validateField(value, field)
  const isLargeRange = field.max === INT_MAX
  const numericValue = error ? field.min : Number(value)
  const range = field.max - field.min
  const sliderValue = isLargeRange
    ? Math.round((Math.log1p(numericValue - field.min) / Math.log1p(range)) * SLIDER_STEPS)
    : numericValue
  const id = `solver-setting-${field.key}`
  const errorId = `${id}-error`

  function handleSliderChange(raw: string) {
    const position = Number(raw)
    const next = isLargeRange
      ? field.min + Math.round(Math.expm1((position / SLIDER_STEPS) * Math.log1p(range)))
      : position
    onChange(String(Math.min(field.max, Math.max(field.min, next))))
  }

  return (
    <div className="rounded-xl border border-slate-700/80 bg-slate-800/40 p-4 transition-colors hover:border-slate-600">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <label htmlFor={id} className="text-sm font-semibold text-slate-100">{field.label}</label>
          <p id={`${id}-help`} className="mt-1 text-xs leading-relaxed text-slate-400">{field.description}</p>
        </div>
        <span className="shrink-0 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-sm font-semibold tabular-nums text-emerald-300">
          {error ? "—" : numericValue.toLocaleString("en-US")}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={isLargeRange ? 0 : field.min}
        max={isLargeRange ? SLIDER_STEPS : field.max}
        step={1}
        value={sliderValue}
        disabled={disabled}
        aria-valuemin={field.min}
        aria-valuemax={field.max}
        aria-valuenow={numericValue}
        aria-valuetext={error ? `Invalid value: ${value}` : String(numericValue)}
        aria-invalid={!!error}
        aria-describedby={`${id}-help${error ? ` ${errorId}` : ""}`}
        onChange={event => handleSliderChange(event.target.value)}
        className="mt-5 h-2 w-full cursor-pointer accent-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
      />
      <div className="mt-2 flex justify-between text-xs tabular-nums text-slate-500">
        <span>{field.min.toLocaleString("en-US")}</span>
        <span>{field.max.toLocaleString("en-US")}</span>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-700/60 pt-3 text-xs text-slate-400">
        <span>System default: <span className="font-medium tabular-nums text-slate-300">{defaultValue.toLocaleString("en-US")}</span></span>
        <div className="flex items-center gap-3">
          {isLargeRange && (
            <button type="button" className="font-medium text-sky-400 hover:text-sky-300 disabled:opacity-50" disabled={disabled} aria-expanded={exactValueOpen} aria-controls={`${id}-exact`} onClick={() => setExactValueOpen(!exactValueOpen)}>
              {exactValueOpen ? "Hide exact value" : "Set exact value"}
            </button>
          )}
          <button type="button" className="font-medium text-emerald-400 hover:text-emerald-300 disabled:opacity-50" disabled={disabled} aria-label={`Use system default for ${field.label}`} onClick={() => onChange(String(defaultValue))}>Use default</button>
        </div>
      </div>
      {isLargeRange && <p className="mt-2 text-xs text-slate-500">Logarithmic scale for a wide range. Set an exact value for precision.</p>}
      {isLargeRange && (
        <div id={`${id}-exact`} hidden={!exactValueOpen} className="mt-3 space-y-1">
          <label htmlFor={`${id}-input`} className="text-xs font-medium text-slate-300">Exact value</label>
          <Input id={`${id}-input`} type="text" inputMode="numeric" value={value} disabled={disabled} aria-invalid={!!error} aria-describedby={error ? errorId : undefined} onChange={event => onChange(event.target.value)} />
        </div>
      )}
      {error && <p id={errorId} className="mt-2 text-sm text-destructive" role="alert">{error}</p>}
    </div>
  )
}

export function SolverSettingsDialog() {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const [settings, setSettings] = useState<SolverSettingsResponse | null>(null)
  const [presets, setPresets] = useState<SolverSettingsPreset[]>([])
  const [form, setForm] = useState<SettingsForm | null>(null)
  const [baseline, setBaseline] = useState<SettingsForm | null>(null)
  const [editing, setEditing] = useState<SolverSettingsPreset | null>(null)
  const [name, setName] = useState("")
  const [nameError, setNameError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [pendingSync, setPendingSync] = useState<SyncMode | null>(null)
  const [tab, setTab] = useState<SettingsTab>("general")
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])

  const dirty = Boolean(form && baseline && (
    FIELDS.some(({ key }) => form[key] !== baseline[key]) ||
    (editing ? name !== editing.name : name !== "")
  ))
  const invalid = form ? FIELDS.some(field => validateField(form[field.key], field) !== null) : true

  function applyActive(data: SolverSettingsResponse) {
    const next = toForm(data)
    setSettings(data)
    setForm(next)
    setBaseline(next)
    setEditing(null)
    setName("")
    setNameError(null)
  }

  async function run(action: () => Promise<void>) {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await action()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  async function sync(mode: SyncMode) {
    const [active, saved] = await Promise.all([solverSettingsApi.get(), solverSettingsApi.getPresets()])
    setSettings(active)
    setPresets(saved)
    if (mode === "active") applyActive(active)
    setPendingSync(null)
    setTab("general")
  }

  async function syncAfterChange(mode: SyncMode, success: string) {
    try {
      await sync(mode)
      setNotice(success)
    } catch (err) {
      setPendingSync(mode)
      setError(`The change was saved, but refreshing failed: ${errorMessage(err)}. Retry the refresh before continuing.`)
    }
  }

  function confirmDiscard() {
    return !dirty || window.confirm("Discard your unsaved changes?")
  }

  function handleOpenChange(next: boolean) {
    if (busyRef.current) return
    if (!next && !confirmDiscard()) return
    setOpen(next)
    if (next) {
      setSettings(null)
      setForm(null)
      setBaseline(null)
      setEditing(null)
      setName("")
      setNameError(null)
      setPendingSync(null)
      void run(() => sync("active"))
    }
  }

  function validName(): string | null {
    const trimmed = name.trim()
    if (!trimmed) {
      setNameError("Enter a preset name.")
      return null
    }
    if (trimmed.length > 120) {
      setNameError("The name must be at most 120 characters.")
      return null
    }
    setNameError(null)
    return trimmed
  }

  function handleSaveActive() {
    if (!form || invalid) return
    void run(async () => {
      const active = await solverSettingsApi.save(toSettings(form))
      applyActive(active)
      setNotice("Active settings saved. The saved presets were not changed.")
    })
  }

  function handleReset() {
    if (!window.confirm("Restore system defaults now? Active settings will change immediately; saved presets will not be deleted." + (dirty ? " Unsaved changes will be discarded." : ""))) return
    void run(async () => {
      applyActive(await solverSettingsApi.reset())
      setNotice("System defaults restored.")
    })
  }

  function handleCreate() {
    if (!form || invalid) return
    const presetName = validName()
    if (!presetName) return
    void run(async () => {
      await solverSettingsApi.createPreset({ name: presetName, settings: toSettings(form) })
      if (!editing) setName("")
      await syncAfterChange("preserve", "Preset created. It has not been activated.")
    })
  }

  function handleEdit(preset: SolverSettingsPreset) {
    if (!confirmDiscard()) return
    const next = toForm(preset.settings)
    setEditing(preset)
    setForm(next)
    setBaseline(next)
    setName(preset.name)
    setNameError(null)
    setError(null)
    setNotice(null)
    setTab("general")
  }

  function handleSavePreset() {
    if (!form || !editing || invalid) return
    const presetName = validName()
    if (!presetName) return
    void run(async () => {
      await solverSettingsApi.updatePreset(editing.id, { name: presetName, settings: toSettings(form) })
      await syncAfterChange("active", "Preset updated.")
    })
  }

  function handleActivate(preset: SolverSettingsPreset) {
    if (!confirmDiscard()) return
    void run(async () => {
      applyActive(await solverSettingsApi.activatePreset(preset.id))
      setNotice(`Preset "${preset.name}" activated.`)
    })
  }

  function handleDelete(preset: SolverSettingsPreset) {
    const deletingEdited = editing?.id === preset.id
    if (!window.confirm(`Delete preset "${preset.name}"?` + (deletingEdited && dirty ? " Unsaved changes will be discarded." : ""))) return
    void run(async () => {
      await solverSettingsApi.deletePreset(preset.id)
      await syncAfterChange(deletingEdited ? "active" : "preserve", "Preset deleted.")
    })
  }

  const disabled = busy || pendingSync !== null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline"><Settings2 />Solver Settings</Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[90vh] w-[calc(100%-2rem)] max-w-5xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="mb-0 border-b border-slate-700/70 px-5 pb-4 pt-5 pr-12 sm:px-6 sm:pr-12">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400"><Settings2 className="size-5" /></span>
            <div>
              <DialogTitle>Solver Settings</DialogTitle>
              <DialogDescription>Global settings for all schedules</DialogDescription>
            </div>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">
            Changes do not start the solver or recalculate a schedule. Running calculations keep their previous settings; the next run and subsequent schedule validations use the current settings.
          </p>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {busy && <p className="mb-4 flex items-center gap-2 text-sm text-slate-400" role="status"><Loader2 className="size-4 animate-spin" />Working...</p>}
          {error && (
            <div className="mb-4 space-y-2 rounded-lg bg-destructive/15 p-3 text-sm text-destructive" role="alert">
              <p>{error}</p>
              {(!settings || pendingSync) && (
                <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void run(() => sync(pendingSync ?? "active"))}>Retry loading</Button>
              )}
            </div>
          )}
          {notice && <p className="mb-4 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-300" role="status">{notice}</p>}

          {settings && form && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-700/70 bg-slate-800/50 px-4 py-3">
                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold text-slate-100">{editing ? `Editing preset: ${editing.name}` : "Editing active settings"}</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {editing ? "Saving updates this preset; an active preset also updates active settings." : "Saving active settings unlinks the active preset without changing it."}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {dirty && <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-300">Unsaved changes</span>}
                  {editing && <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={() => { if (confirmDiscard()) applyActive(settings) }}>Return to active</Button>}
                </div>
              </div>

              <div role="tablist" aria-label="Solver settings sections" className="flex gap-1 overflow-x-auto rounded-xl bg-slate-950/60 p-1">
                {TABS.map((item, index) => {
                  const Icon = item.icon
                  const group = FIELD_GROUPS.find(entry => entry.id === item.id)
                  const hasErrors = group?.fields.some(field => validateField(form[field.key], field))
                  return (
                    <button
                      key={item.id}
                      ref={element => { tabRefs.current[index] = element }}
                      type="button"
                      role="tab"
                      id={`solver-tab-${item.id}`}
                      aria-controls={`solver-panel-${item.id}`}
                      aria-selected={tab === item.id}
                      tabIndex={tab === item.id ? 0 : -1}
                      onClick={() => setTab(item.id)}
                      onKeyDown={event => {
                        let next = index
                        if (event.key === "ArrowRight") next = (index + 1) % TABS.length
                        else if (event.key === "ArrowLeft") next = (index + TABS.length - 1) % TABS.length
                        else if (event.key === "Home") next = 0
                        else if (event.key === "End") next = TABS.length - 1
                        else return
                        event.preventDefault()
                        setTab(TABS[next].id)
                        tabRefs.current[next]?.focus()
                      }}
                      className={cn(
                        "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400",
                        tab === item.id ? "bg-slate-700 text-white shadow-sm" : "text-slate-400 hover:bg-slate-800 hover:text-slate-200",
                      )}
                    >
                      <Icon className="size-4" />
                      {item.label}
                      {hasErrors && <span className="size-2 rounded-full bg-red-400" aria-label="Contains invalid values" />}
                    </button>
                  )
                })}
              </div>

              {FIELD_GROUPS.map(group => (
                <section key={group.id} role="tabpanel" id={`solver-panel-${group.id}`} aria-labelledby={`solver-tab-${group.id}`} hidden={tab !== group.id} tabIndex={0} className="space-y-4">
                  <div>
                    <h3 className="text-base font-semibold text-white">{group.title}</h3>
                    <p className="mt-1 text-sm text-slate-400">{group.description}</p>
                  </div>
                  {group.id === "general" && (
                    <div className="flex gap-2 rounded-lg border border-sky-500/20 bg-sky-500/5 p-3 text-xs leading-relaxed text-slate-300">
                      <Info className="mt-0.5 size-4 shrink-0 text-sky-400" />
                      <p>A nonzero hard penalty threshold permits publication and later changes within the total weighted penalty. Mandatory assignment checks still apply; a user cannot teach and attend another lesson at the same time regardless of the threshold.</p>
                    </div>
                  )}
                  {group.id === "hard" && <p className="text-xs text-slate-400">Higher weights increase the number of penalty points. A zero weight disables the corresponding penalty where allowed.</p>}
                  {group.id === "soft" && <p className="text-xs text-slate-400">Higher values increase the number of reward or penalty points.</p>}
                  <div className="grid gap-3 md:grid-cols-2">
                    {group.fields.map(field => (
                      <SettingsSlider
                        key={field.key}
                        field={field}
                        value={form[field.key]}
                        defaultValue={settings.defaults[field.key]}
                        disabled={disabled}
                        onChange={value => setForm(current => current ? { ...current, [field.key]: value } : current)}
                      />
                    ))}
                  </div>
                </section>
              ))}

              <section role="tabpanel" id="solver-panel-presets" aria-labelledby="solver-tab-presets" hidden={tab !== "presets"} tabIndex={0} className="space-y-4">
                <div>
                  <h3 className="text-base font-semibold text-white">Saved presets</h3>
                  <p className="mt-1 text-sm text-slate-400">Save the current form for later, or activate a saved configuration.</p>
                </div>
                {presets.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-700 p-6 text-center">
                    <Bookmark className="mx-auto size-6 text-slate-500" />
                    <p className="mt-2 text-sm font-medium text-slate-300">No saved presets yet</p>
                    <p className="mt-1 text-xs text-slate-500">Give the current settings a name to save your first preset.</p>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {presets.map(preset => (
                      <li key={preset.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-700/70 bg-slate-800/40 p-3">
                        <span className="min-w-36 flex-1 break-words text-sm font-medium text-white">
                          {preset.name}
                          {settings.activePresetId === preset.id && <span className="ml-2 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-300">Active</span>}
                        </span>
                        <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={() => handleActivate(preset)}>Activate</Button>
                        <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={() => handleEdit(preset)}>Edit</Button>
                        <Button type="button" size="sm" variant="destructive" disabled={disabled} onClick={() => handleDelete(preset)}>Delete</Button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="space-y-3 rounded-xl border border-slate-700/70 bg-slate-800/40 p-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-100">{editing ? "Preset name" : "Create a preset"}</p>
                    <p className="mt-1 text-xs text-slate-400">Creating a preset saves the current form but does not activate it.</p>
                  </div>
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="min-w-48 flex-1 space-y-1">
                      <label htmlFor="solver-preset-name" className="text-xs font-medium text-slate-300">{editing ? "Editing preset name" : "New preset name"}</label>
                      <Input id="solver-preset-name" value={name} maxLength={120} disabled={disabled} aria-invalid={!!nameError} aria-describedby={nameError ? "solver-preset-name-error" : undefined} onChange={event => { setName(event.target.value); setNameError(null) }} />
                      {nameError && <p id="solver-preset-name-error" className="text-sm text-destructive">{nameError}</p>}
                    </div>
                    <Button type="button" variant="outline" disabled={disabled || invalid} onClick={handleCreate}>Save as new preset</Button>
                  </div>
                </div>
              </section>
              {invalid && <p className="text-sm text-destructive" role="alert">Fix the invalid values in the marked tabs before saving.</p>}
            </div>
          )}
        </div>
        {settings && form && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-700/70 bg-slate-900 px-5 py-4 sm:px-6">
            <Button type="button" variant="ghost" disabled={disabled} onClick={handleReset}><RotateCcw />Restore system defaults</Button>
            {editing ? (
              <Button type="button" disabled={disabled || invalid} onClick={() => { if (!name.trim()) setTab("presets"); handleSavePreset() }}>Save preset changes</Button>
            ) : (
              <Button type="button" disabled={disabled || invalid} onClick={handleSaveActive}>Save active settings</Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
