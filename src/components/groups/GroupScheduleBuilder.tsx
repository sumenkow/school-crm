'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ScheduleBuilderState {
  daysOfWeek: number[]; // 0=Пн, 1=Вт, 2=Ср, 3=Чт, 4=Пт, 5=Сб, 6=Вс
  startTime: string;
  endTime: string;
  generateLessons: boolean;
  horizon: '1_month' | '2_months' | '3_months' | 'custom_date';
  startDate: string;
  customEndDate: string;
}

interface GroupScheduleBuilderProps {
  initialSchedule?: string;
  onScheduleChange: (formattedSchedule: string, state: ScheduleBuilderState) => void;
}

const DAY_LABELS = [
  { dayIndex: 0, short: 'Пн', full: 'Понедельник' },
  { dayIndex: 1, short: 'Вт', full: 'Вторник' },
  { dayIndex: 2, short: 'Ср', full: 'Среда' },
  { dayIndex: 3, short: 'Чт', full: 'Четверг' },
  { dayIndex: 4, short: 'Пт', full: 'Пятница' },
  { dayIndex: 5, short: 'Сб', full: 'Суббота' },
  { dayIndex: 6, short: 'Вс', full: 'Воскресенье' },
];

/**
 * Parses existing schedule string like "Пн, Чт • 18:45–20:15" into days and times.
 */
function parseScheduleString(str?: string): { days: number[]; startTime: string; endTime: string } {
  if (!str) return { days: [0, 3], startTime: '18:45', endTime: '20:15' };

  const days: number[] = [];
  const lower = str.toLowerCase();

  if (lower.includes('пн')) days.push(0);
  if (lower.includes('вт')) days.push(1);
  if (lower.includes('ср')) days.push(2);
  if (lower.includes('чт')) days.push(3);
  if (lower.includes('пт')) days.push(4);
  if (lower.includes('сб')) days.push(5);
  if (lower.includes('вс')) days.push(6);

  const timeMatch = str.match(/(\d{1,2}:\d{2})\s*[–\-]\s*(\d{1,2}:\d{2})/);
  const startTime = timeMatch ? timeMatch[1] : '18:45';
  const endTime = timeMatch ? timeMatch[2] : '20:15';

  return {
    days: days.length > 0 ? days : [0, 3],
    startTime,
    endTime,
  };
}

