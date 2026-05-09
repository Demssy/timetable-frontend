import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import type { UserResponse, WeeklyAvailabilityDTO } from '../types/availability.types';
import { deleteSlot } from '../api/availabilityApi';
import { WeeklyAvailabilityGrid } from './WeeklyAvailabilityGrid';
import { SlotFormModal } from './SlotFormModal';
import { DAY_LABELS, formatTime, getInitials, slotDurationHours } from '@/utils/timeUtils';

interface UserAvailabilityPanelProps {
  userId: number | null;
  users: UserResponse[];
}

export function UserAvailabilityPanel({ userId, users }: UserAvailabilityPanelProps) {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<WeeklyAvailabilityDTO | undefined>(undefined);

  const selectedUser = userId != null ? users.find((u) => u.id === userId) : null;

  const deleteMutation = useMutation({
    mutationFn: (slotId: number) => deleteSlot(slotId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availabilityUsers'] });
      toast.success('Slot deleted');
    },
    onError: (err: Error) => toast.error(err.message || 'Delete error'),
  });

  function handleDeleteSlot(slotId: number) {
    if (!confirm('Delete this availability slot?')) return;
    deleteMutation.mutate(slotId);
  }

  function handleEditSlot(slot: WeeklyAvailabilityDTO) {
    setEditingSlot(slot);
    setIsModalOpen(true);
  }

  function handleAddSlot() {
    setEditingSlot(undefined);
    setIsModalOpen(true);
  }

  if (!selectedUser) {
    return (
      <div className="bg-gray-800 rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.5)] flex items-center justify-center h-full min-h-48">
        <p className="text-gray-500 text-sm">← Select a user from the table</p>
      </div>
    );
  }

  const slots = selectedUser.weeklyAvailabilities;
  const totalHours = slots.reduce((s, slot) => s + slotDurationHours(slot), 0);
  const userRole = selectedUser.role === 'TEACHER' ? 'TEACHER' : 'STUDENT';

  return (
    <div className="bg-gray-800 rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-indigo-900 text-indigo-300 flex items-center justify-center font-bold shrink-0">
            {getInitials(selectedUser.fullName)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-100 truncate">{selectedUser.fullName}</p>
            <p className="text-xs text-gray-400 truncate">{selectedUser.email}</p>
          </div>
          <span
            className={cn(
              'px-2 py-0.5 rounded-full text-xs font-medium shrink-0',
              userRole === 'TEACHER'
                ? 'bg-purple-900/60 text-purple-300'
                : 'bg-blue-900/60 text-blue-300',
            )}
          >
            {userRole === 'TEACHER' ? 'Teacher' : 'Student'}
          </span>
        </div>

        {/* Stat chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded-full">
            {slots.length} slots
          </span>
          <span className="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded-full">
            {totalHours.toFixed(1)} h/week
          </span>
          <button
            onClick={handleAddSlot}
            className="ml-auto flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add slot
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="p-4">
        <WeeklyAvailabilityGrid
          slots={slots}
          userRole={userRole}
          onEditSlot={handleEditSlot}
          onDeleteSlot={handleDeleteSlot}
        />
      </div>

      {/* Slot list */}
      {slots.length > 0 && (
        <div className="px-4 pb-4 flex flex-col gap-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Slot list
          </p>
          {slots
            .slice()
            .sort((a, b) => {
              const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
              return days.indexOf(a.dayOfWeek) - days.indexOf(b.dayOfWeek);
            })
            .map((slot) => (
              <div
                key={slot.id}
                className="flex items-center justify-between bg-gray-700/50 rounded-lg px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-400 w-6">
                    {DAY_LABELS[slot.dayOfWeek]}
                  </span>
                  <span className="text-sm text-gray-200">
                    {formatTime(slot.startTime)} – {formatTime(slot.endTime)}
                  </span>
                  <span className="text-xs text-gray-500">
                    ({slotDurationHours(slot).toFixed(1)} ч)
                  </span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEditSlot(slot)}
                    className="p-1.5 rounded hover:bg-gray-600 text-gray-400 hover:text-gray-200"
                    title="Edit"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteSlot(slot.id)}
                    className="p-1.5 rounded hover:bg-red-900/40 text-gray-400 hover:text-red-400"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Modal */}
      <SlotFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        userId={selectedUser.id}
        existingSlot={editingSlot}
      />
    </div>
  );
}
