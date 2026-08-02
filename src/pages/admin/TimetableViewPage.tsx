import { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Link, useParams } from "react-router-dom"
import {
  ChevronRight, AlertTriangle, Loader2, Pin, Pencil, X,
  GripVertical, ChevronDown, ChevronUp,
} from "lucide-react"
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  useDroppable, useDraggable,
  type DragStartEvent, type DragEndEvent,
} from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { solverApi } from "@/api/solverApi"
import { timeslotApi } from "@/api/timeslotApi"
import { lessonApi } from "@/api/lessonApi"
import type { ScheduleSolutionResponse, ScheduledLessonDTO, TimeslotDTO } from "@/types/schedule"
import type { ScoreExplanationResponse, UnmetStudentDTO } from "@/types/solver"
import { getLessonCategory } from "@/types/schedule"
import { DayOfWeek, SolverStatus } from "@/types/enums"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useSolverPolling } from "@/hooks/useSolverPolling"
import { ScoreExplanationPanel } from "@/components/ScoreExplanationPanel"
import { UnmetStudentsPanel } from "@/components/UnmetStudentsPanel"

// ─── Grid configuration ─────────────────────────────────────────────────────
const GRID_START_MIN = 7 * 60 + 30
const GRID_END_MIN   = 22 * 60
const ROW_MINUTES    = 30
const ROW_HEIGHT_PX  = 44
const TIME_COL_W     = 64
const TOTAL_ROWS     = (GRID_END_MIN - GRID_START_MIN) / ROW_MINUTES

const DAY_ORDER: DayOfWeek[] = [
  DayOfWeek.SUNDAY, DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY,
  DayOfWeek.THURSDAY, DayOfWeek.FRIDAY, DayOfWeek.SATURDAY,
]

const DAY_LABEL: Record<string, string> = {
  MONDAY:"Mon", TUESDAY:"Tue", WEDNESDAY:"Wed",
  THURSDAY:"Thu", FRIDAY:"Fri", SATURDAY:"Sat", SUNDAY:"Sun",
}

