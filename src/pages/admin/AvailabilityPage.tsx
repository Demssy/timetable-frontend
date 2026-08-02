import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { getAllUsersWithAvailability, getAllLessons } from '@/features/availability/api/availabilityApi';
import { MetricsSummaryCards } from '@/features/availability/components/MetricsSummaryCards';
import { UsersMetricsTable } from '@/features/availability/components/UsersMetricsTable';
import { UserAvailabilityPanel } from '@/features/availability/components/UserAvailabilityPanel';

export function AvailabilityPage() {
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  const usersQuery = useQuery({
    queryKey: ['availabilityUsers'],
    queryFn: getAllUsersWithAvailability,
    staleTime: 30_000,
  });

  const lessonsQuery = useQuery({
    queryKey: ['lessons'],
    queryFn: getAllLessons,
    staleTime: 60_000,
  });

  const users = usersQuery.data ?? [];
  const lessons = lessonsQuery.data ?? [];
  const isLoading = usersQuery.isLoading || lessonsQuery.isLoading;

  return (
    <>
      <Toaster position="top-right" />
      <div className="p-6 flex flex-col gap-6 min-h-screen gray-950">
        {/* Page title */}
        <div>
          <h1 className="text-2xl font-bold text-gray-100">User Availability</h1>
          <p className="text-sm text-gray-400 mt-1">
            Manage weekly availability schedules for teachers and students
          </p>
        </div>

        {/* Summary cards */}
        <MetricsSummaryCards users={users} lessons={lessons} isLoading={isLoading} />

        {/* Main content */}
        <div className="flex flex-col md:flex-row gap-6 flex-1">
          {/* Left: users table — ~55% */}
          <div className="md:w-[55%] flex flex-col min-h-96">
            <UsersMetricsTable
              users={users}
              lessons={lessons}
              selectedUserId={selectedUserId}
              onSelectUser={setSelectedUserId}
              isLoading={isLoading}
            />
          </div>

          {/* Right: availability panel — ~45%, hidden on mobile when no selection */}
          <div
            className={`md:w-[45%] flex flex-col ${
              selectedUserId == null ? 'hidden md:flex' : 'flex'
            }`}
          >
            <UserAvailabilityPanel userId={selectedUserId} users={users} />
          </div>
        </div>
      </div>
    </>
  );
}
