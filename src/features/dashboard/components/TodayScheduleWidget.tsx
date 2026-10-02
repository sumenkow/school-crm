'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Clock,
  Video,
  MapPin,
  Users,
  ChevronRight,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  CalendarClock
} from 'lucide-react';
import { FullLessonData } from '@/lib/data/mockData';
import { cn } from '@/lib/utils';

export interface TodayScheduleWidgetProps {
  lessons: FullLessonData[];
  onSelectLesson?: (lesson: FullLessonData) => void;
  isLoading?: boolean;
}

export function TodayScheduleWidget({
  lessons,
  onSelectLesson,
  isLoading = false,
}: TodayScheduleWidgetProps) {
  const router = useRouter();

  const todayLessons = useMemo(() => {
    const today = new Date();
    const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const todayRu = today.toLocaleDateString('ru-RU');

    // Filter today's lessons or upcoming scheduled lessons
    const filtered = lessons.filter(l => {
      if (!l.date) return false;
      return l.date === todayIso || l.dateFormatted === todayRu || l.date.includes(todayIso);
    });

    // If no lessons strictly match exact date, fallback to next upcoming scheduled lessons
    if (filtered.length === 0) {
      return lessons.filter(l => l.status === 'scheduled').slice(0, 3);
    }

    return filtered;
  }, [lessons]);

  const trialCount = useMemo(() => {
    return todayLessons.reduce((sum, l) => {
      if (l.isTrial) return sum + 1;
      if (l.trialStudentsCount) return sum + l.trialStudentsCount;
      const trialInStudents = l.students?.filter((s: any) => s.isTrial || s.attendanceStatus === 'trial').length || 0;
      return sum + trialInStudents;
    }, 0);
  }, [todayLessons]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-2xs">
        <div className="h-5 w-40 bg-slate-100 rounded animate-pulse" />
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-50 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-900">Расписание на сегодня</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
            {todayLessons.length} {todayLessons.length === 1 ? 'урок' : todayLessons.length < 5 ? 'урока' : 'уроков'}
          </span>
          {trialCount > 0 && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200/60">
              {trialCount} пробных
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-3 space-y-2 flex-1 overflow-y-auto max-h-[420px]">
        {todayLessons.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200/80">
            <CalendarClock className="w-8 h-8 text-slate-400 mb-2" />
            <p className="text-sm font-bold text-slate-800">На сегодня занятий нет</p>
            <p className="text-xs text-slate-500 mt-1 max-w-xs">
              Все занятия проводятся по утвержденному расписанию недели.
            </p>
            <button
              type="button"
              onClick={() => router.push('/calendar')}
              className="mt-3 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>Открыть расписание недели</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          todayLessons.map((lesson) => (
            <div
              key={lesson.id}
              onClick={() => {
                if (onSelectLesson) {
                  onSelectLesson(lesson);
                } else {
                  router.push(`/calendar?lesson=${lesson.id}`);
                }
              }}
              className="p-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/80 transition-all cursor-pointer group bg-white shadow-2xs space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200/60 text-[11px]">
                    {lesson.startTime || '18:45'} – {lesson.endTime || '20:15'}
                  </span>
                  <span className="group-hover:text-blue-600 transition-colors truncate">
                    {lesson.groupName || 'Группа'}
                  </span>
                </div>

                {lesson.isTrial && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                    Пробный урок
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-2 truncate">
                  <span>{lesson.courseName || 'Основной курс'}</span>
                  <span>•</span>
                  <span>Педагог: <b>{lesson.teacherName || 'Мария Иванова'}</b></span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  {lesson.onlineMeetingUrl ? (
                    <a
                      href={lesson.onlineMeetingUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors flex items-center gap-1 text-[11px] font-semibold"
                      title="Подключиться к Zoom"
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>Zoom</span>
                    </a>
                  ) : (
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {lesson.room || 'Кабинет'}
                    </span>
                  )}
                  <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                    {lesson.students?.length || 0} уч.
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs">
        <span className="text-slate-500 font-medium">Календарная сетка занятий</span>
        <button
          type="button"
          onClick={() => router.push('/calendar')}
          className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1 cursor-pointer"
        >
          <span>В расписание</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
