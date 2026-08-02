import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WeeklyAvailabilityDTO } from '../types/availability.types';
import { DAY_LABELS, DAYS_ORDER, formatTime, parseTimeToMinutes } from '@/utils/timeUtils';

interface WeeklyAvailabilityGridProps {
  readonly slots: WeeklyAvailabilityDTO[];
  readonly userRole: 'TEACHER' | 'STUDENT';
  readonly onEditSlot: (slot: WeeklyAvailabilityDTO) => void;
  readonly onDeleteSlot: (slotId: number) => void;
}

const GRID_START_HOUR = 6;
const GRID_END_HOUR = 22;
const TOTAL_MINUTES = (GRID_END_HOUR - GRID_START_HOUR) * 60;
const GRID_HEIGHT = 480; // px
const PX_PER_MINUTE = GRID_HEIGHT / TOTAL_MINUTES;

export function WeeklyAvailabilityGrid({
  slots,
  userRole,
  onEditSlot,
  onDeleteSlot,
}: WeeklyAvailabilityGridProps) {
  const [hoveredSlotId, setHoveredSlotId] = useState<number | null>(null);

  const slotColor =
    userRole === 'TEACHER'
      ? 'bg-blue-400/70 border border-blue-500 text-blue-900'
      : 'bg-green-400/70 border border-green-500 text-green-900';

  function getTopOffset(time: string): number {
    const minutes = parseTimeToMinutes(time) - GRID_START_HOUR * 60;
    return Math.max(0, minutes * PX_PER_MINUTE);
  }

  function getHeight(start: string, end: string): number {
    const duration = parseTimeToMinutes(end) - parseTimeToMinutes(start);
    return Math.max(4, duration * PX_PER_MINUTE);
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-[560px]">
        {/* Time axis */}
        <div className="w-10 shrink-0 relative" style={{ height: GRID_HEIGHT }}>
          {Array.from({ length: GRID_END_HOUR - GRID_START_HOUR + 1 }, (_, i) => (
            <div
              key={i}
              className="absolute text-xs text-gray-500 -translate-y-2"
              style={{ top: i * 60 * PX_PER_MINUTE }}
            >
              {String(GRID_START_HOUR + i).padStart(2, '0')}:00
            </div>
          ))}
        </div>

        {/* Day columns */}
        {DAYS_ORDER.map((day) => {
          const daySlots = slots.filter((s) => s.dayOfWeek === day);
          return (
            <div key={day} className="flex-1 flex flex-col">
              {/* Column header */}
              <div className="text-center text-xs font-semibold text-gray-400 pb-1">
                {DAY_LABELS[day]}
              </div>
              {/* Column body */}
              <div
                className="relative border-l border-gray-700"
                style={{ height: GRID_HEIGHT }}
              >
                {/* Hour grid lines */}
                {Array.from({ length: GRID_END_HOUR - GRID_START_HOUR + 1 }, (_, i) => (
                  <div
                    key={i}
                    className="absolute left-0 right-0 border-t border-gray-700/50"
                    style={{ top: i * 60 * PX_PER_MINUTE }}
                  />
                ))}

                {/* Slots */}
                {daySlots.map((slot) => {
                  const top = getTopOffset(slot.startTime);
                  const height = getHeight(slot.startTime, slot.endTime);
                  const isHovered = hoveredSlotId === slot.id;
                  const showText = height >= 24;

                  return (
                    <div
                      key={slot.id}
                      className={cn(
                        'absolute left-0.5 right-0.5 rounded px-1 overflow-hidden cursor-pointer transition-opacity',
                        slotColor,
                        isHovered && 'opacity-90',
                      )}
                      style={{ top, height }}
                      onMouseEnter={() => setHoveredSlotId(slot.id)}
                      onMouseLeave={() => setHoveredSlotId(null)}
                    >
                      {showText && (
                        <p className="text-[10px] leading-tight font-medium truncate select-none">
                          {formatTime(slot.startTime)} – {formatTime(slot.endTime)}
                        </p>
                      )}
                      {isHovered && (
                        <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/20 rounded">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onEditSlot(slot); }}
                            className="p-0.5 bg-white rounded shadow hover:bg-gray-100"
                            title="Edit"
                          >
                            <Pencil className="w-3 h-3 text-gray-700" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onDeleteSlot(slot.id); }}
                            className="p-0.5 bg-white rounded shadow hover:bg-red-50"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3 text-red-600" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
