import { useState, useEffect, useCallback } from "react";
import { groupsApi } from "@/api/groupsApi";
import { useAuth } from "@/contexts/AuthContext";
import { UserRole } from "@/types/enums";
import type { DanceGroupDetails, GroupStudentDTO } from "@/types/group";
import type { DayOfWeek } from "@/types/enums";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Users } from "lucide-react";

// ── Helpers ──

const DAY_SHORT: Record<DayOfWeek, string> = {
  MONDAY: "Mon",
  TUESDAY: "Tue",
  WEDNESDAY: "Wed",
  THURSDAY: "Thu",
  FRIDAY: "Fri",
  SATURDAY: "Sat",
  SUNDAY: "Sun",
};

const fmtTime = (t: string) => t.slice(0, 5); // "HH:mm:ss" → "HH:mm"

const LEVEL_COLORS: Record<string, string> = {
  BEGINNER: "bg-green-600/20 text-green-400 border-green-500/30",
  ELEMENTARY: "bg-teal-600/20 text-teal-400 border-teal-500/30",
  PRE_INTERMEDIATE: "bg-blue-600/20 text-blue-400 border-blue-500/30",
  INTERMEDIATE: "bg-yellow-600/20 text-yellow-400 border-yellow-500/30",
  ADVANCED: "bg-orange-600/20 text-orange-400 border-orange-500/30",
  PROFESSIONAL: "bg-red-600/20 text-red-400 border-red-500/30",
};

// ── Group Card ──

