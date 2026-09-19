'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DatePickerProps {
  value: string; // ISO format 'YYYY-MM-DD' or 'DD.MM.YYYY'
  onChange: (valueIso: string, formattedDisplay?: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
  disabled?: boolean;
}

export function DatePicker({
  value,
  onChange,
  label,
  placeholder = 'Выберите дату',
  required,
  className,
  disabled,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Parse initial value date or fallback to today
  const parseValueDate = (val: string): Date => {
    if (!val) return new Date(2026, 8, 19); // Default Sept 19, 2026
    if (val.includes('.')) {
      const parts = val.split('.').map(Number);
      if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
        let yr = parts[2];
        if (yr < 100) yr += 2000;
        return new Date(yr, parts[1] - 1, parts[0]);
      }
    }
    const d = new Date(val);
    return isNaN(d.getTime()) ? new Date(2026, 8, 19) : d;
  };

  const selectedDate = parseValueDate(value);
  const [viewDate, setViewDate] = useState<Date>(selectedDate);

  useEffect(() => {
    if (value) {
      setViewDate(parseValueDate(value));
    }
  }, [value]);

  // Close popover on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const formatDateDisplay = (d: Date): string => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
  };

  const formatDateIso = (d: Date): string => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  const handleSelectDate = (d: Date) => {
    const iso = formatDateIso(d);
    const display = formatDateDisplay(d);
    onChange(iso, display);
    setIsOpen(false);
  };

  // Quick Preset Actions
  const handleSetToday = () => {
    const today = new Date();
    const baseline = new Date(2026, 8, 19);
    const target = today.getTime() > baseline.getTime() ? today : baseline;
    handleSelectDate(target);
  };

  const handleSetTomorrow = () => {
    const today = new Date();
    const baseline = new Date(2026, 8, 19);
    const target = today.getTime() > baseline.getTime() ? today : baseline;
    const tomorrow = new Date(target);
    tomorrow.setDate(tomorrow.getDate() + 1);
    handleSelectDate(tomorrow);
  };

  const handleSetEndOfWeek = () => {
    const today = new Date();
    const baseline = new Date(2026, 8, 19);
    const target = today.getTime() > baseline.getTime() ? today : baseline;
    const endOfWeek = new Date(target);
    const day = endOfWeek.getDay();
    const diff = day === 0 ? 0 : 7 - day;
    endOfWeek.setDate(endOfWeek.getDate() + diff);
    handleSelectDate(endOfWeek);
  };

  // Month navigation
  const prevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  // Generate calendar month grid
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  // Russian Monday start (0=Mon, 6=Sun)
  let startingDayOfWeek = firstDayOfMonth.getDay() - 1;
  if (startingDayOfWeek === -1) startingDayOfWeek = 6;

  const daysInMonth = lastDayOfMonth.getDate();
  const monthName = viewDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });

  const weekDayLabels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  return (
    <div className={cn('relative inline-block w-full', className)} ref={popoverRef}>
      {label && (
        <label className="block text-xs font-medium text-slate-700 mb-1">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      {/* Trigger Button (Strictly Read-Only to prevent text typing) */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-left transition-colors hover:border-blue-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20',
          disabled && 'opacity-60 cursor-not-allowed bg-slate-50',
          isOpen && 'border-blue-500 ring-2 ring-blue-500/20'
        )}
      >
        <span className={cn(value ? 'text-slate-900 font-semibold' : 'text-slate-400')}>
          {value ? formatDateDisplay(selectedDate) : placeholder}
        </span>
        <CalendarIcon className="h-4 w-4 text-slate-400" />
      </button>

      {/* Interactive Calendar Popover */}
      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 w-72 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xl animate-in fade-in zoom-in-95 duration-150">
          {/* Preset Buttons Header */}
          <div className="flex items-center justify-between gap-1 pb-3 border-b border-slate-100">
            <button
              type="button"
              onClick={handleSetToday}
              className="flex-1 rounded-lg bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-100 transition-colors text-center cursor-pointer"
            >
              Сегодня
            </button>
            <button
              type="button"
              onClick={handleSetTomorrow}
              className="flex-1 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-200 transition-colors text-center cursor-pointer"
            >
              Завтра
            </button>
            <button
              type="button"
              onClick={handleSetEndOfWeek}
              className="flex-1 rounded-lg bg-purple-50 px-2 py-1 text-[11px] font-semibold text-purple-700 hover:bg-purple-100 transition-colors text-center cursor-pointer"
            >
              Конец недели
            </button>
          </div>

          {/* Month Navigation */}
          <div className="flex items-center justify-between py-2">
            <button
              type="button"
              onClick={prevMonth}
              className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs font-bold text-slate-900 capitalize">
              {monthName}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center py-1">
            {weekDayLabels.map((wd) => (
              <span key={wd} className="text-[10px] font-bold text-slate-400">
                {wd}
              </span>
            ))}
          </div>

          {/* Calendar Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center pt-1">
            {/* Empty slots for month start */}
            {Array.from({ length: startingDayOfWeek }).map((_, i) => (
              <div key={`empty_${i}`} className="h-7 w-7" />
            ))}

            {/* Days of month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateObj = new Date(year, month, dayNum);
              const isSelected =
                selectedDate.getFullYear() === year &&
                selectedDate.getMonth() === month &&
                selectedDate.getDate() === dayNum;

              const isToday =
                new Date().getFullYear() === year &&
                new Date().getMonth() === month &&
                new Date().getDate() === dayNum;

              return (
                <button
                  key={dayNum}
                  type="button"
                  onClick={() => handleSelectDate(dateObj)}
                  className={cn(
                    'h-7 w-7 rounded-lg text-xs font-semibold flex items-center justify-center transition-all mx-auto cursor-pointer',
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs font-bold'
                      : isToday
                      ? 'bg-blue-50 text-blue-700 border border-blue-200 font-bold'
                      : 'text-slate-700 hover:bg-slate-100'
                  )}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
