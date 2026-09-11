'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Phone, MessageSquare, Mail, Calendar, GraduationCap, ChevronRight } from 'lucide-react';
import { INITIAL_TEACHERS, FullTeacherData } from '@/lib/data/mockData';

export default function TeachersPage() {
  const router = useRouter();
  const [teachers] = useState<FullTeacherData[]>(INITIAL_TEACHERS);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Преподаватели</h1>
          <p className="text-sm text-slate-500">
            Список педагогического состава, расписание занятий и текущая учебная нагрузка
          </p>
        </div>
        <Link
          href="/settings/team?role=teacher"
          className="md-btn md-btn-filled md-btn-sm"
          style={{ gap: '6px' }}
        >
          <Plus size={16} />
          + Добавить преподавателя
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {teachers.map((t) => (
          <div
            key={t.id}
            onClick={() => router.push(`/teachers/${t.id}`)}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 font-bold text-indigo-700 text-lg">
                  {t.name[0]}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base hover:text-blue-600 transition-colors">
                    {t.name}
                  </h3>
                  <p className="text-xs text-slate-500">{t.role.split('(')[0]}</p>
                </div>
              </div>

              <div className="mt-4 space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  <span>{t.phone}</span>
                </div>
                {t.telegram && (
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-3.5 w-3.5 text-blue-500" />
                    <span className="text-blue-600 font-medium">{t.telegram}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-center border border-slate-100">
                <div>
                  <p className="text-base font-bold text-slate-900">{t.activeGroups.length}</p>
                  <p className="text-[10px] text-slate-500">Группы</p>
                </div>
                <div>
                  <p className="text-base font-bold text-slate-900">{t.studentsCount}</p>
                  <p className="text-[10px] text-slate-500">Учеников</p>
                </div>
                <div>
                  <p className="text-base font-bold text-slate-900">{t.lessonsPerWeek}</p>
                  <p className="text-[10px] text-slate-500">Уроков/нед</p>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Нагрузка: <strong>{t.weeklyHours} ч/нед</strong></span>
              <span className="inline-flex items-center gap-0.5 text-blue-600 font-bold hover:underline">
                Карточка <ChevronRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
