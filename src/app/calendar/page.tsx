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
import { INITIAL_LESSONS, INITIAL_TEACHERS, FullLessonData } from '@/lib/data/mockData';
import { getStoredLessons, saveLessonToStorage } from '@/lib/data/lessonStorage';
import { useLanguage } from '@/context/LanguageContext';
import { ScheduleLessonModal } from '@/components/calendar/ScheduleLessonModal';
import { CreateGroupModal } from '@/components/groups/CreateGroupModal';
import { saveGroupToStorage } from '@/lib/data/groupStorage';
import { LessonQuickViewModal } from '@/components/calendar/LessonQuickViewModal';
import { DesktopLessonModal } from '@/components/calendar/DesktopLessonModal';
import { LessonPreviewDrawer } from '@/components/calendar/LessonPreviewDrawer';
import { EditLessonModal } from '@/components/calendar/EditLessonModal';
import { CalendarMobile } from '@/components/calendar/CalendarMobile';
import { createClient } from '@/lib/supabase/client';

const CALENDAR_START_HOUR = 9;
const CALENDAR_HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
const HOUR_HEIGHT = 64;

const SHORT_DAY_NAMES = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];

function getLessonsCountWord(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 19) return `${count} занятий`;
  if (mod10 === 1) return `${count} занятие`;
  if (mod10 >= 2 && mod10 <= 4) return `${count} занятия`;
  return `${count} занятий`;
}

function parseTimeToMinutes(timeStr?: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(':').map(Number);
  return (parts[0] || 0) * 60 + (parts[1] || 0);
}

interface PositionedLessonItem {
  lesson: FullLessonData;
  startMin: number;
  endMin: number;
  top: number;
  height: number;
  trackIdx: number;
  left: string;
  width: string;
}

function layoutDayLessons(dayLessons: FullLessonData[]): PositionedLessonItem[] {
  if (dayLessons.length === 0) return [];

  const minGridMin = CALENDAR_START_HOUR * 60;
  const maxGridMin = (CALENDAR_START_HOUR + CALENDAR_HOURS.length) * 60;

  const items = dayLessons.map((lesson) => {
    const startMin = parseTimeToMinutes(lesson.startTime);
    let endMin = lesson.endTime ? parseTimeToMinutes(lesson.endTime) : startMin + 60;
    if (endMin <= startMin) endMin = startMin + 60;

    const clampedStart = Math.max(minGridMin, Math.min(startMin, maxGridMin - 30));
    const clampedEnd = Math.max(clampedStart + 30, Math.min(endMin, maxGridMin));

    const top = Math.round(((clampedStart - minGridMin) / 60) * HOUR_HEIGHT);
    const height = Math.max(42, Math.round(((clampedEnd - clampedStart) / 60) * HOUR_HEIGHT) - 2);

    return {
      lesson,
      startMin,
      endMin,
      top,
      height,
    };
  });

  // Sort by startMin asc, duration desc
  items.sort((a, b) => a.startMin - b.startMin || (b.endMin - b.startMin) - (a.endMin - a.startMin));

  // Compute column tracks for overlaps
  const tracks: { endMin: number }[] = [];
  const positioned = items.map((item) => {
    let trackIdx = tracks.findIndex((t) => t.endMin <= item.startMin);
    if (trackIdx === -1) {
      tracks.push({ endMin: item.endMin });
      trackIdx = tracks.length - 1;
    } else {
      tracks[trackIdx].endMin = item.endMin;
    }
    return {
      ...item,
      trackIdx,
    };
  });

  return positioned.map((item) => {
    const overlapping = positioned.filter(
      (other) => item.startMin < other.endMin && other.startMin < item.endMin
    );
    const totalTracks = Math.max(...overlapping.map((o) => o.trackIdx)) + 1;
    const widthPct = 100 / totalTracks;
    const leftPct = item.trackIdx * widthPct;

    return {
      ...item,
      left: `calc(${leftPct}% + 2px)`,
      width: `calc(${widthPct}% - 4px)`,
    };
  });
}

