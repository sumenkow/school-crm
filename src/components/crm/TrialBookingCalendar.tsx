'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
  User,
  Sparkles,
  CheckCircle2,
  Check,
  AlertCircle,
  BookOpen
} from 'lucide-react';
import { FullGroupData, INITIAL_COURSES } from '@/lib/data/mockData';
import { cn } from '@/lib/utils';

export interface TrialBookingResult {
  trialDateText: string;
  directionOrCourse: string;
  group?: FullGroupData;
  format: 'group' | 'individual';
  dateIso: string;
  time: string;
}

export interface TrialBookingCalendarProps {
  groups: FullGroupData[];
  selectedGroupId?: string;
  onSelectGroupId?: (id: string) => void;
  defaultCourse?: string;
  initialFormat?: 'group' | 'individual';
  initialDateTimeStr?: string;
  onSave: (result: TrialBookingResult) => void;
  onCancel?: () => void;
  isEmbedded?: boolean;
}

export function parseScheduleDays(scheduleStr?: string): number[] {
  if (!scheduleStr) return [];
  const s = scheduleStr.toLowerCase();
  const days: number[] = [];
  if (s.includes('пн') || s.includes('понедельник')) days.push(1);
  if (s.includes('вт') || s.includes('вторник')) days.push(2);
  if (s.includes('ср') || s.includes('среда') || s.includes('среду')) days.push(3);
  if (s.includes('чт') || s.includes('четверг')) days.push(4);
  if (s.includes('пт') || s.includes('пятниц')) days.push(5);
  if (s.includes('сб') || s.includes('суббот')) days.push(6);
  if (s.includes('вс') || s.includes('воскресень')) days.push(0);
  return days;
}

export function parseScheduleTime(scheduleStr?: string): string {
  if (!scheduleStr) return '18:00';
  const match = scheduleStr.match(/(\d{1,2}:\d{2})/);
  return match ? match[1] : '18:00';
}

const RUSSIAN_MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

const RUSSIAN_DAY_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const RUSSIAN_WEEKDAYS_ORDERED = [1, 2, 3, 4, 5, 6, 0]; // Mon to Sun

const QUICK_TIMES = ['10:00', '11:30', '14:00', '15:30', '17:00', '18:30', '19:45'];

