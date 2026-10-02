'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Users } from 'lucide-react';
import { FullTeacherData, FullGroupData } from '@/lib/data/mockData';
import { cn } from '@/lib/utils';

export interface TeachersListWidgetProps {
  teachers: FullTeacherData[];
  groups: FullGroupData[];
  onSelectTeacher?: (teacher: FullTeacherData) => void;
  isLoading?: boolean;
}

export function TeachersListWidget({
  teachers: inputTeachers,
  groups,
  onSelectTeacher,
  isLoading = false,
}: TeachersListWidgetProps) {
  const router = useRouter();

  const teachers = useMemo(() => {
    const sourceList = inputTeachers || [];
    if (sourceList.length === 0) return [];

    return sourceList.slice(0, 4).map(teacher => {
      const teacherGroups = (groups || []).filter(
        g => (g.teacherId === teacher.id || (g as any).teacher_id === teacher.id || (g as any).teacher?.id === teacher.id) &&
             g.status === 'active' && !g.is_deleted && !(g as any).isDeleted
      );

      let totalStudents = 0;
      let totalCapacity = 0;

      teacherGroups.forEach(g => {
        const enrolled = g.students?.length || 0;
        const cap = g.capacity && g.capacity > 0 ? g.capacity : enrolled;
        totalStudents += enrolled;
        totalCapacity += cap;
      });

      const hasCapacity = totalCapacity > 0;
      const workload = hasCapacity ? Math.round((totalStudents / totalCapacity) * 100) : null;
      
      const initials = (teacher.name || '')
        .trim()
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(n => n[0])
        .join('')
        .toUpperCase() || 'ПР';

      let workloadStatus: string | null = null;
      let workloadStatusClass = '';

      if (workload !== null) {
        if (workload >= 80) {
          workloadStatus = 'Хорошая загрузка';
          workloadStatusClass = 'bg-emerald-50 text-emerald-700';
        } else if (workload >= 60) {
          workloadStatus = 'Близка к полной';
          workloadStatusClass = 'bg-amber-50 text-amber-700';
        } else {
          workloadStatus = 'Есть места';
          workloadStatusClass = 'bg-blue-50 text-blue-700';
        }
      }

      const subject = (teacher as any).specialization || (teacher as any).subject || (teacherGroups[0] as any)?.course || (teacherGroups[0] as any)?.courseId || 'Преподаватель';

      return {
        id: teacher.id,
        name: teacher.name,
        initials,
        subject,
        studentsCount: totalStudents,
        groupsCount: teacherGroups.length,
        workload,
        workloadStatus,
        workloadStatusClass,
        rawTeacher: teacher,
      };
    });
  }, [inputTeachers, groups]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm space-y-3 animate-pulse h-[220px]" />
    );
  }

  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-50">
          <h3 className="font-bold text-slate-900 text-sm">Команда преподавателей</h3>
          <button
            type="button"
            onClick={() => router.push('/teachers')}
            className="text-xs font-medium text-blue-600 hover:text-blue-700 cursor-pointer"
          >
            Вся команда →
          </button>
        </div>

        {teachers.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            Нет активных преподавателей
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {teachers.map((teacher) => (
              <div
                key={teacher.id}
                onClick={() => {
                  if (onSelectTeacher) {
                    onSelectTeacher(teacher.rawTeacher);
                  } else {
                    router.push('/teachers');
                  }
                }}
                className="py-2 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 rounded-lg px-1 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                  <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 font-bold text-[11px] flex items-center justify-center shrink-0">
                    {teacher.initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 truncate">{teacher.name}</p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {teacher.subject} · {teacher.studentsCount > 0 ? `${teacher.studentsCount} уч.` : `${teacher.groupsCount} групп`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {teacher.workload !== null ? (
                    <>
                      <span className="text-xs font-bold text-slate-700">{teacher.workload}%</span>
                      {teacher.workloadStatus && (
                        <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', teacher.workloadStatusClass)}>
                          {teacher.workloadStatus}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-[11px] text-slate-400 font-medium px-1.5 py-0.5 bg-slate-50 rounded">
                      {teacher.groupsCount} {teacher.groupsCount === 1 ? 'группа' : 'групп'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

