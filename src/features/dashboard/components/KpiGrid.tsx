'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  CreditCard,
  UserPlus,
  Filter,
  RefreshCw,
  Calendar,
  AlertCircle,
  ChevronRight
} from 'lucide-react';
import { FullPaymentData, FullStudentData, FullLeadData, FullGroupData, FullTaskData } from '@/lib/data/mockData';
import {
  getDashboardFinanceMetrics,
  generateSparklinePath,
  FULL_MONTH_NAMES_RU,
} from '../lib/analyticsHelpers';
import { cn } from '@/lib/utils';

export interface KpiGridProps {
  payments: FullPaymentData[];
  students: FullStudentData[];
  leads: FullLeadData[];
  groups: FullGroupData[];
  tasks?: FullTaskData[];
  selectedDate?: Date;
  isLoading?: boolean;
  className?: string;
}

export function KpiGrid({
  payments,
  students,
  leads,
  groups,
  selectedDate,
  isLoading = false,
  className,
}: KpiGridProps) {
  const router = useRouter();
  const activeDate = selectedDate || new Date();

  // 1. Unified Finance Data
  const financeData = useMemo(() => {
    return getDashboardFinanceMetrics(payments, students, activeDate);
  }, [payments, students, activeDate]);

  // Real Sparkline for Revenue
  const sparkline = useMemo(() => {
    return generateSparklinePath(financeData.sparklinePoints, 64, 30, 3);
  }, [financeData.sparklinePoints]);

  // 2. New Students
  const studentsData = useMemo(() => {
    const active = students.filter(s => s.status === 'active');
    const refYear = activeDate.getFullYear();
    const refMonth = activeDate.getMonth();
    const nowMs = activeDate.getTime();
    const thirtyDaysAgo = nowMs - 30 * 24 * 60 * 60 * 1000;
    const sevenDaysAgo = nowMs - 7 * 24 * 60 * 60 * 1000;

    const newMonth = students.filter(s => {
      if (s.createdAt) {
        const d = new Date(s.createdAt);
        if (d.getFullYear() === refYear && d.getMonth() === refMonth) return true;
      }
      if (s.isNewUntil && new Date(s.isNewUntil).getTime() > nowMs) return true;
      if (s.createdAt && new Date(s.createdAt).getTime() > thirtyDaysAgo && new Date(s.createdAt).getTime() <= nowMs) return true;
      return false;
    }).length;

    const newWeek = students.filter(s => {
      if (s.createdAt) {
        const cd = new Date(s.createdAt).getTime();
        return cd > sevenDaysAgo && cd <= nowMs;
      }
      return false;
    }).length;

    // Real weekly distribution for mini-bars (last 6 weeks from activeDate)
    const weekBars = [0, 0, 0, 0, 0, 0];
    students.forEach(s => {
      if (!s.createdAt) return;
      const cd = new Date(s.createdAt).getTime();
      const diffWeeks = Math.floor((nowMs - cd) / (7 * 24 * 60 * 60 * 1000));
      if (diffWeeks >= 0 && diffWeeks < 6) {
        weekBars[5 - diffWeeks] += 1;
      }
    });

    const maxBar = Math.max(...weekBars, 1);

    return {
      totalActive: active.length,
      newMonth,
      newWeek,
      weekBars,
      maxBar,
    };
  }, [students, activeDate]);

  // 3. Lead Funnel
  const leadsData = useMemo(() => {
    const activeLeads = leads.filter(l => !l.is_deleted && !(l as any).isDeleted);
    const paidLeads = activeLeads.filter(l => l.status === 'paid');
    const conversion = activeLeads.length > 0
      ? Math.round((paidLeads.length / activeLeads.length) * 100)
      : 0;

    const countNew = activeLeads.filter(l => l.status === 'new').length;
    const countContacted = activeLeads.filter(l => l.status === 'contacted').length;
    const countTrial = activeLeads.filter(l => l.status === 'trial_scheduled' || l.status === 'trial_held').length;
    const countThinking = activeLeads.filter(l => l.status === 'thinking').length;
    const countPaid = paidLeads.length;

    const stageBars = [countNew, countContacted, countTrial, countThinking, countPaid];
    const maxStage = Math.max(...stageBars, 1);

    return {
      total: activeLeads.length,
      paid: paidLeads.length,
      conversion,
      stageBars,
      maxStage,
    };
  }, [leads]);

  // 4. Renewals (Retention)
  const renewalsData = useMemo(() => {
    const activeStudents = students.filter(s => s.status === 'active');
    const totalCount = activeStudents.length;
    const renewed = activeStudents.filter(s => {
      const sub = s.finance?.activeSubscription;
      return sub && (sub.status === 'active' || (sub.lessonsRemaining && sub.lessonsRemaining > 0));
    });

    const renewedCount = renewed.length;
    const ratePercent = totalCount > 0 ? Math.round((renewedCount / totalCount) * 100) : 0;

    return {
      totalCount,
      renewedCount,
      ratePercent,
    };
  }, [students]);

  // 5. Debt
  const debtData = useMemo(() => {
    const overdueList = payments.filter(p => p.status === 'overdue');
    return {
      totalDebt: financeData.overdueEur,
      overdueCount: overdueList.length,
    };
  }, [payments, financeData.overdueEur]);

  if (isLoading) {
    return (
      <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3', className)}>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-[115px] bg-white rounded-2xl border border-slate-100 p-3.5 shadow-sm animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3', className)}>
      
      {/* 1. Выручка за месяц */}
      <div
        onClick={() => router.push('/finance')}
        className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-sm flex flex-col justify-between h-[115px] cursor-pointer hover:shadow-md transition-all group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CreditCard className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 truncate">Выручка за месяц</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600 transition-colors shrink-0" />
        </div>

        <div className="flex items-baseline justify-between my-0.5">
          <span className="text-xl font-bold text-slate-900 tracking-tight">
            {financeData.paidEur.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
          </span>
          {/* Real Sparkline SVG */}
          <div className="w-14 h-6 shrink-0">
            <svg viewBox="0 0 64 30" className="w-full h-full overflow-visible">
              <path
                d={sparkline.path}
                fill="none"
                stroke={sparkline.hasData ? '#10b981' : '#cbd5e1'}
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              {sparkline.lastPoint && (
                <circle cx={sparkline.lastPoint.x} cy={sparkline.lastPoint.y} r="3" fill="#10b981" />
              )}
            </svg>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1.5 border-t border-slate-50">
          {financeData.deltaPercent !== null ? (
            <span className={cn(
              'inline-flex items-center gap-0.5 text-[11px] font-medium px-2 py-0.5 rounded-full',
              financeData.deltaPercent > 0 ? 'text-emerald-600 bg-emerald-50' : financeData.deltaPercent < 0 ? 'text-rose-600 bg-rose-50' : 'text-slate-600 bg-slate-100'
            )}>
              {financeData.deltaPercent > 0 ? `↑ +${financeData.deltaPercent}%` : financeData.deltaPercent < 0 ? `↓ ${Math.abs(financeData.deltaPercent)}%` : '0%'}
            </span>
          ) : (
            <span className="inline-flex items-center text-[11px] font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full">
              текущий месяц
            </span>
          )}
          <span className="text-[11px] text-slate-400 truncate">
            {financeData.deltaPercent !== null ? `к ${financeData.prevMonthName}` : `цель: ${financeData.monthlyTarget} €`}
          </span>
        </div>
      </div>

      {/* 2. Новые ученики */}
      <div
        onClick={() => router.push('/students')}
        className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-sm flex flex-col justify-between h-[115px] cursor-pointer hover:shadow-md transition-all group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <UserPlus className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 truncate">Новые ученики</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600 transition-colors shrink-0" />
        </div>

        <div className="flex items-baseline justify-between my-0.5">
          <span className="text-xl font-bold text-slate-900">{studentsData.newMonth}</span>
          {/* Real weekly bar chart */}
          <div className="flex items-end gap-1 h-5 shrink-0">
            {studentsData.weekBars.map((val, idx) => {
              const barHeight = Math.max(3, Math.round((val / studentsData.maxBar) * 18));
              return (
                <div
                  key={idx}
                  className={cn(
                    'w-1.5 rounded-t-sm transition-all',
                    idx === 5 ? 'bg-blue-600' : 'bg-blue-200'
                  )}
                  style={{ height: `${barHeight}px` }}
                />
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between pt-1.5 border-t border-slate-50">
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
            +{studentsData.newWeek} за нед.
          </span>
          <span className="text-[11px] text-slate-400">{studentsData.totalActive} в базе</span>
        </div>
      </div>

      {/* 3. Конверсия лидов */}
      <div
        onClick={() => router.push('/crm')}
        className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-sm flex flex-col justify-between h-[115px] cursor-pointer hover:shadow-md transition-all group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Filter className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 truncate">Конверсия лидов</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600 transition-colors shrink-0" />
        </div>

        <div className="flex items-baseline justify-between my-0.5">
          <span className="text-xl font-bold text-slate-900">{leadsData.conversion}%</span>
          {/* Real Stage Distribution Bars */}
          <div className="flex items-end gap-1 h-5 shrink-0">
            {leadsData.stageBars.map((val, idx) => {
              const barHeight = Math.max(3, Math.round((val / leadsData.maxStage) * 18));
              return (
                <div
                  key={idx}
                  className={cn(
                    'w-1.5 rounded-t-sm',
                    idx === 4 ? 'bg-indigo-600' : 'bg-indigo-200'
                  )}
                  style={{ height: `${barHeight}px` }}
                />
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between pt-1.5 border-t border-slate-50 gap-1">
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full shrink-0">
            {leadsData.total} → {leadsData.paid}
          </span>
          <span className="text-[11px] text-slate-400 truncate">от новых к оплате</span>
        </div>
      </div>

      {/* 4. Продления */}
      <div
        onClick={() => router.push('/students')}
        className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-sm flex flex-col justify-between h-[115px] cursor-pointer hover:shadow-md transition-all group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
              <RefreshCw className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 truncate">Продления</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600 transition-colors shrink-0" />
        </div>

        <div className="flex items-baseline justify-between my-0.5">
          <span className="text-xl font-bold text-slate-900">{renewalsData.ratePercent}%</span>
          {/* Donut Mini SVG */}
          <div className="w-6 h-6 shrink-0 relative flex items-center justify-center">
            <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
              <path
                className="text-slate-100"
                strokeWidth="4"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-teal-500"
                strokeDasharray={`${renewalsData.ratePercent}, 100`}
                strokeWidth="4"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1.5 border-t border-slate-50">
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">
            {renewalsData.ratePercent}%
          </span>
          <span className="text-[11px] text-slate-400">{renewalsData.renewedCount} из {renewalsData.totalCount}</span>
        </div>
      </div>

      {/* 5. Дебиторская задолженность */}
      <div
        onClick={() => router.push('/finance')}
        className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-sm flex flex-col justify-between h-[115px] cursor-pointer hover:shadow-md transition-all group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 truncate">Задолженность</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600 transition-colors shrink-0" />
        </div>

        <div className="flex items-baseline justify-between my-0.5">
          <span className="text-xl font-bold text-slate-900">
            {debtData.totalDebt.toLocaleString('ru-RU')} €
          </span>
          {/* Mini Status Indicator */}
          <div className="w-6 h-6 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
          </div>
        </div>

        <div className="flex items-center justify-between pt-1.5 border-t border-slate-50">
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
            {debtData.overdueCount > 0 ? `! ${debtData.overdueCount} счетов` : '0 долгов'}
          </span>
          <span className="text-[11px] text-slate-400">просрочено</span>
        </div>
      </div>

    </div>
  );
}

export { KpiGrid as DashboardKpiGrid };

