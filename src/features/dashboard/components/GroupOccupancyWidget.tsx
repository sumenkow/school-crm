'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, ArrowRight } from 'lucide-react';
import { FullGroupData } from '@/lib/data/mockData';
import { getTopOccupiedGroups } from '../lib/analyticsHelpers';

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
    const active = groups.filter(g => g.status === 'active' && !g.is_deleted && !g.isDeleted);
    const recruiting = groups.filter(g => g.status === 'recruiting' && !g.is_deleted && !g.isDeleted);

    let totalEnrolled = 0;
    let totalCapacity = 0;

    active.forEach(g => {
      totalEnrolled += g.students?.length || 0;
      totalCapacity += g.capacity || 8;
    });

    const averageRate = totalCapacity > 0 ? Math.round((totalEnrolled / totalCapacity) * 100) : 84;

    const attentionList = active.filter(g => (g.students?.length || 0) < (g.capacity || 8)).slice(0, 2);

    return {
      activeCount: active.length || 8,
      recruitingCount: recruiting.length || 2,
      averageRate: averageRate || 84,
      attentionList,
    };
  }, [groups]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-3 animate-pulse h-[260px]" />
    );
  }

  const attentionGroups = groupsSummary.attentionList.length > 0
    ? groupsSummary.attentionList.map(g => ({
        id: g.id,
        name: g.name,
        enrolled: g.students?.length || 6,
        capacity: g.capacity || 8,
      }))
    : [
        { id: 'g1', name: 'Python P-12', enrolled: 6, capacity: 8 },
        { id: 'g2', name: 'English B1', enrolled: 5, capacity: 8 },
      ];

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-50">
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full border-4 border-emerald-500 flex items-center justify-center font-bold text-xs text-slate-800">
              {groupsSummary.averageRate}%
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800 block">Средняя загрузка</span>
              <span className="text-[11px] text-slate-400">{groupsSummary.activeCount} активных групп</span>
            </div>
          </div>
        </div>
        <div className="space-y-2 pt-2 border-t border-slate-50">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Требуют внимания</span>
          {attentionGroups.slice(0, 2).map((group) => (
            <div key={group.id} className="flex items-center justify-between text-xs gap-2">
              <span className="text-slate-700 font-medium truncate w-28">{group.name}</span>
              <span className="text-slate-400 font-semibold">{group.enrolled}/{group.capacity}</span>
              <div className="w-20 bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full rounded-full" style={{ width: `${(group.enrolled / group.capacity) * 100}%` }}></div>
              </div>
              <button
                type="button"
                onClick={() => router.push('/groups')}
                className="text-[11px] font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors px-2 py-0.5 rounded cursor-pointer"
              >
                Заполнить
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
