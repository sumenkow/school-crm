'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  CreditCard,
  Users,
  UserCheck,
  RefreshCw,
  ShieldAlert,
  ChevronRight,
  TrendingUp,
  TrendingDown
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
  tasks?: FullTaskData[];
  isLoading?: boolean;
  className?: string;
}

interface KpiCardProps {
  title: string;
  value: string;
  subtext: string;
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
  iconBgClass: string;
  badgeText: string;
  badgeClass: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  microIndicator?: React.ReactNode;
  onClick: () => void;
  hoverBorderClass: string;
}

function KpiCard({
  title,
  value,
  subtext,
  icon: Icon,
  iconClass,
  iconBgClass,
  badgeText,
  badgeClass,
  trend,
  microIndicator,
  onClick,
  hoverBorderClass,
}: KpiCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'h-[155px] flex flex-col justify-between bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs transition-all cursor-pointer group hover:shadow-xs',
        hoverBorderClass
      )}
    >
      {/* Top row: Title + Icon */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className={cn('p-1.5 rounded-lg flex items-center justify-center shrink-0', iconBgClass, iconClass)}>
            <Icon className="w-3.5 h-3.5" />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate">
            {title}
          </span>
        </div>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all shrink-0" />
      </div>

      {/* Middle row: Big Number + Subtext */}
      <div className="my-auto">
        <div className="text-2xl font-black text-slate-900 tracking-tight leading-none">
          {value}
        </div>
        <div className="text-[11px] text-slate-400 mt-1 font-medium truncate">
          {subtext}
        </div>
      </div>

      {/* Bottom row: Badge + Optional Micro Indicator */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100/80">
        <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-md border truncate', badgeClass)}>
          {badgeText}
        </span>

        {microIndicator && (
          <div className="shrink-0 flex items-center">
            {microIndicator}
          </div>
        )}
      </div>
    </div>
  );
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

  // 1. Monthly Revenue Metrics
  const revenueMetrics = useMemo(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();

    const weeklyBars = [0, 0, 0, 0]; // 4 weeks of current month

    const paidPaymentsThisMonth = payments.filter(p => {
      if (p.status !== 'paid') return false;
      const d = parseDateSafe(p.paymentDate);
      if (!d) return false;
      if (d.getMonth() === curMonth && d.getFullYear() === curYear) {
        const day = d.getDate();
        const amt = parsePaymentAmountEUR(p.amount, rate);
        if (day <= 7) weeklyBars[0] += amt;
        else if (day <= 14) weeklyBars[1] += amt;
        else if (day <= 21) weeklyBars[2] += amt;
        else weeklyBars[3] += amt;
        return true;
      }
      return false;
    });

    const totalPaidEur = Math.round(
      paidPaymentsThisMonth.reduce((sum, p) => sum + parsePaymentAmountEUR(p.amount, rate), 0)
    );

    // Overdue Debt
    const overduePayments = payments.filter(p => p.status === 'overdue');
    const totalDebtEur = Math.round(
      overduePayments.reduce((sum, p) => sum + parsePaymentAmountEUR(p.amount, rate), 0)
    );

    const maxWeek = Math.max(...weeklyBars, 1);
    const normalizedWeeklyBars = weeklyBars.map(w => Math.max(15, Math.round((w / maxWeek) * 100)));

    return {
      totalPaidEur,
      totalDebtEur,
      paidCount: paidPaymentsThisMonth.length,
      overdueCount: overduePayments.length,
      weeklyBars: normalizedWeeklyBars,
    };
  }, [payments, rate]);

  // 2. Student Metrics
  const studentMetrics = useMemo(() => {
    const active = students.filter(s => s.status === 'active');
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    const newCount = students.filter(s => {
      if (s.isNewUntil && new Date(s.isNewUntil).getTime() > now) return true;
      if (s.createdAt && new Date(s.createdAt).getTime() > thirtyDaysAgo) return true;
      return false;
    }).length;

    const activeCount = active.length;
    const newPercent = activeCount > 0 ? Math.min(100, Math.round((newCount / activeCount) * 100)) : 0;

    return {
      activeCount,
      newCount,
      newPercent,
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
      <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5', className)}>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-[155px] bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs animate-pulse flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 bg-slate-100 rounded" />
              <div className="h-4 w-4 bg-slate-100 rounded-full" />
            </div>
            <div className="space-y-1.5">
              <div className="h-7 w-20 bg-slate-100 rounded" />
              <div className="h-3 w-32 bg-slate-50 rounded" />
            </div>
            <div className="h-4 w-28 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5', className)}>
      {/* 1. Monthly Revenue */}
      <KpiCard
        title="Выручка"
        value={`${revenueMetrics.totalPaidEur.toLocaleString('ru-RU')} €`}
        subtext={`${revenueMetrics.paidCount} ${revenueMetrics.paidCount === 1 ? 'оплата' : 'оплат'} за месяц`}
        icon={CreditCard}
        iconClass="text-blue-600"
        iconBgClass="bg-blue-50 border border-blue-100"
        badgeText="За текущий месяц"
        badgeClass="bg-blue-50 text-blue-700 border-blue-200/60"
        hoverBorderClass="hover:border-blue-300"
        onClick={() => router.push('/finance')}
        microIndicator={
          <div className="flex items-end gap-0.5 h-4" title="Динамика по неделям месяца">
            {revenueMetrics.weeklyBars.map((height, idx) => (
              <div
                key={idx}
                className="w-1.5 bg-blue-400/80 rounded-t-sm"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        }
      />

      {/* 2. New Students */}
      <KpiCard
        title="Ученики"
        value={String(studentMetrics.activeCount)}
        subtext={`+${studentMetrics.newCount} новых за 30 дней`}
        icon={Users}
        iconClass="text-emerald-600"
        iconBgClass="bg-emerald-50 border border-emerald-100"
        badgeText={`+${studentMetrics.newCount} новых`}
        badgeClass="bg-emerald-50 text-emerald-700 border-emerald-200/60"
        hoverBorderClass="hover:border-emerald-300"
        onClick={() => router.push('/students')}
        microIndicator={
          <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden" title={`Доля новых учеников: ${studentMetrics.newPercent}%`}>
            <div
              className="h-full bg-emerald-500 rounded-full"
              style={{ width: `${studentMetrics.newPercent}%` }}
            />
          </div>
        }
      />

      {/* 3. Conversion */}
      <KpiCard
        title="Конверсия"
        value={`${leadMetrics.conversionRate}%`}
        subtext={`${leadMetrics.paidLeadsCount} из ${leadMetrics.totalLeads} лидов оплатили`}
        icon={UserCheck}
        iconClass="text-purple-600"
        iconBgClass="bg-purple-50 border border-purple-100"
        badgeText="Лиды в продажу"
        badgeClass="bg-purple-50 text-purple-700 border-purple-200/60"
        hoverBorderClass="hover:border-purple-300"
        onClick={() => router.push('/crm')}
        microIndicator={
          <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden" title={`Конверсия воронки: ${leadMetrics.conversionRate}%`}>
            <div
              className="h-full bg-purple-500 rounded-full"
              style={{ width: `${leadMetrics.conversionRate}%` }}
            />
          </div>
        }
      />

      {/* 4. Renewals */}
      <KpiCard
        title="Продления"
        value={String(renewalMetrics.renewalsCount)}
        subtext="Активных на продлении"
        icon={RefreshCw}
        iconClass="text-indigo-600"
        iconBgClass="bg-indigo-50 border border-indigo-100"
        badgeText="Абонементы"
        badgeClass="bg-indigo-50 text-indigo-700 border-indigo-200/60"
        hoverBorderClass="hover:border-indigo-300"
        onClick={() => router.push('/students')}
      />

      {/* 5. Debt */}
      <KpiCard
        title="Задолженность"
        value={`${revenueMetrics.totalDebtEur.toLocaleString('ru-RU')} €`}
        subtext={
          revenueMetrics.overdueCount > 0
            ? `${revenueMetrics.overdueCount} счетов просрочено`
            : 'Все счета оплачены'
        }
        icon={ShieldAlert}
        iconClass={revenueMetrics.totalDebtEur > 0 ? 'text-rose-600' : 'text-slate-500'}
        iconBgClass={revenueMetrics.totalDebtEur > 0 ? 'bg-rose-50 border border-rose-100' : 'bg-slate-50 border border-slate-100'}
        badgeText={revenueMetrics.totalDebtEur > 0 ? 'Требует внимания' : 'Долгов нет'}
        badgeClass={
          revenueMetrics.totalDebtEur > 0
            ? 'bg-rose-50 text-rose-700 border-rose-200/60'
            : 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
        }
        hoverBorderClass={revenueMetrics.totalDebtEur > 0 ? 'hover:border-rose-300' : 'hover:border-slate-300'}
        onClick={() => router.push('/finance')}
      />
    </div>
  );
}

// Alias export for explicit naming convention
export { KpiGrid as DashboardKpiGrid };
