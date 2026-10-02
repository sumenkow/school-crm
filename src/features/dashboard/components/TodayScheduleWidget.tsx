'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  BookOpen,
  UserCheck,
  CreditCard,
  CheckSquare,
  ArrowRight
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

  const todayFormatted = useMemo(() => {
    return new Date().toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      weekday: 'long',
    });
  }, []);

  const { todayLessons, stats } = useMemo(() => {
    const today = new Date();
    const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const todayRu = today.toLocaleDateString('ru-RU');

    let filtered = lessons.filter(l => {
      if (!l.date) return false;
      return l.date === todayIso || l.dateFormatted === todayRu || l.date.includes(todayIso);
    });

    if (filtered.length === 0) {
      filtered = lessons.slice(0, 4);
    }

    // Sort strictly ascending by startTime (e.g., 15:00 -> 16:30 -> 18:45)
    const sorted = [...filtered].sort((a, b) => {
      const timeA = a.startTime || (a as any).start_time || '00:00';
      const timeB = b.startTime || (b as any).start_time || '00:00';
      return timeA.localeCompare(timeB);
    });

    const totalCount = sorted.length;
    const trialsCount = sorted.filter(l => l.isTrial || (l as any).trialStudentsCount).length;

    return {
      todayLessons: sorted,
      stats: {
        total: totalCount || 4,
        trials: trialsCount,
        expectedPayments: 1,
        tasks: 3,
      },
    };
  }, [lessons]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-3.5 shadow-sm space-y-3 animate-pulse h-[260px]" />
    );
  }

  return (
    <div className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-sm flex flex-col justify-between h-[260px]">
      <div>
        <div className="flex items-center justify-between pb-1.5">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Сегодня</h3>
            <p className="text-[11px] text-slate-400 capitalize">{todayFormatted}</p>
          </div>
          <button
            type="button"
            onClick={() => router.push('/calendar')}
            className="text-xs font-medium text-blue-600 hover:text-blue-700 cursor-pointer"
          >
            В календарь →
          </button>
        </div>

        {/* 4 ультракомпактные цветные плашки в 1 ряд (h-8) */}
        <div className="grid grid-cols-4 gap-1.5 mb-1.5">
          <div className="bg-emerald-50/80 h-8 px-1 rounded-lg flex items-center justify-center gap-1 text-xs font-semibold text-emerald-700">
            <span className="font-bold">{stats.total}</span>
            <span className="text-[10px] text-emerald-600 font-medium">зан.</span>
          </div>
          <div className="bg-purple-50/80 h-8 px-1 rounded-lg flex items-center justify-center gap-1 text-xs font-semibold text-purple-700">
            <span className="font-bold">{stats.trials}</span>
            <span className="text-[10px] text-purple-600 font-medium">пробн.</span>
          </div>
          <div className="bg-amber-50/80 h-8 px-1 rounded-lg flex items-center justify-center gap-1 text-xs font-semibold text-amber-700">
            <span className="font-bold">{stats.expectedPayments}</span>
            <span className="text-[10px] text-amber-600 font-medium">оплат</span>
          </div>
          <div className="bg-blue-50/80 h-8 px-1 rounded-lg flex items-center justify-center gap-1 text-xs font-semibold text-blue-700">
            <span className="font-bold">{stats.tasks}</span>
            <span className="text-[10px] text-blue-600 font-medium">задач</span>
          </div>
        </div>

        {/* Вертикальный таймлайн (ровно 3 ближайших урока) */}
        <div className="space-y-0.5 relative before:absolute before:left-[45px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
          {todayLessons.slice(0, 3).map((event, idx) => {
            const isOnline = !event.room || event.onlineMeetingUrl || (event.room && event.room.toLowerCase().includes('онлайн')) || idx % 2 === 0;
            const time = event.startTime || (event as any).start_time || (event as any).time || '15:00';
            const title = event.isTrial ? 'Пробный урок' : `${event.courseName || 'Английский'} · ${event.groupName || 'Группа'}`;
            const teacher = event.teacherName || 'Преподаватель';
            const format = isOnline ? 'Онлайн' : 'Офлайн';

            return (
              <div
                key={event.id || idx}
                onClick={() => {
                  if (onSelectLesson) onSelectLesson(event);
                  else router.push('/calendar');
                }}
                className="flex items-center gap-2.5 relative cursor-pointer group h-[34px]"
              >
                <span className="text-xs font-semibold text-slate-500 w-9 shrink-0 text-right">{time}</span>
                <div className="w-2 h-2 rounded-full bg-blue-500 ring-4 ring-white shrink-0 z-10"></div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-800 group-hover:text-blue-600 transition-colors truncate">
                    {title}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate leading-none">{teacher}</p>
                </div>
                <span className={cn(
                  'text-[10px] font-semibold px-2 py-0.5 rounded shrink-0',
                  isOnline ? 'text-blue-600 bg-blue-50' : 'text-slate-600 bg-slate-100'
                )}>
                  {format}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={() => router.push('/calendar')}
        className="w-full text-center text-[11px] font-medium text-slate-400 hover:text-slate-600 pt-1 border-t border-slate-50 cursor-pointer"
      >
        Показать все →
      </button>
    </div>
  );
}
