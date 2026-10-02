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

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex flex-col justify-between h-[260px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-50">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Users className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Команда преподавателей</h3>
        </div>
        <button
          type="button"
          onClick={() => router.push('/teachers')}
          className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
        >
          <span>Открыть команду</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {/* Teachers Rows */}
      <div className="space-y-1.5 my-auto">
        {teachersList.map((t) => (
          <div
            key={t.id}
            onClick={() => router.push('/teachers')}
            className="flex items-center justify-between py-1 px-1 rounded-lg hover:bg-slate-50/80 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2.5 min-w-0 pr-2">
              <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0', t.avatarBg)}>
                {t.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                  {t.name}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  {t.subject} • {t.studentsCount} учеников
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-bold text-blue-600 w-8 text-right">
                {t.percent}%
              </span>
              <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0', t.statusColor)}>
                {t.statusText}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
