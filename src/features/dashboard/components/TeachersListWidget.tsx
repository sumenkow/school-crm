'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  GraduationCap,
  Users,
  ChevronRight,
  Sparkles,
  BookOpen,
  Calendar
} from 'lucide-react';
import { FullTeacherData, FullGroupData } from '@/lib/data/mockData';
import { cn } from '@/lib/utils';

export interface TeachersListWidgetProps {
  teachers: FullTeacherData[];
  groups: FullGroupData[];
  onSelectTeacher?: (teacher: FullTeacherData) => void;
  isLoading?: boolean;
}

export function TeachersListWidget({
  teachers,
  groups,
  onSelectTeacher,
  isLoading = false,
}: TeachersListWidgetProps) {
  const router = useRouter();

  const teachersWithStats = useMemo(() => {
    return teachers.filter(t => t.status === 'active').map(t => {
      // Find groups taught by this teacher
      const teacherGroups = groups.filter(g => g.teacherId === t.id && g.status === 'active' && !g.is_deleted && !g.isDeleted);
      
      const totalStudents = teacherGroups.reduce((sum, g) => sum + (g.students?.length || 0), 0);
      const groupsCount = teacherGroups.length || t.activeGroups?.length || 0;
      const weeklyHours = t.weeklyHours || groupsCount * 4;

      // Workload rate based on 20 max weekly hours
      const workloadPercent = Math.min(100, Math.round((weeklyHours / 20) * 100));

      return {
        ...t,
        computedGroupsCount: groupsCount,
        computedStudentsCount: totalStudents || t.studentsCount || 0,
        workloadPercent,
      };
    });
  }, [teachers, groups]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-2xs">
        <div className="h-5 w-40 bg-slate-100 rounded animate-pulse" />
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-12 bg-slate-50 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-emerald-600" />
          <h3 className="text-sm font-bold text-slate-900">Команда преподавателей</h3>
        </div>
        <span className="text-[11px] font-semibold text-slate-500">
          {teachersWithStats.length} {teachersWithStats.length === 1 ? 'педагог' : teachersWithStats.length < 5 ? 'педагога' : 'педагогов'}
        </span>
      </div>

      {/* Teachers List */}
      <div className="p-3 space-y-1.5 flex-1 overflow-y-auto max-h-[420px]">
        {teachersWithStats.map((t) => (
          <div
            key={t.id}
            onClick={() => {
              if (onSelectTeacher) {
                onSelectTeacher(t);
              } else {
                router.push(`/teachers/${t.id}`);
              }
            }}
            className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50/80 border border-transparent hover:border-slate-200 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs shrink-0 border border-slate-200">
                {t.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                  {t.name}
                </div>
                <div className="text-[11px] text-slate-500 truncate">
                  {t.role?.split('(')[0]?.trim() || 'Преподаватель'} • {t.computedStudentsCount} уч.
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 ml-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                {t.computedGroupsCount} {t.computedGroupsCount === 1 ? 'группа' : t.computedGroupsCount < 5 ? 'группы' : 'групп'}
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs">
        <span className="text-slate-500 font-medium">Штатное расписание и нагрузка</span>
        <button
          type="button"
          onClick={() => router.push('/teachers')}
          className="text-xs font-bold text-emerald-700 hover:text-emerald-800 transition-colors flex items-center gap-1 cursor-pointer"
        >
          <span>Все преподаватели</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
