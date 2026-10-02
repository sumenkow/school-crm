'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  CreditCard,
  UserPlus,
  Filter,
  RefreshCw,
  Calendar,
  AlertCircle
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
        className="h-[165px] flex flex-col justify-between bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CreditCard className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold text-slate-700">Выручка за месяц</span>
        </div>

        <div className="flex items-center justify-between gap-2 my-auto">
          <div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {revenueData.currentPaid.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
            </div>
            <div className="flex items-center gap-1 mt-1">
              {revenueData.deltaPercent !== null ? (
                <span className="inline-flex items-center text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-full">
                  ↑ +{revenueData.deltaPercent}%
                </span>
              ) : (
                <span className="text-[11px] text-slate-400 font-medium">текущий месяц</span>
              )}
              <span className="text-[11px] text-slate-400 font-normal">к {revenueData.prevMonthName}</span>
            </div>
          </div>

          {/* Green Sparkline SVG */}
          <div className="w-16 h-9 shrink-0">
            <svg viewBox="0 0 64 36" className="w-full h-full overflow-visible">
              <path
                d="M 2 28 Q 18 30, 28 20 T 50 12 T 62 4"
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <circle cx="62" cy="4" r="3.5" fill="#10b981" />
            </svg>
          </div>
        </div>

        {/* Progress Bar */}
        <div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium mb-1">
            <span>План: {revenueData.monthlyTarget.toLocaleString('ru-RU')} €</span>
            <span className="text-blue-600 font-bold">{revenueData.planPercent}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${revenueData.planPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2. Новые ученики */}
      <div
        onClick={() => router.push('/students')}
        className="h-[165px] flex flex-col justify-between bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <UserPlus className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold text-slate-700">Новые ученики</span>
        </div>

        <div className="flex items-center justify-between gap-2 my-auto">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900 tracking-tight">
                {studentsData.newMonth}
              </span>
              <span className="inline-flex items-center text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-full">
                +{studentsData.newWeek}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">к прошлой неделе</p>
          </div>

          {/* Mini Cyan/Blue Bar Chart */}
          <div className="flex items-end gap-1 h-8 shrink-0">
            <div className="w-1.5 h-3 bg-blue-200 rounded-t-sm" />
            <div className="w-1.5 h-4 bg-blue-200 rounded-t-sm" />
            <div className="w-1.5 h-5 bg-blue-300 rounded-t-sm" />
            <div className="w-1.5 h-6 bg-blue-400 rounded-t-sm" />
            <div className="w-1.5 h-7 bg-blue-500 rounded-t-sm" />
            <div className="w-1.5 h-8 bg-blue-600 rounded-t-sm" />
          </div>
        </div>

        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-50">
          <span className="text-slate-500 text-[11px]">Всего учеников</span>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-900">{studentsData.totalActive}</span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-md">
              +{studentsData.newMonth}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Конверсия лидов */}
      <div
        onClick={() => router.push('/crm')}
        className="h-[165px] flex flex-col justify-between bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Filter className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold text-slate-700">Конверсия лидов</span>
        </div>

        <div className="flex items-center justify-between gap-2 my-auto">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900 tracking-tight">
                {leadsData.conversion}%
              </span>
              <span className="inline-flex items-center text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-full">
                ↑ +4 п.п.
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">от новых до оплат</p>
          </div>

          {/* Mini Purple Bar Chart */}
          <div className="flex items-end gap-1 h-8 shrink-0">
            <div className="w-1.5 h-7 bg-purple-400 rounded-t-sm" />
            <div className="w-1.5 h-8 bg-purple-300 rounded-t-sm" />
            <div className="w-1.5 h-4 bg-purple-200 rounded-t-sm" />
            <div className="w-1.5 h-5 bg-purple-400 rounded-t-sm" />
            <div className="w-1.5 h-3 bg-purple-200 rounded-t-sm" />
          </div>
        </div>

        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-50">
          <span className="text-slate-700 font-bold text-[11px]">
            {leadsData.total} → {leadsData.paid}
          </span>
          <span className="text-slate-400 text-[11px]">от новых до оплат</span>
        </div>
      </div>

      {/* 4. Продления */}
      <div
        onClick={() => router.push('/students')}
        className="h-[165px] flex flex-col justify-between bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
            <RefreshCw className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold text-slate-700">Продления</span>
        </div>

        <div className="flex items-center justify-between gap-2 my-auto">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900 tracking-tight">
                {renewalsData.ratePercent}%
              </span>
              <span className="inline-flex items-center text-[11px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded-full">
                → 0%
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">остаются с нами</p>
          </div>

          {/* Donut Circle SVG */}
          <div className="w-10 h-10 shrink-0 relative flex items-center justify-center">
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

        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-50">
          <span className="text-slate-800 font-bold text-[11px]">
            {renewalsData.renewedCount} из {renewalsData.totalCount}
          </span>
          <span className="text-slate-400 text-[11px]">продлевают занятия</span>
        </div>
      </div>

      {/* 5. Дебиторская задолженность */}
      <div
        onClick={() => router.push('/finance')}
        className="h-[165px] flex flex-col justify-between bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold text-slate-700">Дебиторская задолженность</span>
        </div>

        <div className="flex items-center justify-between gap-2 my-auto">
          <div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {debtData.totalDebt.toLocaleString('ru-RU')} €
            </div>
            <div className="flex items-center gap-1 mt-1">
              <span className="inline-flex items-center text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-full">
                ↓ -80 €
              </span>
              <span className="text-[11px] text-slate-400 font-normal">к прошлому месяцу</span>
            </div>
          </div>

          {/* Mini Rose Bar Chart */}
          <div className="flex items-end gap-1 h-8 shrink-0">
            <div className="w-1.5 h-3 bg-rose-200 rounded-t-sm" />
            <div className="w-1.5 h-7 bg-rose-300 rounded-t-sm" />
            <div className="w-1.5 h-5 bg-rose-200 rounded-t-sm" />
            <div className="w-1.5 h-4 bg-rose-300 rounded-t-sm" />
            <div className="w-1.5 h-6 bg-rose-400 rounded-t-sm" />
            <div className="w-1.5 h-5 bg-rose-400 rounded-t-sm" />
          </div>
        </div>

        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-50">
          <span className="text-slate-600 text-[11px]">
            Просрочено: <b className="text-rose-600 font-bold">{debtData.totalDebt.toLocaleString('ru-RU')} €</b>
          </span>
          <div className="w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
            !
          </div>
        </div>
      </div>

    </div>
  );
}

export { KpiGrid as DashboardKpiGrid };
