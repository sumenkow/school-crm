'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  UserCheck,
  TrendingUp,
  ChevronRight,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Users
} from 'lucide-react';
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

  const activeLeads = useMemo(() => {
    return leads.filter(l => !l.is_deleted && !(l as any).isDeleted);
  }, [leads]);

  const totalLeads = activeLeads.length || 1;

  const funnelStages = useMemo(() => {
    const countNew = activeLeads.length;
    const countContacted = activeLeads.filter(l => l.status !== 'new' && l.status !== 'lost' && (l.status as string) !== 'no_response').length;
    const countTrialScheduled = activeLeads.filter(l => l.status === 'trial_scheduled' || l.status === 'trial_held' || l.status === 'thinking' || l.status === 'paid' || !!l.trialDate).length;
    const countTrialHeld = activeLeads.filter(l => l.status === 'trial_held' || l.status === 'thinking' || l.status === 'paid').length;
    const countThinking = activeLeads.filter(l => l.status === 'thinking' || l.status === 'paid').length;
    const countPaid = activeLeads.filter(l => l.status === 'paid').length;

    return [
      {
        key: 'new',
        label: 'Новые лиды',
        count: countNew,
        percent: 100,
        color: 'bg-blue-500',
        badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
      },
      {
        key: 'contacted',
        label: 'В работе',
        count: countContacted,
        percent: Math.round((countContacted / totalLeads) * 100),
        color: 'bg-amber-500',
        badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
      },
      {
        key: 'trial_scheduled',
        label: 'Пробное назначено',
        count: countTrialScheduled,
        percent: Math.round((countTrialScheduled / totalLeads) * 100),
        color: 'bg-purple-500',
        badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
      },
      {
        key: 'trial_held',
        label: 'Пробное проведено',
        count: countTrialHeld,
        percent: Math.round((countTrialHeld / totalLeads) * 100),
        color: 'bg-indigo-500',
        badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      },
      {
        key: 'thinking',
        label: 'Думают / Счёт',
        count: countThinking,
        percent: Math.round((countThinking / totalLeads) * 100),
        color: 'bg-teal-500',
        badgeColor: 'bg-teal-50 text-teal-700 border-teal-200',
      },
      {
        key: 'paid',
        label: 'Оплачено (Успех)',
        count: countPaid,
        percent: Math.round((countPaid / totalLeads) * 100),
        color: 'bg-emerald-500',
        badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      },
    ];
  }, [activeLeads, totalLeads]);

  const overallConversion = useMemo(() => {
    const paid = activeLeads.filter(l => l.status === 'paid').length;
    return activeLeads.length > 0 ? Math.round((paid / activeLeads.length) * 100) : 0;
  }, [activeLeads]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-2xs">
        <div className="h-5 w-40 bg-slate-100 rounded animate-pulse" />
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-8 bg-slate-50 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
        <div className="flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-purple-600" />
          <h3 className="text-sm font-bold text-slate-900">Воронка продаж и конверсия</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            Конверсия: {overallConversion}%
          </span>
        </div>
      </div>

      {/* Stages List */}
      <div className="p-4 space-y-2.5 flex-1 overflow-y-auto">
        {funnelStages.map((stage, idx) => (
          <div
            key={stage.key}
            onClick={() => router.push('/crm')}
            className="group cursor-pointer space-y-1"
          >
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-4 text-[10px] font-bold text-slate-400">
                  {idx + 1}.
                </span>
                <span className="font-semibold text-slate-800 group-hover:text-purple-600 transition-colors">
                  {stage.label}
                </span>
              </div>

              <div className="flex items-center gap-2 font-bold">
                <span className="text-slate-900">{stage.count}</span>
                <span className="text-[11px] text-slate-400 font-medium">
                  ({stage.percent}%)
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-500', stage.color)}
                style={{ width: `${Math.max(5, stage.percent)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs">
        <span className="text-slate-500 font-medium">Всего активных лидов: <b>{activeLeads.length}</b></span>
        <button
          type="button"
          onClick={() => router.push('/crm')}
          className="text-xs font-bold text-purple-600 hover:text-purple-700 transition-colors flex items-center gap-1 cursor-pointer"
        >
          <span>В CRM-воронку</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
