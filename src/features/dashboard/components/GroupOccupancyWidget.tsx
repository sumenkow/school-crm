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

    const averageRate = totalCapacity > 0 ? Math.round((totalEnrolled / totalCapacity) * 100) : 0;

    const attentionList = active
      .filter(g => {
        const enrolled = g.students?.length || 0;
        const capacity = g.capacity || 0;
        return capacity > 0 && enrolled < capacity;
      })
      .sort((a, b) => {
        const rateA = (a.students?.length || 0) / (a.capacity || 1);
        const rateB = (b.students?.length || 0) / (b.capacity || 1);
        return rateA - rateB;
      })
      .slice(0, 2);

    return {
      activeCount: active.length,
      recruitingCount: recruiting.length,
      averageRate,
      attentionList,
    };
  }, [groups]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm space-y-3 animate-pulse h-[220px]" />
    );
  }

  const { activeCount, averageRate, attentionList } = groupsSummary;

  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-50">
          <h3 className="font-bold text-slate-900 text-sm">Группы</h3>
          <button
            type="button"
            onClick={() => router.push('/groups')}
            className="text-xs font-medium text-blue-600 hover:text-blue-700 cursor-pointer"
          >
            Открыть группы →
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-full border-4 ${averageRate >= 80 ? 'border-emerald-500 text-emerald-700' : averageRate >= 50 ? 'border-blue-500 text-blue-700' : 'border-amber-500 text-amber-700'} flex items-center justify-center font-bold text-xs shrink-0`}>
              {averageRate}%
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-slate-800 block">Средняя загрузка</span>
              <span className="text-[11px] text-slate-400">{activeCount} активных групп</span>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-50">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              {attentionList.length > 0 ? 'Требуют внимания' : 'Статус набора'}
            </span>

            {attentionList.length === 0 ? (
              <div className="py-2 flex items-center gap-2 text-xs text-slate-500">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{activeCount > 0 ? 'Все группы полностью укомплектованы' : 'Нет активных групп'}</span>
              </div>
            ) : (
              attentionList.map((group) => {
                const enrolled = group.students?.length || 0;
                const capacity = group.capacity || enrolled;
                const percent = capacity > 0 ? Math.round((enrolled / capacity) * 100) : 100;

                return (
                  <div key={group.id} className="flex items-center justify-between text-xs gap-2 py-0.5">
                    <span className="text-slate-700 font-medium truncate flex-1 min-w-0">{group.name}</span>
                    <span className="text-slate-400 font-semibold shrink-0">{enrolled}/{capacity}</span>
                    <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden shrink-0">
                      <div className="bg-blue-500 h-full rounded-full" style={{ width: `${Math.min(percent, 100)}%` }} />
                    </div>
                    <button
                      type="button"
                      onClick={() => router.push(`/groups?open=${group.id}`)}
                      className="text-[11px] font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors px-2 py-0.5 rounded cursor-pointer shrink-0"
                    >
                      Заполнить
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

