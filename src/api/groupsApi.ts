import { apiFetch } from "./client";
import type { DanceGroupDetails, GroupStudentDTO } from "@/types/group";

const BASE = "/api/groups";

export const groupsApi = {
  getAll: () => apiFetch<DanceGroupDetails[]>(BASE),

  getMy: () => apiFetch<DanceGroupDetails[]>(`${BASE}/my`),

  enroll: (groupId: number) =>
    apiFetch<void>(`${BASE}/${groupId}/enroll`, { method: "POST" }),

  unenroll: (groupId: number) =>
    apiFetch<void>(`${BASE}/${groupId}/enroll`, { method: "DELETE" }),

  getStudents: (groupId: number) =>
    apiFetch<GroupStudentDTO[]>(`${BASE}/${groupId}/students`),
};

