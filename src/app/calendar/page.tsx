'use client';

import React, { useState } from 'react';
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
import { ScheduleLessonModal } from '@/components/calendar/ScheduleLessonModal';

export default function CalendarPage() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<'week' | 'day' | 'month'>('week');
  const [selectedTeacher, setSelectedTeacher] = useState<string>('all');
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(2); // Wednesday (Today)
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [lessons, setLessons] = useState<FullLessonData[]>(INITIAL_LESSONS);

  const daysOfWeek = [
    { name: 'Пн', date: '01 сен', fullDate: '2026-09-01', dayIndex: 0 },
    { name: 'Вт', date: '02 сен', fullDate: '2026-09-02', dayIndex: 1 },
    { name: 'Ср', date: '03 сен', fullDate: '2026-09-03', dayIndex: 2, isToday: true },
    { name: 'Чт', date: '04 сен', fullDate: '2026-09-04', dayIndex: 3 },
    { name: 'Пт', date: '05 сен', fullDate: '2026-09-05', dayIndex: 4 },
    { name: 'Сб', date: '06 сен', fullDate: '2026-09-06', dayIndex: 5 },
    { name: 'Вс', date: '07 сен', fullDate: '2026-09-07', dayIndex: 6 },
  ];

  const handleLessonScheduled = (newLesson: FullLessonData) => {
    setLessons((prev) => [...prev, newLesson]);
  };

  const filteredLessons = lessons.filter((l) => {
    if (selectedTeacher === 'all') return true;
    return l.teacherId === selectedTeacher;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Календарь школы</h1>
          <p className="text-sm text-slate-500">
            Расписание занятий всех групп и преподавателей (One Source of Truth)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsScheduleModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            + Запланировать занятие
          </button>
        </div>
      </div>

      {/* Navigation & Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
        <div className="flex items-center gap-2">
          <button className="rounded-lg border border-slate-200 p-1.5 hover:bg-slate-50 text-slate-600">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold text-slate-800 px-2">
            1 сентября – 7 сентября 2026
          </span>
          <button className="rounded-lg border border-slate-200 p-1.5 hover:bg-slate-50 text-slate-600">
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => setSelectedDayIndex(2)}
            className="ml-2 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Сегодня
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Teacher filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <span>Преподаватель:</span>
            <select
              value={selectedTeacher}
              onChange={(e) => setSelectedTeacher(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">Все преподаватели</option>
              <option value="t1">Мария Иванова (English)</option>
              <option value="t2">Денис Смирнов (Robotics)</option>
              <option value="t3">Ольга Соколова (Math)</option>
            </select>
          </div>

          {/* View Mode Toggle (Day / Week / Month) */}
          <div className="flex rounded-lg bg-slate-100 p-1 text-xs font-medium">
            <button
              onClick={() => setViewMode('day')}
              className={cn('rounded px-2.5 py-1 transition-all', viewMode === 'day' ? 'bg-white shadow-xs font-semibold' : 'text-slate-600')}
            >
              День
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={cn('rounded px-2.5 py-1 transition-all', viewMode === 'week' ? 'bg-white shadow-xs font-semibold' : 'text-slate-600')}
            >
              Неделя
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={cn('rounded px-2.5 py-1 transition-all', viewMode === 'month' ? 'bg-white shadow-xs font-semibold' : 'text-slate-600')}
            >
              Месяц
            </button>
          </div>
        </div>
      </div>

      {/* VIEW 1: WEEK CALENDAR (MAIN VIEW) */}
      {viewMode === 'week' && (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {daysOfWeek.map((day) => {
            const dayLessons = filteredLessons.filter((l) => l.dayOfWeek === day.dayIndex);

            return (
              <div
                key={day.dayIndex}
                className={cn(
                  'min-h-[420px] rounded-2xl border bg-white p-3 shadow-xs flex flex-col',
                  day.isToday ? 'border-blue-400 ring-2 ring-blue-100 bg-blue-50/10' : 'border-slate-200'
                )}
              >
                {/* Day Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                  <span className={cn('text-xs font-bold uppercase', day.isToday ? 'text-blue-600' : 'text-slate-500')}>
                    {day.name}
                  </span>
                  <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', day.isToday ? 'bg-blue-600 text-white font-bold' : 'text-slate-600')}>
                    {day.date}
                  </span>
                </div>

                {/* Lessons in Day */}
                <div className="space-y-2 flex-1">
                  {dayLessons.length === 0 ? (
                    <div className="flex h-32 items-center justify-center text-[11px] text-slate-300">
                      Нет занятий
                    </div>
                  ) : (
                    dayLessons.map((lesson) => (
                      <div
                        key={lesson.id}
                        onClick={() => router.push(`/calendar/lessons/${lesson.id}`)}
                        className={cn(
                          'rounded-xl border p-2.5 text-xs transition-all hover:shadow-md cursor-pointer text-left',
                          lesson.status === 'completed'
                            ? 'border-emerald-200 bg-emerald-50/60'
                            : 'border-blue-200 bg-blue-50/40 hover:border-blue-300'
                        )}
                      >
                        <div className="flex items-center justify-between font-bold text-slate-800 text-[11px]">
                          <span>{lesson.startTime} – {lesson.endTime}</span>
                          {lesson.onlineMeetingUrl && (
                            <span className="flex items-center gap-0.5 text-[10px] text-indigo-600 font-medium bg-indigo-50 px-1 py-0.5 rounded">
                              <Video className="h-2.5 w-2.5" /> Online
                            </span>
                          )}
                        </div>
                        <p className="mt-1 font-bold text-slate-900 leading-snug">{lesson.groupName.split('(')[0]}</p>
                        <p className="mt-0.5 text-[11px] text-slate-500">{lesson.teacherName}</p>

                        <div className="mt-2 flex items-center justify-between border-t border-slate-200/50 pt-1.5 text-[10px] text-slate-500">
                          <span>{lesson.room}</span>
                          <span className="font-semibold text-slate-700">
                            {lesson.students.length} уч.
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 2: DAY VIEW */}
      {viewMode === 'day' && (
        <div className="space-y-4 max-w-3xl mx-auto">
          {/* Day picker pills */}
          <div className="flex gap-2 justify-center pb-2">
            {daysOfWeek.map((day) => (
              <button
                key={day.dayIndex}
                onClick={() => setSelectedDayIndex(day.dayIndex)}
                className={cn(
                  'rounded-xl px-3.5 py-2 text-xs font-semibold transition-all',
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
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
              Занятия на {daysOfWeek[selectedDayIndex].date}:
            </h2>

            {filteredLessons.filter((l) => l.dayOfWeek === selectedDayIndex).length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">На этот день занятий не запланировано</p>
            ) : (
              filteredLessons
                .filter((l) => l.dayOfWeek === selectedDayIndex)
                .map((lesson) => (
                  <div
                    key={lesson.id}
                    onClick={() => router.push(`/calendar/lessons/${lesson.id}`)}
                    className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 hover:bg-slate-100/70 transition-all cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-16 flex-col items-center justify-center rounded-xl bg-blue-100 text-blue-800 font-bold text-xs">
                        <span>{lesson.startTime}</span>
                        <span className="text-[10px] font-normal text-blue-600">{lesson.endTime}</span>
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">{lesson.groupName}</h3>
                        <p className="text-xs text-slate-500">{lesson.teacherName} • {lesson.room}</p>
                        <p className="text-xs text-blue-600 font-medium mt-0.5">Тема: {lesson.topic}</p>
                      </div>
                    </div>
                    <div className="text-right text-xs">
                      <span className={cn(
                        'rounded-full px-2.5 py-1 text-[10px] font-semibold',
                        lesson.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                      )}>
                        {lesson.status === 'completed' ? 'Завершён' : 'Запланирован'}
                      </span>
                      <p className="text-slate-400 text-[11px] mt-1">{lesson.students.length} учеников</p>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      )}

      {/* VIEW 3: MONTH VIEW (HIGH LEVEL OVERVIEW) */}
      {viewMode === 'month' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Сетка месяца (Сентябрь 2026)</h3>
          <div className="grid grid-cols-7 gap-2 text-center text-xs">
            {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((d) => (
              <div key={d} className="font-bold text-slate-400 uppercase py-1">{d}</div>
            ))}
            {Array.from({ length: 30 }).map((_, i) => {
              const dayNum = i + 1;
              const hasLessons = dayNum === 1 || dayNum === 2 || dayNum === 3 || dayNum === 4 || dayNum === 5;

              return (
                <div
                  key={i}
                  className={cn(
                    'h-20 rounded-xl border p-1.5 flex flex-col justify-between text-left transition-colors',
                    dayNum === 3 ? 'border-blue-500 bg-blue-50/30' : 'border-slate-100 hover:bg-slate-50'
                  )}
                >
                  <span className={cn('text-[11px] font-bold', dayNum === 3 ? 'text-blue-600' : 'text-slate-700')}>
                    {dayNum}
                  </span>
                  {hasLessons && (
                    <div className="space-y-0.5">
                      <span className="block rounded bg-blue-100 px-1 py-0.5 text-[9px] font-semibold text-blue-800 truncate">
                        2 урока
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Schedule Lesson Modal */}
      <ScheduleLessonModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        onScheduled={handleLessonScheduled}
      />
    </div>
  );
}
