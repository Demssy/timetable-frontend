import { Users, Clock, CheckCircle, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UserResponse, ScheduledLessonDTO } from '../types/availability.types';
import { parseTimeToMinutes } from '@/utils/timeUtils';

interface MetricsSummaryCardsProps {
  users: UserResponse[];
  lessons: ScheduledLessonDTO[];
  isLoading: boolean;
}

interface CardConfig {
  title: string;
  value: string;
  icon: React.ElementType;
  borderColor: string;
  iconBg: string;
  iconColor: string;
}

function SkeletonCard() {
  return (
    <div className="bg-gray-800 rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.45)] border-l-4 border-gray-700 p-5 animate-pulse">
      <div className="h-4 bg-gray-700 rounded w-2/3 mb-3" />
      <div className="h-8 bg-gray-700 rounded w-1/3" />
    </div>
  );
}

export function MetricsSummaryCards({ users, lessons, isLoading }: MetricsSummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  const nonAdminUsers = users.filter((u) => u.role !== 'ADMIN');

  const totalHours = nonAdminUsers.reduce((sum, u) => {
    return (
      sum +
      u.weeklyAvailabilities.reduce((s, slot) => {
        return s + (parseTimeToMinutes(slot.endTime) - parseTimeToMinutes(slot.startTime)) / 60;
      }, 0)
    );
  }, 0);

  const usersWithSlots = nonAdminUsers.filter((u) => u.weeklyAvailabilities.length > 0).length;
  const coveragePct =
    nonAdminUsers.length > 0 ? Math.round((usersWithSlots / nonAdminUsers.length) * 100) : 0;

  const activeLesson = lessons.filter((l) => l.isActive).length;

  const cards: CardConfig[] = [
    {
      title: 'Users',
      value: String(nonAdminUsers.length),
      icon: Users,
      borderColor: 'border-blue-500',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      title: 'Availability hours / week',
      value: totalHours.toFixed(1),
      icon: Clock,
      borderColor: 'border-green-500',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
    },
    {
      title: 'Availability coverage',
      value: `${coveragePct}%`,
      icon: CheckCircle,
      borderColor: 'border-purple-500',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
    },
    {
      title: 'Active lessons',
      value: String(activeLesson),
      icon: BookOpen,
      borderColor: 'border-orange-500',
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.title}
            className={cn('bg-gray-800 rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.45)] border-l-4 p-5 flex items-center gap-4', card.borderColor)}
          >
            <div className={cn('p-3 rounded-lg', card.iconBg)}>
              <Icon className={cn('w-6 h-6', card.iconColor)} />
            </div>
            <div>
              <p className="text-sm text-gray-400">{card.title}</p>
              <p className="text-2xl font-bold text-gray-100">{card.value}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
