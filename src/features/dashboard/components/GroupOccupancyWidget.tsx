'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Users, CheckCircle2 } from 'lucide-react';
import { FullGroupData } from '@/lib/data/mockData';

export interface GroupOccupancyWidgetProps {
  groups: FullGroupData[];
  isLoading?: boolean;
}

export function GroupOccupancyWidget({
  groups,
  isLoading = false,
}: GroupOccupancyWidgetProps) {
  const router = useRouter();

  const groupsSummary = useMemo(() => {
    const list = groups || [];
    const active = list.filter(g => g.status === 'active' && !g.is_deleted && !g.isDeleted);
    const recruiting = list.filter(g => g.status === 'recruiting' && !g.is_deleted && !g.isDeleted);

    let totalEnrolled = 0;
    let totalCapacity = 0;

    active.forEach(g => {
      const count = g.students?.length || 0;
      const cap = g.capacity && g.capacity > 0 ? g.capacity : count;
      totalEnrolled += count;
      totalCapacity += cap;
    });

    const averageOccupancy = totalCapacity > 0 ? Math.round((totalEnrolled / totalCapacity) * 100) : 0;
    const occupancyDelta = 4;

    const attentionGroups = active
      .map(g => ({
        id: g.id,
        name: g.name,
        enrolled: g.students?.length || 0,
        capacity: g.capacity || (g.students?.length || 0) || 8,
      }))
      .filter(g => g.capacity > 0 && g.enrolled < g.capacity)
      .sort((a, b) => {
        const rateA = a.enrolled / (a.capacity || 1);
        const rateB = b.enrolled / (b.capacity || 1);
        return rateA - rateB;
      });

    return {
      activeGroupsCount: active.length,
      recruitingGroupsCount: recruiting.length,
      averageOccupancy,
      occupancyDelta,
      attentionGroups,
    };
  }, [groups]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-2 animate-pulse h-full min-h-[190px]" />
    );
  }

  const {
    activeGroupsCount,
    recruitingGroupsCount,
    averageOccupancy,
    occupancyDelta,
    attentionGroups,
  } = groupsSummary;

  const onOpenGroups = () => {
    router.push('/groups');
  };

  const onFillGroup = (groupId: string) => {
    router.push(`/groups/${groupId}`);
  };

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm flex flex-col justify-between h-full min-h-[190px]">
      {/* 1. Шапка карточки */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-50">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Users className="w-3.5 h-3.5" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">Группы</h3>
        </div>
        <button
          type="button"
          onClick={onOpenGroups}
          className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
        >
          Открыть группы <span>→</span>
        </button>
      </div>

      {/* 2. Верхняя панель метрик: Donut + Загрузка + Активные + В наборе */}
      <div className="grid grid-cols-12 gap-2 items-center py-2.5 my-auto">
        
        {/* Кольцевой прогресс-бар (Donut) */}
        <div className="col-span-3 flex items-center justify-center">
          <div className="relative w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center shrink-0">
            <svg className="w-12 h-12 sm:w-14 sm:h-14 -rotate-90" viewBox="0 0 44 44">
              <circle
                cx="22"
                cy="22"
                r="18"
                fill="transparent"
                stroke="#F1F5F9"
                strokeWidth="4"
              />
              <circle
                cx="22"
                cy="22"
                r="18"
                fill="transparent"
                stroke="#10B981"
                strokeWidth="4"
                strokeDasharray={113.1}
                strokeDashoffset={113.1 - (113.1 * Math.min(averageOccupancy, 100)) / 100}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            </svg>
            <span className="absolute text-xs sm:text-sm font-bold text-slate-900">{averageOccupancy}%</span>
          </div>
        </div>

        {/* Описание загрузки и бейдж динамики */}
        <div className="col-span-4 pl-1">
          <span className="text-xs font-semibold text-slate-800 block leading-tight">Средняя загрузка</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">
              ↑ +{occupancyDelta}%
            </span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">к прошлому месяцу</span>
        </div>

        {/* Разделитель и крупные счетчики справа */}
        <div className="col-span-5 flex items-center justify-around border-l border-slate-100 pl-2">
          <div className="text-center">
            <span className="text-lg sm:text-xl font-bold text-slate-900 block leading-none">{activeGroupsCount}</span>
            <span className="text-[10px] text-slate-400 font-medium mt-1 block leading-tight">активных<br/>групп</span>
          </div>
          <div className="text-center">
            <span className="text-lg sm:text-xl font-bold text-slate-900 block leading-none">{recruitingGroupsCount}</span>
            <span className="text-[10px] text-slate-400 font-medium mt-1 block leading-tight">в наборе</span>
          </div>
        </div>
      </div>

      {/* 3. Список групп, требующих внимания */}
      <div className="pt-2 border-t border-slate-50 space-y-1.5">
        <h4 className="text-xs font-bold text-slate-900">Требуют внимания</h4>

        {attentionGroups.length === 0 ? (
          <div className="py-1 flex items-center gap-2 text-xs text-slate-500">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span className="text-[11px]">{activeGroupsCount > 0 ? 'Все группы укомплектованы' : 'Нет активных групп'}</span>
          </div>
        ) : (
          attentionGroups.slice(0, 2).map((group) => {
            const percentage = Math.round((group.enrolled / (group.capacity || 1)) * 100);
            return (
              <div
                key={group.id}
                onClick={() => onFillGroup(group.id)}
                className="flex items-center justify-between gap-2 text-xs py-1 hover:bg-slate-50/60 rounded-lg px-1 -mx-1 transition-colors cursor-pointer group"
              >
                {/* 1. Компактная иконка + Название на всю свободную ширину */}
                <div className="flex items-center gap-2 min-w-0 flex-1 pr-1">
                  <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-semibold text-slate-800 truncate text-xs group-hover:text-blue-600 transition-colors" title={group.name}>
                    {group.name}
                  </span>
                </div>

                {/* 2. Количество мест (1/8) */}
                <span className="font-semibold text-slate-600 shrink-0 text-xs w-7 text-right">
                  {group.enrolled}/{group.capacity}
                </span>

                {/* 3. Компактный монолитный прогресс-бар без точек (w-14 = 56px) */}
                <div className="w-14 bg-slate-100 h-2 rounded-full overflow-hidden shrink-0">
                  <div
                    className="bg-blue-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>

                {/* 4. Кнопка действия */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onFillGroup(group.id);
                  }}
                  className="text-[11px] font-medium text-blue-600 bg-blue-50/70 hover:bg-blue-100 border border-blue-200/60 px-2 py-0.5 rounded-lg shrink-0 transition-colors cursor-pointer"
                >
                  Заполнить
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export { GroupOccupancyWidget as GroupsPanel };

