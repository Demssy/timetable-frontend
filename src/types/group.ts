import type { DayOfWeek, DanceLevel } from "./enums";

export interface GroupStudentDTO {
  id: number;
  fullName: string;
  email: string;
  danceLevel: string | null;
}

export interface GroupScheduleSlot {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  teacherName: string;
}

export interface DanceGroupDetails {
  id: number;
  name: string;
  danceStyleName: string | null;
  danceLevel: DanceLevel | null;
  targetAgeRange: string | null;
  minSize: number | null;
  schedule: GroupScheduleSlot[];
  enrolledCount: number;
  enrolledByCurrentUser: boolean;
}