const LEVEL_STYLE: Record<string, string> = {
  BEGINNER:         "bg-green-500/20 text-green-300 border-green-500/30",
  ELEMENTARY:       "bg-blue-500/20 text-blue-300 border-blue-500/30",
  PRE_INTERMEDIATE: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  INTERMEDIATE:     "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  ADVANCED:         "bg-orange-500/20 text-orange-300 border-orange-500/30",
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const toMinutes = (t: string) => { const [h,m]=t.split(":").map(Number); return h*60+(m||0) }
const toTimeStr = (m: number) => `${String(Math.floor(m/60)).padStart(2,"0")}:${String(m%60).padStart(2,"0")}`
const SCORE_PATTERN = /(-?\d+)hard\/(-?\d+)soft/

function parseScore(score: string|null) {
  if (!score) return null
  const m = SCORE_PATTERN.exec(score)
  return m ? { hard: Number(m[1]), soft: Number(m[2]) } : null
}

function getLessonSubject(lesson: ScheduledLessonDTO): string {
  switch (getLessonCategory(lesson)) {
    case "group": return lesson.danceGroup?.name ?? "Group Lesson"
    case "private-matched": return lesson.student?.fullName ?? "Private Lesson"
    default: return "Open Slot"
  }
}

function getScoreStatusClass(hardScore: number | undefined): string {
  return hardScore !== undefined && hardScore < 0
    ? "bg-red-500/15 text-red-400 border-red-500/30"
    : "bg-green-500/15 text-green-400 border-green-500/30"
}

function getScoreStatusIcon(hardScore: number | undefined): string {
  return hardScore !== undefined && hardScore < 0 ? "❌" : "✅"
}

const makeDropId = (id: number) => `drop-ts-${id}`
const parseTsId  = (s: string)  => Number(s.replace("drop-ts-",""))

/** Card background — solidBg=true gives opaque result for expanded stacks */
function cardBg(color: string, avail: boolean, solid: boolean) {
  if (avail)  return solid ? "rgba(51,65,85,0.90)" : "rgba(156,163,175,0.08)"
  return solid ? `color-mix(in srgb, ${color} 32%, #0f172a)` : `${color}18`
}
function cardBorder(color: string, avail: boolean, solid: boolean) {
  if (avail) return solid ? "#64748baa" : "#9ca3af55"
  return solid ? `${color}cc` : `${color}55`
}

// ─── LessonBlockContent ───────────────────────────────────────────────────────
function LessonBlockContent({ lesson, heightPx, isEditing=false, isDragging=false }:{
  readonly lesson: ScheduledLessonDTO; readonly heightPx: number; readonly isEditing?: boolean; readonly isDragging?: boolean
}) {
  const cat      = getLessonCategory(lesson)
  const compact  = heightPx < 68
  const tc       = lesson.teacher.colorCode || "#9ca3af"
  const avail    = cat === "private-available"
  const subject = getLessonSubject(lesson)
  const level    = lesson.danceGroup?.danceLevel ?? null

  return (
    <>
      <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: avail ? "#9ca3af" : tc }} />
      <div className={cn("pl-3 pr-2 py-1.5 h-full flex flex-col gap-0.5 overflow-hidden", isDragging && "opacity-90")}>
        <div className="flex items-start justify-between gap-1">
          <div className="flex items-center gap-1 min-w-0">
            {isEditing && !lesson.isPinned && <GripVertical className="h-3 w-3 text-slate-400 shrink-0 cursor-grab" />}
            <span className={cn("font-semibold text-[11px] leading-tight truncate", avail ? "text-slate-400 italic" : "text-white/90")}>
              {subject}
            </span>
          </div>
          <div className="flex gap-0.5 shrink-0 mt-px">
            {avail && <span className="rounded px-1 py-px text-[9px] font-bold bg-slate-500/30 text-slate-300 border border-slate-500/30">Open</span>}
            {lesson.isPrivate && !avail && <span className="rounded px-1 py-px text-[9px] font-bold bg-purple-500/30 text-purple-300 border border-purple-500/30">P</span>}
            {lesson.isPinned && <Pin className="h-2.5 w-2.5 text-amber-400" />}
          </div>
        </div>
        {!compact && level && (
          <span className={cn("inline-flex self-start rounded border px-1 py-px text-[9px] font-bold", LEVEL_STYLE[level] ?? "bg-slate-500/20 text-slate-300 border-slate-500/30")}>
            {level.replace("_"," ")}
          </span>
        )}
        <span className="text-[10px] font-semibold truncate leading-none" style={{ color: tc }}>{lesson.teacher.fullName}</span>
        {!compact && avail  && <span className="text-[9px] text-slate-400 italic leading-none">No student assigned</span>}
        {!compact && lesson.room && !avail && <span className="text-[10px] text-slate-400 truncate leading-none">🚪 {lesson.room.name}</span>}
      </div>
    </>
  )
}

// ─── LessonBlock (view mode) ──────────────────────────────────────────────────
function LessonBlock({ lesson, topPx, heightPx, widthPercent=100, leftPercent=0, solidBg=false }:{
  readonly lesson: ScheduledLessonDTO; readonly topPx: number; readonly heightPx: number
  readonly widthPercent?: number; readonly leftPercent?: number; readonly solidBg?: boolean
}) {
  const avail = getLessonCategory(lesson) === "private-available"
  const tc    = lesson.teacher.colorCode || "#9ca3af"
  return (
    <div
      className={cn("absolute rounded-lg overflow-hidden border cursor-pointer select-none z-10 hover:z-20 transition-all duration-200 hover:shadow-xl", avail && "border-dashed opacity-75")}
      style={{
        top: topPx+2, height: Math.max(heightPx-4,22),
        left: `calc(${leftPercent}% + 4px)`, width: `calc(${widthPercent}% - 8px)`,
        borderColor: cardBorder(tc,avail,solidBg), backgroundColor: cardBg(tc,avail,solidBg),
      }}
    >
      <LessonBlockContent lesson={lesson} heightPx={heightPx} />
    </div>
  )
}

