'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, TrendingUp, Layers, AlertCircle, ArrowUpRight } from 'lucide-react';
import { FullLessonData, FullStudentData, FullGroupData, FullPaymentData } from '@/lib/data/mockData';

export interface WeeklySummaryStripProps {
  lessons?: FullLessonData[];
  students?: FullStudentData[];
  groups?: FullGroupData[];
  payments?: FullPaymentData[];
  onOpenReport?: () => void;
  isLoading?: boolean;
}

export function WeeklySummaryStrip({
  students = [],
  groups = [],
  payments = [],
  onOpenReport,
  isLoading = false,
}: WeeklySummaryStripProps) {
  const router = useRouter();

  const stats = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // New students in the last 7 days
    const newStudentsCount = students.filter(s => {
      const dateStr = (s as any).created_at || (s as any).createdAt || (s as any).enrollmentDate;
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return !isNaN(d.getTime()) && d >= sevenDaysAgo;
    }).length;

    // Active students count
    const activeStudentsCount = students.filter(s => s.status === 'active' && !(s as any).is_deleted && !(s as any).isDeleted).length;

    // New groups in the last 7 days
    const newGroupsCount = groups.filter(g => {
      const dateStr = (g as any).created_at || (g as any).createdAt;
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return !isNaN(d.getTime()) && d >= sevenDaysAgo;
    }).length;

    // Payments in the last 7 days
    const weekPaidEur = payments
      .filter(p => {
        const status = p.status ? p.status.toLowerCase() : '';
        if (status !== 'paid' && status !== 'completed') return false;
        const dateStr = p.paymentDate || (p as any).date || (p as any).paid_at || (p as any).createdAt;
        if (!dateStr) return false;
        const d = new Date(dateStr);
        return !isNaN(d.getTime()) && d >= sevenDaysAgo;
      })
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    // Total debt from negative balances
    const totalDebtEur = students
      .filter(s => ((s as any).balance || 0) < 0)
      .reduce((sum, s) => sum + Math.abs((s as any).balance || 0), 0);

    return {
      newStudentsCount,
      activeStudentsCount,
      newGroupsCount,
      weekPaidEur: Math.round(weekPaidEur),
      totalDebtEur: Math.round(totalDebtEur),
    };
  }, [students, groups, payments]);

  if (isLoading) {
    return (
      <div className="h-9 bg-white rounded-xl border border-slate-100 animate-pulse shadow-xs" />
    );
  }

  return (
    <div className="bg-white rounded-xl px-4 py-1.5 border border-slate-100 shadow-xs flex items-center justify-between text-xs min-h-[36px]">
      <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
        <span className="font-bold text-slate-800 shrink-0">С этой недели</span>
        <div className="flex items-center gap-3 sm:gap-5 flex-wrap">
          <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
            <UserPlus className="w-3.5 h-3.5" />
            <span>
              +{stats.newStudentsCount} {stats.newStudentsCount === 1 ? 'новый ученик' : stats.newStudentsCount >= 2 && stats.newStudentsCount <= 4 ? 'новых ученика' : 'новых учеников'}
            </span>
          </div>

          {stats.weekPaidEur > 0 ? (
            <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+{stats.weekPaidEur.toLocaleString('ru-RU')} € выручка</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-slate-500 font-medium">
              <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
              <span>{stats.activeStudentsCount} активных учеников</span>
            </div>
          )}

          {stats.newGroupsCount > 0 && (
            <div className="hidden md:flex items-center gap-1.5 text-blue-600 font-medium">
              <Layers className="w-3.5 h-3.5" />
              <span>
                +{stats.newGroupsCount} {stats.newGroupsCount === 1 ? 'новая группа' : stats.newGroupsCount >= 2 && stats.newGroupsCount <= 4 ? 'новые группы' : 'новых групп'}
              </span>
            </div>
          )}

          {stats.totalDebtEur > 0 ? (
            <div className="flex items-center gap-1.5 text-rose-600 font-medium">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>-{stats.totalDebtEur.toLocaleString('ru-RU')} € задолженность</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-slate-400 font-medium">
              <AlertCircle className="w-3.5 h-3.5 text-slate-300" />
              <span>0 € долгов</span>
            </div>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onOpenReport ? onOpenReport : () => router.push('/analytics')}
        className="flex items-center gap-1 text-blue-600 bg-blue-50/70 hover:bg-blue-100/80 border border-blue-200/70 font-semibold px-2.5 py-0.5 rounded-lg transition-colors cursor-pointer shrink-0 ml-2 text-xs"
      >
        <span>Полный отчёт</span>
        <ArrowUpRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}


