'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Filter, ArrowRight, AlertCircle, ChevronRight } from 'lucide-react';
import { FullLeadData } from '@/lib/data/mockData';
import { cn } from '@/lib/utils';

export interface FunnelWidgetProps {
  leads: FullLeadData[];
  isLoading?: boolean;
}

export function FunnelWidget({
  leads,
  isLoading = false,
}: FunnelWidgetProps) {
  const router = useRouter();

  const stagesData = useMemo(() => {
    const activeLeads = (leads || []).filter(l => !l.is_deleted && !(l as any).isDeleted);
    const totalCount = activeLeads.length;

    const countNew = activeLeads.filter(l => (l.status as string) === 'new').length;
    const countContacted = activeLeads.filter(l => (l.status as string) === 'contacted' || (l.status as string) === 'in_progress').length;
    const countTrialScheduled = activeLeads.filter(l => (l.status as string) === 'trial_scheduled' || !!l.trialDate).length;
    const countTrialHeld = activeLeads.filter(l => (l.status as string) === 'trial_held' || (l.status as string) === 'trial_completed').length;
    const countThinking = activeLeads.filter(l => (l.status as string) === 'thinking' || (l.status as string) === 'decision').length;
    const countPaid = activeLeads.filter(l => (l.status as string) === 'paid' || (l.status as string) === 'enrolled' || (l.status as string) === 'converted').length;

    const maxCount = Math.max(countNew, countContacted, countTrialScheduled, countTrialHeld, countThinking, countPaid, 1);

    const stages = [
      { id: 'new', label: 'Новые', count: countNew, color: 'bg-blue-600', dotColor: 'bg-blue-600' },
      { id: 'contacted', label: 'В работе', count: countContacted, color: 'bg-sky-400', dotColor: 'bg-sky-400' },
      { id: 'trial_scheduled', label: 'Пробное назначено', count: countTrialScheduled, color: 'bg-purple-400', dotColor: 'bg-purple-400' },
      { id: 'trial_held', label: 'Пробное проведено', count: countTrialHeld, color: 'bg-pink-400', dotColor: 'bg-pink-400' },
      { id: 'thinking', label: 'Думают / Счёт', count: countThinking, color: 'bg-orange-400', dotColor: 'bg-orange-400' },
      { id: 'paid', label: 'Оплачено', count: countPaid, color: 'bg-emerald-500', dotColor: 'bg-emerald-500' },
    ];

    const conversionRate = totalCount > 0 ? Math.round((countPaid / totalCount) * 100) : 0;

    // Calculate leads waiting > 24 hours
    const now = new Date().getTime();
    const dayMs = 24 * 60 * 60 * 1000;
    const waitingCount = activeLeads.filter(l => {
      const st = l.status as string;
      if (st !== 'new' && st !== 'contacted') return false;
      const createdTime = (l as any).created_at || l.createdAt;
      if (!createdTime) return false;
      const leadTime = new Date(createdTime).getTime();
      return !isNaN(leadTime) && (now - leadTime) > dayMs;
    }).length;

    return {
      stages,
      maxCount,
      conversionRate,
      waitingCount,
    };
  }, [leads]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-3.5 shadow-sm space-y-3 animate-pulse h-[260px]" />
    );
  }

  return (
    <div className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-sm flex flex-col justify-between h-[260px]">
      <div>
        <div className="flex items-center justify-between pb-1.5 border-b border-slate-50">
          <h3 className="font-bold text-slate-900 text-sm">Воронка лидов</h3>
          <button
            type="button"
            onClick={() => router.push('/crm')}
            className="text-xs font-medium text-blue-600 hover:text-blue-700 cursor-pointer"
          >
            Подробнее →
          </button>
        </div>

        <div className="space-y-1 my-1">
          {stagesData.stages.map((stage) => {
            const widthPercent = Math.max(8, Math.min(100, Math.round((stage.count / stagesData.maxCount) * 100)));

            return (
              <div
                key={stage.id}
                onClick={() => router.push(`/crm?stage=${stage.id}`)}
                className="flex items-center gap-2 text-xs cursor-pointer group py-0.5"
              >
                <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', stage.dotColor || 'bg-blue-500')}></span>
                <span className="text-slate-600 font-medium text-[11px] w-28 shrink-0 truncate group-hover:text-blue-600 transition-colors">
                  {stage.label}
                </span>
                <span className="font-bold text-slate-900 w-4 text-right shrink-0 text-xs">
                  {stage.count}
                </span>
                <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${widthPercent}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Conversion Row */}
        <div className="flex items-center justify-between px-1 py-1 border-t border-slate-50 mt-1">
          <span className="text-[11px] text-slate-500">Конверсия</span>
          <div className="flex items-baseline gap-1">
            <span className="font-bold text-slate-900 text-xs">{stagesData.conversionRate}%</span>
            <span className="text-[10px] text-slate-400">от новых до оплат</span>
          </div>
        </div>
      </div>

      {/* Компактный нижний алерт (28px) */}
      <div
        onClick={() => router.push('/crm')}
        className="h-7 px-2.5 rounded-lg bg-rose-50/90 border border-rose-100 flex items-center justify-between text-xs text-rose-700 cursor-pointer hover:bg-rose-100 transition-colors"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0"></span>
          <span className="font-medium text-[10px] truncate">
            {(() => {
              const count = stagesData.waitingCount;
              if (count === 0) return 'Все лиды обработаны';
              const mod10 = count % 10;
              const mod100 = count % 100;
              if (mod10 === 1 && mod100 !== 11) {
                return `${count} лид ждет реакции более 24 часов`;
              }
              if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
                return `${count} лида ждут реакции более 24 часов`;
              }
              return `${count} лидов ждут реакции более 24 часов`;
            })()}
          </span>
        </div>
        <span className="shrink-0 text-xs font-bold leading-none">→</span>
      </div>
    </div>
  );
}