// ─── DraggableLessonBlock (edit mode) ─────────────────────────────────────────
function DraggableLessonBlock({ lesson, topPx, heightPx, isMoving, widthPercent=100, leftPercent=0, solidBg=false }:{
  readonly lesson: ScheduledLessonDTO; readonly topPx: number; readonly heightPx: number; readonly isMoving: boolean
  readonly widthPercent?: number; readonly leftPercent?: number; readonly solidBg?: boolean
}) {
  const avail    = getLessonCategory(lesson) === "private-available"
  const tc       = lesson.teacher.colorCode || "#9ca3af"
  const disabled = isMoving || lesson.isPinned
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `lesson-${lesson.id}`, data: { lesson }, disabled,
  })

  return (
    <div
      ref={setNodeRef} {...listeners} {...attributes}
      className={cn("absolute rounded-lg overflow-hidden border select-none transition-shadow duration-200 hover:shadow-xl hover:z-20", avail && "border-dashed opacity-75", disabled ? "cursor-not-allowed" : "cursor-grab active:cursor-grabbing")}
      style={{
        top: topPx+2, height: Math.max(heightPx-4,22),
        left: `calc(${leftPercent}% + 4px)`, width: `calc(${widthPercent}% - 8px)`,
        borderColor: cardBorder(tc,avail,solidBg), backgroundColor: cardBg(tc,avail,solidBg),
        transform: CSS.Translate.toString(transform),
        zIndex: isDragging ? 50 : 10,
        opacity: isDragging ? 0.4 : isMoving ? 0.5 : 1,
      }}
    >
      {isMoving && <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 rounded-lg"><Loader2 className="h-4 w-4 animate-spin text-white" /></div>}
      <LessonBlockContent lesson={lesson} heightPx={heightPx} isEditing isDragging={isDragging} />
    </div>
  )
}

// ─── DroppableTimeslot ────────────────────────────────────────────────────────
function DroppableTimeslot({ timeslot, isOccupied }:{ readonly timeslot: TimeslotDTO; readonly isOccupied: boolean }) {
  const start = toMinutes(timeslot.startTime), end = toMinutes(timeslot.endTime)
  const top   = (start - GRID_START_MIN) / ROW_MINUTES * ROW_HEIGHT_PX
  const h     = (end - start) / ROW_MINUTES * ROW_HEIGHT_PX
  const { isOver, setNodeRef } = useDroppable({ id: makeDropId(timeslot.id), data: { timeslot } })
  return (
    <div ref={setNodeRef}
      className={cn("absolute left-0.5 right-0.5 rounded border-2 border-dashed transition-all duration-150",
        isOver ? "border-indigo-400/70 bg-indigo-400/15" : isOccupied ? "border-slate-600/20 bg-slate-500/5" : "border-emerald-400/40 bg-emerald-400/8 animate-pulse")}
      style={{ top: top+1, height: Math.max(h-2,2) }}
    >
      {!isOccupied && !isOver && <span className="absolute top-0.5 right-1 text-[8px] text-emerald-400/60 font-medium select-none">{toTimeStr(start)}</span>}
      {isOver && <span className="absolute top-0.5 right-1 text-[8px] text-indigo-300 font-semibold select-none">Drop here</span>}
    </div>
  )
}

// ─── TimeslotDropLayer ────────────────────────────────────────────────────────
function TimeslotDropLayer({ gridDays, allTimeslots, occupiedTimeslotIds }:{
  readonly gridDays: DayOfWeek[]; readonly allTimeslots: TimeslotDTO[]; readonly occupiedTimeslotIds: Set<number>
}) {
  return (
    <div className="absolute inset-0 grid pointer-events-none" style={{ gridTemplateColumns:`${TIME_COL_W}px repeat(${gridDays.length},1fr)`, zIndex:5 }}>
      <div />
      {gridDays.map(day => (
        <div key={day} className="relative pointer-events-auto">
          {allTimeslots.filter(ts=>ts.dayOfWeek===day).map(ts=>(
            <DroppableTimeslot key={ts.id} timeslot={ts} isOccupied={occupiedTimeslotIds.has(ts.id)} />
          ))}
        </div>
      ))}
    </div>
  )
}

