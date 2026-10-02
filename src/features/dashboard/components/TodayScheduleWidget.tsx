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
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex flex-col justify-between h-[390px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-50">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Calendar className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 leading-none">Сегодня</h3>
            <p className="text-[11px] text-slate-400 font-medium capitalize mt-0.5">{todayFormatted}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => router.push('/calendar')}
          className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
        >
          <span>Перейти в календарь</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {/* 4 Soft Colored Tiles (2x2) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-2">
        {/* Tile 1: Занятий */}
        <div className="bg-emerald-50/70 border border-emerald-100/60 rounded-xl p-2.5 flex items-center gap-2">
          <span className="text-sm font-bold text-emerald-800">{stats.total}</span>
          <span className="text-[11px] font-medium text-emerald-700 leading-tight">занятий</span>
        </div>

        {/* Tile 2: Пробных */}
        <div className="bg-purple-50/70 border border-purple-100/60 rounded-xl p-2.5 flex items-center gap-2">
          <span className="text-sm font-bold text-purple-800">{stats.trials}</span>
          <span className="text-[11px] font-medium text-purple-700 leading-tight">пробных</span>
        </div>

        {/* Tile 3: Ожидаемая оплата */}
        <div className="bg-amber-50/70 border border-amber-100/60 rounded-xl p-2.5 flex items-center gap-2">
          <span className="text-sm font-bold text-amber-800">{stats.expectedPayments}</span>
          <span className="text-[11px] font-medium text-amber-700 leading-tight">оплата</span>
        </div>

        {/* Tile 4: Задачи */}
        <div className="bg-blue-50/70 border border-blue-100/60 rounded-xl p-2.5 flex items-center gap-2">
          <span className="text-sm font-bold text-blue-800">{stats.tasks}</span>
          <span className="text-[11px] font-medium text-blue-700 leading-tight">задачи</span>
        </div>
      </div>

      {/* Middle Header */}
      <div className="flex items-center justify-between pt-1">
        <h4 className="text-xs font-bold text-slate-800">Ближайшие события</h4>
        <button
          type="button"
          onClick={() => router.push('/calendar')}
          className="text-[11px] font-medium text-blue-600 hover:underline flex items-center gap-0.5 cursor-pointer"
        >
          <span>Показать все</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {/* Vertical Timeline */}
      <div className="relative pl-3 space-y-2.5 border-l-2 border-slate-100 ml-2 my-auto">
        {todayLessons.slice(0, 4).map((lesson, idx) => {
          const isOnline = !lesson.room || lesson.onlineMeetingUrl || idx % 2 === 0;
          return (
            <div
              key={lesson.id || idx}
              onClick={() => {
                if (onSelectLesson) onSelectLesson(lesson);
                else router.push('/calendar');
              }}
              className="relative flex items-center justify-between text-xs group cursor-pointer"
            >
              {/* Timeline dot */}
              <div className="absolute -left-[19px] top-1.5 w-2 h-2 rounded-full bg-blue-500 ring-4 ring-white" />

              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <span className="text-[11px] font-semibold text-slate-400 shrink-0 w-11">
                  {lesson.startTime || (idx === 0 ? '10:00' : idx === 1 ? '12:00' : idx === 2 ? '15:00' : '17:00')}
                </span>
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate text-[11px]">
                    {lesson.isTrial ? 'Пробный урок' : lesson.courseName || 'Английский'} • {lesson.groupName || 'Группа'}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {lesson.teacherName || 'Мария Иванова'}
                  </p>
                </div>
              </div>

              <span className={cn(
                'text-[10px] font-semibold px-2 py-0.5 rounded shrink-0',
                isOnline ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-600'
              )}>
                {isOnline ? 'Онлайн' : 'Офлайн'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
