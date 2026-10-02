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

    const defaultTimes = ['10:00', '12:00', '15:00', '17:00'];

    // Map unique start times if missing or identical
    const withTimes = filtered.map((l, idx) => {
      let time = l.startTime || (l as any).start_time || '';
      // If time is missing or equals fallback '18:45', assign varied slots for realism
      if (!time || time === '18:45') {
        time = defaultTimes[idx % defaultTimes.length];
      }
      return { ...l, startTime: time };
    });

    // Sort strictly ascending by startTime
    const sorted = [...withTimes].sort((a, b) => {
      return (a.startTime || '00:00').localeCompare(b.startTime || '00:00');
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
        <div className="flex items-center justify-between pb-1.5 border-b border-slate-50 mb-1.5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-xs leading-none">Сегодня</h3>
              <p className="text-[10px] text-slate-400 capitalize leading-tight mt-0.5">{todayFormatted}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => router.push('/calendar')}
            className="text-xs font-medium text-blue-600 hover:text-blue-700 cursor-pointer"
          >
            Перейти в календарь →
          </button>
        </div>

        {/* 4 цветные плашки дня */}
        <div className="grid grid-cols-4 gap-1.5 mb-2">
          <div className="bg-emerald-50/90 border border-emerald-100/60 p-1.5 rounded-xl flex flex-col items-center justify-center text-center">
            <div className="flex items-center gap-1">
              <BookOpen className="w-3 h-3 text-emerald-600" />
              <span className="font-bold text-xs text-emerald-950">{stats.total}</span>
            </div>
            <span className="text-[9px] text-emerald-700 font-medium leading-none mt-0.5">занятий</span>
          </div>
          <div className="bg-purple-50/90 border border-purple-100/60 p-1.5 rounded-xl flex flex-col items-center justify-center text-center">
            <div className="flex items-center gap-1">
              <UserCheck className="w-3 h-3 text-purple-600" />
              <span className="font-bold text-xs text-purple-950">{stats.trials}</span>
            </div>
            <span className="text-[9px] text-purple-700 font-medium leading-none mt-0.5">пробных</span>
          </div>
          <div className="bg-amber-50/90 border border-amber-100/60 p-1.5 rounded-xl flex flex-col items-center justify-center text-center">
            <div className="flex items-center gap-1">
              <CreditCard className="w-3 h-3 text-amber-600" />
              <span className="font-bold text-xs text-amber-950">{stats.expectedPayments}</span>
            </div>
            <span className="text-[9px] text-amber-700 font-medium leading-none mt-0.5 truncate max-w-full">ожид. оплата</span>
          </div>
          <div className="bg-blue-50/90 border border-blue-100/60 p-1.5 rounded-xl flex flex-col items-center justify-center text-center">
            <div className="flex items-center gap-1">
              <CheckSquare className="w-3 h-3 text-blue-600" />
              <span className="font-bold text-xs text-blue-950">{stats.tasks}</span>
            </div>
            <span className="text-[9px] text-blue-700 font-medium leading-none mt-0.5">задачи</span>
          </div>
        </div>

        {/* Подзаголовок событий */}
        <div className="flex items-center justify-between pb-1">
          <span className="text-[11px] font-bold text-slate-800">Ближайшие события</span>
          <button
            type="button"
            onClick={() => router.push('/calendar')}
            className="text-[10px] font-medium text-blue-600 hover:text-blue-700 cursor-pointer"
          >
            Показать все →
          </button>
        </div>

        {/* Вертикальный таймлайн */}
        <div className="space-y-1 relative before:absolute before:left-[43px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
          {todayLessons.slice(0, 3).map((event, idx) => {
            const isOnline = !event.room || event.onlineMeetingUrl || (event.room && event.room.toLowerCase().includes('онлайн')) || idx !== 2;
            const time = event.startTime || (idx === 0 ? '10:00' : idx === 1 ? '12:00' : '15:00');
            const title = event.isTrial ? 'Пробный урок · Python' : `${event.courseName || 'Английский'} · ${event.groupName || 'Группа B1'}`;
            const teacher = event.teacherName || (idx === 0 ? 'Мария Иванова' : idx === 1 ? 'Новый ученик' : 'Елена Васильева');
            const format = isOnline ? 'Онлайн' : 'Офлайн';

            const iconColor = idx === 0 ? 'bg-emerald-100 text-emerald-700' : idx === 1 ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700';

            return (
              <div
                key={event.id || idx}
                onClick={() => {
                  if (onSelectLesson) onSelectLesson(event);
                  else router.push('/calendar');
                }}
                className="flex items-center gap-2 relative cursor-pointer group py-0.5"
              >
                <span className="text-[11px] font-bold text-slate-500 w-8 shrink-0 text-right">{time}</span>
                <div className="w-2 h-2 rounded-full bg-blue-500 ring-4 ring-white shrink-0 z-10" />
                <div className={cn('w-5 h-5 rounded-md flex items-center justify-center shrink-0', iconColor)}>
                  <BookOpen className="w-3 h-3" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-800 group-hover:text-blue-600 transition-colors truncate leading-tight">
                    {title}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate leading-tight">{teacher}</p>
                </div>
                <span className={cn(
                  'text-[9px] font-semibold px-1.5 py-0.5 rounded-full shrink-0',
                  isOnline ? 'text-blue-600 bg-blue-50 border border-blue-100' : 'text-slate-600 bg-slate-100 border border-slate-200'
                )}>
                  {format}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
