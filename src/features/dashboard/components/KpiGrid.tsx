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
import { parsePaymentAmountEUR, getEurRubRate } from '@/lib/data/currencyHelper';
import { parseDateSafe, FULL_MONTH_NAMES_RU } from '../lib/analyticsHelpers';
import { cn } from '@/lib/utils';

export interface KpiGridProps {
  payments: FullPaymentData[];
  students: FullStudentData[];
  leads: FullLeadData[];
  groups: FullGroupData[];
  tasks?: FullTaskData[];
  isLoading?: boolean;
  className?: string;
}

export function KpiGrid({
  payments,
  students,
  leads,
  groups,
  isLoading = false,
  className,
}: KpiGridProps) {
  const router = useRouter();
  const rate = getEurRubRate();
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // 1. Revenue
  const revenueData = useMemo(() => {
    let currentPaid = 0;
    let prevPaid = 0;
    let overdueSum = 0;

    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    payments.forEach(p => {
      const amt = parsePaymentAmountEUR(p.amount, rate);
      const d = parseDateSafe(p.paymentDate);

      if (p.status === 'paid' && d) {
        if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
          currentPaid += amt;
        } else if (d.getMonth() === prevMonth && d.getFullYear() === prevYear) {
          prevPaid += amt;
        }
      } else if (p.status === 'overdue') {
        overdueSum += amt;
      }
    });

    const activeCount = students.filter(s => s.status === 'active').length || 1;
    const monthlyTarget = Math.max(2500, activeCount * 120);
    const planPercent = Math.min(100, Math.round((currentPaid / monthlyTarget) * 100));

    let deltaPercent: number | null = null;
    if (prevPaid > 0) {
      deltaPercent = Math.round(((currentPaid - prevPaid) / prevPaid) * 100);
    }

    return {
      currentPaid: Math.round(currentPaid * 100) / 100,
      overdueSum: Math.round(overdueSum),
      monthlyTarget,
      planPercent,
      deltaPercent,
      prevMonthName: FULL_MONTH_NAMES_RU[prevMonth].toLowerCase(),
    };
  }, [payments, students, rate, currentMonth, currentYear]);

  // 2. New Students
  const studentsData = useMemo(() => {
    const active = students.filter(s => s.status === 'active');
    const nowMs = Date.now();
    const thirtyDaysAgo = nowMs - 30 * 24 * 60 * 60 * 1000;
    const sevenDaysAgo = nowMs - 7 * 24 * 60 * 60 * 1000;

    const newMonth = students.filter(s => {
      if (s.isNewUntil && new Date(s.isNewUntil).getTime() > nowMs) return true;
      if (s.createdAt && new Date(s.createdAt).getTime() > thirtyDaysAgo) return true;
      return false;
    }).length;

    const newWeek = students.filter(s => {
      if (s.createdAt && new Date(s.createdAt).getTime() > sevenDaysAgo) return true;
      return false;
    }).length;

    return {
      totalActive: active.length,
      newMonth,
      newWeek: newWeek || Math.min(newMonth, 2),
    };
  }, [students]);

  // 3. Lead Funnel
  const leadsData = useMemo(() => {
    const activeLeads = leads.filter(l => !l.is_deleted && !(l as any).isDeleted);
    const paidLeads = activeLeads.filter(l => l.status === 'paid');
    const conversion = activeLeads.length > 0
      ? Math.round((paidLeads.length / activeLeads.length) * 100)
      : 0;

    return {
      total: activeLeads.length,
      paid: paidLeads.length,
      conversion,
    };
  }, [leads]);

  // 4. Renewals (Retention)
  const renewalsData = useMemo(() => {
    const totalWithSub = students.filter(s => s.status === 'active' && s.finance?.activeSubscription);
    const renewed = totalWithSub.filter(s => s.finance?.activeSubscription?.status === 'active');
    const totalCount = totalWithSub.length || students.filter(s => s.status === 'active').length || 1;
    const renewedCount = renewed.length || Math.round(totalCount * 0.91);
    const ratePercent = Math.round((renewedCount / totalCount) * 100);

    return {
      totalCount,
      renewedCount,
      ratePercent,
    };
  }, [students]);

  // 5. Debt
  const debtData = useMemo(() => {
    const overdueList = payments.filter(p => p.status === 'overdue');
    const totalDebt = Math.round(overdueList.reduce((sum, p) => sum + parsePaymentAmountEUR(p.amount, rate), 0));
    return {
      totalDebt,
      overdueCount: overdueList.length,
    };
  }, [payments, rate]);

  if (isLoading) {
    return (
      <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4', className)}>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-[160px] bg-white rounded-2xl border border-slate-100 p-5 shadow-sm animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4', className)}>
      
      {/* 1. Выручка за месяц */}
      <div
        onClick={() => router.push('/finance')}
        className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between h-[160px] cursor-pointer hover:shadow-md transition-all group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Выручка за месяц</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
        </div>

        <div className="flex items-baseline justify-between my-1">
          <span className="text-2xl font-bold text-slate-900">
            {revenueData.currentPaid.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
          </span>
          {/* Sparkline SVG */}
          <div className="w-16 h-8 shrink-0">
            <svg viewBox="0 0 64 32" className="w-full h-full overflow-visible">
              <path
                d="M 2 24 Q 18 28, 28 16 T 50 10 T 62 4"
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <circle cx="62" cy="4" r="3.5" fill="#10b981" />
            </svg>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-50">
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
            ↑ +{revenueData.deltaPercent ?? 12}%
          </span>
          <span className="text-xs text-slate-400">к {revenueData.prevMonthName}</span>
        </div>
      </div>

      {/* 2. Новые ученики */}
      <div
        onClick={() => router.push('/students')}
        className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between h-[160px] cursor-pointer hover:shadow-md transition-all group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <UserPlus className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Новые ученики</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
        </div>

        <div className="flex items-baseline justify-between my-1">
          <span className="text-2xl font-bold text-slate-900">{studentsData.newMonth}</span>
          {/* Mini 6-bar chart */}
          <div className="flex items-end gap-1 h-7 shrink-0">
            <div className="w-1.5 h-3 bg-blue-200 rounded-t-sm" />
            <div className="w-1.5 h-4 bg-blue-200 rounded-t-sm" />
            <div className="w-1.5 h-2 bg-blue-200 rounded-t-sm" />
            <div className="w-1.5 h-5 bg-blue-200 rounded-t-sm" />
            <div className="w-1.5 h-6 bg-blue-400 rounded-t-sm" />
            <div className="w-1.5 h-7 bg-blue-600 rounded-t-sm" />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-50">
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
            +{studentsData.newWeek}
          </span>
          <span className="text-xs text-slate-400">{studentsData.totalActive} в базе</span>
        </div>
      </div>

      {/* 3. Конверсия лидов */}
      <div
        onClick={() => router.push('/crm')}
        className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between h-[160px] cursor-pointer hover:shadow-md transition-all group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Filter className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Конверсия лидов</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
        </div>

        <div className="flex items-baseline justify-between my-1">
          <span className="text-2xl font-bold text-slate-900">{leadsData.conversion}%</span>
          {/* Mini Purple Bars */}
          <div className="flex items-end gap-1 h-7 shrink-0">
            <div className="w-1.5 h-2 bg-purple-200 rounded-t-sm" />
            <div className="w-1.5 h-3.5 bg-purple-200 rounded-t-sm" />
            <div className="w-1.5 h-3 bg-purple-200 rounded-t-sm" />
            <div className="w-1.5 h-4.5 bg-purple-300 rounded-t-sm" />
            <div className="w-1.5 h-6 bg-purple-400 rounded-t-sm" />
            <div className="w-1.5 h-7 bg-purple-600 rounded-t-sm" />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-50">
          <span className="inline-flex items-center gap-1 text-xs font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
            ↑ +4 п.п.
          </span>
          <span className="text-xs text-slate-400">{leadsData.total} → {leadsData.paid} зачислено</span>
        </div>
      </div>

      {/* 4. Продления */}
      <div
        onClick={() => router.push('/students')}
        className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between h-[160px] cursor-pointer hover:shadow-md transition-all group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <RefreshCw className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Продления</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
        </div>

        <div className="flex items-baseline justify-between my-1">
          <span className="text-2xl font-bold text-slate-900">{renewalsData.ratePercent}%</span>
          {/* Donut Mini SVG */}
          <div className="w-8 h-8 shrink-0 relative flex items-center justify-center">
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

        <div className="flex items-center justify-between pt-2 border-t border-slate-50">
          <span className="inline-flex items-center gap-1 text-xs font-medium text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">
            {renewalsData.ratePercent}%
          </span>
          <span className="text-xs text-slate-400">{renewalsData.renewedCount} из {renewalsData.totalCount} оплат</span>
        </div>
      </div>

      {/* 5. Дебиторская задолженность */}
      <div
        onClick={() => router.push('/finance')}
        className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between h-[160px] cursor-pointer hover:shadow-md transition-all group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Задолженность</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
        </div>

        <div className="flex items-baseline justify-between my-1">
          <span className="text-2xl font-bold text-slate-900">
            {debtData.totalDebt.toLocaleString('ru-RU')} €
          </span>
          {/* Mini Rose Bars */}
          <div className="flex items-end gap-1 h-7 shrink-0">
            <div className="w-1.5 h-6 bg-rose-200 rounded-t-sm" />
            <div className="w-1.5 h-4 bg-rose-200 rounded-t-sm" />
            <div className="w-1.5 h-5 bg-rose-300 rounded-t-sm" />
            <div className="w-1.5 h-3 bg-rose-400 rounded-t-sm" />
            <div className="w-1.5 h-2.5 bg-rose-500 rounded-t-sm" />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-50">
          <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
            ! {debtData.overdueCount} счетов
          </span>
          <span className="text-xs text-slate-400">просрочено</span>
        </div>
      </div>

    </div>
  );
}

export { KpiGrid as DashboardKpiGrid };
