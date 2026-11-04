// components/event/EventCalendar.tsx
// Month calendar that marks days with events and lets the user pick a day.
// Shared by the event page ("Upcoming" tab) and the organizer/venue page.
import React, { useMemo, useState, type ReactElement } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import Card from '@/components/ui/Card';

const cx = (...c: ReadonlyArray<string | null | undefined | false>): string =>
  c.filter(Boolean).join(' ');

/** Day key used to match events to calendar cells (local time, month 0-based). */
export function dateKeyOf(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export type EventCalendarProps = Readonly<{
  /** ISO start dates of the events to mark on the calendar. */
  eventDates: ReadonlyArray<string | null | undefined>;
  selectedDate: string | null;
  onSelectDate: (dateKey: string | null) => void;
  /** Month to show first; defaults to the current month. */
  initialMonth?: { year: number; month: number };
}>;

export default function EventCalendar({
  eventDates,
  selectedDate,
  onSelectDate,
  initialMonth,
}: EventCalendarProps): ReactElement {
  const [view, setView] = useState(() => {
    if (initialMonth) return initialMonth;
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const eventKeys = useMemo(() => {
    const set = new Set<string>();
    for (const iso of eventDates) {
      const key = dateKeyOf(iso);
      if (key) set.add(key);
    }
    return set;
  }, [eventDates]);

  const shiftMonth = (delta: number): void => {
    setView((prev) => {
      const m = prev.month + delta;
      if (m < 0) return { year: prev.year - 1, month: 11 };
      if (m > 11) return { year: prev.year + 1, month: 0 };
      return { year: prev.year, month: m };
    });
  };

  return (
    <Card variant="outlined" padding="md">
      <View className="flex-row items-center justify-between mb-3">
        <Pressable
          accessibilityRole="button"
          onPress={() => shiftMonth(-1)}
          className="rounded-xl bg-white border border-gray300 h-9 w-9 items-center justify-center"
        >
          <Feather name="chevron-left" size={18} color="#6B7280" />
        </Pressable>
        <Text className="text-base font-medium text-gray900">
          {new Date(view.year, view.month).toLocaleDateString(undefined, {
            month: 'long',
            year: 'numeric',
          })}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => shiftMonth(1)}
          className="rounded-xl bg-white border border-gray300 h-9 w-9 items-center justify-center"
        >
          <Feather name="chevron-right" size={18} color="#6B7280" />
        </Pressable>
      </View>

      <CalendarGrid
        year={view.year}
        month={view.month}
        eventDates={eventKeys}
        selectedDate={selectedDate}
        onSelectDate={onSelectDate}
      />
    </Card>
  );
}

function CalendarGrid({
  year,
  month,
  eventDates,
  selectedDate,
  onSelectDate,
}: {
  year: number;
  month: number;
  eventDates: Set<string>;
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
}): ReactElement {
  const daysRow = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const grid = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells: Array<{ day: number; inMonth: boolean; dateKey: string }> = [];

    // Previous month padding
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const pm = month === 0 ? 11 : month - 1;
      const py = month === 0 ? year - 1 : year;
      cells.push({ day: d, inMonth: false, dateKey: `${py}-${pm}-${d}` });
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, inMonth: true, dateKey: `${year}-${month}-${d}` });
    }

    // Next month padding
    const remaining = 7 - (cells.length % 7);
    if (remaining < 7) {
      const nm = month === 11 ? 0 : month + 1;
      const ny = month === 11 ? year + 1 : year;
      for (let d = 1; d <= remaining; d++) {
        cells.push({ day: d, inMonth: false, dateKey: `${ny}-${nm}-${d}` });
      }
    }

    // Split into weeks
    const weeks: Array<typeof cells> = [];
    for (let i = 0; i < cells.length; i += 7) {
      weeks.push(cells.slice(i, i + 7));
    }
    return weeks;
  }, [year, month]);

  return (
    <View>
      <View className="flex-row justify-between mb-2">
        {daysRow.map((d) => (
          <Text key={d} className="w-10 text-center text-gray500 text-sm">
            {d}
          </Text>
        ))}
      </View>
      {grid.map((row, i) => (
        <View key={String(i)} className="flex-row justify-between mb-1">
          {row.map((cell) => {
            const hasEvent = eventDates.has(cell.dateKey);
            const isSelected = selectedDate === cell.dateKey;

            return (
              <Pressable
                key={cell.dateKey}
                onPress={() => {
                  if (!cell.inMonth) return;
                  onSelectDate(isSelected ? null : cell.dateKey);
                }}
                className={cx(
                  'h-10 w-10 rounded-xl items-center justify-center',
                  isSelected ? 'bg-black' : '',
                )}
              >
                <Text
                  className={cx(
                    cell.inMonth ? 'text-gray800' : 'text-gray300',
                    isSelected ? 'text-white font-semibold' : '',
                  )}
                >
                  {cell.day}
                </Text>
                {hasEvent && (
                  <View
                    className={cx(
                      'absolute bottom-1 h-1.5 w-1.5 rounded-full',
                      isSelected ? 'bg-white' : 'bg-black',
                    )}
                  />
                )}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}