function GroupCard({
  group,
  isStudent,
  onToggleEnroll,
  enrollingId,
  onDetails,
}: {
  readonly group: DanceGroupDetails;
  readonly isStudent: boolean;
  readonly onToggleEnroll: (id: number, enrolled: boolean) => void;
  readonly enrollingId: number | null;
  readonly onDetails: (group: DanceGroupDetails) => void;
}) {
  const busy = enrollingId === group.id;

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-5 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-lg font-bold text-white leading-tight">{group.name}</h3>
        {group.danceLevel && (
          <span
            className={cn(
              "shrink-0 rounded-md border px-2 py-0.5 text-xs font-medium",
              LEVEL_COLORS[group.danceLevel] ?? "bg-slate-700 text-slate-300"
            )}
          >
            {group.danceLevel.replace("_", " ")}
          </span>
        )}
      </div>

      {/* Style & age */}
      {group.danceStyleName && (
        <span className="text-sm text-slate-400">{group.danceStyleName}</span>
      )}
      {group.targetAgeRange && (
        <span className="text-xs text-slate-500">Age: {group.targetAgeRange}</span>
      )}

      {/* Schedule */}
      <div className="mt-1 space-y-1 text-sm text-slate-300">
        {group.schedule.length === 0 ? (
          <p className="italic text-slate-500">No schedule assigned yet</p>
        ) : (
          group.schedule.map((s) => (
            <p key={`${s.dayOfWeek}-${s.startTime}-${s.endTime}-${s.teacherName}`}>
              <span className="font-medium text-slate-200 inline-block w-10">
                {DAY_SHORT[s.dayOfWeek]}
              </span>{" "}
              {fmtTime(s.startTime)} – {fmtTime(s.endTime)}{" "}
              <span className="text-slate-500">•</span> {s.teacherName}
            </p>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="mt-auto flex items-center justify-between pt-3 border-t border-slate-700">
        <button
          type="button"
          onClick={() => onDetails(group)}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <Users className="size-4" />
          {group.enrolledCount} students
        </button>

        {isStudent && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onToggleEnroll(group.id, group.enrolledByCurrentUser)}
            className={cn(
              "rounded-lg px-4 py-1.5 text-sm font-medium transition disabled:opacity-50",
              group.enrolledByCurrentUser
                ? "border border-red-500/50 text-red-400 hover:bg-red-500/10"
                : "bg-green-600 text-white hover:bg-green-500"
            )}
          >
            {busy ? "…" : group.enrolledByCurrentUser ? "Unenroll" : "Enroll"}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Page ──

type Tab = "all" | "my";

export default function GroupsPage() {
  const { user } = useAuth();
  const isStudent = user?.role === UserRole.STUDENT;

  const [tab, setTab] = useState<Tab>("all");
  const [groups, setGroups] = useState<DanceGroupDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enrollingId, setEnrollingId] = useState<number | null>(null);

  // Details dialog state
  const [detailsGroup, setDetailsGroup] = useState<DanceGroupDetails | null>(null);
  const [students, setStudents] = useState<GroupStudentDTO[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState<string | null>(null);

  const fetchGroups = useCallback(async (t: Tab) => {
    setLoading(true);
    setError(null);
    try {
      const data = t === "all" ? await groupsApi.getAll() : await groupsApi.getMy();
      setGroups(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load groups");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups(tab);
  }, [tab, fetchGroups]);

  const handleToggleEnroll = async (id: number, enrolled: boolean) => {
    setEnrollingId(id);
    try {
      if (enrolled) await groupsApi.unenroll(id);
      else await groupsApi.enroll(id);
      await fetchGroups(tab);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Enrollment action failed");
    } finally {
      setEnrollingId(null);
    }
  };

  const handleOpenDetails = async (group: DanceGroupDetails) => {
    setDetailsGroup(group);
    setStudents([]);
    setStudentsError(null);
    setStudentsLoading(true);
    try {
      const data = await groupsApi.getStudents(group.id);
      setStudents(data);
    } catch (e: unknown) {
      setStudentsError(e instanceof Error ? e.message : "Failed to load students");
    } finally {
      setStudentsLoading(false);
    }
  };

  const emptyMessage = () => {
    if (tab === "all") return "No groups found.";
    switch (user?.role) {
      case UserRole.STUDENT:
        return "You are not enrolled in any groups yet. Browse All Groups to sign up!";
      case UserRole.TEACHER:
        return "You have no groups assigned yet.";
      default:
        return "No groups found.";
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">Groups</h1>

      {/* Tabs */}
      <div className="flex gap-2">
        {(["all", "my"] as Tab[]).map((t) => (
          <button
            type="button"
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition",
              tab === t
                ? "bg-slate-700 text-white"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            )}
          >
            {t === "all" ? "All Groups" : "My Groups"}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-600 border-t-white" />
        </div>
      ) : error ? (
        <p className="text-red-400 text-center py-8">{error}</p>
      ) : groups.length === 0 ? (
        <p className="text-slate-400 text-center py-8">{emptyMessage()}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <GroupCard
              key={g.id}
              group={g}
              isStudent={isStudent}
              onToggleEnroll={handleToggleEnroll}
              enrollingId={enrollingId}
              onDetails={handleOpenDetails}
            />
          ))}
        </div>
      )}

      {/* Students dialog */}
      <Dialog open={!!detailsGroup} onOpenChange={(open) => { if (!open) setDetailsGroup(null); }}>
        <DialogContent className="max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{detailsGroup?.name} — Students</DialogTitle>
            <DialogDescription>
              {detailsGroup?.danceStyleName}{detailsGroup?.danceLevel ? ` · ${detailsGroup.danceLevel.replace("_", " ")}` : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto mt-2">
            {studentsLoading ? (
              <div className="flex justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-4 border-slate-600 border-t-white" />
              </div>
            ) : studentsError ? (
              <p className="text-red-400 text-sm text-center py-6">{studentsError}</p>
            ) : students.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-6">No students enrolled yet.</p>
            ) : (
              <ul className="space-y-2">
                {students.map((s) => (
                  <li key={s.id} className="flex items-center justify-between rounded-lg bg-slate-800 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-white">{s.fullName}</p>
                      <p className="text-xs text-slate-400">{s.email}</p>
                    </div>
                    {s.danceLevel && (
                      <span className={cn(
                        "rounded-md border px-2 py-0.5 text-xs font-medium",
                        LEVEL_COLORS[s.danceLevel] ?? "bg-slate-700 text-slate-300"
                      )}>
                        {s.danceLevel.replace("_", " ")}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

