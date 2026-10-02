'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { FullLessonData, FullStudentData, FullGroupData } from '@/lib/data/mockData';

export interface WeeklySummaryStripProps {
  lessons?: FullLessonData[];
  students?: FullStudentData[];
  groups?: FullGroupData[];
  onOpenReport?: () => void;
  isLoading?: boolean;
}

export function WeeklySummaryStrip({
  onOpenReport,
  isLoading = false,
}: WeeklySummaryStripProps) {
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="h-14 bg-white rounded-2xl border border-slate-100 animate-pulse shadow-sm" />
    );
  }

  const weeklyStats = {
    newStudents: 7,
    revenueDelta: 12,
    debtDelta: -80,
  };

  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center justify-between text-xs">
      <div className="flex items-center gap-6">
        <span className="font-bold text-slate-800">С этой недели</span>
        <div className="flex items-center gap-4">
          <span className="text-emerald-600 font-medium">+{weeklyStats.newStudents} учеников</span>
          <span className="text-emerald-600 font-medium">+{weeklyStats.revenueDelta}% выручка</span>
          <span className="text-rose-600 font-medium">{weeklyStats.debtDelta} € долг</span>
        </div>
      </div>
      <button
        type="button"
        onClick={onOpenReport ? onOpenReport : () => router.push('/analytics')}
        className="text-blue-600 font-semibold hover:underline cursor-pointer"
      >
        Полный отчёт ↗
      </button>
    </div>
  );
}

