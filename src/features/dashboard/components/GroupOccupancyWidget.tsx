'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { FullGroupData } from '@/lib/data/mockData';
import { getTopOccupiedGroups } from '../lib/analyticsHelpers';
import { BookOpen, Users, ChevronRight, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface GroupOccupancyWidgetProps {
  groups: FullGroupData[];
  isLoading?: boolean;
}

export function GroupOccupancyWidget({
  groups,
  isLoading = false,
}: GroupOccupancyWidgetProps) {
  const router = useRouter();

  // STRICT CONSTRAINT: Calculate only if the Group entity has capacity and student count fields.
  // If capacity is missing, OMIT the component.
  const occupiedGroups = useMemo(() => {
    return getTopOccupiedGroups(groups, 5);
  }, [groups]);

  const hasValidGroups = groups.some(
    g => !g.is_deleted && !g.isDeleted && typeof g.capacity === 'number' && g.capacity > 0 && Array.isArray(g.students)
  );

  // If no capacity concept or valid groups with capacity exist, OMIT the component
  if (!hasValidGroups) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-2xs">
        <div className="h-5 w-40 bg-slate-100 rounded animate-pulse" />
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 bg-slate-50 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Заполняемость групп</h3>
            <p className="text-[11px] text-slate-500">Топ-5 активных групп по наполняемости</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => router.push('/groups')}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer transition-colors"
        >
          <span>Все группы</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* List */}
      <div className="p-4 space-y-3 flex-1">
        {occupiedGroups.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-xs">
            Нет данных по наполняемости групп
          </div>
        ) : (
          occupiedGroups.map((grp) => {
            const isFull = grp.occupancyPercent >= 80;
            const isMedium = grp.occupancyPercent >= 50 && grp.occupancyPercent < 80;

            const barColor = isFull
              ? 'bg-emerald-500'
              : isMedium
              ? 'bg-indigo-500'
              : 'bg-amber-500';

            const badgeColor = isFull
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : isMedium
              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
              : 'bg-amber-50 text-amber-700 border-amber-200';

            return (
              <div
                key={grp.id}
                onClick={() => router.push(`/groups/${grp.id}`)}
                className="p-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/70 transition-all cursor-pointer group bg-white shadow-2xs"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                      {grp.name}
                    </h4>
                    <p className="text-[11px] text-slate-400 truncate">
                      {grp.courseName}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-bold text-slate-700">
                      {grp.enrolled} <span className="text-slate-400 font-normal">/ {grp.capacity} мест</span>
                    </span>
                    <span className={cn('text-[10px] font-extrabold px-2 py-0.5 rounded-md border', badgeColor)}>
                      {grp.occupancyPercent}%
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all duration-500', barColor)}
                    style={{ width: `${grp.occupancyPercent}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
