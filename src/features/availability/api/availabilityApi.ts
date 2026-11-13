import type {
  UserResponse,
  WeeklyAvailabilityDTO,
  WeeklyAvailabilityRequest,
  ResourceUnavailabilityDTO,
  AvailabilityRole,
  ScheduledLessonDTO,
} from '../types/availability.types';
import { apiFetch } from '@/api/client';

const BASE = '/api';

/** GET /api/admin/availability/users — all users with their availability */
export async function getAllUsersWithAvailability(): Promise<UserResponse[]> {
  return apiFetch<UserResponse[]>(`${BASE}/admin/availability/users`);
}

/** GET /api/admin/availability/users/{userId} — slots for one user */
export async function getUserAvailability(userId: number): Promise<WeeklyAvailabilityDTO[]> {
  return apiFetch<WeeklyAvailabilityDTO[]>(`${BASE}/admin/availability/users/${userId}`);
}

/** POST /api/admin/availability/users/{userId}/weekly — create a slot */
export async function createSlot(
  userId: number,
  req: WeeklyAvailabilityRequest,
): Promise<WeeklyAvailabilityDTO> {
  return apiFetch<WeeklyAvailabilityDTO>(`${BASE}/admin/availability/users/${userId}/weekly`, {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

/** PUT /api/admin/availability/weekly/{slotId} — update a slot */
export async function updateSlot(
  slotId: number,
  req: WeeklyAvailabilityRequest,
): Promise<WeeklyAvailabilityDTO> {
  return apiFetch<WeeklyAvailabilityDTO>(`${BASE}/admin/availability/weekly/${slotId}`, {
    method: 'PUT',
    body: JSON.stringify(req),
  });
}

/** DELETE /api/admin/availability/weekly/{slotId} */
export async function deleteSlot(slotId: number): Promise<void> {
  return apiFetch<void>(`${BASE}/admin/availability/weekly/${slotId}`, {
    method: 'DELETE',
  });
}

/** GET /api/availability/weekly?role= — current user's weekly grid for one role */
export async function getMyWeeklyAvailability(
  role: AvailabilityRole,
): Promise<WeeklyAvailabilityDTO[]> {
  return apiFetch<WeeklyAvailabilityDTO[]>(`${BASE}/availability/weekly?role=${role}`);
}
/** GET /api/unavailability/user/{userId}?role= — one-time exceptions for one role */
export async function getUserUnavailability(
  userId: number,
  role: AvailabilityRole,
): Promise<ResourceUnavailabilityDTO[]> {
  return apiFetch<ResourceUnavailabilityDTO[]>(`${BASE}/unavailability/user/${userId}?role=${role}`);
}

/** GET /api/admin/lessons — all lessons (used for metrics) */
export async function getAllLessons(): Promise<ScheduledLessonDTO[]> {
  return apiFetch<ScheduledLessonDTO[]>(`${BASE}/admin/lessons`);
}