export default function CalendarPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState<'week' | 'day' | 'month'>('week');
  const [selectedTeacher, setSelectedTeacher] = useState<string>('all');
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

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
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [selectedDateForSchedule, setSelectedDateForSchedule] = useState<string>(() => getTodayDateStr());
  
  const [lessons, setLessons] = useState<FullLessonData[]>(() => {
    return typeof window !== 'undefined' ? getStoredLessons() : INITIAL_LESSONS;
  });
  const [selectedLessonForQuickView, setSelectedLessonForQuickView] = useState<FullLessonData | null>(null);
  const [selectedLessonForDesktop, setSelectedLessonForDesktop] = useState<FullLessonData | null>(null);
  const [selectedLessonForDrawer, setSelectedLessonForDrawer] = useState<FullLessonData | null>(null);
  const [selectedLessonForEdit, setSelectedLessonForEdit] = useState<FullLessonData | null>(null);

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
    setSelectedLessonForDrawer(lesson);
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

  // Lessons currently visible in the active range (week/day/month) for dynamic teacher badge counts
  const currentRangeLessons = useMemo(() => {
    if (viewMode === 'day') {
      const selectedDay = daysOfWeek[selectedDayIndex] || daysOfWeek[0];
      return sanitizedLessons.filter(
        (l) => l.date === selectedDay.fullDate || (!l.date && l.dayOfWeek === selectedDay.dayIndex)
      );
    }
    if (viewMode === 'month') {
      return sanitizedLessons.filter((l) => {
        if (!l.date) return true;
        const d = new Date(l.date);
        return d.getFullYear() === viewYear && d.getMonth() === viewMonth;
      });
    }
    // Week mode
    const weekDates = new Set(daysOfWeek.map((d) => d.fullDate));
    return sanitizedLessons.filter(
      (l) => weekDates.has(l.date) || (!l.date && l.dayOfWeek >= 0 && l.dayOfWeek <= 6)
    );
  }, [sanitizedLessons, viewMode, daysOfWeek, selectedDayIndex, viewYear, viewMonth]);

  const teacherColorMap: Record<string, string> = {
    t1: 'bg-rose-500',
    t2: 'bg-amber-500',
    t3: 'bg-emerald-500',
    t4: 'bg-indigo-500',
  };

  const teachersList = useMemo(() => {
    return INITIAL_TEACHERS.map((teacher, idx) => {
      const initials = teacher.name
        .trim()
        .split(' ')
        .slice(0, 2)
        .map((n) => n[0])
        .join('')
        .toUpperCase() || 'ПР';

      const bg = teacherColorMap[teacher.id] || (idx % 4 === 0 ? 'bg-rose-500' : idx % 4 === 1 ? 'bg-amber-500' : idx % 4 === 2 ? 'bg-emerald-500' : 'bg-indigo-500');

      const count = currentRangeLessons.filter((l) => l.teacherId === teacher.id).length;

      return {
        id: teacher.id,
        name: teacher.name,
        initials,
        bg,
        count,
      };
    });
  }, [currentRangeLessons]);

  const nowHours = now.getHours();
  const nowMinutes = now.getMinutes();
  const nowTotalMinutes = nowHours * 60 + nowMinutes;
  const isNowInRange =
    nowTotalMinutes >= CALENDAR_START_HOUR * 60 &&
    nowTotalMinutes <= (CALENDAR_START_HOUR + CALENDAR_HOURS.length) * 60;
  const nowOffsetMinutes = nowTotalMinutes - CALENDAR_START_HOUR * 60;
  const currentTimeTop = (nowOffsetMinutes / 60) * HOUR_HEIGHT;
  const currentTimeStr = `${String(nowHours).padStart(2, '0')}:${String(nowMinutes).padStart(2, '0')}`;

  return (
    <>
      {/* MOBILE AGENDA CALENDAR (< 768px / md:hidden) */}
      <div className="block md:hidden -m-6">
        <CalendarMobile
          lessons={lessons}
          onOpenSchedule={(dateStr) => handleOpenScheduleForDate(dateStr || getTodayDateStr())}
          onOpenCourseSchedule={() => setIsCreateGroupModalOpen(true)}
          onLessonUpdated={(updatedLesson) => {
            setLessons((prev) => prev.map((l) => (l.id === updatedLesson.id ? updatedLesson : l)));
          }}
        />
      </div>

      {/* DESKTOP CALENDAR (>= 768px / hidden md:block) */}
      <div className="hidden md:block space-y-4">
        {/* 1. Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              {t('calendar.title', 'Календарь школы')}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">
              {t('calendar.subtitle', 'Расписание занятий всех групп и преподавателей')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCreateGroupModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-blue-600 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Создать группу
            </button>
            <button
              type="button"
              onClick={() => setIsScheduleModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-blue-700 transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              {t('action.scheduleLesson', 'Запланировать занятие')}
            </button>
          </div>
        </div>

        {/* 2. Navigation & Controls Bar (Toolbar) */}
        <div className="space-y-2.5 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Pagination Controls */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePrev}
                title="Назад"
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer shadow-2xs"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white shadow-2xs text-xs font-semibold text-slate-800 select-none min-w-[200px] justify-center">
                <CalendarIcon className="h-3.5 w-3.5 text-slate-500" />
                <span>{activeNavigationLabel}</span>
              </div>
              <button
                type="button"
                onClick={handleNext}
                title="Вперед"
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer shadow-2xs"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleGoToToday}
                className="ml-1 text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
              >
                {t('calendar.today', 'Сегодня')}
              </button>
            </div>

            {/* View Mode Pill Group */}
            <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('day')}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs transition-all cursor-pointer font-medium',
                  viewMode === 'day'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                {t('calendar.viewDay', 'День')}
              </button>
              <button
                type="button"
                onClick={() => setViewMode('week')}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs transition-all cursor-pointer font-medium',
                  viewMode === 'week'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                {t('calendar.viewWeek', 'Неделя')}
              </button>
              <button
                type="button"
                onClick={() => setViewMode('month')}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs transition-all cursor-pointer font-medium',
                  viewMode === 'month'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                {t('calendar.viewMonth', 'Месяц')}
              </button>
            </div>
          </div>

          {/* 3. Horizontal Teacher Filter Bar */}
          <div className="flex items-center gap-2 pt-2.5 border-t border-slate-100 overflow-x-auto no-scrollbar">
            <span className="text-xs font-semibold text-slate-500 mr-1 shrink-0 whitespace-nowrap">
              Преподаватели:
            </span>
            <button
              type="button"
              onClick={() => setSelectedTeacher('all')}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap shrink-0',
                selectedTeacher === 'all'
                  ? 'bg-blue-600 text-white shadow-xs font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              Все учителя
            </button>
            {teachersList.map((teacher) => {
              const isSelected = selectedTeacher === teacher.id;
              const labelText = teacher.count > 0 ? `${teacher.name} · ${teacher.count}` : teacher.name;

              return (
                <button
                  key={teacher.id}
                  type="button"
                  onClick={() => setSelectedTeacher(isSelected ? 'all' : teacher.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer whitespace-nowrap shrink-0',
                    isSelected
                      ? 'border-blue-600 bg-blue-50 text-blue-900 font-semibold ring-2 ring-blue-100 shadow-2xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  )}
                >
                  <span className={cn('flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white shrink-0 shadow-2xs', teacher.bg)}>
                    {teacher.initials}
                  </span>
                  <span>{labelText}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* VIEW 1: WEEK CALENDAR (MAIN VIEW) */}
        {viewMode === 'week' && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden flex flex-col">
            {/* 1. Header of Days (7 columns with left axis spacer) */}
            <div className="flex border-b border-slate-200 bg-slate-50/70 select-none">
              <div className="w-14 shrink-0 border-r border-slate-200 flex items-center justify-center">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
              </div>
              <div className="grid grid-cols-7 flex-1 divide-x divide-slate-200">
                {daysOfWeek.map((day) => {
                  const dayLessons = filteredLessons.filter(
                    (l) => l.date === day.fullDate || (!l.date && l.dayOfWeek === day.dayIndex)
                  );

                  return (
                    <div
                      key={day.dayIndex}
                      onClick={() => handleOpenScheduleForDate(day.fullDate)}
                      className={cn(
                        'py-2 px-1 text-center transition-colors cursor-pointer hover:bg-slate-100/60',
                        day.isToday && 'bg-blue-50/40'
                      )}
                      title={t('calendar.createLessonDayHint', 'Нажмите, чтобы создать занятие на этот день')}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span
                          className={cn(
                            'text-xs font-bold uppercase',
                            day.isToday ? 'text-blue-600' : 'text-slate-600'
                          )}
                        >
                          {SHORT_DAY_NAMES[day.dayIndex]}
                        </span>
                        <span
                          className={cn(
                            'text-xs font-semibold px-1.5 py-0.5 rounded-md transition-transform',
                            day.isToday
                              ? 'bg-blue-600 text-white font-bold shadow-2xs'
                              : 'text-slate-700 bg-slate-100'
                          )}
                        >
                          {day.date}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                        {getLessonsCountWord(dayLessons.length)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Scrollable Timetable Canvas (09:00 - 21:00) */}
            <div className="relative flex max-h-[720px] overflow-y-auto no-scrollbar">
              {/* Vertical Time Axis */}
              <div className="w-14 shrink-0 select-none border-r border-slate-200 bg-slate-50/30">
                {CALENDAR_HOURS.map((hour) => (
                  <div
                    key={hour}
                    style={{ height: `${HOUR_HEIGHT}px` }}
                    className="relative border-b border-slate-100 pr-2 pt-1 text-right"
                  >
                    <span className="text-[10px] font-medium text-slate-400">
                      {String(hour).padStart(2, '0')}:00
                    </span>
                  </div>
                ))}
              </div>

              {/* 7 Days Canvas Grid */}
              <div className="relative grid flex-1 grid-cols-7 divide-x divide-slate-200 bg-white min-w-0">
                {daysOfWeek.map((day) => {
                  const dayLessons = filteredLessons.filter(
                    (l) => l.date === day.fullDate || (!l.date && l.dayOfWeek === day.dayIndex)
                  );
                  const positionedLessons = layoutDayLessons(dayLessons);

                  return (
                    <div
                      key={day.dayIndex}
                      className={cn(
                        'relative flex flex-col justify-between min-w-0 transition-colors',
                        day.isToday && 'bg-blue-50/5'
                      )}
                      style={{ height: `${CALENDAR_HOURS.length * HOUR_HEIGHT + 44}px` }}
                    >
                      {/* Background Horizontal Guide Lines */}
                      <div
                        className="absolute inset-x-0 top-0 pointer-events-none"
                        style={{ height: `${CALENDAR_HOURS.length * HOUR_HEIGHT}px` }}
                      >
                        {CALENDAR_HOURS.map((hour) => (
                          <div
                            key={hour}
                            style={{ height: `${HOUR_HEIGHT}px` }}
                            className="border-b border-slate-100 w-full"
                          />
                        ))}
                      </div>

                      {/* 3. Current Time Indicator (Line & Dot & Badge) */}
                      {day.isToday && isNowInRange && (
                        <div
                          className="absolute inset-x-0 z-20 pointer-events-none flex items-center"
                          style={{ top: `${currentTimeTop}px` }}
                        >
                          <div className="relative w-full border-b-2 border-blue-500">
                            <div className="absolute -left-1 -top-[5px] h-2.5 w-2.5 rounded-full bg-blue-600 ring-2 ring-white shadow-2xs" />
                            <span className="absolute left-2 -top-5 rounded bg-blue-600 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-2xs">
                              {currentTimeStr}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* 4. Lesson Cards Container */}
                      <div
                        className="relative w-full"
                        style={{ height: `${CALENDAR_HOURS.length * HOUR_HEIGHT}px` }}
                      >
                        {positionedLessons.map((item) => {
                          const { lesson } = item;
                          const trialCount =
                            lesson.students?.filter(
                              (s) => (s as any).isTrial || s.name?.includes('Пробное')
                            ).length ||
                            lesson.trialStudentsCount ||
                            (lesson.isTrial ? lesson.students?.length : 0) ||
                            0;
                          const isTrial = lesson.isTrial || trialCount > 0;

                          let cardClasses =
                            'bg-blue-50/80 border-l-4 border-l-blue-500 border-blue-100 text-blue-900 hover:border-blue-300';
                          if (lesson.status === 'cancelled') {
                            cardClasses =
                              'bg-slate-50 border-l-4 border-l-slate-400 opacity-60 text-slate-600 border-slate-200';
                          } else if (lesson.status === 'completed') {
                            cardClasses =
                              'bg-emerald-50/80 border-l-4 border-l-emerald-500 border-emerald-100 text-emerald-900 hover:border-emerald-300';
                          } else if (lesson.status === 'rescheduled' || isTrial) {
                            cardClasses =
                              'bg-amber-50/80 border-l-4 border-l-amber-500 border-amber-100 text-amber-900 hover:border-amber-300';
                          }

                          return (
                            <div
                              key={lesson.id}
                              onClick={() => handleLessonClick(lesson)}
                              style={{
                                top: `${item.top}px`,
                                height: `${item.height}px`,
                                left: item.left,
                                width: item.width,
                              }}
                              className={cn(
                                'absolute p-2 rounded-lg border flex flex-col justify-between transition-all hover:shadow-md cursor-pointer select-none overflow-hidden z-10',
                                cardClasses
                              )}
                            >
                              {/* Top part: Time, Zoom badge, Group name, Teacher name */}
                              <div className="min-w-0">
                                <div className="flex items-center justify-between gap-1 leading-none">
                                  <span
                                    className={cn(
                                      'text-[11px] font-bold whitespace-nowrap tracking-tight',
                                      lesson.status === 'cancelled'
                                        ? 'text-slate-400'
                                        : 'text-slate-800'
                                    )}
                                  >
                                    {lesson.startTime} – {lesson.endTime}
                                  </span>
                                  {lesson.onlineMeetingUrl ||
                                  lesson.room?.toLowerCase().includes('онлайн') ? (
                                    <span
                                      title="Zoom / Онлайн"
                                      className="inline-flex items-center gap-0.5 text-[9px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1 py-0.2 rounded shrink-0"
                                    >
                                      <Video className="h-2.5 w-2.5 text-indigo-600" />
                                      <span>Zoom</span>
                                    </span>
                                  ) : null}
                                </div>

                                <p
                                  className={cn(
                                    'mt-1 text-xs font-bold truncate leading-tight',
                                    lesson.status === 'cancelled'
                                      ? 'text-slate-500 line-through decoration-rose-400'
                                      : 'text-slate-900'
                                  )}
                                >
                                  {lesson.groupName.split('(')[0].trim()}
                                </p>

                                <p
                                  className={cn(
                                    'mt-0.5 text-[11px] truncate leading-tight',
                                    lesson.status === 'cancelled'
                                      ? 'text-slate-400'
                                      : 'text-slate-500'
                                  )}
                                >
                                  {lesson.teacherName}
                                </p>
                              </div>

                              {/* Bottom row: Students count & Badges */}
                              <div className="flex items-center justify-between gap-1 mt-auto pt-1 text-[10px] border-t border-slate-900/5 leading-none">
                                <span className="font-medium text-slate-500 whitespace-nowrap flex items-center gap-0.5 text-[10px]">
                                  <Users className="h-3 w-3 text-slate-400" />
                                  <span>{lesson.students?.length || 0} уч.</span>
                                </span>

                                <div className="flex items-center gap-1 shrink-0">
                                  {trialCount > 0 && (
                                    <span className="rounded bg-purple-100 px-1 py-0.5 text-[9px] font-bold text-purple-900 border border-purple-200 whitespace-nowrap">
                                      🎯 Пробное · {trialCount}
                                    </span>
                                  )}
                                  {lesson.status === 'completed' && (
                                    <span className="text-[9px] font-bold text-emerald-700">✓</span>
                                  )}
                                  {lesson.status === 'rescheduled' && (
                                    <span className="text-[9px] font-bold text-amber-700">⇄</span>
                                  )}
                                  {lesson.status === 'cancelled' && (
                                    <span className="text-[9px] font-bold text-rose-600">✕</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* 5. Bottom "+ Ещё занятие" button */}
                      <div className="p-1.5 mt-auto relative z-10">
                        <button
                          type="button"
                          onClick={() => handleOpenScheduleForDate(day.fullDate)}
                          className="w-full border border-dashed border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/40 text-[11px] font-medium rounded-lg py-1 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Plus className="h-3 w-3" />
                          {t('calendar.moreLessons', 'Ещё занятие')}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
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
                      <div className="text-right text-xs shrink-0 flex flex-col items-end gap-1">
                        <span className={cn(
                          'rounded-full px-2.5 py-1 text-[10px] font-bold border',
                          lesson.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : lesson.status === 'rescheduled'
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : lesson.status === 'cancelled'
                            ? 'bg-rose-100 text-rose-800 border-rose-200'
                            : 'bg-blue-100 text-blue-800 border-blue-200'
                        )}>
                          {lesson.status === 'completed'
                            ? '✓ ' + t('status.completed', 'Проведено')
                            : lesson.status === 'rescheduled'
                            ? '🔄 ' + t('status.rescheduled', 'Перенесено')
                            : lesson.status === 'cancelled'
                            ? '✕ ' + t('status.cancelled', 'Отменено')
                            : '📅 ' + t('status.scheduled', 'Запланировано')}
                        </span>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                          {lesson.isBilled && (
                            <span className="font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 text-[9px]">
                              💳 Списано
                            </span>
                          )}
                          <span>{lesson.students.length} {t('calendar.studentsCount', 'учеников')}</span>
                        </div>
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

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={isCreateGroupModalOpen}
        onClose={() => setIsCreateGroupModalOpen(false)}
        onCreated={(newGroup) => {
          saveGroupToStorage(newGroup);
          setLessons(getStoredLessons());
        }}
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

      {/* Quick Preview Drawer */}
      <LessonPreviewDrawer
        isOpen={!!selectedLessonForDrawer}
        lesson={selectedLessonForDrawer}
        onClose={() => setSelectedLessonForDrawer(null)}
        onEdit={(l) => {
          setSelectedLessonForDrawer(null);
          setSelectedLessonForEdit(l);
        }}
        onLessonUpdated={(updated) => {
          setLessons((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
          setSelectedLessonForDrawer(updated);
        }}
        onDuplicate={(l) => {
          const dup: FullLessonData = {
            ...l,
            id: `l_dup_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            status: 'scheduled',
            students: (l.students || []).map((s) => ({
              ...s,
              attendanceStatus: 'not_marked',
            })),
          };
          saveLessonToStorage(dup);
          setLessons((prev) => [dup, ...prev]);
          setSelectedLessonForDrawer(dup);
        }}
      />

      {/* Edit Lesson Modal */}
      {selectedLessonForEdit && (
        <EditLessonModal
          isOpen={!!selectedLessonForEdit}
          lesson={selectedLessonForEdit}
          onClose={() => setSelectedLessonForEdit(null)}
          onSaved={(updated) => {
            setLessons((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
            setSelectedLessonForEdit(null);
          }}
        />
      )}
    </>
  );
}
