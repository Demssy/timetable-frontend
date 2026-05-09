import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import type { WeeklyAvailabilityDTO, DayOfWeek } from '../types/availability.types';
import { createSlot, updateSlot } from '../api/availabilityApi';
import { DAY_LABELS_FULL, DAYS_ORDER, formatTime, toBackendTime } from '@/utils/timeUtils';
import { cn } from '@/lib/utils';

interface SlotFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
  existingSlot?: WeeklyAvailabilityDTO;
}

export function SlotFormModal({ isOpen, onClose, userId, existingSlot }: SlotFormModalProps) {
  const queryClient = useQueryClient();

  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek>('MONDAY');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Pre-fill form when editing
  useEffect(() => {
    if (existingSlot) {
      setDayOfWeek(existingSlot.dayOfWeek);
      setStartTime(formatTime(existingSlot.startTime));
      setEndTime(formatTime(existingSlot.endTime));
    } else {
      setDayOfWeek('MONDAY');
      setStartTime('');
      setEndTime('');
    }
    setValidationError(null);
  }, [existingSlot, isOpen]);

  const mutation = useMutation({
    mutationFn: () => {
      const request = {
        dayOfWeek,
        startTime: toBackendTime(startTime),
        endTime: toBackendTime(endTime),
      };
      return existingSlot
        ? updateSlot(existingSlot.id, request)
        : createSlot(userId, request);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availabilityUsers'] });
      queryClient.invalidateQueries({ queryKey: ['userAvailability', userId] });
      toast.success(existingSlot ? 'Slot updated' : 'Slot created');
      onClose();
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to save');
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError(null);

    if (!dayOfWeek || !startTime || !endTime) {
      setValidationError('All fields are required');
      return;
    }
    if (endTime <= startTime) {
      setValidationError('End time must be after start time');
      return;
    }
    mutation.mutate();
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-800">
            {existingSlot ? 'Edit slot' : 'Add availability slot'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Day of week */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Day of week</label>
            <select
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(e.target.value as DayOfWeek)}
              className="border rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {DAYS_ORDER.map((d) => (
                <option key={d} value={d}>
                  {DAY_LABELS_FULL[d]}
                </option>
              ))}
            </select>
          </div>

          {/* Start time */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Start time</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* End time */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">End time</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* Validation error */}
          {validationError && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{validationError}</p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className={cn(
                'px-4 py-2 rounded-lg text-sm text-white font-medium transition-colors',
                mutation.isPending
                  ? 'bg-blue-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700',
              )}
            >
              {mutation.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}