// ─── StackedLessonsGroup ──────────────────────────────────────────────────────
function StackedLessonsGroup({ lessons, topPx, heightPx, isEditing, movingLessonId }:{
  readonly lessons: ScheduledLessonDTO[]; readonly topPx: number; readonly heightPx: number
  readonly isEditing: boolean; readonly movingLessonId: number|null
}) {
  const [expanded, setExpanded] = useState(false)
  const count = lessons.length

  if (count <= 1) {
    const l = lessons[0]
    return isEditing
      ? <DraggableLessonBlock lesson={l} topPx={topPx} heightPx={heightPx} isMoving={movingLessonId===l.id} />
      : <LessonBlock lesson={l} topPx={topPx} heightPx={heightPx} />
  }

  // ── Collapsed: side-by-side ───────────────────────────────────────────────
  if (!expanded) {
    return (
      <>
        {lessons.map((l,idx) => {
          const w=100/count, left=idx*w
          return isEditing
            ? <DraggableLessonBlock key={l.id} lesson={l} topPx={topPx} heightPx={heightPx} isMoving={movingLessonId===l.id} widthPercent={w} leftPercent={left} />
            : <LessonBlock key={l.id} lesson={l} topPx={topPx} heightPx={heightPx} widthPercent={w} leftPercent={left} />
        })}
        <button type="button" onClick={e=>{e.stopPropagation();setExpanded(true)}}
          className="absolute right-0 z-30 flex items-center justify-center w-5 h-5 rounded-full bg-indigo-500/80 text-white hover:bg-indigo-400 transition-colors shadow-lg"
          style={{top:topPx-2}} title={`${count} lessons — expand`}>
          <ChevronDown className="h-3 w-3" />
        </button>
        <div className="absolute right-6 z-30 rounded-full bg-indigo-500/90 text-white text-[9px] font-bold px-1.5 py-0.5 shadow" style={{top:topPx-2}}>
          {count}
        </div>
      </>
    )
  }

  // ── Expanded: vertical stack, fully opaque ────────────────────────────────
  const itemH = Math.max(heightPx, 68)
  return (
    <>
      <button type="button" onClick={e=>{e.stopPropagation();setExpanded(false)}}
        className="absolute right-0 z-40 flex items-center justify-center w-5 h-5 rounded-full bg-indigo-500/80 text-white hover:bg-indigo-400 transition-colors shadow-lg"
        style={{top:topPx-2}} title="Collapse">
        <ChevronUp className="h-3 w-3" />
      </button>
      {/* Fully opaque slate-950 backdrop so cards are clearly readable */}
      <div className="absolute left-0.5 right-0.5 rounded-xl border border-indigo-500/25"
        style={{ top:topPx-4, height:itemH*count+16, zIndex:5, backgroundColor:"#0f172a" }} />
      {lessons.map((l,idx) => {
        const itemTop = topPx + idx*itemH
        return isEditing
          ? <DraggableLessonBlock key={l.id} lesson={l} topPx={itemTop} heightPx={itemH} isMoving={movingLessonId===l.id} solidBg />
          : <LessonBlock key={l.id} lesson={l} topPx={itemTop} heightPx={itemH} solidBg />
      })}
    </>
  )
}

// ─── DragOverlayContent ───────────────────────────────────────────────────────
function DragOverlayContent({ lesson }:{ readonly lesson: ScheduledLessonDTO }) {
  const avail = getLessonCategory(lesson) === "private-available"
  const tc    = lesson.teacher.colorCode || "#9ca3af"
  return (
    <div className={cn("rounded-lg overflow-hidden border select-none shadow-2xl", avail && "border-dashed")}
      style={{ width:200, height:80, borderColor:cardBorder(tc,avail,true), backgroundColor:cardBg(tc,avail,true) }}>
      <LessonBlockContent lesson={lesson} heightPx={80} isEditing isDragging />
    </div>
  )
}

