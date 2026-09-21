'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Filter,
  Users,
  Video,
  Clock,
  MapPin,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { INITIAL_LESSONS, FullLessonData } from '@/lib/data/mockData';
import { getStoredLessons } from '@/lib/data/lessonStorage';
import { useLanguage } from '@/context/LanguageContext';
import { ScheduleLessonModal } from '@/components/calendar/ScheduleLessonModal';
import { ScheduleCourseModal } from '@/components/calendar/ScheduleCourseModal';
import { LessonQuickViewModal } from '@/components/calendar/LessonQuickViewModal';
import { DesktopLessonModal } from '@/components/calendar/DesktopLessonModal';
import { CalendarMobile } from '@/components/calendar/CalendarMobile';
import { createClient } from '@/lib/supabase/client';

export default function CalendarPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState<'week' | 'day' | 'month'>('week');
  const [selectedTeacher, setSelectedTeacher] = useState<string>('all');

  const getMonday = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
  };

  const getTodayDateStr = () => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  };

  const getTodayDayIndex = () => {
    const day = new Date().getDay();
    return day === 0 ? 6 : day - 1;
  };

  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => getMonday(new Date()));
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(() => getTodayDayIndex());
  const [selectedMonthDate, setSelectedMonthDate] = useState<string>(() => getTodayDateStr());
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [selectedDateForSchedule, setSelectedDateForSchedule] = useState<string>(() => getTodayDateStr());
  
  const [lessons, setLessons] = useState<FullLessonData[]>(() => {
    return typeof window !== 'undefined' ? getStoredLessons() : INITIAL_LESSONS;
  });
  const [selectedLessonForQuickView, setSelectedLessonForQuickView] = useState<FullLessonData | null>(null);
  const [selectedLessonForDesktop, setSelectedLessonForDesktop] = useState<FullLessonData | null>(null);

  // Sync stored lessons and subscribe to Supabase Realtime
  useEffect(() => {
    const handleSync = () => {
      setLessons(getStoredLessons());
    };
    handleSync();
    window.addEventListener('crm-lessons-changed', handleSync);

    try {
      const supabase = createClient();
      const channel = supabase
        .channel('calendar-realtime-channel')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'lessons' },
          (payload) => {
            if (payload.eventType === 'UPDATE') {
              setLessons((prev) =>
                prev.map((l) => (l.id === payload.new.id ? { ...l, ...payload.new } : l))
              );
            } else if (payload.eventType === 'INSERT') {
              setLessons((prev) => {
                // Guard: don't add if already in local state (prevents double-add with modal callback)
                if (prev.some((l) => l.id === (payload.new as any).id)) return prev;
                return [payload.new as any, ...prev];
              });
            } else if (payload.eventType === 'DELETE') {
              setLessons((prev) => prev.filter((l) => l.id === payload.old.id));
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'lesson_attendance' },
          () => {
            setLessons(getStoredLessons());
          }
        )
        .subscribe();

      return () => {
        window.removeEventListener('crm-lessons-changed', handleSync);
        supabase.removeChannel(channel);
      };
    } catch {
      return () => {
        window.removeEventListener('crm-lessons-changed', handleSync);
      };
    }
  }, []);

  const handleUpdateAttendance = (
    lessonId: string,
    studentId: string,
    status: 'present' | 'absent' | 'excused' | 'rescheduled' | 'cancelled' | 'not_marked'
  ) => {
    setLessons((prev) =>
      prev.map((l) => {
        if (l.id === lessonId) {
          const updatedStudents = (l.students || []).map((s) => {
            if (s.id === studentId) {
              return { ...s, attendance: status };
            }
            return s;
          });
          return { ...l, students: updatedStudents };
        }
        return l;
      })
    );
  };

  const handleGoToToday = () => {
    const today = new Date();
    setCurrentWeekStart(getMonday(today));
    setSelectedDayIndex(getTodayDayIndex());
    setSelectedMonthDate(getTodayDateStr());
  };

  const handleLessonClick = (lesson: FullLessonData) => {
    router.push(`/calendar/lessons/${lesson.id}`);
  };

  const todayStr = getTodayDateStr();

  const daysOfWeek = [0, 1, 2, 3, 4, 5, 6].map((offset) => {
    const d = new Date(currentWeekStart);
    d.setDate(currentWeekStart.getDate() + offset);
    const pad = (n: number) => String(n).padStart(2, '0');
    const date = `${pad(d.getDate())}.${pad(d.getMonth() + 1)}`;
    const fullDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    const dayKeys = ['days.mon', 'days.tue', 'days.wed', 'days.thu', 'days.fri', 'days.sat', 'days.sun'];
    return {
      name: t(dayKeys[offset], dayNames[offset]),
      date,
      fullDate,
      dayIndex: offset,
      isToday: fullDate === todayStr,
    };
  });

  const weekEnd = new Date(currentWeekStart);
  weekEnd.setDate(currentWeekStart.getDate() + 6);

  const formatDateRange = (start: Date, end: Date) => {
    const monthsRu = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
    const sDay = start.getDate();
    const eDay = end.getDate();
    const sM = monthsRu[start.getMonth()];
    const eM = monthsRu[end.getMonth()];
    const yr = end.getFullYear();
    if (start.getMonth() === end.getMonth()) {
      return `${sDay} – ${eDay} ${sM} ${yr}`;
    }
    return `${sDay} ${sM} – ${eDay} ${eM} ${yr}`;
  };

  const dateRangeLabel = formatDateRange(currentWeekStart, weekEnd);

  const monthLabel = currentWeekStart.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  const capitalizedMonthLabel = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);
  const activeNavigationLabel = viewMode === 'month'
    ? capitalizedMonthLabel
    : viewMode === 'day'
    ? `${daysOfWeek[selectedDayIndex]?.name}, ${daysOfWeek[selectedDayIndex]?.date}`
    : dateRangeLabel;

  const handlePrev = () => {
    if (viewMode === 'month') {
      setCurrentWeekStart((prev) => {
        const d = new Date(prev);
        d.setMonth(d.getMonth() - 1);
        return getMonday(d);
      });
    } else if (viewMode === 'day') {
      setSelectedDayIndex((prev) => (prev > 0 ? prev - 1 : 6));
    } else {
      setCurrentWeekStart((prev) => {
        const d = new Date(prev);
        d.setDate(d.getDate() - 7);
        return d;
      });
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      setCurrentWeekStart((prev) => {
        const d = new Date(prev);
        d.setMonth(d.getMonth() + 1);
        return getMonday(d);
      });
    } else if (viewMode === 'day') {
      setSelectedDayIndex((prev) => (prev < 6 ? prev + 1 : 0));
    } else {
      setCurrentWeekStart((prev) => {
        const d = new Date(prev);
        d.setDate(d.getDate() + 7);
        return d;
      });
    }
  };

  const handleOpenScheduleForDate = (dateStr: string) => {
    setSelectedDateForSchedule(dateStr);
    setIsScheduleModalOpen(true);
  };

  const handleLessonScheduled = (newLesson: FullLessonData) => {
    setLessons((prev) => {
      // Guard: don't add if already in local state (could arrive from Supabase realtime first)
      if (prev.some((l) => l.id === newLesson.id)) return prev;
      return [...prev, newLesson];
    });
  };

  // Render-level dedup: guard against any remaining duplicates by ID
  const sanitizedLessons = useMemo(
    () => Array.from(new Map(lessons.map((l) => [l.id, l])).values()),
    [lessons]
  );

  const filteredLessons = sanitizedLessons.filter((l) => {
    if (selectedTeacher === 'all') return true;
    return l.teacherId === selectedTeacher;
  });

  // Dynamic month grid calculations
  const viewYear = currentWeekStart.getFullYear();
  const viewMonth = currentWeekStart.getMonth();
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
  const lastDayOfMonth = new Date(viewYear, viewMonth + 1, 0);
  const daysInMonthCount = lastDayOfMonth.getDate();
  const startDayOfWeek = firstDayOfMonth.getDay() === 0 ? 6 : firstDayOfMonth.getDay() - 1;

  return (
    <>
      {/* MOBILE AGENDA CALENDAR (< 768px / md:hidden) */}
      <div className="block md:hidden -m-6">
        <CalendarMobile
          lessons={lessons}
          onOpenSchedule={(dateStr) => handleOpenScheduleForDate(dateStr || getTodayDateStr())}
          onOpenCourseSchedule={() => setIsCourseModalOpen(true)}
          onLessonUpdated={(updatedLesson) => {
            setLessons((prev) => prev.map((l) => (l.id === updatedLesson.id ? updatedLesson : l)));
          }}
        />
      </div>

      {/* DESKTOP CALENDAR (>= 768px / hidden md:block) */}
      <div className="hidden md:block space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t('calendar.title', 'Календарь школы')}</h1>
            <p className="text-sm text-slate-500">
              {t('calendar.subtitle', 'Расписание занятий всех групп и преподавателей')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCourseModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
            >
              <CalendarIcon className="h-4 w-4" />
              Запланировать курс
            </button>
            <button
              onClick={() => setIsScheduleModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              {t('action.scheduleLesson', 'Запланировать занятие')}
            </button>
          </div>
        </div>

        {/* Navigation & Controls Bar */}
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrev}
                title="Назад"
                className="rounded-lg border border-slate-200 p-1.5 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-semibold text-slate-800 px-2 min-w-[210px] text-center">
                {activeNavigationLabel}
              </span>
              <button
                onClick={handleNext}
                title="Вперед"
                className="rounded-lg border border-slate-200 p-1.5 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={handleGoToToday}
                className="ml-2 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                {t('calendar.today', 'Сегодня')}
              </button>
            </div>

            <div className="flex items-center gap-3">
              {/* View Mode Toggle (Day / Week / Month) */}
              <div className="flex rounded-lg bg-slate-100 p-1 text-xs font-medium">
                <button
                  onClick={() => setViewMode('day')}
                  className={cn('rounded px-2.5 py-1 transition-all cursor-pointer', viewMode === 'day' ? 'bg-white shadow-xs font-semibold' : 'text-slate-600')}
                >
                  {t('calendar.viewDay', 'День')}
                </button>
                <button
                  onClick={() => setViewMode('week')}
                  className={cn('rounded px-2.5 py-1 transition-all cursor-pointer', viewMode === 'week' ? 'bg-white shadow-xs font-semibold' : 'text-slate-600')}
                >
                  {t('calendar.viewWeek', 'Неделя')}
                </button>
                <button
                  onClick={() => setViewMode('month')}
                  className={cn('rounded px-2.5 py-1 transition-all cursor-pointer', viewMode === 'month' ? 'bg-white shadow-xs font-semibold' : 'text-slate-600')}
                >
                  {t('calendar.viewMonth', 'Месяц')}
                </button>
              </div>
            </div>
          </div>

          {/* Quick Teacher Avatar Filters */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 overflow-x-auto">
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Преподаватели:</span>
            <button
              type="button"
              onClick={() => setSelectedTeacher('all')}
              className={cn(
                'px-2.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap',
                selectedTeacher === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              Все учителя
            </button>
            {[
              { id: 't1', name: 'Мария Иванова', role: 'English', initials: 'МИ', bg: 'bg-rose-500' },
              { id: 't2', name: 'Денис Смирнов', role: 'Robotics', initials: 'ДС', bg: 'bg-amber-500' },
              { id: 't3', name: 'Ольга Соколова', role: 'Math', initials: 'ОС', bg: 'bg-emerald-500' },
              { id: 't4', name: 'Анна Кузнецова', role: 'German', initials: 'АК', bg: 'bg-indigo-500' },
            ].map((teacher) => {
              const isSelected = selectedTeacher === teacher.id;
              return (
                <button
                  key={teacher.id}
                  type="button"
                  onClick={() => setSelectedTeacher(isSelected ? 'all' : teacher.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer whitespace-nowrap',
                    isSelected
                      ? 'border-blue-600 bg-blue-50 text-blue-900 font-semibold ring-2 ring-blue-200'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  )}
                >
                  <span className={cn('flex h-4.5 w-4.5 items-center justify-center rounded-full text-[9px] font-bold text-white', teacher.bg)}>
                    {teacher.initials}
                  </span>
                  <span>{teacher.name}</span>
                  <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">({teacher.role})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* VIEW 1: WEEK CALENDAR (MAIN VIEW) */}
        {viewMode === 'week' && (
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            {daysOfWeek.map((day) => {
              const dayLessons = filteredLessons.filter((l) => l.date === day.fullDate || (!l.date && l.dayOfWeek === day.dayIndex));

              return (
                <div
                  key={day.dayIndex}
                  className={cn(
                    'min-h-[420px] rounded-2xl border bg-white p-3 shadow-xs flex flex-col transition-all',
                    day.isToday ? 'border-blue-400 ring-2 ring-blue-100 bg-blue-50/10' : 'border-slate-200 hover:border-slate-300'
                  )}
                >
                  {/* Day Header */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                    <div
                      onClick={() => handleOpenScheduleForDate(day.fullDate)}
                      className="cursor-pointer group flex items-center gap-1.5"
                      title={t('calendar.createLessonDayHint', 'Нажмите, чтобы создать занятие на этот день')}
                    >
                      <span className={cn('text-xs font-bold uppercase group-hover:text-blue-600 transition-colors', day.isToday ? 'text-blue-600' : 'text-slate-500')}>
                        {day.name}
                      </span>
                      <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full transition-transform group-hover:scale-105', day.isToday ? 'bg-blue-600 text-white font-bold' : 'text-slate-600 bg-slate-100')}>
                        {day.date}
                      </span>
                    </div>
                    <button
                      onClick={() => handleOpenScheduleForDate(day.fullDate)}
                      title={t('calendar.createLessonTitle', 'Создать занятие')}
                      className="flex h-6 w-6 items-center justify-center rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Lessons in Day */}
                  <div className="space-y-2 flex-1 flex flex-col">
                    {dayLessons.length === 0 ? (
                      <div
                        onClick={() => handleOpenScheduleForDate(day.fullDate)}
                        className="flex flex-1 flex-col items-center justify-center text-center p-3 rounded-xl border border-dashed border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 cursor-pointer group transition-all"
                      >
                        <Plus className="h-4 w-4 text-slate-300 group-hover:text-blue-500 transition-colors mb-1" />
                        <span className="text-[11px] text-slate-400 group-hover:text-blue-600 font-medium">
                          + {t('calendar.addLesson', 'Добавить занятие')}
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-2 flex-1">
                          {dayLessons.map((lesson) => (
                            <div
                              key={lesson.id}
                              onClick={() => handleLessonClick(lesson)}
                              className={cn(
                                'rounded-xl border p-2.5 text-xs transition-all hover:shadow-md cursor-pointer text-left',
                                lesson.status === 'completed'
                                  ? 'border-emerald-200 bg-emerald-50/60'
                                  : lesson.status === 'rescheduled'
                                  ? 'border-amber-300 bg-amber-50/70 hover:border-amber-400'
                                  : lesson.status === 'cancelled'
                                  ? 'border-rose-200 bg-rose-50/50 opacity-70'
                                  : 'border-blue-200 bg-blue-50/40 hover:border-blue-300'
                              )}
                            >
                              <div className="flex items-center justify-between font-bold text-slate-800 text-[11px]">
                                <span>{lesson.startTime} – {lesson.endTime}</span>
                                <div className="flex items-center gap-1">
                                  {lesson.status === 'completed' && (
                                    <span className="rounded bg-emerald-100 text-emerald-800 border border-emerald-300 px-1 py-0.2 text-[9px] font-bold">
                                      ✓ {t('status.completed', 'Проведено')}
                                    </span>
                                  )}
                                  {lesson.status === 'rescheduled' && (
                                    <span className="rounded bg-amber-200/70 text-amber-900 px-1 py-0.2 text-[9px] font-bold">
                                      {t('status.rescheduled', 'Перенос')}
                                    </span>
                                  )}
                                  {lesson.onlineMeetingUrl && (
                                    <a
                                      href={lesson.onlineMeetingUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      title="Открыть Zoom / конференцию"
                                      className="flex items-center gap-1 text-[10px] text-indigo-700 hover:text-indigo-900 font-bold bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-1.5 py-0.5 rounded transition-colors"
                                    >
                                      <Video className="h-2.5 w-2.5 text-indigo-600" />
                                      <span>Zoom</span>
                                    </a>
                                  )}
                                </div>
                              </div>
                              <p className="mt-1 font-bold text-slate-900 leading-snug">{lesson.groupName.split('(')[0]}</p>
                              <p className="mt-0.5 text-[11px] text-slate-500">{lesson.teacherName}</p>

                              {(() => {
                                const trialCount = lesson.students?.filter((s) => (s as any).isTrial || s.name?.includes('Пробное')).length || lesson.trialStudentsCount || (lesson.isTrial ? lesson.students?.length : 0) || 0;
                                if (trialCount > 0) {
                                  return (
                                    <div className="mt-1.5 flex items-center gap-1">
                                      <span className="rounded-md bg-purple-100 text-purple-900 font-bold px-1.5 py-0.5 text-[10px] border border-purple-200 flex items-center gap-1">
                                        <span>🎯 {t('calendar.trialLessonCount', 'Пробное занятие')} — {trialCount}</span>
                                      </span>
                                    </div>
                                  );
                                }
                                return null;
                              })()}

                              <div className="mt-2 flex items-center justify-between border-t border-slate-200/50 pt-1.5 text-[10px] text-slate-500">
                                <span>{lesson.room}</span>
                                <span className="font-semibold text-slate-700">
                                  {lesson.students.length} {t('calendar.studentsShort', 'уч.')}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={() => handleOpenScheduleForDate(day.fullDate)}
                          className="w-full mt-2 py-1.5 rounded-lg border border-dashed border-slate-200 text-[11px] font-medium text-slate-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/30 transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Plus className="h-3 w-3" /> {t('calendar.moreLessons', 'Ещё занятие')}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* VIEW 2: DAY VIEW */}
        {viewMode === 'day' && (() => {
          const selectedDay = daysOfWeek[selectedDayIndex] || daysOfWeek[0];
          const dayLessons = filteredLessons.filter((l) => l.date === selectedDay.fullDate || (!l.date && l.dayOfWeek === selectedDay.dayIndex));

          return (
            <div className="space-y-4 max-w-3xl mx-auto">
              {/* Day picker pills */}
              <div className="flex gap-2 justify-center pb-2 flex-wrap">
                {daysOfWeek.map((day) => (
                  <button
                    key={day.dayIndex}
                    onClick={() => setSelectedDayIndex(day.dayIndex)}
                    className={cn(
                      'rounded-xl px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer',
                      selectedDayIndex === day.dayIndex
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    )}
                  >
                    <div>{day.name}</div>
                    <div className="text-[10px] opacity-80">{day.date}</div>
                  </button>
                ))}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h2 className="text-sm font-bold text-slate-900">
                    {t('calendar.lessonsOn', 'Занятия на')} {selectedDay.date}:
                  </h2>
                  <button
                    onClick={() => handleOpenScheduleForDate(selectedDay.fullDate)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {t('calendar.scheduleFor', 'Запланировать на')} {selectedDay.name}
                  </button>
                </div>

                {dayLessons.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-xs text-slate-400 mb-3">{t('calendar.noLessonsDay', 'На этот день занятий не запланировано')}</p>
                    <button
                      onClick={() => handleOpenScheduleForDate(selectedDay.fullDate)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-blue-300 bg-blue-50/50 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-100/60 transition-colors cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {t('calendar.addLesson', 'Добавить занятие')}
                    </button>
                  </div>
                ) : (
                  dayLessons.map((lesson) => (
                    <div
                      key={lesson.id}
                      onClick={() => handleLessonClick(lesson)}
                      className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 hover:bg-slate-100/70 transition-all cursor-pointer flex items-center justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-16 flex-col items-center justify-center rounded-xl bg-blue-100 text-blue-800 font-bold text-xs">
                          <span>{lesson.startTime}</span>
                          <span className="text-[10px] font-normal text-blue-600">{lesson.endTime}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-900 text-sm">{lesson.groupName}</h3>
                            {lesson.onlineMeetingUrl && (
                              <a
                                href={lesson.onlineMeetingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                title="Открыть Zoom / конференцию"
                                className="flex items-center gap-1 text-[10px] text-indigo-700 hover:text-indigo-900 font-bold bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-1.5 py-0.5 rounded transition-colors"
                              >
                                <Video className="h-2.5 w-2.5 text-indigo-600" />
                                <span>Zoom</span>
                              </a>
                            )}
                            {(() => {
                              const trialCount = lesson.students?.filter((s) => (s as any).isTrial || s.name?.includes('Пробное')).length || lesson.trialStudentsCount || (lesson.isTrial ? lesson.students?.length : 0) || 0;
                              if (trialCount > 0) {
                                return (
                                  <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-900 border border-purple-200">
                                    🎯 {t('calendar.trialLessonCount', 'Пробное занятие')} — {trialCount}
                                  </span>
                                );
                              }
                              return null;
                            })()}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{lesson.teacherName} • {lesson.room}</p>
                          <p className="text-xs text-blue-600 font-medium mt-0.5">{t('hero.topic', 'Тема')}: {lesson.topic}</p>
                        </div>
                      </div>
                      <div className="text-right text-xs">
                        <span className={cn(
                          'rounded-full px-2.5 py-1 text-[10px] font-semibold',
                          lesson.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : lesson.status === 'rescheduled'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : lesson.status === 'cancelled'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-blue-100 text-blue-800'
                        )}>
                          {lesson.status === 'completed'
                            ? t('status.completed', 'Завершён')
                            : lesson.status === 'rescheduled'
                            ? t('status.rescheduled', 'Перенесён')
                            : lesson.status === 'cancelled'
                            ? t('status.cancelled', 'Отменён')
                            : t('status.scheduled', 'Запланирован')}
                        </span>
                        <p className="text-slate-400 text-[11px] mt-1">{lesson.students.length} {t('calendar.studentsCount', 'учеников')}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })()}

        {/* VIEW 3: MONTH VIEW (HIGH LEVEL OVERVIEW) */}
        {viewMode === 'month' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900">{t('calendar.monthGridTitle', 'Сетка месяца')} ({capitalizedMonthLabel})</h3>
                <span className="text-xs text-slate-500">{t('calendar.monthGridHint', 'Нажмите на любую дату, чтобы запланировать занятие')}</span>
              </div>
              <div className="grid grid-cols-7 gap-2 text-center text-xs">
                {[t('days.mon', 'Пн'), t('days.tue', 'Вт'), t('days.wed', 'Ср'), t('days.thu', 'Чт'), t('days.fri', 'Пт'), t('days.sat', 'Сб'), t('days.sun', 'Вс')].map((d, di) => (
                  <div key={di} className="font-bold text-slate-400 uppercase py-1">{d}</div>
                ))}
                
                {/* Preceding empty slots for Month Grid */}
                {Array.from({ length: startDayOfWeek }).map((_, idx) => (
                  <div key={`empty_${idx}`} className="h-20 rounded-xl border border-slate-50 bg-slate-50/20 p-1.5 opacity-40" />
                ))}

                {Array.from({ length: daysInMonthCount }).map((_, i) => {
                  const dayNum = i + 1;
                  const pad = (n: number) => String(n).padStart(2, '0');
                  const dateStr = `${viewYear}-${pad(viewMonth + 1)}-${pad(dayNum)}`;
                  const isToday = dateStr === todayStr;
                  const d = new Date(viewYear, viewMonth, dayNum);
                  const dayOfWeek = d.getDay() === 0 ? 6 : d.getDay() - 1;
                  const dayLessons = filteredLessons.filter((l) => l.date === dateStr || (!l.date && l.dayOfWeek === dayOfWeek));
                  const hasLessons = dayLessons.length > 0;

                  return (
                    <div
                      key={dateStr}
                      onClick={() => handleOpenScheduleForDate(dateStr)}
                      title={`${t('calendar.scheduleFor', 'Запланировать на')} ${dayNum}`}
                      className={cn(
                        'group h-20 rounded-xl border p-1.5 flex flex-col justify-between text-left transition-all cursor-pointer',
                        isToday
                          ? 'border-blue-500 bg-blue-50/30 hover:border-blue-600 hover:shadow-xs'
                          : 'border-slate-100 hover:border-blue-300 hover:bg-blue-50/20 hover:shadow-xs'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className={cn('text-[11px] font-bold', isToday ? 'text-blue-600' : 'text-slate-700')}>
                          {dayNum}
                        </span>
                        <Plus className="h-3 w-3 text-slate-300 opacity-0 group-hover:opacity-100 text-blue-600 transition-opacity" />
                      </div>
                      {hasLessons && (
                        <div className="space-y-0.5">
                          <span className="block rounded bg-blue-100 px-1 py-0.5 text-[9px] font-semibold text-blue-800 truncate">
                            {dayLessons.length === 1 ? '1 урок' : `${dayLessons.length} урока`}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Schedule Lesson Modal */}
      <ScheduleLessonModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        onScheduled={handleLessonScheduled}
        initialDate={selectedDateForSchedule}
      />

      {/* Schedule Course Modal */}
      <ScheduleCourseModal
        isOpen={isCourseModalOpen}
        onClose={() => setIsCourseModalOpen(false)}
        onCourseScheduled={(newLessons) => setLessons((prev) => [...prev, ...newLessons])}
      />

      {/* Quick Lesson View & Attendance Modal (Mobile Fallback) */}
      <LessonQuickViewModal
        isOpen={!!selectedLessonForQuickView}
        lesson={selectedLessonForQuickView}
        onClose={() => setSelectedLessonForQuickView(null)}
        onUpdateAttendance={handleUpdateAttendance}
      />

      {/* Interactive Desktop Lesson Modal (Desktop) */}
      <DesktopLessonModal
        isOpen={!!selectedLessonForDesktop}
        lesson={selectedLessonForDesktop}
        onClose={() => setSelectedLessonForDesktop(null)}
        onSave={(updatedLesson) => {
          setLessons((prev) => prev.map((l) => (l.id === updatedLesson.id ? updatedLesson : l)));
        }}
      />
    </>
  );
}
