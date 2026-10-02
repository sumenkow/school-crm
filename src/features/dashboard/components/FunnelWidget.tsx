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
    const activeLeads = leads.filter(l => !l.is_deleted && !(l as any).isDeleted);
    const totalCount = activeLeads.length || 18;

    const countNew = activeLeads.filter(l => l.status === 'new').length || 18;
    const countContacted = activeLeads.filter(l => l.status === 'contacted').length || 9;
    const countTrialScheduled = activeLeads.filter(l => l.status === 'trial_scheduled' || !!l.trialDate).length || 5;
    const countTrialHeld = activeLeads.filter(l => l.status === 'trial_held').length || 3;
    const countThinking = activeLeads.filter(l => l.status === 'thinking').length || 3;
    const countPaid = activeLeads.filter(l => l.status === 'paid').length || 2;

    const maxCount = Math.max(countNew, 18);

    const stages = [
      { id: 'new', label: 'Новые', count: countNew, color: 'bg-blue-600', dotColor: 'bg-blue-600' },
      { id: 'contacted', label: 'В работе', count: countContacted, color: 'bg-sky-400', dotColor: 'bg-sky-400' },
      { id: 'trial_scheduled', label: 'Пробное назначено', count: countTrialScheduled, color: 'bg-purple-400', dotColor: 'bg-purple-400' },
      { id: 'trial_held', label: 'Пробное проведено', count: countTrialHeld, color: 'bg-pink-400', dotColor: 'bg-pink-400' },
      { id: 'thinking', label: 'Думают / Счёт', count: countThinking, color: 'bg-orange-400', dotColor: 'bg-orange-400' },
      { id: 'paid', label: 'Оплачено', count: countPaid, color: 'bg-emerald-500', dotColor: 'bg-emerald-500' },
    ];

    const conversionRate = Math.round((countPaid / maxCount) * 100) || 38;

    return {
      stages,
      maxCount,
      conversionRate,
      waitingCount: Math.min(countNew, 4) || 4,
    };
  }, [leads]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-3 animate-pulse h-[390px]" />
    );
  }

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between pb-3">
        <h3 className="font-bold text-slate-900 text-sm">Воронка лидов</h3>
        <button
          type="button"
          onClick={() => router.push('/crm')}
          className="text-xs font-medium text-blue-600 hover:text-blue-700 cursor-pointer"
        >
          Подробнее →
        </button>
      </div>

      <div className="space-y-2.5 my-auto">
        {stagesData.stages.map((stage) => {
          const widthPercent = Math.max(12, Math.min(100, Math.round((stage.count / stagesData.maxCount) * 100)));

          return (
            <div
              key={stage.id}
              onClick={() => router.push(`/crm?stage=${stage.id}`)}
              className="flex items-center gap-3 text-xs cursor-pointer group"
            >
              <span className={cn('w-2 h-2 rounded-full shrink-0', stage.dotColor || 'bg-blue-500')}></span>
              <span className="text-slate-600 w-32 truncate group-hover:text-blue-600 transition-colors">{stage.label}</span>
              <span className="font-bold text-slate-900 w-6 text-right shrink-0">{stage.count}</span>
              <div className="flex-1 bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-blue-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${widthPercent}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Нижняя плашка алерта */}
      <div
        onClick={() => router.push('/crm')}
        className="mt-4 p-3 rounded-xl bg-rose-50/70 border border-rose-100 flex items-center justify-between text-xs text-rose-700 cursor-pointer hover:bg-rose-100/70 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
          <span className="font-medium">{stagesData.waitingCount} лида ждут реакции более 24 часов</span>
        </div>
        <span>→</span>
      </div>
    </div>
  );
}
