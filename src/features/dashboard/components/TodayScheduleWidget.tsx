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
      <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm space-y-3 animate-pulse h-[280px]" />
    );
  }

  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between pb-2">
        <div>
          <h3 className="font-bold text-slate-900 text-sm">Сегодня</h3>
          <p className="text-[11px] text-slate-400 capitalize">{todayFormatted}</p>
        </div>
        <button
          type="button"
          onClick={() => router.push('/calendar')}
          className="text-xs font-medium text-blue-600 hover:text-blue-700 cursor-pointer"
        >
          Перейти в календарь →
        </button>
      </div>

      {/* 4 компактные цветные плашки сверху (h-11, без переноса строк) */}
      <div className="grid grid-cols-4 gap-1.5 sm:gap-2 mb-2">
        <div className="bg-emerald-50/80 h-11 px-1.5 py-1 rounded-lg flex flex-col items-center justify-center text-center">
          <span className="text-sm font-bold text-emerald-700 leading-none">{stats.total}</span>
          <span className="text-[10px] text-emerald-600 font-medium leading-none mt-1 whitespace-nowrap truncate w-full">занятий</span>
        </div>
        <div className="bg-purple-50/80 h-11 px-1.5 py-1 rounded-lg flex flex-col items-center justify-center text-center">
          <span className="text-sm font-bold text-purple-700 leading-none">{stats.trials}</span>
          <span className="text-[10px] text-purple-600 font-medium leading-none mt-1 whitespace-nowrap truncate w-full">пробных</span>
        </div>
        <div className="bg-amber-50/80 h-11 px-1.5 py-1 rounded-lg flex flex-col items-center justify-center text-center">
          <span className="text-sm font-bold text-amber-700 leading-none">{stats.expectedPayments}</span>
          <span className="text-[10px] text-amber-600 font-medium leading-none mt-1 whitespace-nowrap truncate w-full">ожид. оплат</span>
        </div>
        <div className="bg-blue-50/80 h-11 px-1.5 py-1 rounded-lg flex flex-col items-center justify-center text-center">
          <span className="text-sm font-bold text-blue-700 leading-none">{stats.tasks}</span>
          <span className="text-[10px] text-blue-600 font-medium leading-none mt-1 whitespace-nowrap truncate w-full">задачи</span>
        </div>
      </div>

      {/* Вертикальный таймлайн */}
      <div className="space-y-1 relative before:absolute before:left-[45px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100 my-0.5">
        {todayLessons.slice(0, 4).map((event, idx) => {
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
              className="flex items-center gap-2.5 relative cursor-pointer group py-1"
            >
              <span className="text-xs font-semibold text-slate-500 w-9 shrink-0 text-right">{time}</span>
              <div className="w-2 h-2 rounded-full bg-blue-500 ring-4 ring-white shrink-0 z-10"></div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-800 group-hover:text-blue-600 transition-colors truncate">
                  {title}
                </p>
                <p className="text-[11px] text-slate-400 truncate">{teacher}</p>
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

      <button
        type="button"
        onClick={() => router.push('/calendar')}
        className="w-full text-center text-xs font-medium text-slate-400 hover:text-slate-600 mt-1 pt-1.5 border-t border-slate-50 cursor-pointer"
      >
        Показать все →
      </button>
    </div>
  );
}
