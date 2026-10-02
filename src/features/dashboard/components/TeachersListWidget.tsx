'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Users, GraduationCap } from 'lucide-react';
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
      // Robust matching by id, teacher_id, teacher.id, teacherName or name
      const teacherNameClean = (teacher.name || '').trim().toLowerCase();
      const teacherIdClean = String(teacher.id || '').trim();

      const teacherGroups = (groups || []).filter(g => {
        const isActive = g.status === 'active' && !g.is_deleted && !(g as any).isDeleted;
        if (!isActive) return false;

        const gTId = String(g.teacherId || (g as any).teacher_id || (g as any).teacher?.id || '').trim();
        if (gTId && gTId === teacherIdClean) return true;

        const gTName = String(g.teacherName || (g as any).teacher?.name || '').trim().toLowerCase();
        if (gTName && teacherNameClean && gTName === teacherNameClean) return true;

        return false;
      });

      let totalStudents = 0;
      let totalCapacity = 0;

      teacherGroups.forEach(g => {
        const enrolled = g.students?.length || 0;
        const cap = g.capacity && g.capacity > 0 ? g.capacity : enrolled;
        totalStudents += enrolled;
        totalCapacity += cap;
      });

      // If groups in global state don't match, fallback to teacher's embedded activeGroups / studentsCount
      const effectiveGroupsCount = teacherGroups.length > 0
        ? teacherGroups.length
        : (teacher.activeGroups?.length || 0);

      const effectiveStudentsCount = totalStudents > 0
        ? totalStudents
        : (teacher.studentsCount || (teacher.activeGroups ? teacher.activeGroups.reduce((acc, ag) => acc + (ag.studentsCount || 0), 0) : 0));

      // Calculate academic workload %
      let workload = 0;
      if (typeof teacher.weeklyHours === 'number') {
        workload = Math.min(100, Math.round((teacher.weeklyHours / 20) * 100));
      } else if (totalCapacity > 0) {
        workload = Math.round((totalStudents / totalCapacity) * 100);
      } else if (effectiveGroupsCount > 0) {
        workload = Math.min(100, effectiveGroupsCount * 30);
      }

      const initials = (teacher.name || '')
        .trim()
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(n => n[0])
        .join('')
        .toUpperCase() || 'ПР';

      let workloadStatus = 'Свободные часы';
      let workloadStatusClass = 'bg-amber-50 text-amber-700';

      if (workload >= 80) {
        workloadStatus = 'Высокая загрузка';
        workloadStatusClass = 'bg-emerald-50 text-emerald-700';
      } else if (workload >= 50) {
        workloadStatus = 'Оптимальная';
        workloadStatusClass = 'bg-blue-50 text-blue-700';
      } else {
        workloadStatus = 'Свободные часы';
        workloadStatusClass = 'bg-amber-50 text-amber-700';
      }

      // Determine subject name
      let subject = (teacher as any).specialization || (teacher as any).subject;
      if (!subject && teacherGroups.length > 0) {
        subject = teacherGroups[0].courseName || (teacherGroups[0] as any).course || (teacherGroups[0] as any).courseId;
      }
      if (!subject && teacher.role) {
        const roleLower = teacher.role.toLowerCase();
        if (roleLower.includes('английск')) subject = 'Английский';
        else if (roleLower.includes('робототехник')) subject = 'Робототехника';
        else if (roleLower.includes('математик')) subject = 'Математика';
        else if (roleLower.includes('немецк')) subject = 'Немецкий';
        else subject = teacher.role.split('(')[0].replace(/^(Ведущий преподаватель|Преподаватель)\s+/i, '').trim();
      }
      if (!subject) subject = 'Преподаватель';

      // Format Russian grammar for groups & students
      const groupsStr = effectiveGroupsCount === 1 ? '1 активная группа'
        : [2, 3, 4].includes(effectiveGroupsCount % 10) && ![12, 13, 14].includes(effectiveGroupsCount % 100)
        ? `${effectiveGroupsCount} активных группы`
        : `${effectiveGroupsCount} активных групп`;

      const studentsStr = effectiveStudentsCount === 1 ? '1 ученик'
        : [2, 3, 4].includes(effectiveStudentsCount % 10) && ![12, 13, 14].includes(effectiveStudentsCount % 100)
        ? `${effectiveStudentsCount} ученика`
        : `${effectiveStudentsCount} учеников`;

      return {
        id: teacher.id,
        name: teacher.name,
        initials,
        subject,
        groupsStr,
        studentsStr,
        workload,
        workloadStatus,
        workloadStatusClass,
        rawTeacher: teacher,
      };
    });
  }, [inputTeachers, groups]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-5 shadow-sm space-y-3 animate-pulse h-full min-h-[190px]" />
    );
  }

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm flex flex-col justify-between h-full min-h-[190px]">
      {/* Шапка карточки */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-50">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <GraduationCap className="w-3.5 h-3.5" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">Преподаватели</h3>
        </div>
        <button
          type="button"
          onClick={() => router.push('/teachers')}
          className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
        >
          Вся команда <span>→</span>
        </button>
      </div>

      {teachers.length === 0 ? (
        <div className="py-6 text-center text-xs text-slate-400 my-auto">
          Нет активных преподавателей
        </div>
      ) : (
        <div className="divide-y divide-slate-50 my-auto pt-1">
          {teachers.slice(0, 3).map((teacher) => (
            <div
              key={teacher.id}
              onClick={() => {
                if (onSelectTeacher) {
                  onSelectTeacher(teacher.rawTeacher);
                } else {
                  router.push('/teachers');
                }
              }}
              className="py-2 flex items-center justify-between cursor-pointer hover:bg-slate-50/60 rounded-xl px-1.5 -mx-1.5 transition-colors gap-2 group"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-bold text-[11px] flex items-center justify-center shrink-0">
                  {teacher.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                    {teacher.name}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                    {teacher.subject} · {teacher.groupsStr} · {teacher.studentsStr}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-bold text-slate-700 w-9 text-right">{teacher.workload}%</span>
                <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full text-center w-28 shrink-0 truncate', teacher.workloadStatusClass)}>
                  {teacher.workloadStatus}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

