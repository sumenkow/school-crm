'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Users, Clock, Calendar, GraduationCap, ArrowRight, Filter, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import { INITIAL_GROUPS, FullGroupData } from '@/lib/data/mockData';
import { getStoredGroups, saveGroupToStorage } from '@/lib/data/groupStorage';
import { CreateGroupModal } from '@/components/groups/CreateGroupModal';

export default function GroupsPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<FullGroupData[]>(() => {
    return typeof window !== 'undefined' ? getStoredGroups() : INITIAL_GROUPS;
  });
  const [filterCourse, setFilterCourse] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    const sync = () => {
      setGroups(getStoredGroups());
    };
    sync();
    window.addEventListener('crm-groups-changed', sync);
    window.addEventListener('crm-students-changed', sync);
    window.addEventListener('focus', sync);
    return () => {
      window.removeEventListener('crm-groups-changed', sync);
      window.removeEventListener('crm-students-changed', sync);
      window.removeEventListener('focus', sync);
    };
  }, []);

  const handleGroupCreated = (newGroup: FullGroupData) => {
    saveGroupToStorage(newGroup);
    setGroups(getStoredGroups());
  };

  const filteredGroups = groups.filter((g) => {
    return filterCourse === 'all' || g.courseName === filterCourse;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Группы школы</h1>
          <p className="text-sm text-slate-500">
            Управление группами, расписанием и автоматический расчет свободных мест (One Source of Truth)
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Создать группу
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-xs text-xs">
        <Filter className="h-3.5 w-3.5 text-slate-400" />
        <span className="text-slate-500 font-medium">Фильтр по курсу:</span>
        <select
          value={filterCourse}
          onChange={(e) => setFilterCourse(e.target.value)}
          className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="all">Все курсы</option>
          <option value="Английский язык">Английский язык</option>
          <option value="Робототехника">Робототехника</option>
          <option value="Математика">Математика</option>
        </select>
      </div>

      {/* Grid of groups */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredGroups.map((group) => {
          const enrolledCount = group.students.length;
          const freeSpots = group.capacity - enrolledCount;
          const occupancyPercent = Math.min(100, Math.round((enrolledCount / group.capacity) * 100));

          return (
            <div
              key={group.id}
              onClick={() => router.push(`/groups/${group.id}`)}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between cursor-pointer"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                      {group.courseName}
                    </span>
                    <h3 className="mt-0.5 text-base font-bold text-slate-900 hover:text-blue-600 transition-colors">
                      {group.name}
                    </h3>
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
                    <span>Преподаватель: <strong className="text-slate-800">{group.teacherName}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4 text-blue-500" />
                    <span className="text-blue-700 font-medium">Формат: Онлайн (Zoom / веб-класс)</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span>Тариф: <strong className="text-slate-800">{group.pricing?.pricePerLessonFormatted || '1 050 ₽'} / урок</strong></span>
                    <span>Абонемент: <strong className="text-slate-800">{group.pricing?.pricePerMonthFormatted || '7 600 ₽/мес'}</strong></span>
                  </div>
                </div>

                {/* Capacity Progress Bar (Dynamic calculation) */}
                <div className="mt-5 rounded-xl bg-slate-50 p-3 border border-slate-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium">
                      Заполненность: <strong className="text-slate-900">{enrolledCount} из {group.capacity}</strong> учеников
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
                <span className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-700">
                  Открыть карточку группы <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <CreateGroupModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={handleGroupCreated}
      />
    </div>
  );
}
