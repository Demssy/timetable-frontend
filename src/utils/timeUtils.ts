import type { DayOfWeek, WeeklyAvailabilityDTO } from '../features/availability/types/availability.types';

/** "09:30:00" → 570 */
export function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m ?? 0);
}

/** "09:30:00" → "09:30" */
export function formatTime(time: string): string {
  return time.slice(0, 5);
}

/** duration in hours for a single slot */
export function slotDurationHours(slot: WeeklyAvailabilityDTO): number {
  return (parseTimeToMinutes(slot.endTime) - parseTimeToMinutes(slot.startTime)) / 60;
}

/** "HH:mm" → "HH:mm:ss" */
export function toBackendTime(time: string): string {
  return time.length === 5 ? `${time}:00` : time;
}

export const DAY_LABELS: Record<DayOfWeek, string> = {
  MONDAY: 'Mon',
  TUESDAY: 'Tue',
  WEDNESDAY: 'Wed',
  THURSDAY: 'Thu',
  FRIDAY: 'Fri',
  SATURDAY: 'Sat',
  SUNDAY: 'Sun',
};

export const DAY_LABELS_FULL: Record<DayOfWeek, string> = {
  MONDAY: 'Monday',
  TUESDAY: 'Tuesday',
  WEDNESDAY: 'Wednesday',
  THURSDAY: 'Thursday',
  FRIDAY: 'Friday',
  SATURDAY: 'Saturday',
  SUNDAY: 'Sunday',
};

export const DAYS_ORDER: DayOfWeek[] = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
];

/** Returns initials from a full name: "Иван Иванов" → "ИИ" */
export function getInitials(fullName: string): string {
  return fullName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}