export function GroupScheduleBuilder({
  initialSchedule,
  onScheduleChange,
}: GroupScheduleBuilderProps) {
  const parsed = parseScheduleString(initialSchedule);

  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(parsed.days);
  const [startTime, setStartTime] = useState<string>(parsed.startTime);
  const [endTime, setEndTime] = useState<string>(parsed.endTime);

  const [generateLessons, setGenerateLessons] = useState<boolean>(true);
  const [horizon, setHorizon] = useState<'1_month' | '2_months' | '3_months' | 'custom_date'>('1_month');
  
  const [startDate, setStartDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });

  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 60);
    return d.toISOString().slice(0, 10);
  });

  // Toggle Day Selection
  const toggleDay = (dayIndex: number) => {
    setDaysOfWeek((prev) => {
      const next = prev.includes(dayIndex)
        ? prev.filter((d) => d !== dayIndex)
        : [...prev, dayIndex].sort((a, b) => a - b);
      return next.length > 0 ? next : [dayIndex]; // Keep at least one
    });
  };

  // Build human-readable formatted string: e.g. "Пн, Чт • 18:45–20:15"
  const formattedSchedule = React.useMemo(() => {
    const dayNames = daysOfWeek
      .map((d) => DAY_LABELS.find((l) => l.dayIndex === d)?.short)
      .filter(Boolean)
      .join(', ');
    return `${dayNames} • ${startTime}–${endTime}`;
  }, [daysOfWeek, startTime, endTime]);

  // Notify parent on any state change
  useEffect(() => {
    onScheduleChange(formattedSchedule, {
      daysOfWeek,
      startTime,
      endTime,
      generateLessons,
      horizon,
      startDate,
      customEndDate,
    });
  }, [formattedSchedule, daysOfWeek, startTime, endTime, generateLessons, horizon, startDate, customEndDate, onScheduleChange]);

  const estimatedLessonCount = React.useMemo(() => {
    const daysPerWeek = daysOfWeek.length;
    if (horizon === '1_month') return daysPerWeek * 4;
    if (horizon === '2_months') return daysPerWeek * 8;
    if (horizon === '3_months') return daysPerWeek * 12;
    if (horizon === 'custom_date' && customEndDate && startDate) {
      const diffDays = Math.max(0, (new Date(customEndDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
      const weeks = diffDays / 7;
      return Math.round(weeks * daysPerWeek);
    }
    return daysPerWeek * 4;
  }, [daysOfWeek, horizon, startDate, customEndDate]);

  return (
    <div className="space-y-4 rounded-2xl border border-blue-100 bg-linear-to-b from-blue-50/40 to-indigo-50/20 p-4">
      {/* HEADER / RESULT BADGE */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <Calendar className="h-4 w-4 text-blue-600" />
          Конструктор расписания группы
        </span>
        <span className="rounded-lg bg-blue-600 text-white font-mono px-2.5 py-0.5 text-xs font-bold shadow-2xs">
          {formattedSchedule}
        </span>
      </div>

      {/* ШАГ 1: ДНИ НЕДЕЛИ */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-slate-700 block">
          Шаг 1: Выберите дни проведения занятий
        </label>
        <div className="grid grid-cols-7 gap-1.5">
          {DAY_LABELS.map((day) => {
            const isSelected = daysOfWeek.includes(day.dayIndex);
            return (
              <button
                key={day.dayIndex}
                type="button"
                onClick={() => toggleDay(day.dayIndex)}
                title={day.full}
                className={cn(
                  'py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border flex flex-col items-center justify-center',
                  isSelected
                    ? 'bg-blue-600 border-blue-600 text-white shadow-xs scale-[1.02]'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50/40'
                )}
              >
                <span>{day.short}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ШАГ 2: ВРЕМЯ ЗАНЯТИЯ */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-slate-700 block">
          Шаг 2: Время начала и окончания
        </label>
        <div className="grid grid-cols-2 gap-3">
          <div className="relative">
            <span className="text-[10px] text-slate-500 font-semibold block mb-0.5">Начало</span>
            <input
              type="time"
              required
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 font-semibold focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="relative">
            <span className="text-[10px] text-slate-500 font-semibold block mb-0.5">Окончание</span>
            <input
              type="time"
              required
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 font-semibold focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* ШАГ 3: ДАТА СТАРТА КУРСА И ГЕНЕРАЦИЯ В КАЛЕНДАРЬ */}
      <div className="rounded-xl border border-indigo-200 bg-white p-3.5 space-y-3 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
          <div>
            <label className="text-[11px] font-bold text-slate-800 block mb-1">
              Шаг 3: Дата старта курса *
            </label>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 font-semibold focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-between pb-1 sm:justify-end gap-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={generateLessons}
                onChange={(e) => setGenerateLessons(e.target.checked)}
                className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
              />
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                Сгенерировать в календарь
              </span>
            </label>
            {generateLessons && (
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                ≈ {estimatedLessonCount} {estimatedLessonCount === 1 ? 'урок' : 'уроков'}
              </span>
            )}
          </div>
        </div>

        {generateLessons && (
          <div className="space-y-2.5 pt-2 border-t border-slate-100 animate-in fade-in duration-150 text-xs">
            <span className="text-[11px] font-semibold text-slate-600 block">Период планирования генерации:</span>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => setHorizon('1_month')}
                className={cn(
                  'px-2.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer border text-center text-[11px]',
                  horizon === '1_month'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs font-bold'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-indigo-50'
                )}
              >
                1 месяц ({daysOfWeek.length * 4} ур.)
              </button>

              <button
                type="button"
                onClick={() => setHorizon('2_months')}
                className={cn(
                  'px-2.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer border text-center text-[11px]',
                  horizon === '2_months'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs font-bold'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-indigo-50'
                )}
              >
                2 месяца ({daysOfWeek.length * 8} ур.)
              </button>

              <button
                type="button"
                onClick={() => setHorizon('3_months')}
                className={cn(
                  'px-2.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer border text-center text-[11px]',
                  horizon === '3_months'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs font-bold'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-indigo-50'
                )}
              >
                3 месяца ({daysOfWeek.length * 12} ур.)
              </button>

              <button
                type="button"
                onClick={() => setHorizon('custom_date')}
                className={cn(
                  'px-2.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer border text-center text-[11px]',
                  horizon === 'custom_date'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs font-bold'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-indigo-50'
                )}
              >
                До даты...
              </button>
            </div>

            {horizon === 'custom_date' && (
              <div className="pt-1 max-w-xs">
                <span className="text-[10px] text-slate-500 font-semibold block mb-0.5">Дата окончания генерации</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
