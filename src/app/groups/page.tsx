'use client';

import React, { useState } from 'react';
import { Plus, Users, Clock, Calendar, GraduationCap, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function GroupsPage() {
  const [filterCourse, setFilterCourse] = useState('all');

  const groups = [
    {
      id: '1',
      name: 'English B1 Teens (Пн/Чт 18:45)',
      course: 'Английский язык',
      teacher: 'Мария Иванова',
      schedule: 'Пн, Чт • 18:45–20:15',
      capacity: 8,
      enrolled: 7, // 1 free spot
      status: 'active',
      room: 'Ауд. 204',
      startDate: '01.09.2026',
    },
    {
      id: '2',
      name: 'Kids English A1 (Вт/Пт 15:00)',
      course: 'Английский язык',
      teacher: 'Мария Иванова',
      schedule: 'Вт, Пт • 15:00–16:30',
      capacity: 6,
      enrolled: 6, // 0 free spots (FULL)
      status: 'active',
      room: 'Ауд. 102',
      startDate: '01.09.2026',
    },
    {
      id: '3',
      name: 'Robotics Junior (Ср/Сб 15:00)',
      course: 'Робототехника',
      teacher: 'Денис Смирнов',
      schedule: 'Ср 15:00, Сб 11:00',
      capacity: 8,
      enrolled: 4, // 4 free spots (recruiting)
      status: 'recruiting',
      room: 'IT Лаб',
      startDate: '10.09.2026',
    },
    {
      id: '4',
      name: 'Kids Math Safari (Чт 16:00)',
      course: 'Математика',
      teacher: 'Ольга Соколова',
      schedule: 'Четверг • 16:00–17:00',
      capacity: 6,
      enrolled: 5, // 1 free spot
      status: 'active',
      room: 'Ауд. 101',
      startDate: '01.09.2026',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Группы</h1>
          <p className="text-sm text-slate-500">
            Управление группами, составом учеников и автоматический расчет свободных мест
          </p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors">
          <Plus className="h-4 w-4" />
          + Создать группу
        </button>
      </div>

      {/* Grid of groups */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-5">
        {groups.map((group) => {
          const freeSpots = group.capacity - group.enrolled;
          const occupancyPercent = Math.round((group.enrolled / group.capacity) * 100);

          return (
            <div
              key={group.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                      {group.course}
                    </span>
                    <h3 className="mt-0.5 text-base font-bold text-slate-900">{group.name}</h3>
                  </div>
                  <span
                    className={cn(
                      'rounded-full px-2.5 py-0.5 text-[10px] font-semibold border',
                      group.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                    )}
                  >
                    {group.status === 'active' ? 'Идут занятия' : 'Набор'}
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <span className="font-medium text-slate-800">{group.schedule}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-slate-400" />
                    <span>Преподаватель: <strong className="text-slate-800">{group.teacher}</strong> ({group.room})</span>
                  </div>
                </div>

                {/* Capacity Progress Bar (Dynamic calculation) */}
                <div className="mt-5 rounded-xl bg-slate-50 p-3 border border-slate-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium">
                      Заполненность: <strong className="text-slate-900">{group.enrolled} из {group.capacity}</strong> учеников
                    </span>
                    <span className={cn(
                      'font-bold text-[11px]',
                      freeSpots === 0 ? 'text-rose-600' : freeSpots <= 2 ? 'text-amber-600' : 'text-emerald-600'
                    )}>
                      {freeSpots === 0 ? 'Группа заполнена' : `Свободно: ${freeSpots} мест`}
                    </span>
                  </div>
                  <div className="mt-2 h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-300',
                        freeSpots === 0 ? 'bg-rose-500' : occupancyPercent >= 75 ? 'bg-emerald-500' : 'bg-blue-500'
                      )}
                      style={{ width: `${occupancyPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400">Старт: {group.startDate}</span>
                <button className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-700">
                  Список учеников и журнал <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