export function TrialBookingCalendar({
  groups,
  selectedGroupId,
  onSelectGroupId,
  defaultCourse,
  initialFormat = 'group',
  initialDateTimeStr,
  onSave,
  onCancel,
  isEmbedded = false,
}: TrialBookingCalendarProps) {
  const [format, setFormat] = useState<'group' | 'individual'>(initialFormat);
  const [selectedGroup, setSelectedGroup] = useState<string>(selectedGroupId || (groups[0]?.id || ''));
  const [selectedCourse, setSelectedCourse] = useState<string>(defaultCourse || 'Английский язык');
  
  // Calendar Navigation
  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d;
  });
  const [selectedTime, setSelectedTime] = useState<string>('18:00');

  // Keep group sync
  useEffect(() => {
    if (selectedGroupId) {
      setSelectedGroup(selectedGroupId);
    }
  }, [selectedGroupId]);

  const currentGroupObj = useMemo(() => {
    return groups.find(g => g.id === selectedGroup);
  }, [groups, selectedGroup]);

  // When group changes, update selectedCourse and default time
  useEffect(() => {
    if (format === 'group' && currentGroupObj) {
      if (currentGroupObj.courseName) {
        setSelectedCourse(currentGroupObj.courseName);
      }
      const parsedTime = parseScheduleTime(currentGroupObj.schedule);
      setSelectedTime(parsedTime);
    }
  }, [format, currentGroupObj]);

  const groupScheduleDays = useMemo(() => {
    if (format !== 'group' || !currentGroupObj) return [];
    return parseScheduleDays(currentGroupObj.schedule);
  }, [format, currentGroupObj]);

  // Next 3 upcoming matching dates for quick chips
  const upcomingGroupDates = useMemo(() => {
    if (format !== 'group' || !currentGroupObj || groupScheduleDays.length === 0) return [];
    const results: Date[] = [];
    const check = new Date();
    for (let i = 0; i < 30 && results.length < 3; i++) {
      const candidate = new Date(check);
      candidate.setDate(candidate.getDate() + i);
      const dayOfWeek = candidate.getDay();
      if (groupScheduleDays.includes(dayOfWeek)) {
        results.push(candidate);
      }
    }
    return results;
  }, [format, currentGroupObj, groupScheduleDays]);

  // Month navigation
  const prevMonth = () => {
    setCurrentMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Calendar cells calculation
  const calendarCells = useMemo(() => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const totalDays = lastDay.getDate();

    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const cells: Array<{
      date: Date;
      dayNumber: number;
      isCurrentMonth: boolean;
      isGroupDay: boolean;
      isPast: boolean;
      isSelected: boolean;
      isToday: boolean;
    }> = [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Previous month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay - i);
      d.setHours(0, 0, 0, 0);
      cells.push({
        date: d,
        dayNumber: d.getDate(),
        isCurrentMonth: false,
        isGroupDay: false,
        isPast: d.getTime() < today.getTime(),
        isSelected: !!selectedDate && d.toDateString() === selectedDate.toDateString(),
        isToday: d.getTime() === today.getTime(),
      });
    }

    // Current month days
    for (let day = 1; day <= totalDays; day++) {
      const d = new Date(year, month, day);
      d.setHours(0, 0, 0, 0);
      const dayOfWeek = d.getDay();
      const isGroupDay = format === 'group' && groupScheduleDays.includes(dayOfWeek);
      const isPast = d.getTime() < today.getTime();
      const isSelected = !!selectedDate && d.toDateString() === selectedDate.toDateString();
      const isToday = d.getTime() === today.getTime();

      cells.push({
        date: d,
        dayNumber: day,
        isCurrentMonth: true,
        isGroupDay,
        isPast,
        isSelected,
        isToday,
      });
    }

    // Next month padding to fill complete weeks (multiples of 7)
    const remaining = 7 - (cells.length % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        const d = new Date(year, month + 1, i);
        d.setHours(0, 0, 0, 0);
        cells.push({
          date: d,
          dayNumber: i,
          isCurrentMonth: false,
          isGroupDay: false,
          isPast: d.getTime() < today.getTime(),
          isSelected: !!selectedDate && d.toDateString() === selectedDate.toDateString(),
          isToday: false,
        });
      }
    }

    return cells;
  }, [currentMonthDate, selectedDate, format, groupScheduleDays]);

  const handleCellClick = (cellDate: Date, isGroupDay: boolean) => {
    setSelectedDate(cellDate);
    if (format === 'group' && currentGroupObj) {
      const parsedTime = parseScheduleTime(currentGroupObj.schedule);
      setSelectedTime(parsedTime);
    }
  };

  const handleQuickSlotClick = (date: Date) => {
    setSelectedDate(date);
    setCurrentMonthDate(new Date(date.getFullYear(), date.getMonth(), 1));
    if (currentGroupObj) {
      setSelectedTime(parseScheduleTime(currentGroupObj.schedule));
    }
  };

  const formattedDatePreview = useMemo(() => {
    if (!selectedDate) return 'Дата не выбрана';
    const dayOfWeek = RUSSIAN_DAY_SHORT[selectedDate.getDay()];
    const dayNum = selectedDate.getDate();
    const monthName = RUSSIAN_MONTH_NAMES[selectedDate.getMonth()].slice(0, 3).toLowerCase();
    return `${dayOfWeek}, ${dayNum} ${monthName}`;
  }, [selectedDate]);

  const fullTrialText = useMemo(() => {
    if (!selectedDate) return 'Дата и время не назначены';
    const dateStr = formattedDatePreview;
    const timeStr = selectedTime || '18:00';
    if (format === 'group') {
      const grpName = currentGroupObj?.name || 'Группа';
      return `${dateStr} • ${timeStr} (Группа «${grpName}»)`;
    } else {
      return `${dateStr} • ${timeStr} (Индивидуально • ${selectedCourse})`;
    }
  }, [selectedDate, selectedTime, format, currentGroupObj, selectedCourse, formattedDatePreview]);

  const handleSubmit = () => {
    if (!selectedDate) {
      return;
    }
    const pad = (n: number) => String(n).padStart(2, '0');
    const dateIso = `${selectedDate.getFullYear()}-${pad(selectedDate.getMonth() + 1)}-${pad(selectedDate.getDate())}`;

    onSave({
      trialDateText: fullTrialText,
      directionOrCourse: format === 'group' ? (currentGroupObj?.courseName || selectedCourse) : selectedCourse,
      group: format === 'group' ? currentGroupObj : undefined,
      format,
      dateIso,
      time: selectedTime || '18:00',
    });
  };

  return (
    <div className={cn('space-y-4', !isEmbedded && 'bg-white rounded-2xl p-5 border border-slate-200 shadow-xl')}>
      {/* Header & Format Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-purple-600" />
            Запись на пробное занятие
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Выберите формат занятия, дату в интерактивном календаре и удобное время
          </p>
        </div>

        {/* Format Selector Pills */}
        <div className="flex items-center p-1 bg-slate-100 rounded-xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setFormat('group')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer',
              format === 'group'
                ? 'bg-white text-purple-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <Users className="w-3.5 h-3.5 text-purple-600" />
            В группе
          </button>
          <button
            type="button"
            onClick={() => setFormat('individual')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer',
              format === 'individual'
                ? 'bg-white text-blue-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <User className="w-3.5 h-3.5 text-blue-600" />
            Индивидуально
          </button>
        </div>
      </div>

      {/* Target Selector (Group vs Direction) */}
      {format === 'group' ? (
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
            1. Выберите группу для пробного урока <span className="text-rose-500">*</span>
          </label>
          <select
            value={selectedGroup}
            onChange={(e) => {
              setSelectedGroup(e.target.value);
              onSelectGroupId?.(e.target.value);
            }}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
          >
            {groups.map(g => (
              <option key={g.id} value={g.id}>
                {g.name} ({g.courseName}) • {g.schedule} • Мест: {g.students?.length || 0}/{g.capacity || 8}
              </option>
            ))}
          </select>

          {currentGroupObj && (
            <div className="p-3 bg-purple-50/70 border border-purple-200/80 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-600" />
                <span className="font-bold text-purple-950">{currentGroupObj.name}</span>
                <span className="text-purple-700 font-medium">({currentGroupObj.courseName})</span>
                <span className="text-slate-500 ml-1">Расписание: <b>{currentGroupObj.schedule}</b></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-600">Преподаватель: <b>{currentGroupObj.teacherName}</b></span>
                <span className="px-2 py-0.5 rounded bg-purple-200/80 text-purple-900 font-bold text-[11px]">
                  {currentGroupObj.students?.length || 0} / {currentGroupObj.capacity || 8} уч.
                </span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
            1. Направление / Предмет (группу выбирать не нужно) <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              {INITIAL_COURSES.map(c => (
                <option key={c.id} value={c.name}>{c.name} ({c.description})</option>
              ))}
              <option value="Подготовка к школе">Подготовка к школе</option>
              <option value="Китайский язык">Китайский язык</option>
              <option value="Шахматы и логика">Шахматы и логика</option>
            </select>

            <div className="p-2.5 bg-blue-50/70 border border-blue-200/80 rounded-xl flex items-center gap-2 text-xs text-blue-900">
              <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Свободный выбор даты и времени для индивидуального урока</span>
            </div>
          </div>
        </div>
      )}

      {/* Quick Upcoming Group Slots */}
      {format === 'group' && upcomingGroupDates.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
            Ближайшие занятия группы (быстрый выбор):
          </label>
          <div className="flex flex-wrap gap-2">
            {upcomingGroupDates.map((d, idx) => {
              const dShort = RUSSIAN_DAY_SHORT[d.getDay()];
              const dNum = d.getDate();
              const mShort = RUSSIAN_MONTH_NAMES[d.getMonth()].slice(0, 3).toLowerCase();
              const time = parseScheduleTime(currentGroupObj?.schedule);
              const isSelected = selectedDate && d.toDateString() === selectedDate.toDateString();

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleQuickSlotClick(d)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer',
                    isSelected
                      ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                      : 'bg-purple-50/80 hover:bg-purple-100 text-purple-900 border-purple-200'
                  )}
                >
                  <CalendarIcon className="w-3.5 h-3.5" />
                  <span>{dShort} {dNum} {mShort}, {time}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 ml-0.5" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Interactive Calendar Section */}
      <div className="space-y-2 pt-2 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
            2. Календарь {format === 'group' ? '(выделены дни занятий группы)' : '(выберите любую дату)'}
          </label>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
              title="Предыдущий месяц"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-slate-800 min-w-[120px] text-center">
              {RUSSIAN_MONTH_NAMES[currentMonthDate.getMonth()]} {currentMonthDate.getFullYear()}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
              title="Следующий месяц"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Month Calendar Grid */}
        <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((wd, i) => (
              <div
                key={wd}
                className={cn(
                  'text-[11px] font-bold py-1 text-slate-500',
                  i >= 5 && 'text-rose-500 font-semibold'
                )}
              >
                {wd}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map((cell, idx) => {
              const { isCurrentMonth, isGroupDay, isPast, isSelected, isToday, dayNumber, date } = cell;

              let cellStyle = 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200';

              if (!isCurrentMonth) {
                cellStyle = 'text-slate-300 bg-transparent border-transparent hover:bg-slate-100/50';
              } else if (isSelected) {
                cellStyle = format === 'group'
                  ? 'bg-purple-600 text-white font-bold border-purple-600 shadow-2xs'
                  : 'bg-blue-600 text-white font-bold border-blue-600 shadow-2xs';
              } else if (isGroupDay) {
                cellStyle = 'bg-purple-100 text-purple-950 font-bold border-purple-300 ring-1 ring-purple-300 hover:bg-purple-200';
              } else if (isToday) {
                cellStyle = 'border-blue-400 font-bold text-blue-600 bg-blue-50/50';
              }

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={isPast && !isSelected}
                  onClick={() => handleCellClick(date, isGroupDay)}
                  className={cn(
                    'h-9 rounded-lg border text-xs flex flex-col items-center justify-center relative transition-all cursor-pointer select-none',
                    cellStyle,
                    isPast && !isSelected && 'opacity-35 cursor-not-allowed hover:bg-transparent'
                  )}
                >
                  <span>{dayNumber}</span>
                  {isGroupDay && !isSelected && (
                    <span className="w-1 h-1 rounded-full bg-purple-600 absolute bottom-1" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-200/60 text-[11px] text-slate-500">
            {format === 'group' ? (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-purple-100 border border-purple-300" />
                  <span>День занятий группы</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-purple-600" />
                  <span>Выбранная дата</span>
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-blue-600" />
                  <span>Выбранная дата</span>
                </span>
                <span>(Доступны любые открытые даты)</span>
              </div>
            )}
            <span className="text-slate-400 text-[10px]">
              Выбрано: <b>{formattedDatePreview}</b>
            </span>
          </div>
        </div>
      </div>

      {/* 3. Time Selection */}
      <div className="space-y-2 pt-2 border-t border-slate-100">
        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
          3. Время начала урока <span className="text-rose-500">*</span>
        </label>
        <div className="flex flex-wrap items-center gap-2">
          {QUICK_TIMES.map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setSelectedTime(t)}
              className={cn(
                'px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer',
                selectedTime === t
                  ? (format === 'group' ? 'bg-purple-600 text-white border-purple-600' : 'bg-blue-600 text-white border-blue-600')
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              )}
            >
              {t}
            </button>
          ))}
          <div className="flex items-center gap-1.5 ml-auto">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              placeholder="18:00"
              className="w-20 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-500 text-center"
            />
          </div>
        </div>
      </div>

      {/* Summary Box */}
      <div className="p-3 bg-slate-100/80 rounded-xl border border-slate-200 space-y-1">
        <span className="text-[11px] font-bold text-slate-500 uppercase block">Итоговая запись:</span>
        <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
          <CheckCircle2 className={cn('w-4 h-4', format === 'group' ? 'text-purple-600' : 'text-blue-600')} />
          <span>{fullTrialText}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            Отмена
          </button>
        )}
        <button
          type="button"
          onClick={handleSubmit}
          className={cn(
            'inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-white font-bold text-xs shadow-xs transition-colors cursor-pointer',
            format === 'group'
              ? 'bg-purple-600 hover:bg-purple-700'
              : 'bg-blue-600 hover:bg-blue-700'
          )}
        >
          <CheckCircle2 className="w-4 h-4" />
          Зафиксировать пробное занятие
        </button>
      </div>
    </div>
  );
}
