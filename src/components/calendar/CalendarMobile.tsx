'use client';

import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Plus,
  Filter,
  Video,
  Users,
  Sparkles,
} from 'lucide-react';
import { FullLessonData } from '@/lib/data/mockData';
import { cn } from '@/lib/utils';
import { LessonBottomSheet } from '@/components/calendar/LessonBottomSheet';

interface CalendarMobileProps {
  lessons: FullLessonData[];
  onOpenSchedule: (dateStr?: string) => void;
  onOpenCourseSchedule?: () => void;
  onLessonUpdated?: (updatedLesson: FullLessonData) => void;
}

export function CalendarMobile({
  lessons,
  onOpenSchedule,
  onOpenCourseSchedule,
  onLessonUpdated,
}: CalendarMobileProps) {
  const getMonday = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
  };

  const getTodayStr = () => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  };

  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => getMonday(new Date()));
  const [selectedDate, setSelectedDate] = useState<string>(() => getTodayStr());
  const [selectedTeacher, setSelectedTeacher] = useState<string>('all');
  const [showTeacherFilter, setShowTeacherFilter] = useState(false);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<FullLessonData | null>(null);

  const todayStr = getTodayStr();

  // 7 days of the active week strip
  const daysOfWeek = [0, 1, 2, 3, 4, 5, 6].map((offset) => {
    const d = new Date(currentWeekStart);
    d.setDate(currentWeekStart.getDate() + offset);
    const pad = (n: number) => String(n).padStart(2, '0');
    const fullDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const dayNames = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];
    const dateNum = d.getDate();
    
    // Lessons on this date
    const dayLessons = lessons.filter((l) => {
      const matchDate = l.date === fullDate || (!l.date && l.dayOfWeek === offset);
      if (selectedTeacher !== 'all') {
        return matchDate && l.teacherId === selectedTeacher;
      }
      return matchDate;
    });

    const hasRegularLessons = dayLessons.some(l => !l.isTrial);
    const hasTrialLessons = dayLessons.some(l => l.isTrial || l.students?.some((s: any) => s.isTrial));

    return {
      name: dayNames[offset],
      dateNum,
      fullDate,
      dayIndex: offset,
      isToday: fullDate === todayStr,
      isSelected: fullDate === selectedDate,
      hasRegularLessons,
      hasTrialLessons,
      lessonCount: dayLessons.length,
    };
  });

  const handleGoToToday = () => {
    const today = new Date();
    setCurrentWeekStart(getMonday(today));
    setSelectedDate(getTodayStr());
    setIsMonthPickerOpen(false);
  };

  const handlePrevWeek = () => {
    setCurrentWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  };

  const handleNextWeek = () => {
    setCurrentWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  };

  // Active Date & Month calculations
  const activeDateObj = new Date(selectedDate);
  const monthYearLabel = activeDateObj.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  const capitalizedMonthYear = monthYearLabel.charAt(0).toUpperCase() + monthYearLabel.slice(1);

  // Month grid calculations
  const viewYear = activeDateObj.getFullYear();
  const viewMonth = activeDateObj.getMonth();
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
  const lastDayOfMonth = new Date(viewYear, viewMonth + 1, 0);
  const daysInMonthCount = lastDayOfMonth.getDate();
  const startDayOfWeek = firstDayOfMonth.getDay() === 0 ? 6 : firstDayOfMonth.getDay() - 1;

  // Lessons of selected day
  const selectedDayOfWeek = activeDateObj.getDay() === 0 ? 6 : activeDateObj.getDay() - 1;
  const dayLessons = lessons.filter((l) => {
    const matchDate = l.date === selectedDate || (!l.date && l.dayOfWeek === selectedDayOfWeek);
    if (selectedTeacher !== 'all') {
      return matchDate && l.teacherId === selectedTeacher;
    }
    return matchDate;
  });

  const formattedSelectedDayTitle = activeDateObj.toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).toUpperCase();

  const teachersList = [
    { id: 'all', name: `Все (${lessons.length})` },
    { id: 't1', name: 'Мария Иванова' },
    { id: 't2', name: 'Денис Смирнов' },
    { id: 't3', name: 'Ольга Соколова' },
    { id: 't4', name: 'Анна Кузнецова' },
  ];

  return (
    <div className="flex flex-col bg-slate-50 min-h-screen">
      
      {/* UNIFIED STICKY CONTAINER FOR HEADER + STRIP / MONTH PICKER */}
      <div className="sticky top-0 z-30 w-full bg-white border-b border-slate-200 shadow-xs flex flex-col">
        
        {/* ROW 1: Month Title with Dropdown Arrow, Today, Filter, Plus */}
        <div className="h-14 px-4 flex items-center justify-between flex-shrink-0 bg-white">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setIsMonthPickerOpen(!isMonthPickerOpen)}
              className="flex items-center gap-1.5 font-bold text-slate-900 text-base py-1 cursor-pointer active:opacity-70 truncate"
            >
              <span>{capitalizedMonthYear}</span>
              <ChevronDown className={cn('w-4 h-4 text-slate-500 transition-transform shrink-0', isMonthPickerOpen ? 'rotate-180' : '')} />
            </button>
            <button
              type="button"
              onClick={handleGoToToday}
              className={cn(
                'text-xs font-semibold px-2.5 py-1 rounded-full transition-colors cursor-pointer shrink-0',
                selectedDate === todayStr
                  ? 'bg-blue-100 text-blue-700 font-bold'
                  : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
              )}
            >
              Сегодня
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowTeacherFilter(!showTeacherFilter)}
              className={cn(
                'p-2 rounded-lg border transition-colors relative cursor-pointer',
                selectedTeacher !== 'all'
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'text-slate-500 hover:bg-slate-100 border-slate-200'
              )}
              title="Фильтр учителей"
            >
              <Filter className="w-4 h-4" />
              {selectedTeacher !== 'all' && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-600 rounded-full ring-2 ring-white" />
              )}
            </button>

            <button
              type="button"
              onClick={() => onOpenSchedule(selectedDate)}
              className="p-2 bg-blue-600 text-white rounded-lg shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
              title="Запланировать занятие"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Expandable Teacher Filter Bar */}
        {showTeacherFilter && (
          <div className="bg-slate-50 px-4 py-2 flex items-center gap-2 overflow-x-auto border-t border-slate-100">
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Учитель:</span>
            {teachersList.map((tItem) => (
              <button
                key={tItem.id}
                type="button"
                onClick={() => setSelectedTeacher(tItem.id)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer',
                  selectedTeacher === tItem.id
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                )}
              >
                {tItem.name}
              </button>
            ))}
          </div>
        )}

        {/* Expandable Collapsible Month Grid */}
        {isMonthPickerOpen ? (
          <div className="w-full px-4 pt-2 pb-4 bg-white border-t border-slate-100 animate-in fade-in duration-150">
            <div className="grid grid-cols-7 gap-1 text-center text-xs mb-1">
              {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((d, di) => (
                <div key={di} className="font-bold text-slate-400 uppercase py-1 text-[10px]">{d}</div>
              ))}

              {/* Preceding empty slots */}
              {Array.from({ length: startDayOfWeek }).map((_, idx) => (
                <div key={`empty_m_${idx}`} className="h-10 opacity-30" />
              ))}

              {/* Days of current month */}
              {Array.from({ length: daysInMonthCount }).map((_, i) => {
                const dayNum = i + 1;
                const pad = (n: number) => String(n).padStart(2, '0');
                const dateStr = `${viewYear}-${pad(viewMonth + 1)}-${pad(dayNum)}`;
                const isSelected = selectedDate === dateStr;
                const isToday = dateStr === todayStr;
                const d = new Date(viewYear, viewMonth, dayNum);
                const dayOfWeek = d.getDay() === 0 ? 6 : d.getDay() - 1;

                const dayLessons = lessons.filter((l) => {
                  const matchDate = l.date === dateStr || (!l.date && l.dayOfWeek === dayOfWeek);
                  if (selectedTeacher !== 'all') return matchDate && l.teacherId === selectedTeacher;
                  return matchDate;
                });
                const hasRegular = dayLessons.some(l => !l.isTrial);
                const hasTrial = dayLessons.some(l => l.isTrial || l.students?.some((s: any) => s.isTrial));

                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => {
                      setSelectedDate(dateStr);
                      setCurrentWeekStart(getMonday(new Date(viewYear, viewMonth, dayNum)));
                      setIsMonthPickerOpen(false);
                    }}
                    className={cn(
                      'h-10 rounded-xl flex flex-col items-center justify-center text-xs transition-all relative cursor-pointer',
                      isSelected
                        ? 'bg-blue-600 text-white font-bold shadow-md'
                        : isToday
                        ? 'border border-blue-400 bg-blue-50 text-blue-700 font-bold'
                        : 'text-slate-700 hover:bg-slate-100'
                    )}
                  >
                    <span>{dayNum}</span>
                    <div className="flex items-center gap-0.5 mt-0.5 h-1">
                      {hasRegular && (
                        <span className={cn('w-1 h-1 rounded-full', isSelected ? 'bg-white' : 'bg-blue-600')} />
                      )}
                      {hasTrial && (
                        <span className={cn('w-1 h-1 rounded-full', isSelected ? 'bg-purple-200' : 'bg-purple-600')} />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* ROW 2: Week DateStrip with clear padding without negative margins */
          <div className="w-full px-2 pt-2 pb-3 flex items-center justify-between flex-shrink-0 bg-white">
            <button type="button" onClick={handlePrevWeek} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex-1 grid grid-cols-7 gap-1 items-center text-center">
              {daysOfWeek.map((day) => (
                <button
                  key={day.fullDate}
                  type="button"
                  onClick={() => setSelectedDate(day.fullDate)}
                  className={cn(
                    'flex flex-col items-center justify-center py-1.5 rounded-xl transition-all cursor-pointer',
                    day.isSelected
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'hover:bg-slate-50 text-slate-700'
                  )}
                >
                  <span className={cn('text-[10px] font-semibold uppercase mb-0.5', day.isSelected ? 'text-blue-100' : 'text-slate-400')}>
                    {day.name}
                  </span>
                  <span className="text-sm font-bold leading-none">
                    {day.dateNum}
                  </span>

                  {/* Indicator dots */}
                  <div className="flex items-center gap-0.5 mt-1 h-1">
                    {day.hasRegularLessons && (
                      <span className={cn('w-1 h-1 rounded-full', day.isSelected ? 'bg-white' : 'bg-blue-600')} />
                    )}
                    {day.hasTrialLessons && (
                      <span className={cn('w-1 h-1 rounded-full', day.isSelected ? 'bg-purple-200' : 'bg-purple-600')} />
                    )}
                  </div>
                </button>
              ))}
            </div>

            <button type="button" onClick={handleNextWeek} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* AGENDA DAY LIST IN NORMAL DOCUMENT FLOW */}
      <div className="p-4 space-y-3 pb-28">
        <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
          <span>{formattedSelectedDayTitle}</span>
          <span>{dayLessons.length} {dayLessons.length === 1 ? 'занятие' : 'занятий'}</span>
        </div>

        {dayLessons.length === 0 ? (
          <div className="p-8 rounded-2xl border border-dashed border-slate-200 bg-white text-center space-y-3">
            <p className="text-xs text-slate-400">На выбранный день занятий не запланировано</p>
            <button
              type="button"
              onClick={() => onOpenSchedule(selectedDate)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 font-bold text-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Запланировать занятие</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {dayLessons.map((lesson) => {
              const trialStudents = (lesson.students || []).filter((s) => (s as any).isTrial || s.name?.includes('Пробн') || (lesson.isTrial && s.name));

              return (
                <div
                  key={lesson.id}
                  onClick={() => setSelectedLesson(lesson)}
                  className={cn(
                    'rounded-2xl border p-4 bg-white shadow-2xs transition-all active:scale-[0.99] cursor-pointer space-y-2.5',
                    lesson.status === 'completed'
                      ? 'border-emerald-200 bg-emerald-50/20'
                      : lesson.status === 'rescheduled'
                      ? 'border-amber-200 bg-amber-50/20'
                      : 'border-slate-200 hover:border-blue-300'
                  )}
                >
                  {/* Top Row: Timing + Room + Zoom */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
                        {lesson.startTime} – {lesson.endTime}
                      </span>
                      <span className="text-slate-500 font-medium text-[11px]">{lesson.room}</span>
                    </div>

                    {lesson.onlineMeetingUrl && (
                      <a
                        href={lesson.onlineMeetingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-bold text-[11px] shadow-2xs"
                      >
                        <Video className="w-3 h-3" />
                        <span>Zoom</span>
                      </a>
                    )}
                  </div>

                  {/* Group Name & Teacher */}
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 leading-snug">
                      {lesson.groupName}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Преподаватель: <span className="font-semibold text-slate-700">{lesson.teacherName}</span>
                    </p>
                  </div>

                  {/* Personalized Trial Badges */}
                  {trialStudents.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {trialStudents.map((st, idx) => (
                        <div key={st.id || idx} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-100 border border-purple-200 text-purple-900 font-bold text-[11px]">
                          <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                          <span>🎯 Пробный: <strong className="font-extrabold">{st.name}</strong></span>
                        </div>
                      ))}
                    </div>
                  ) : lesson.isTrial ? (
                    <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-100 border border-purple-200 text-purple-900 font-bold text-[11px]">
                      <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                      <span>🎯 Пробный урок</span>
                    </div>
                  ) : null}

                  {/* Card Footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-semibold text-slate-700">{lesson.students?.length || 0} уч.</span>
                    </div>

                    <span className="text-blue-600 font-bold text-[11px] hover:underline">
                      Отметить журнал →
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lesson Bottom Sheet Drawer */}
      <LessonBottomSheet
        isOpen={!!selectedLesson}
        lesson={selectedLesson}
        onClose={() => setSelectedLesson(null)}
        onSaved={(updatedLesson) => {
          if (onLessonUpdated) onLessonUpdated(updatedLesson);
        }}
      />
    </div>
  );
}
