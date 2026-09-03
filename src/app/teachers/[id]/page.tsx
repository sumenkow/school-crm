'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { INITIAL_TEACHERS, FullTeacherData } from '@/lib/data/mockData';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  GraduationCap,
  Phone,
  MessageSquare,
  Mail,
  BookOpen,
  Award,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TeacherDetailsPage() {
  const params = useParams();
  const teacherId = params.id as string;

  const [teacher] = useState<FullTeacherData>(() => {
    return INITIAL_TEACHERS.find((t) => t.id === teacherId) || INITIAL_TEACHERS[0];
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/teachers" className="inline-flex items-center gap-1 hover:text-slate-900 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
          Назад к списку преподавателей
        </Link>
        <span>/</span>
        <span className="text-slate-800 font-semibold">{teacher.name}</span>
      </div>

      {/* Hero Header Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 font-bold text-indigo-700 text-2xl shadow-sm">
              {teacher.name[0]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  {teacher.name}
                </h1>
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                  Активен
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{teacher.role}</p>

              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-600">
                <div className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  <a href={`tel:${teacher.phone}`} className="hover:text-blue-600 font-medium">{teacher.phone}</a>
                </div>
                {teacher.telegram && (
                  <div className="flex items-center gap-1.5 text-blue-600 font-medium">
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>{teacher.telegram}</span>
                  </div>
                )}
                {teacher.email && (
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    <span>{teacher.email}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <Link
            href="/calendar"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
          >
            <Calendar className="h-3.5 w-3.5 text-slate-500" />
            Расписание в календаре
          </Link>
        </div>

        {/* Workload Stats Strip */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-slate-100 pt-4 text-xs">
          <div>
            <span className="text-slate-400">Активных групп:</span>
            <p className="text-lg font-bold text-slate-900 mt-0.5">{teacher.activeGroups.length}</p>
          </div>
          <div>
            <span className="text-slate-400">Учеников на обучении:</span>
            <p className="text-lg font-bold text-blue-600 mt-0.5">{teacher.studentsCount}</p>
          </div>
          <div>
            <span className="text-slate-400">Занятий в неделю:</span>
            <p className="text-lg font-bold text-slate-900 mt-0.5">{teacher.lessonsPerWeek}</p>
          </div>
          <div>
            <span className="text-slate-400">Часов в неделю:</span>
            <p className="text-lg font-bold text-emerald-600 mt-0.5">{teacher.weeklyHours} ч.</p>
          </div>
        </div>
      </div>

      {/* Bio / Notes */}
      {teacher.bio && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">О преподавателе</h3>
          <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
            {teacher.bio}
          </p>
        </div>
      )}

      {/* Teacher's Active Groups */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-blue-600" />
          Группы преподавателя ({teacher.activeGroups.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {teacher.activeGroups.map((grp) => (
            <div key={grp.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">{grp.courseName}</span>
                <h4 className="font-bold text-slate-900 text-sm mt-0.5">{grp.name}</h4>
                <div className="mt-2 space-y-1 text-xs text-slate-600">
                  <p className="flex items-center gap-1.5">
                    <Calendar className="h-3 w-3 text-slate-400" />
                    <span>{grp.schedule}</span>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Users className="h-3 w-3 text-slate-400" />
                    <span>Зачислено: <strong>{grp.studentsCount} учеников</strong></span>
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200/60 text-right">
                <Link href={`/groups/${grp.id}`} className="text-xs font-semibold text-blue-600 hover:underline">
                  Карточка группы и журнал →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
