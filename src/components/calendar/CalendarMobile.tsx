'use client';

import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Filter,
  Video,
  Calendar as CalendarIcon,
  Users,
  CheckCircle2,
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
  const [selectedLesson, setSelectedLesson] = useState<FullLessonData | null>(null);

  const todayStr = getTodayStr();

  // Calculate 7 days of the active week strip
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
    const hasTrialLessons = dayLessons.some(l => l.isTrial || l.students?.some(s => (s as any).isTrial));

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

  // Month label for Header
  const activeDateObj = new Date(selectedDate);
  const monthYearLabel = activeDateObj.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  const capitalizedMonthYear = monthYearLabel.charAt(0).toUpperCase() + monthYearLabel.slice(1);

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
    <div className="flex flex-col bg-slate-50 min-h-screen pb-20">
      
      {/* 1. Compact Header (48px / h-14) */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-slate-100 bg-white sticky top-0 z-20 shadow-2xs">
        {/* Left: Month Year Label */}
        <div className="flex items-center gap-1">
          <span className="text-sm font-bold text-slate-900">{capitalizedMonthYear}</span>
        </div>

        {/* Center: Today Badge Button */}
        <button
          type="button"
          onClick={handleGoToToday}
          className={cn(
            'px-2.5 py-1 text-xs font-semibold rounded-full border transition-all',
            selectedDate === todayStr
              ? 'bg-blue-50 text-blue-700 border-blue-200'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          )}
        >
          Сегодня
        </button>

        {/* Right: Filter & Create Action */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowTeacherFilter(!showTeacherFilter)}
            className={cn(
              'p-2 rounded-xl border transition-colors relative',
              selectedTeacher !== 'all'
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
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
            className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md active:bg-blue-700 transition-colors"
            title="Запланировать занятие"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Horizontal Week DateStrip */}
      <div className="bg-white border-b border-slate-100 px-2 py-3 shadow-2xs">
        <div className="flex items-center justify-between gap-1">
          <button
            type="button"
            onClick={handlePrevWeek}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="grid grid-cols-7 gap-1.5 flex-1 text-center">
            {daysOfWeek.map((day) => (
              <button
                key={day.fullDate}
                type="button"
                onClick={() => setSelectedDate(day.fullDate)}
                className={cn(
                  'flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all cursor-pointer relative',
                  day.isSelected
                    ? 'bg-blue-600 text-white font-bold shadow-md'
                    : day.isToday
                    ? 'border border-blue-400 bg-blue-50 text-blue-800 font-bold'
                    : 'text-slate-700 hover:bg-slate-50'
                )}
              >
                <span className={cn('text-[10px] font-bold uppercase', day.isSelected ? 'text-blue-100' : 'text-slate-400')}>
                  {day.name}
                </span>
                <span className="text-base font-extrabold leading-tight mt-0.5">
                  {day.dateNum}
                </span>

                {/* Indicator dots */}
                <div className="flex items-center gap-0.5 mt-1 h-1.5">
                  {day.hasRegularLessons && (
                    <span className={cn('w-1.5 h-1.5 rounded-full', day.isSelected ? 'bg-white' : 'bg-blue-600')} />
                  )}
                  {day.hasTrialLessons && (
                    <span className={cn('w-1.5 h-1.5 rounded-full', day.isSelected ? 'bg-purple-200' : 'bg-purple-600')} />
                  )}
                </div>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleNextWeek}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 3. Expandable Chips Bar (Teacher Filter) */}
      {showTeacherFilter && (
        <div className="bg-slate-100/80 px-4 py-2 flex items-center gap-2 overflow-x-auto border-b border-slate-200">
          <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Учитель:</span>
          {teachersList.map((tItem) => (
            <button
              key={tItem.id}
              type="button"
              onClick={() => setSelectedTeacher(tItem.id)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors',
                selectedTeacher === tItem.id
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
              )}
            >
              {tItem.name}
            </button>
          ))}
        </div>
      )}

      {/* 4. Agenda Day List */}
      <div className="p-4 space-y-3 flex-1">
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
              const trialStudents = lesson.students?.filter((s) => (s as any).isTrial || s.name?.includes('Пробное')) || [];
              const trialCount = trialStudents.length || lesson.trialStudentsCount || (lesson.isTrial ? 1 : 0);

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

                  {/* Trial Badge if any */}
                  {trialCount > 0 && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-100 border border-purple-200 text-purple-900 font-bold text-[11px]">
                      <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                      <span>Пробное занятие: {trialCount} чел.</span>
                    </div>
                  )}

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
