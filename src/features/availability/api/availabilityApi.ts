import type {
  UserResponse,
  WeeklyAvailabilityDTO,
  WeeklyAvailabilityRequest,
  ScheduledLessonDTO,
} from '../types/availability.types';

const BASE = '/api';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return {} as T;
  return res.json() as Promise<T>;
}

const defaultInit: RequestInit = {
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
};

/** GET /api/admin/availability/users — all users with their availability */
export async function getAllUsersWithAvailability(): Promise<UserResponse[]> {
  const res = await fetch(`${BASE}/admin/availability/users`, defaultInit);
  return handleResponse<UserResponse[]>(res);
}

/** GET /api/admin/availability/users/{userId} — slots for one user */
export async function getUserAvailability(userId: number): Promise<WeeklyAvailabilityDTO[]> {
  const res = await fetch(`${BASE}/admin/availability/users/${userId}`, defaultInit);
  return handleResponse<WeeklyAvailabilityDTO[]>(res);
}

/** POST /api/admin/availability/users/{userId}/weekly — create a slot */
export async function createSlot(
  userId: number,
  req: WeeklyAvailabilityRequest,
): Promise<WeeklyAvailabilityDTO> {
  const res = await fetch(`${BASE}/admin/availability/users/${userId}/weekly`, {
    ...defaultInit,
    method: 'POST',
    body: JSON.stringify(req),
  });
  return handleResponse<WeeklyAvailabilityDTO>(res);
}

/** PUT /api/admin/availability/weekly/{slotId} — update a slot */
export async function updateSlot(
  slotId: number,
  req: WeeklyAvailabilityRequest,
): Promise<WeeklyAvailabilityDTO> {
  const res = await fetch(`${BASE}/admin/availability/weekly/${slotId}`, {
    ...defaultInit,
    method: 'PUT',
    body: JSON.stringify(req),
  });
  return handleResponse<WeeklyAvailabilityDTO>(res);
}

/** DELETE /api/admin/availability/weekly/{slotId} */
export async function deleteSlot(slotId: number): Promise<void> {
  const res = await fetch(`${BASE}/admin/availability/weekly/${slotId}`, {
    ...defaultInit,
    method: 'DELETE',
  });
  return handleResponse<void>(res);
}

/** GET /api/admin/lessons — all lessons (used for metrics) */
export async function getAllLessons(): Promise<ScheduledLessonDTO[]> {
  const res = await fetch(`${BASE}/admin/lessons`, defaultInit);
  return handleResponse<ScheduledLessonDTO[]>(res);
}

