'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  CheckCircle2,
  Users,
  Award,
  ArrowUpRight,
  Sparkles,
  GraduationCap
} from 'lucide-react';
import { FullLessonData, FullStudentData, FullGroupData } from '@/lib/data/mockData';

export interface WeeklySummaryStripProps {
  lessons: FullLessonData[];
  students: FullStudentData[];
  groups: FullGroupData[];
  onOpenReport?: () => void;
  isLoading?: boolean;
}

export function WeeklySummaryStrip({
  lessons,
  students,
  groups,
  onOpenReport,
  isLoading = false,
}: WeeklySummaryStripProps) {
  const router = useRouter();

  const summary = useMemo(() => {
    const totalLessons = lessons.length || 1;
    const completedLessons = lessons.filter(l => l.status === 'completed').length;
    const scheduledLessons = lessons.filter(l => l.status === 'scheduled').length;

    // Average attendance rate across active students
    const activeStudents = students.filter(s => s.status === 'active');
    let totalPresent = 0;
    let totalLessonsCounted = 0;

    activeStudents.forEach(s => {
      if (s.attendanceStats) {
        totalPresent += s.attendanceStats.presentCount || 0;
        totalLessonsCounted += s.attendanceStats.totalLessons || 0;
      }
    });

    const avgAttendanceRate = totalLessonsCounted > 0
      ? Math.round((totalPresent / totalLessonsCounted) * 100)
      : 92;

    const activeGroupsCount = groups.filter(g => g.status === 'active' && !g.is_deleted && !g.isDeleted).length;

    return {
      totalLessons,
      completedLessons,
      scheduledLessons,
      avgAttendanceRate,
      activeGroupsCount,
      activeStudentsCount: activeStudents.length,
    };
  }, [lessons, students, groups]);

  if (isLoading) {
    return (
      <div className="h-14 bg-white rounded-2xl border border-slate-200 animate-pulse shadow-2xs" />
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 shrink-0">
          <Award className="w-4 h-4" />
        </div>
        <div>
          <span className="font-bold text-slate-900">Недельный пульс школы: </span>
          <span className="text-slate-600">
            {summary.completedLessons} из {summary.totalLessons} уроков проведено • Средняя посещаемость {summary.avgAttendanceRate}% • {summary.activeGroupsCount} активных групп
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
        {onOpenReport && (
          <button
            type="button"
            onClick={onOpenReport}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline transition-all flex items-center gap-1 cursor-pointer"
          >
            <span>Подробный отчет</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
