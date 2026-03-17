import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

import type {ScheduledLessonDTO} from "@/types/schedule";
import type {ScheduledEvent, DanceClass} from "@/components/weekly-timetable";
import { DayOfWeek } from "@/types/enums";

const DAY_TO_INDEX: Record<DayOfWeek, number> = {
  [DayOfWeek.MONDAY]: 0,
  [DayOfWeek.TUESDAY]: 1,
  [DayOfWeek.WEDNESDAY]: 2,
  [DayOfWeek.THURSDAY]: 3,
  [DayOfWeek.FRIDAY]: 4,
  [DayOfWeek.SATURDAY]: 5,
  [DayOfWeek.SUNDAY]: 6,
};

export function mapLessonToEvent(lesson: ScheduledLessonDTO): ScheduledEvent | null {
  // Игнорируем уроки, которым солвер еще не назначил время или комнату
  if (!lesson.timeslot || !lesson.room) return null;

  // Определяем тип танца для цвета (придется сопоставить стили с бэка с DanceClass)
  const styleName = lesson.danceGroup.name.toLowerCase();
  let type: DanceClass = "contemporary"; // fallback
  if (styleName.includes("ballet")) type = "ballet";
  if (styleName.includes("hip hop") || styleName.includes("hiphop")) type = "hiphop";
  if (styleName.includes("jazz")) type = "jazz";
  if (styleName.includes("salsa")) type = "salsa";

  return {
    id: lesson.id.toString(),
    title: lesson.danceGroup.name,
    instructor: lesson.teacher.fullName,
    room: lesson.room.name,
    startTime: lesson.timeslot.startTime.slice(0, 5), // "09:00:00" -> "09:00"
    endTime: lesson.timeslot.endTime.slice(0, 5),
    day: DAY_TO_INDEX[lesson.timeslot.dayOfWeek],
    type: type,
  };
}