// ─── TimetableViewPage ────────────────────────────────────────────────────────
export function TimetableViewPage() {
  const { id }     = useParams<{ id: string }>()
  const scheduleId = id ? Number(id) : null

  const [solution, setSolution]   = useState<ScheduleSolutionResponse|null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError]         = useState<string|null>(null)
  const { status, startPolling, stopPolling } = useSolverPolling(scheduleId)
  const isSolving = status===SolverStatus.SOLVING_ACTIVE || status===SolverStatus.SOLVING_SCHEDULED

  const [isEditing, setIsEditing]           = useState(false)
  const [allTimeslots, setAllTimeslots]     = useState<TimeslotDTO[]>([])
  const [movingLessonId, setMovingLessonId] = useState<number|null>(null)
  const [activeLesson, setActiveLesson]     = useState<ScheduledLessonDTO|null>(null)
  const gridBodyRef = useRef<HTMLDivElement>(null)

  const [scoreExplanation, setScoreExplanation] = useState<ScoreExplanationResponse|null>(null)
  const [unmetStudents, setUnmetStudents]       = useState<UnmetStudentDTO[]|null>(null)
  const [isLoadingReports, setIsLoadingReports] = useState(false)
  const [explanationError, setExplanationError] = useState<string|null>(null)
  const [unmetError, setUnmetError]             = useState<string|null>(null)
  const prevStatusRef = useRef<string|null>(null)

  const sensors = useSensors(useSensor(PointerSensor,{ activationConstraint:{ distance:5 } }))

  const fetchSolution = useCallback(async () => {
    if (!scheduleId) return
    try { const d=await solverApi.getSolution(scheduleId); setSolution(d) }
    catch(e) { setError(e instanceof Error ? e.message : "Failed to load solution") }
    finally { setIsLoading(false) }
  },[scheduleId])

  const fetchReports = useCallback(async () => {
    if (!scheduleId) return
    setIsLoadingReports(true); setExplanationError(null); setUnmetError(null)
    const [er, ur] = await Promise.allSettled([
      solverApi.getScoreExplanation(scheduleId),
      solverApi.getUnmetStudents(scheduleId),
    ])
    if (er.status==="fulfilled") setScoreExplanation(er.value)
    else setExplanationError(er.reason instanceof Error ? er.reason.message : "Failed to load score explanation")
    if (ur.status==="fulfilled") setUnmetStudents(ur.value)
    else setUnmetError(ur.reason instanceof Error ? ur.reason.message : "Failed to load student report")
    setIsLoadingReports(false)
  },[scheduleId])

  useEffect(() => {
    const prev = prevStatusRef.current; prevStatusRef.current = status
    if (prev!==null && prev!==SolverStatus.NOT_SOLVING && status===SolverStatus.NOT_SOLVING) fetchReports()
  },[status, fetchReports])

  useEffect(() => {
    fetchSolution(); startPolling()
    return () => { stopPolling() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[])

  useEffect(() => {
    let t: ReturnType<typeof setInterval>|undefined
    if (isSolving) t = setInterval(fetchSolution,2000)
    return () => { if(t) clearInterval(t) }
  },[isSolving, fetchSolution])

  const handleEditToggle = useCallback(async () => {
    if (!isEditing) {
      try { setAllTimeslots(await timeslotApi.getAll()) }
      catch(e) { console.error("Failed to load timeslots:",e); return }
    }
    setIsEditing(p=>!p)
  },[isEditing])

  const handleDragStart = useCallback((e: DragStartEvent) => {
    setActiveLesson((e.active.data.current?.lesson as ScheduledLessonDTO|undefined) ?? null)
  },[])

  const handleDragEnd = useCallback(async (e: DragEndEvent) => {
    setActiveLesson(null)
    const { active, over } = e
    if (!over) return
    const lesson = active.data.current?.lesson as ScheduledLessonDTO|undefined
    if (!lesson) return
    const tsId = parseTsId(over.id as string)
    if (isNaN(tsId) || tsId===lesson.timeslot?.id) return
    const ts = allTimeslots.find(t=>t.id===tsId)
    if (!ts) return
    setMovingLessonId(lesson.id)
    try {
      await lessonApi.update(lesson.id,{
        teacherId:lesson.teacher.id, danceGroupId:lesson.danceGroup?.id??null,
        studentId:lesson.student?.id??null, durationMinutes:lesson.durationMinutes,
        isPrivate:lesson.isPrivate, isPinned:lesson.isPinned, isActive:lesson.isActive,
        timeslotId:ts.id, roomId:lesson.room?.id??null,
      })
      await fetchSolution()
    } catch(err) { console.error("Failed to move lesson:",err) }
    finally { setMovingLessonId(null) }
  },[allTimeslots, fetchSolution])

  const handleDragCancel = useCallback(()=>setActiveLesson(null),[])

  if (isLoading) return (
    <div className="container mx-auto py-10 flex items-center justify-center gap-3 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" /> Loading timetable…
    </div>
  )
  if (error || !solution) return (
    <div className="container mx-auto py-10">
      <div className="bg-destructive/15 text-destructive p-4 rounded-md">{error ?? "No solution available."}</div>
    </div>
  )

  const assigned   = solution.lessons.filter(l=>l.timeslot!==null && l.room!==null)
  const unassigned = solution.lessons.filter(l=>l.timeslot===null  || l.room===null)
  const occupiedTimeslotIds = new Set(assigned.map(l=>l.timeslot!.id))

  const stats = {
    total:solution.lessons.length,
    groupLessons:solution.lessons.filter(l=>!l.isPrivate).length,
    privateMatched:solution.lessons.filter(l=>l.isPrivate&&l.student!=null).length,
    privateAvailable:solution.lessons.filter(l=>l.isPrivate&&l.student==null).length,
    hardScore:solution.hardScore, softScore:solution.softScore,
  }

  const gridDays       = DAY_ORDER
  const timeBoundaries = Array.from({length:TOTAL_ROWS+1},(_,i)=>GRID_START_MIN+i*ROW_MINUTES)
  const timeLabels     = Array.from({length:TOTAL_ROWS},  (_,i)=>GRID_START_MIN+i*ROW_MINUTES)
  const parsedScore    = parseScore(solution.score)

  const lessonsByDay = DAY_ORDER.reduce<Record<string,ScheduledLessonDTO[]>>((acc,day)=>{
    acc[day]=assigned.filter(l=>l.timeslot?.dayOfWeek===day); return acc
  },{})

  const groupByTimeslot = (ls: ScheduledLessonDTO[]) => {
    const map = new Map<number,ScheduledLessonDTO[]>()
    for (const l of ls) { const k=l.timeslot!.id; if(!map.has(k)) map.set(k,[]); map.get(k)!.push(l) }
    return Array.from(map.values())
  }

  const gridContent = (
    <>
      <div className="grid border-b border-white/10 sticky top-0 z-30 bg-slate-900"
        style={{ gridTemplateColumns:`${TIME_COL_W}px repeat(${gridDays.length},1fr)` }}>
        <div className="h-11" />
        {gridDays.map(day=>(
          <div key={day} className={cn("h-11 flex items-center justify-center text-xs font-semibold tracking-wider uppercase border-l border-white/10",
            day===DayOfWeek.SATURDAY||day===DayOfWeek.SUNDAY ? "text-violet-400" : "text-slate-300")}>
            {DAY_LABEL[day]}
          </div>
        ))}
      </div>

      <div ref={gridBodyRef} className="relative" style={{ height:TOTAL_ROWS*ROW_HEIGHT_PX }}>
        {/* Background grid */}
        <div className="absolute inset-0 pointer-events-none grid"
          style={{ gridTemplateColumns:`${TIME_COL_W}px repeat(${gridDays.length},1fr)` }}>
          <div className="relative">
            {timeBoundaries.map((min,i)=>min%60===0?(
              <div key={min} className="absolute right-3 text-[10px] text-slate-500 leading-none -translate-y-1/2 select-none" style={{top:i*ROW_HEIGHT_PX}}>
                {toTimeStr(min)}
              </div>
            ):null)}
          </div>
          {gridDays.map(day=>(
            <div key={day} className="border-l border-white/5">
              {timeLabels.map((min,i)=>(
                <div key={i} className={cn("border-b",min%60===0?"border-white/10":"border-white/4")} style={{height:ROW_HEIGHT_PX}} />
              ))}
            </div>
          ))}
        </div>

        {isEditing && <TimeslotDropLayer gridDays={gridDays} allTimeslots={allTimeslots} occupiedTimeslotIds={occupiedTimeslotIds} />}

        <div className="absolute inset-0 grid pointer-events-none"
          style={{ gridTemplateColumns:`${TIME_COL_W}px repeat(${gridDays.length},1fr)` }}>
          <div />
          {gridDays.map(day=>(
            <div key={day} className="relative pointer-events-auto">
              {groupByTimeslot(lessonsByDay[day]??[]).map(group=>{
                const first=group[0]
                const sMin=toMinutes(first.timeslot!.startTime), eMin=toMinutes(first.timeslot!.endTime)
                const topPx=(sMin-GRID_START_MIN)/ROW_MINUTES*ROW_HEIGHT_PX
                const hPx  =(eMin-sMin)          /ROW_MINUTES*ROW_HEIGHT_PX
                return (
                  <StackedLessonsGroup key={`stack-${first.timeslot!.id}`}
                    lessons={group} topPx={topPx} heightPx={hPx}
                    isEditing={isEditing} movingLessonId={movingLessonId} />
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </>
  )

  return (
    <div className="container mx-auto py-10 space-y-6">
      <nav className="flex items-center gap-1.5 text-sm text-slate-400">
        <Link to="/admin" className="hover:text-white transition-colors">Admin Panel</Link>
        <ChevronRight className="h-4 w-4" />
        <Link to="/admin/schedules" className="hover:text-white transition-colors">Schedules</Link>
        <ChevronRight className="h-4 w-4" />
        <Link to={`/admin/schedules/${id}`} className="hover:text-white transition-colors">#{id}</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-white font-medium">Timetable</span>
      </nav>

      <div className="flex items-center gap-4">
        <h1 className="text-3xl font-bold text-white">Timetable — Schedule #{id}</h1>
        {!isSolving && solution.lessons.length>0 && (
          <Button type="button" variant={isEditing?"destructive":"outline"} size="sm" onClick={handleEditToggle} className="gap-1.5">
            {isEditing ? <><X className="h-4 w-4" /> Exit Edit</> : <><Pencil className="h-4 w-4" /> Edit</>}
          </Button>
        )}
      </div>

      {isEditing && (
        <div className="flex items-center gap-2 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-4 py-2.5 text-sm font-medium text-indigo-300">
          <GripVertical className="h-4 w-4" />
          <span>
            <strong>Edit Mode:</strong> Drag lessons to highlighted timeslots.
            Pinned <Pin className="inline h-3 w-3 text-amber-400" /> cannot be moved.
            Stacked lessons expand with <ChevronDown className="inline h-3 w-3" />.
          </span>
        </div>
      )}

      <div className="flex flex-wrap gap-3 items-center">
        {isSolving && (
          <div className="flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            {status===SolverStatus.SOLVING_SCHEDULED ? "Solving scheduled…" : "Solving in progress…"}
          </div>
        )}
        {solution.score && (
          <div className={cn("flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium border",
            getScoreStatusClass(parsedScore?.hard))}>
            {getScoreStatusIcon(parsedScore?.hard)}
            <span>Score: {parsedScore ? `${parsedScore.hard} hard / ${parsedScore.soft} soft` : solution.score}</span>
            {parsedScore&&parsedScore.hard<0 && <span className="text-red-300">(Hard constraint violated!)</span>}
            {parsedScore&&parsedScore.hard===0&&parsedScore.soft<0 && <span className="text-yellow-400">({Math.abs(parsedScore.soft)} soft penalties)</span>}
          </div>
        )}
        {!solution.fullyAssigned && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-400">
            <AlertTriangle className="h-4 w-4" /> Not all lessons could be assigned
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3 text-center"><p className="text-2xl font-bold text-white">{stats.total}</p><p className="text-xs text-muted-foreground mt-0.5">Total Lessons</p></div>
        <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3 text-center"><p className="text-2xl font-bold text-blue-400">{stats.groupLessons}</p><p className="text-xs text-muted-foreground mt-0.5">Group Lessons</p></div>
        <div className="rounded-lg border border-purple-700/50 bg-purple-900/20 p-3 text-center"><p className="text-2xl font-bold text-purple-400">{stats.privateMatched}</p><p className="text-xs text-muted-foreground mt-0.5">Private (matched)</p></div>
        <div className={cn("rounded-lg border p-3 text-center",stats.privateAvailable>0?"border-amber-700/50 bg-amber-900/20":"border-slate-700 bg-slate-800/50")}>
          <p className={cn("text-2xl font-bold",stats.privateAvailable>0?"text-amber-400":"text-slate-400")}>{stats.privateAvailable}</p><p className="text-xs text-muted-foreground mt-0.5">Available Slots</p>
        </div>
        <div className={cn("rounded-lg border p-3 text-center",stats.hardScore<0?"border-red-700/50 bg-red-900/20":"border-green-700/50 bg-green-900/20")}>
          <p className={cn("text-2xl font-bold",stats.hardScore<0?"text-red-400":"text-green-400")}>{stats.hardScore}</p><p className="text-xs text-muted-foreground mt-0.5">Hard Violations</p>
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3 text-center"><p className="text-2xl font-bold text-yellow-400">{stats.softScore}</p><p className="text-xs text-muted-foreground mt-0.5">Quality Score</p></div>
      </div>

      {/* Post-solve report panels */}
      {!isSolving && solution.lessons.length>0 && (
        <div className="space-y-3">
          <ScoreExplanationPanel scheduleId={scheduleId} hardScore={stats.hardScore}
            explanation={scoreExplanation} isLoading={isLoadingReports}
            error={explanationError} onRequestLoad={fetchReports} />
          <UnmetStudentsPanel unmetStudents={unmetStudents} isLoading={isLoadingReports} error={unmetError} />
        </div>
      )}

      {/* Calendar grid */}
      {solution.lessons.length>0 ? (
        <div className={cn("rounded-xl border bg-slate-900/60 backdrop-blur overflow-hidden", isEditing?"border-indigo-500/30":"border-white/10")}>
          <div className="overflow-y-auto max-h-[680px] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full">
            {isEditing ? (
              <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
                {gridContent}
                {createPortal(
                  <DragOverlay dropAnimation={null}>{activeLesson && <DragOverlayContent lesson={activeLesson} />}</DragOverlay>,
                  document.body,
                )}
              </DndContext>
            ) : gridContent}
          </div>
          <div className="border-t border-white/10 px-4 py-2.5 flex items-center gap-4 flex-wrap bg-slate-900/80">
            <span className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">Legend:</span>
            {Object.entries(LEVEL_STYLE).map(([lv,cls])=>(
              <span key={lv} className={cn("rounded border px-2 py-0.5 text-[10px] font-bold",cls)}>{lv.replace("_"," ")}</span>
            ))}
            <span className="rounded border px-2 py-0.5 text-[10px] font-bold bg-purple-500/20 text-purple-300 border-purple-500/30">P — Private</span>
            <span className="rounded border border-dashed px-2 py-0.5 text-[10px] font-bold bg-slate-500/10 text-slate-400 border-slate-500/30">Open Slot</span>
            <span className="flex items-center gap-1 text-[10px] text-amber-400"><Pin className="h-2.5 w-2.5" /> Pinned</span>
            {isEditing && <>
              <span className="rounded border-2 border-dashed border-emerald-400/40 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">Available Slot</span>
              <span className="flex items-center gap-1 text-[10px] text-indigo-400"><GripVertical className="h-3 w-3" /> Draggable</span>
            </>}
          </div>
        </div>
      ) : (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No assigned lessons in the solution.</CardContent></Card>
      )}

      {/* Unassigned lessons */}
      {unassigned.length>0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-amber-400 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" /> Unassigned Lessons ({unassigned.length})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {unassigned.map(l=>{
              const cat=getLessonCategory(l), tc=l.teacher.colorCode||"#9ca3af"
              const sub = getLessonSubject(l)
              return (
                <div key={l.id} className={cn("rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs space-y-1.5",cat==="private-available"&&"border-dashed")}>
                  <p className={cn("font-semibold truncate",cat==="private-available"?"text-slate-400 italic":"text-white/80")}>{sub}</p>
                  <p className="font-medium truncate" style={{color:tc}}>{l.teacher.fullName}</p>
                  <p className="text-muted-foreground">{l.durationMinutes} min</p>
                  <div className="flex gap-1 flex-wrap">
                    {!l.timeslot && <span className="rounded bg-red-500/20 text-red-400 border border-red-500/30 px-1 py-px">No slot</span>}
                    {!l.room    && <span className="rounded bg-red-500/20 text-red-400 border border-red-500/30 px-1 py-px">No room</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}