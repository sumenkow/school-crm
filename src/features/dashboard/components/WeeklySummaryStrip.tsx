'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
      weekPaidEur: Math.round(weekPaidEur),
      totalDebtEur: Math.round(totalDebtEur),
    };
  }, [students, payments]);

  if (isLoading) {
    return (
      <div className="h-9 bg-white rounded-xl border border-slate-100 animate-pulse shadow-xs" />
    );
  }

  return (
    <div className="bg-white rounded-xl px-4 py-1.5 border border-slate-100 shadow-xs flex items-center justify-between text-xs min-h-[36px]">
      <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
        <span className="font-bold text-slate-800 shrink-0">С этой недели</span>
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          <span className="text-emerald-600 font-medium">
            +{stats.newStudentsCount} {stats.newStudentsCount === 1 ? 'ученик' : stats.newStudentsCount >= 2 && stats.newStudentsCount <= 4 ? 'ученика' : 'учеников'}
          </span>
          {stats.weekPaidEur > 0 ? (
            <span className="text-emerald-600 font-medium">
              +{stats.weekPaidEur.toLocaleString('ru-RU')} € выручка
            </span>
          ) : (
            <span className="text-slate-500 font-medium">
              {stats.activeStudentsCount} активных учеников
            </span>
          )}
          {stats.totalDebtEur > 0 ? (
            <span className="text-rose-600 font-medium">
              -{stats.totalDebtEur.toLocaleString('ru-RU')} € задолженность
            </span>
          ) : (
            <span className="text-slate-400 font-medium">
              0 € долгов
            </span>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onOpenReport ? onOpenReport : () => router.push('/analytics')}
        className="text-blue-600 font-semibold hover:underline cursor-pointer shrink-0 ml-2 text-xs"
      >
        Полный отчёт ↗
      </button>
    </div>
  );
}


