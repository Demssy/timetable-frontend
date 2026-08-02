import { useState } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UserResponse, ScheduledLessonDTO } from '../types/availability.types';
import { parseTimeToMinutes, getInitials } from '@/utils/timeUtils';

type RoleFilter = 'ALL' | 'TEACHER' | 'STUDENT';

interface UsersMetricsTableProps {
  users: UserResponse[];
  lessons: ScheduledLessonDTO[];
  selectedUserId: number | null;
  onSelectUser: (id: number) => void;
  isLoading: boolean;
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {[...Array(6)].map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-700 rounded" />
        </td>
      ))}
    </tr>
  );
}

export function UsersMetricsTable({
  users,
  lessons,
  selectedUserId,
  onSelectUser,
  isLoading,
}: UsersMetricsTableProps) {
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');
  const [search, setSearch] = useState('');

  const nonAdminUsers = users.filter((u) => u.role !== 'ADMIN');

  const filtered = nonAdminUsers.filter((u) => {
    const matchRole = roleFilter === 'ALL' || u.role === roleFilter;
    const q = search.toLowerCase();
    const matchSearch =
      !q || u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    return matchRole && matchSearch;
  });

  function getUserLessons(userId: number) {
    return lessons.filter(
      (l) => l.teacher?.id === userId || l.student?.id === userId,
    );
  }

  function userHoursPerWeek(u: UserResponse): number {
    return u.weeklyAvailabilities.reduce((sum, slot) => {
      return sum + (parseTimeToMinutes(slot.endTime) - parseTimeToMinutes(slot.startTime)) / 60;
    }, 0);
  }

  const ROLE_BUTTONS: { label: string; value: RoleFilter }[] = [
    { label: 'All', value: 'ALL' },
    { label: 'Teachers', value: 'TEACHER' },
    { label: 'Students', value: 'STUDENT' },
  ];

  return (
    <div className="bg-gray-800 rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.45)] overflow-hidden flex flex-col h-full">
      {/* Filter bar */}
      <div className="p-4 border-b border-gray-700 flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1">
          {ROLE_BUTTONS.map((btn) => (
            <button
              key={btn.value}
              onClick={() => setRoleFilter(btn.value)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                roleFilter === btn.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600',
              )}
            >
              {btn.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-auto flex-1">
        <table className="w-full text-sm">
          <thead className="bg-gray-900/60 text-gray-400 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">User</th>
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-center">Slots</th>
              <th className="px-4 py-3 text-center">Hours / week</th>
              <th className="px-4 py-3 text-center">Lessons</th>
              <th className="px-4 py-3 text-center">Lesson minutes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {isLoading
              ? [...Array(3)].map((_, i) => <SkeletonRow key={i} />)
              : filtered.map((u) => {
                  const userLessons = getUserLessons(u.id);
                  const totalLessonMinutes = userLessons.reduce(
                    (s, l) => s + (l.durationMinutes ?? 0),
                    0,
                  );
                  const isSelected = u.id === selectedUserId;
                  const slotCount = u.weeklyAvailabilities.length;

                  return (
                    <tr
                      key={u.id}
                      onClick={() => onSelectUser(u.id)}
                      className={cn(
                        'cursor-pointer transition-colors hover:bg-gray-700/50',
                        isSelected && 'bg-blue-900/40 border-l-4 border-blue-500',
                      )}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-900 text-indigo-300 flex items-center justify-center font-semibold text-xs shrink-0">
                            {getInitials(u.fullName)}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-100">{u.fullName}</p>
                            <p className="text-xs text-gray-400">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-full text-xs font-medium',
                            u.role === 'TEACHER'
                              ? 'bg-purple-900/60 text-purple-300'
                              : 'bg-blue-900/60 text-blue-300',
                          )}
                        >
                          {u.role === 'TEACHER' ? 'Teacher' : 'Student'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-full text-xs font-medium',
                            slotCount > 0 ? 'bg-green-900/60 text-green-300' : 'bg-gray-700 text-gray-400',
                          )}
                        >
                          {slotCount}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-300">
                        {userHoursPerWeek(u).toFixed(1)}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-300">
                        {userLessons.length}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-300">
                        {totalLessonMinutes}
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>

        {!isLoading && filtered.length === 0 && (
          <p className="text-center text-gray-500 py-10 text-sm">No users found</p>
        )}
      </div>
    </div>
  );
}
