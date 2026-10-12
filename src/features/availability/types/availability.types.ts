export type DayOfWeek =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

export type AvailabilityRole = 'TEACHER' | 'STUDENT';

export interface WeeklyAvailabilityDTO {
  id: number;
  dayOfWeek: DayOfWeek;
  startTime: string; // "HH:mm:ss"
  endTime: string;   // "HH:mm:ss"
  availabilityRole: AvailabilityRole;
}

export interface ResourceUnavailabilityDTO {
  id: number;
  date: string;       // "YYYY-MM-DD"
  startTime: string;
  endTime: string;
  reason: string | null;
  availabilityRole: AvailabilityRole;
}

export interface UserResponse {
  id: number;
  email: string;
  fullName: string;
  role: 'STUDENT' | 'TEACHER' | 'ADMIN';
  /** All authorities, e.g. ['ROLE_TEACHER', 'ROLE_STUDENT'] */
  roles?: string[];
  isActive: boolean;
  // Contain entries of BOTH roles - always filter by availabilityRole
  weeklyAvailabilities: WeeklyAvailabilityDTO[];
  oneTimeUnavailabilities: ResourceUnavailabilityDTO[];
}

export interface WeeklyAvailabilityRequest {
  dayOfWeek: DayOfWeek;
  startTime: string; // "HH:mm:ss"
  endTime: string;   // "HH:mm:ss"
  availabilityRole: AvailabilityRole;
}

export interface DanceStyleDTO {
  id: number;
  name: string;
}

export interface TeacherResponse {
  id: number;
  email: string;
  fullName: string;
  maxDailyHours: number | null;
  colorCode: string | null;
  qualifiedStyles: DanceStyleDTO[];
}

export interface StudentResponse {
  id: number;
  email: string;
  fullName: string;
  birthDate: string;
  danceLevel: string;
  parentContact: string | null;
}

export interface TimeslotDTO {
  id: number;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
}

export interface ScheduledLessonDTO {
  id: number;
  teacher: TeacherResponse;
  danceGroup: { id: number; name: string } | null;
  student: StudentResponse | null;
  durationMinutes: number;
  isPrivate: boolean;
  isPinned: boolean;
  isActive: boolean;
  timeslot: TimeslotDTO | null;
  room: { id: number; name: string } | null;
}

// Frontend-only computed type (not a backend DTO)
export interface UserMetrics {
  user: UserResponse;
  weeklySlotCount: number;
  totalAvailableHoursPerWeek: number;
  lessonCount: number;
  totalLessonMinutes: number;
}

