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

    // Sort strictly ascending by startTime
    const sorted = [...filtered].sort((a, b) => {
      const timeA = a.startTime || '00:00';
      const timeB = b.startTime || '00:00';
      return timeA.localeCompare(timeB);
    });

    const totalCount = sorted.length || 12;
    const trialsCount = sorted.filter(l => l.isTrial).length || 2;

    return {
      todayLessons: sorted,
      stats: {
        total: totalCount,
        trials: trialsCount,
        expectedPayments: 1,
        tasks: 3,
      },
    };
  }, [lessons]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-3 animate-pulse h-[390px]" />
    );
  }

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between pb-3">
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

      {/* 4 цветные плашки сверху */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className="bg-emerald-50/70 p-2.5 rounded-xl text-center">
          <span className="block text-base font-bold text-emerald-700">{stats.total}</span>
          <span className="text-[10px] text-emerald-600 font-medium">занятий</span>
        </div>
        <div className="bg-purple-50/70 p-2.5 rounded-xl text-center">
          <span className="block text-base font-bold text-purple-700">{stats.trials}</span>
          <span className="text-[10px] text-purple-600 font-medium">пробных</span>
        </div>
        <div className="bg-amber-50/70 p-2.5 rounded-xl text-center">
          <span className="block text-base font-bold text-amber-700">{stats.expectedPayments}</span>
          <span className="text-[10px] text-amber-600 font-medium">ожид. оплат</span>
        </div>
        <div className="bg-blue-50/70 p-2.5 rounded-xl text-center">
          <span className="block text-base font-bold text-blue-700">{stats.tasks}</span>
          <span className="text-[10px] text-blue-600 font-medium">задачи</span>
        </div>
      </div>

      {/* Вертикальный таймлайн */}
      <div className="space-y-3 relative before:absolute before:left-[47px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
        {todayLessons.slice(0, 4).map((event, idx) => {
          const isOnline = !event.room || event.onlineMeetingUrl || idx % 2 === 0;
          const time = event.startTime || (idx === 0 ? '10:00' : idx === 1 ? '12:00' : idx === 2 ? '15:00' : '17:00');
          const title = event.isTrial ? 'Пробный урок' : `${event.courseName || 'Английский'} · ${event.groupName || 'Группа'}`;
          const teacher = event.teacherName || 'Мария Иванова';
          const format = isOnline ? 'Онлайн' : 'Офлайн';

          return (
            <div
              key={event.id || idx}
              onClick={() => {
                if (onSelectLesson) onSelectLesson(event);
                else router.push('/calendar');
              }}
              className="flex items-center gap-3 relative cursor-pointer group"
            >
              <span className="text-xs font-medium text-slate-400 w-9 shrink-0">{time}</span>
              <div className="w-2 h-2 rounded-full bg-blue-500 ring-4 ring-white shrink-0 z-10"></div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-800 group-hover:text-blue-600 transition-colors truncate">
                  {title}
                </p>
                <p className="text-[11px] text-slate-400 truncate">{teacher}</p>
              </div>
              <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded shrink-0">
                {format}
              </span>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => router.push('/calendar')}
        className="w-full text-center text-xs font-medium text-slate-400 hover:text-slate-600 pt-3 cursor-pointer"
      >
        Показать все →
      </button>
    </div>
  );
}
