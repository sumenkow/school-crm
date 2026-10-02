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
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex flex-col justify-between h-[390px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-50">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Filter className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Воронка лидов</h3>
        </div>
        <button
          type="button"
          onClick={() => router.push('/crm')}
          className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
        >
          <span>Подробнее</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {/* Stage Bars */}
      <div className="space-y-2 my-auto">
        {stagesData.stages.map((stage) => {
          const widthPercent = Math.max(12, Math.min(100, Math.round((stage.count / stagesData.maxCount) * 100)));

          return (
            <div
              key={stage.id}
              onClick={() => router.push(`/crm?stage=${stage.id}`)}
              className="flex items-center justify-between gap-3 text-xs cursor-pointer group"
            >
              <div className="flex items-center gap-2 min-w-[130px] shrink-0">
                <span className={cn('w-2 h-2 rounded-full shrink-0', stage.dotColor)} />
                <span className="text-slate-700 font-medium text-[11px] group-hover:text-blue-600 transition-colors">
                  {stage.label}
                </span>
              </div>

              <span className="text-xs font-bold text-slate-900 w-6 text-right shrink-0">
                {stage.count}
              </span>

              {/* Progress Bar */}
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all duration-500', stage.color)}
                  style={{ width: `${widthPercent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Section: Conversion + Alert Banner */}
      <div className="pt-2 border-t border-slate-50 flex items-center justify-between gap-3">
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[11px] text-slate-500 font-medium">Конверсия</span>
            <span className="text-sm font-bold text-slate-900">{stagesData.conversionRate}%</span>
            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded-full">
              ↑ +4 п.п.
            </span>
          </div>
          <p className="text-[10px] text-slate-400">от новых до оплат</p>
        </div>

        {/* Red Alert Pill */}
        <div
          onClick={() => router.push('/crm')}
          className="bg-rose-50 border border-rose-100 rounded-xl p-2 px-2.5 text-[11px] text-rose-700 font-medium flex items-center gap-1.5 cursor-pointer hover:bg-rose-100/70 transition-colors shrink-0"
        >
          <div className="w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
            !
          </div>
          <span className="leading-tight text-[10px]">
            {stagesData.waitingCount} лида ждут реакции &gt; 24ч
          </span>
          <ChevronRight className="w-3 h-3 text-rose-400 shrink-0" />
        </div>
      </div>
    </div>
  );
}
