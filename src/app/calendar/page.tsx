'use client';

import React, { useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Filter, Users, Video } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CalendarPage() {
  const [viewMode, setViewMode] = useState<'week' | 'day' | 'month'>('week');
  const [selectedTeacher, setSelectedTeacher] = useState<string>('all');

  const daysOfWeek = [
    { name: 'Пн', date: '01 сен' },
    { name: 'Вт', date: '02 сен' },
    { name: 'Ср', date: '03 сен', isToday: true },
    { name: 'Чт', date: '04 сен' },
    { name: 'Пт', date: '05 сен' },
    { name: 'Сб', date: '06 сен' },
    { name: 'Вс', date: '07 сен' },
  ];

  const sampleLessons = [
    {
      id: '1',
      dayIndex: 0, // Пн
      title: 'English B1 Teens',
      time: '17:00 - 18:30',
      teacher: 'Мария Иванова',
      room: 'Ауд. 204',
      studentsCount: 7,
      status: 'completed',
    },
    {
      id: '2',
      dayIndex: 2, // Ср (Сегодня)
      title: 'Robotics Junior',
      time: '15:00 - 16:30',
      teacher: 'Денис Смирнов',
      room: 'IT Лаб',
      studentsCount: 6,
      status: 'completed',
    },
    {
      id: '3',
      dayIndex: 2, // Ср (Сегодня)
      title: 'English B1 Teens',
      time: '18:45 - 20:15',
      teacher: 'Мария Иванова',
      room: 'Ауд. 204',
      studentsCount: 8,
      status: 'scheduled',
      isOnline: true,
    },
    {
      id: '4',
      dayIndex: 3, // Чт
      title: 'Kids Math Safari',
      time: '16:00 - 17:00',
      teacher: 'Ольга Соколова',
      room: 'Ауд. 101',
      studentsCount: 5,
      status: 'scheduled',
    },
    {
      id: '5',
      dayIndex: 4, // Пт
      title: 'English B2 Advanced',
      time: '19:00 - 20:30',
      teacher: 'Мария Иванова',
      room: 'Ауд. 204',
      studentsCount: 6,
      status: 'scheduled',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Расписание школы</h1>
          <p className="text-sm text-slate-500">
            Интерактивный календарь занятий всех групп и преподавателей
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors">
            <Plus className="h-4 w-4" />
            + Запланировать занятие
          </button>
        </div>
      </div>

      {/* Controls bar */}
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
          <button className="ml-2 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
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
              <option value="ivanova">Мария Иванова</option>
              <option value="smirnov">Денис Смирнов</option>
              <option value="sokolova">Ольга Соколова</option>
            </select>
          </div>

          {/* View Mode Toggle */}
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

      {/* Week Grid */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        {daysOfWeek.map((day, idx) => {
          const lessons = sampleLessons.filter((l) => l.dayIndex === idx);

          return (
            <div
              key={idx}
              className={cn(
                'min-h-[380px] rounded-xl border bg-white p-3 shadow-xs flex flex-col',
                day.isToday ? 'border-blue-300 ring-2 ring-blue-100' : 'border-slate-200'
              )}
            >
              {/* Day header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                <span className={cn('text-xs font-bold uppercase', day.isToday ? 'text-blue-600' : 'text-slate-500')}>
                  {day.name}
                </span>
                <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', day.isToday ? 'bg-blue-600 text-white font-bold' : 'text-slate-600')}>
                  {day.date}
                </span>
              </div>

              {/* Lessons in this day */}
              <div className="space-y-2 flex-1">
                {lessons.length === 0 ? (
                  <div className="flex h-32 items-center justify-center text-[11px] text-slate-300">
                    Нет уроков
                  </div>
                ) : (
                  lessons.map((lesson) => (
                    <div
                      key={lesson.id}
                      className={cn(
                        'rounded-lg border p-2.5 text-xs transition-all hover:shadow-md cursor-pointer',
                        lesson.status === 'completed'
                          ? 'border-emerald-200 bg-emerald-50/50'
                          : 'border-blue-200 bg-blue-50/40 hover:border-blue-300'
                      )}
                    >
                      <div className="flex items-center justify-between font-semibold text-slate-800">
                        <span>{lesson.time}</span>
                        {lesson.isOnline && (
                          <span className="flex items-center gap-0.5 text-[10px] text-indigo-600 font-medium bg-indigo-50 px-1.5 py-0.5 rounded">
                            <Video className="h-2.5 w-2.5" /> Online
                          </span>
                        )}
                      </div>
                      <p className="mt-1 font-bold text-slate-900 leading-snug">{lesson.title}</p>
                      <p className="mt-0.5 text-[11px] text-slate-500">{lesson.teacher}</p>
                      <div className="mt-2 flex items-center justify-between border-t border-slate-200/50 pt-1.5 text-[10px] text-slate-500">
                        <span>{lesson.room}</span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3 text-slate-400" /> {lesson.studentsCount} уч.
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
    </div>
  );
}
