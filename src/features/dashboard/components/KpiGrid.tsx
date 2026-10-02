'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  CreditCard,
  Users,
  UserCheck,
  BookOpen,
  CheckSquare,
  ChevronRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { FullPaymentData, FullStudentData, FullLeadData, FullGroupData, FullTaskData } from '@/lib/data/mockData';
import { parsePaymentAmountEUR, calculateMultiCurrencyTotals, getEurRubRate } from '@/lib/data/currencyHelper';
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

  // 1. Revenue & Debt
  const revenueMetrics = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Paid payments in current month
    const paidPaymentsThisMonth = payments.filter(p => {
      if (p.status !== 'paid') return false;
      if (!p.paymentDate) return false;
      const parts = p.paymentDate.split('.');
      if (parts.length === 3) {
        const pMonth = parseInt(parts[1], 10) - 1;
        const pYear = parseInt(parts[2], 10);
        return pMonth === currentMonth && (pYear === currentYear || pYear === currentYear % 100);
      }
      return true;
    });

    const totalPaidEur = paidPaymentsThisMonth.reduce((sum, p) => {
      const amt = parsePaymentAmountEUR(p.amount, rate);
      return sum + amt;
    }, 0);

    // Overdue payments
    const overduePayments = payments.filter(p => p.status === 'overdue');
    const totalDebtEur = overduePayments.reduce((sum, p) => {
      const amt = parsePaymentAmountEUR(p.amount, rate);
      return sum + amt;
    }, 0);

    // Expected monthly budget target based on active students * average fee (120 EUR)
    const activeStudentCount = students.filter(s => s.status === 'active').length || 1;
    const dynamicMonthlyTarget = activeStudentCount * 120;
    const targetPercent = Math.min(100, Math.round((totalPaidEur / dynamicMonthlyTarget) * 100)) || 0;

    return {
      totalPaidEur,
      totalDebtEur,
      targetPercent,
    };
  }, [payments, students, rate]);

  // 2. Students & Growth
  const studentMetrics = useMemo(() => {
    const active = students.filter(s => s.status === 'active');
    const paused = students.filter(s => s.status === 'paused');
    
    // New students in last 7 days or isNewUntil
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const newCount = students.filter(s => {
      if (s.isNewUntil && new Date(s.isNewUntil).getTime() > now) return true;
      if (s.createdAt && new Date(s.createdAt).getTime() > sevenDaysAgo) return true;
      return false;
    }).length;

    return {
      activeCount: active.length,
      pausedCount: paused.length,
      newCount,
    };
  }, [students]);

  // 3. Lead Funnel & Conversion
  const leadMetrics = useMemo(() => {
    const activeLeads = leads.filter(l => !l.is_deleted && !(l as any).isDeleted);
    const paidLeads = activeLeads.filter(l => l.status === 'paid');
    const trialLeads = activeLeads.filter(l => l.status === 'trial_scheduled' || l.status === 'trial_held' || !!l.trialDate);

    const conversionRate = activeLeads.length > 0
      ? Math.round((paidLeads.length / activeLeads.length) * 100)
      : 0;

    return {
      totalLeads: activeLeads.length,
      conversionRate,
      trialCount: trialLeads.length,
    };
  }, [leads]);

  // 4. Groups & Capacity
  const groupMetrics = useMemo(() => {
    const activeGroups = groups.filter(g => g.status === 'active' && !g.isDeleted && !g.is_deleted);
    const recruitingGroups = groups.filter(g => g.status === 'recruiting' && !g.isDeleted && !g.is_deleted);

    let totalEnrolled = 0;
    let totalCapacity = 0;

    activeGroups.forEach(g => {
      totalEnrolled += g.students?.length || 0;
      totalCapacity += g.capacity || 8;
    });

    const occupancyRate = totalCapacity > 0
      ? Math.round((totalEnrolled / totalCapacity) * 100)
      : 0;

    return {
      activeCount: activeGroups.length,
      recruitingCount: recruitingGroups.length,
      occupancyRate,
    };
  }, [groups]);

  // 5. Operations & Tasks SLA
  const taskMetrics = useMemo(() => {
    const total = tasks.length || 1;
    const completed = tasks.filter(t => t.status === 'done').length;
    const open = tasks.filter(t => t.status === 'open' || t.status === 'in_progress').length;
    const overdue = tasks.filter(t => t.isOverdue && (t.status === 'open' || t.status === 'in_progress')).length;

    const slaPercent = Math.round((completed / total) * 100);

    return {
      slaPercent,
      openCount: open,
      overdueCount: overdue,
    };
  }, [tasks]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-32 bg-slate-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
      {/* 1. Revenue */}
      <div
        onClick={() => router.push('/finance')}
        className="flex flex-col justify-between bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs hover:shadow-xs hover:border-blue-300 transition-all cursor-pointer group"
      >
        <div className="flex items-center justify-between text-slate-500">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-600">
            <CreditCard className="w-3.5 h-3.5 text-blue-600" />
            <span>Выручка</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
        </div>
        <div className="mt-2.5">
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {revenueMetrics.totalPaidEur.toLocaleString('ru-RU')} €
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
            Оплаты за текущий месяц
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-3 flex-wrap">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/60">
            План: {revenueMetrics.targetPercent}%
          </span>
          {revenueMetrics.totalDebtEur > 0 ? (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200/60">
              Долг: {revenueMetrics.totalDebtEur.toLocaleString('ru-RU')} €
            </span>
          ) : (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60">
              Долгов нет
            </span>
          )}
        </div>
      </div>

      {/* 2. Students */}
      <div
        onClick={() => router.push('/students')}
        className="flex flex-col justify-between bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs hover:shadow-xs hover:border-emerald-300 transition-all cursor-pointer group"
      >
        <div className="flex items-center justify-between text-slate-500">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-600">
            <Users className="w-3.5 h-3.5 text-emerald-600" />
            <span>Ученики</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
        </div>
        <div className="mt-2.5">
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {studentMetrics.activeCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
            Активных учащихся
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-3 flex-wrap">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60">
            +{studentMetrics.newCount} новых
          </span>
          {studentMetrics.pausedCount > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200/60">
              {studentMetrics.pausedCount} на паузе
            </span>
          )}
        </div>
      </div>

      {/* 3. Lead Funnel */}
      <div
        onClick={() => router.push('/crm')}
        className="flex flex-col justify-between bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs hover:shadow-xs hover:border-purple-300 transition-all cursor-pointer group"
      >
        <div className="flex items-center justify-between text-slate-500">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-600">
            <UserCheck className="w-3.5 h-3.5 text-purple-600" />
            <span>Воронка</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all" />
        </div>
        <div className="mt-2.5">
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {leadMetrics.totalLeads}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
            Заявок в работе
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-3 flex-wrap">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200/60">
            Конверсия {leadMetrics.conversionRate}%
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
            {leadMetrics.trialCount} пробных
          </span>
        </div>
      </div>

      {/* 4. Groups */}
      <div
        onClick={() => router.push('/groups')}
        className="flex flex-col justify-between bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs hover:shadow-xs hover:border-indigo-300 transition-all cursor-pointer group"
      >
        <div className="flex items-center justify-between text-slate-500">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-600">
            <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
            <span>Группы</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
        </div>
        <div className="mt-2.5">
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {groupMetrics.activeCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
            Действующих групп
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-3 flex-wrap">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/60">
            {groupMetrics.occupancyRate}% мест
          </span>
          {groupMetrics.recruitingCount > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
              {groupMetrics.recruitingCount} набор
            </span>
          )}
        </div>
      </div>

      {/* 5. Tasks / Operations */}
      <div
        onClick={() => router.push('/tasks')}
        className="flex flex-col justify-between bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs hover:shadow-xs hover:border-amber-300 transition-all cursor-pointer group"
      >
        <div className="flex items-center justify-between text-slate-500">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-600">
            <CheckSquare className="w-3.5 h-3.5 text-amber-600" />
            <span>Операции</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all" />
        </div>
        <div className="mt-2.5">
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {taskMetrics.slaPercent}%
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
            Исполнение задач (SLA)
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-3 flex-wrap">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200/60">
            {taskMetrics.openCount} в работе
          </span>
          {taskMetrics.overdueCount > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200/60">
              {taskMetrics.overdueCount} просрочено
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
