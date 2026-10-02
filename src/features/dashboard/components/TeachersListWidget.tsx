'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Users, ArrowRight } from 'lucide-react';
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

  const teachersList = useMemo(() => {
    return [
      {
        id: 't1',
        name: 'Мария Иванова',
        subject: 'Английский',
        studentsCount: 18,
        percent: 92,
        statusText: 'Хорошая загрузка',
        statusColor: 'bg-emerald-50 text-emerald-700',
        avatarBg: 'bg-indigo-100 text-indigo-700',
      },
      {
        id: 't2',
        name: 'Дмитрий Соколов',
        subject: 'Робототехника',
        studentsCount: 14,
        percent: 85,
        statusText: 'Хорошая загрузка',
        statusColor: 'bg-emerald-50 text-emerald-700',
        avatarBg: 'bg-blue-100 text-blue-700',
      },
      {
        id: 't3',
        name: 'Елена Васильева',
        subject: 'Математика',
        studentsCount: 11,
        percent: 78,
        statusText: 'Близка к полной загрузке',
        statusColor: 'bg-amber-50 text-amber-700',
        avatarBg: 'bg-purple-100 text-purple-700',
      },
      {
        id: 't4',
        name: 'Сергей Петров',
        subject: 'Программирование',
        studentsCount: 8,
        percent: 65,
        statusText: 'Есть свободные места',
        statusColor: 'bg-rose-50 text-rose-700',
        avatarBg: 'bg-teal-100 text-teal-700',
      },
    ];
  }, []);

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-3 animate-pulse h-[260px]" />
    );
  }

  const teachers = teachersList.map(t => ({
    id: t.id,
    name: t.name,
    initials: t.name.split(' ').map(n => n[0]).join(''),
    subject: t.subject,
    studentsCount: t.studentsCount,
    workload: t.percent,
    workloadStatus: t.statusText,
    workloadStatusClass: t.statusColor,
  }));

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-50">
        <h3 className="font-bold text-slate-900 text-sm">Команда преподавателей</h3>
        <button
          type="button"
          onClick={() => router.push('/teachers')}
          className="text-xs font-medium text-blue-600 hover:text-blue-700 cursor-pointer"
        >
          Вся команда →
        </button>
      </div>
      <div className="divide-y divide-slate-50">
        {teachers.slice(0, 4).map((teacher) => (
          <div
            key={teacher.id}
            onClick={() => router.push('/teachers')}
            className="py-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 rounded-lg px-1 transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center shrink-0">
                {teacher.initials}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">{teacher.name}</p>
                <p className="text-[11px] text-slate-400 truncate">{teacher.subject} · {teacher.studentsCount} уч.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-bold text-slate-700">{teacher.workload}%</span>
              <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', teacher.workloadStatusClass || 'bg-emerald-50 text-emerald-700')}>
                {teacher.workloadStatus}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
