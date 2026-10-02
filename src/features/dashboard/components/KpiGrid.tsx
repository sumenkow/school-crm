'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  CreditCard,
  Users,
  UserCheck,
  RefreshCw,
  AlertCircle,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { FullPaymentData, FullStudentData, FullLeadData, FullGroupData, FullTaskData } from '@/lib/data/mockData';
import { parsePaymentAmountEUR, getEurRubRate } from '@/lib/data/currencyHelper';
import { parseDateSafe } from '../lib/analyticsHelpers';
import { cn } from '@/lib/utils';

export interface KpiGridProps {
  payments: FullPaymentData[];
  students: FullStudentData[];
  leads: FullLeadData[];
  groups: FullGroupData[];
  tasks: FullTaskData[];
  isLoading?: boolean;
}

export function KpiGrid({
  payments,
  students,
  leads,
  groups,
  tasks,
  isLoading = false,
}: KpiGridProps) {
  const router = useRouter();
  const rate = getEurRubRate();

  // 1. Monthly Revenue
  const revenueMetrics = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const paidPaymentsThisMonth = payments.filter(p => {
      if (p.status !== 'paid') return false;
      const d = parseDateSafe(p.paymentDate);
      if (!d) return false;
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const totalPaidEur = Math.round(
      paidPaymentsThisMonth.reduce((sum, p) => sum + parsePaymentAmountEUR(p.amount, rate), 0)
    );

    // Overdue payments (Debt)
    const overduePayments = payments.filter(p => p.status === 'overdue');
    const totalDebtEur = Math.round(
      overduePayments.reduce((sum, p) => sum + parsePaymentAmountEUR(p.amount, rate), 0)
    );

    return {
      totalPaidEur,
      totalDebtEur,
      paidCount: paidPaymentsThisMonth.length,
      overdueCount: overduePayments.length,
    };
  }, [payments, rate]);

  // 2. New Students
  const studentMetrics = useMemo(() => {
    const active = students.filter(s => s.status === 'active');
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    const newCount = students.filter(s => {
      if (s.isNewUntil && new Date(s.isNewUntil).getTime() > now) return true;
      if (s.createdAt && new Date(s.createdAt).getTime() > thirtyDaysAgo) return true;
      return false;
    }).length;

    return {
      activeCount: active.length,
      newCount,
    };
  }, [students]);

  // 3. Lead Funnel & Conversion
  const leadMetrics = useMemo(() => {
    const activeLeads = leads.filter(l => !l.is_deleted && !(l as any).isDeleted);
    const paidLeads = activeLeads.filter(l => l.status === 'paid');

    const conversionRate = activeLeads.length > 0
      ? Math.round((paidLeads.length / activeLeads.length) * 100)
      : 0;

    return {
      totalLeads: activeLeads.length,
      paidLeadsCount: paidLeads.length,
      conversionRate,
    };
  }, [leads]);

  // 4. Renewals
  const renewalMetrics = useMemo(() => {
    const studentsWithRenewals = students.filter(s => {
      return !!s.finance?.activeSubscription?.renewalDate;
    });

    return {
      renewalsCount: studentsWithRenewals.length,
    };
  }, [students]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-28 bg-slate-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
      {/* 1. Monthly Revenue */}
      <div
        onClick={() => router.push('/finance')}
        className="flex flex-col justify-between bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs hover:shadow-xs hover:border-blue-300 transition-all cursor-pointer group"
      >
        <div className="flex items-center justify-between text-slate-500">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-600">
            <CreditCard className="w-3.5 h-3.5 text-blue-600" />
            <span>Выручка за месяц</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
        </div>
        <div className="mt-2.5">
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {revenueMetrics.totalPaidEur.toLocaleString('ru-RU')} €
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
            {revenueMetrics.paidCount} {revenueMetrics.paidCount === 1 ? 'оплата' : 'оплат'} в этом месяце
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-3">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/60">
            Текущий месяц
          </span>
        </div>
      </div>

      {/* 2. New Students */}
      <div
        onClick={() => router.push('/students')}
        className="flex flex-col justify-between bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs hover:shadow-xs hover:border-emerald-300 transition-all cursor-pointer group"
      >
        <div className="flex items-center justify-between text-slate-500">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-600">
            <Users className="w-3.5 h-3.5 text-emerald-600" />
            <span>Новые ученики</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
        </div>
        <div className="mt-2.5">
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {studentMetrics.newCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
            Всего активных: {studentMetrics.activeCount}
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-3">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60">
            За последние 30 дней
          </span>
        </div>
      </div>

      {/* 3. Conversion */}
      <div
        onClick={() => router.push('/crm')}
        className="flex flex-col justify-between bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs hover:shadow-xs hover:border-purple-300 transition-all cursor-pointer group"
      >
        <div className="flex items-center justify-between text-slate-500">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-600">
            <UserCheck className="w-3.5 h-3.5 text-purple-600" />
            <span>Конверсия CRM</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all" />
        </div>
        <div className="mt-2.5">
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {leadMetrics.conversionRate}%
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
            {leadMetrics.paidLeadsCount} из {leadMetrics.totalLeads} лидов оплатили
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-3">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200/60">
            Лиды в продажу
          </span>
        </div>
      </div>

      {/* 4. Renewals */}
      <div
        onClick={() => router.push('/students')}
        className="flex flex-col justify-between bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs hover:shadow-xs hover:border-indigo-300 transition-all cursor-pointer group"
      >
        <div className="flex items-center justify-between text-slate-500">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-600">
            <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />
            <span>Продления</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
        </div>
        <div className="mt-2.5">
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {renewalMetrics.renewalsCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
            Активных абонементов на продлении
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-3">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/60">
            Абонементы
          </span>
        </div>
      </div>

      {/* 5. Debt */}
      <div
        onClick={() => router.push('/finance')}
        className="flex flex-col justify-between bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs hover:shadow-xs hover:border-rose-300 transition-all cursor-pointer group"
      >
        <div className="flex items-center justify-between text-slate-500">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-600">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
            <span>Задолженность</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-rose-600 group-hover:translate-x-0.5 transition-all" />
        </div>
        <div className="mt-2.5">
          <div className={cn(
            'text-2xl font-black tracking-tight',
            revenueMetrics.totalDebtEur > 0 ? 'text-rose-600' : 'text-slate-900'
          )}>
            {revenueMetrics.totalDebtEur.toLocaleString('ru-RU')} €
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
            {revenueMetrics.overdueCount > 0
              ? `${revenueMetrics.overdueCount} просроченных счетов`
              : 'Все счета оплачены вовремя'}
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-3">
          {revenueMetrics.totalDebtEur > 0 ? (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200/60">
              Требует внимания
            </span>
          ) : (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60">
              Долгов нет
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
