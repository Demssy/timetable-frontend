import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { teacherService } from "@/services/teacherService"
import { userService } from "@/services/userService"
import type { TeacherResponse } from "@/types/teacher"
import type { User } from "@/types/user"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export interface ManualLessonData {
  teacherId: number
  studentId: number
  timeslotId: number
  isPinned: false
}

interface AddManualLessonModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (data: ManualLessonData) => void
  timeslotId: number | null
  isSubmitting?: boolean
}

export function AddManualLessonModal({ isOpen, onClose, onConfirm, timeslotId, isSubmitting = false }: AddManualLessonModalProps) {
  const [teachers, setTeachers] = useState<TeacherResponse[]>([])
  const [students, setStudents] = useState<User[]>([])
  const [teacherId, setTeacherId] = useState("")
  const [studentId, setStudentId] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
	if (!isOpen) return

	let isCurrent = true
	void Promise.all([teacherService.getAllTeachers(), userService.getStudents()])
	  .then(([allTeachers, allStudents]) => {
		if (!isCurrent) return
		setTeachers(allTeachers)
		setStudents(allStudents.filter(student => student.isActive))
	  })
	  .catch((reason: unknown) => {
		if (!isCurrent) return
		setError(reason instanceof Error ? reason.message : "Failed to load teachers and students.")
	  })
	  .finally(() => { if (isCurrent) setIsLoading(false) })

	return () => { isCurrent = false }
  }, [isOpen])

  const canConfirm = timeslotId !== null && teacherId !== "" && studentId !== "" && !isLoading && !isSubmitting

  const handleConfirm = () => {
	if (!canConfirm || timeslotId === null) return
	onConfirm({ teacherId: Number(teacherId), studentId: Number(studentId), timeslotId, isPinned: false })
  }

  return (
	<Dialog open={isOpen} onOpenChange={open => { if (!open) onClose() }}>
	  <DialogContent>
		<DialogHeader>
		  <DialogTitle>Add private lesson</DialogTitle>
		  <DialogDescription>
			Select a teacher and student. This administrator action bypasses availability and subscription checks.
		  </DialogDescription>
		</DialogHeader>

		{error ? (
		  <div className="rounded-md border border-destructive/30 bg-destructive/15 p-3 text-sm text-destructive">{error}</div>
		) : isLoading ? (
		  <div className="flex items-center gap-2 py-8 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" />Loading people…</div>
		) : (
		  <div className="space-y-4">
			<div className="space-y-2">
			  <Label htmlFor="manual-lesson-teacher">Teacher</Label>
			  <Select value={teacherId} onValueChange={setTeacherId}>
				<SelectTrigger id="manual-lesson-teacher"><SelectValue placeholder="Select a teacher" /></SelectTrigger>
				<SelectContent>
				  {teachers.map(teacher => <SelectItem key={teacher.id} value={String(teacher.id)}>{teacher.fullName} · {teacher.email}</SelectItem>)}
				</SelectContent>
			  </Select>
			</div>
			<div className="space-y-2">
			  <Label htmlFor="manual-lesson-student">Student</Label>
			  <Select value={studentId} onValueChange={setStudentId}>
				<SelectTrigger id="manual-lesson-student"><SelectValue placeholder="Select a student" /></SelectTrigger>
				<SelectContent>
				  {students.map(student => <SelectItem key={student.id} value={String(student.id)}>{student.fullName} · {student.email}</SelectItem>)}
				</SelectContent>
			  </Select>
			</div>
		  </div>
		)}

		<div className="flex justify-end gap-3 pt-5">
		  <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
		  <Button type="button" onClick={handleConfirm} disabled={!canConfirm}>
			{isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
			{isSubmitting ? "Adding…" : "Add Lesson"}
		  </Button>
		</div>
	  </DialogContent>
	</Dialog>
  )
}





