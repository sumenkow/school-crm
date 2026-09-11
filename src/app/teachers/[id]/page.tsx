'use client';

import React, { useState, useEffect } from 'react';
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
  ChevronRight,
  Plus
} from 'lucide-react';

export default function TeacherDetailsPage() {
  const params = useParams();
  const teacherId = params.id as string;

  const [teacher, setTeacher] = useState<FullTeacherData | null>(() => {
    return INITIAL_TEACHERS.find((t) => t.id === teacherId) || null;
  });
  const [loading, setLoading] = useState(!teacher);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/teachers?id=${encodeURIComponent(teacherId)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.teacher) {
            setTeacher(data.teacher);
          }
        }
      } catch (err) {
        console.error('Failed to load teacher details:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [teacherId]);

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto pb-16">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link href="/teachers" className="inline-flex items-center gap-1 hover:text-slate-900 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />
            Назад к списку преподавателей
          </Link>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 animate-pulse space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-slate-100" />
            <div className="space-y-2 flex-1">
              <div className="h-6 w-1/3 bg-slate-100 rounded" />
              <div className="h-4 w-1/4 bg-slate-100 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto pb-16 text-center pt-12">
        <h2 className="text-xl font-bold text-slate-900">Преподаватель не найден</h2>
        <p className="text-sm text-slate-500 mt-1">Возможно, он был удален или перемещен.</p>
        <div className="mt-4">
          <Link href="/teachers" className="md-btn md-btn-tonal md-btn-sm">
            Вернуться к списку
          </Link>
        </div>
      </div>
    );
  }

  const activeGroups = teacher.activeGroups || [];

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
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 font-bold text-indigo-700 text-2xl shadow-sm flex-shrink-0">
              {teacher.name ? teacher.name[0].toUpperCase() : 'П'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  {teacher.name}
                </h1>
                {teacher.status === 'archived' ? (
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 border border-slate-200">
                    В архиве
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                    Активен
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{teacher.role || 'Преподаватель'}</p>

              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-600">
                <div className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  {teacher.phone && teacher.phone !== '—' ? (
                    <a href={`tel:${teacher.phone}`} className="hover:text-blue-600 font-medium">{teacher.phone}</a>
                  ) : (
                    <span className="text-slate-400">Телефон не указан</span>
                  )}
                </div>
                {teacher.email && (
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    <a href={`mailto:${teacher.email}`} className="hover:text-blue-600">{teacher.email}</a>
                  </div>
                )}
                {teacher.telegram && (
                  <div className="flex items-center gap-1.5 text-blue-600 font-medium">
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>{teacher.telegram}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/calendar"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
            >
              <Calendar className="h-3.5 w-3.5 text-slate-500" />
              Расписание в календаре
            </Link>
          </div>
        </div>

        {/* Workload Stats Strip */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-slate-100 pt-4 text-xs">
          <div>
            <span className="text-slate-400">Активных групп:</span>
            <p className="text-lg font-bold text-slate-900 mt-0.5">{activeGroups.length}</p>
          </div>
          <div>
            <span className="text-slate-400">Учеников на обучении:</span>
            <p className="text-lg font-bold text-blue-600 mt-0.5">{teacher.studentsCount || 0}</p>
          </div>
          <div>
            <span className="text-slate-400">Занятий в неделю:</span>
            <p className="text-lg font-bold text-slate-900 mt-0.5">{teacher.lessonsPerWeek || 0}</p>
          </div>
          <div>
            <span className="text-slate-400">Часов в неделю:</span>
            <p className="text-lg font-bold text-emerald-600 mt-0.5">{teacher.weeklyHours || 0} ч.</p>
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
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-blue-600" />
            Группы преподавателя ({activeGroups.length})
          </h3>
          <Link
            href="/groups"
            className="text-xs font-semibold text-blue-600 hover:underline inline-flex items-center gap-1"
          >
            Все группы <ChevronRight size={14} />
          </Link>
        </div>

        {activeGroups.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
            <GraduationCap className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-medium text-slate-600">
              У преподавателя пока нет активных групп
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5 max-w-sm mx-auto">
              Вы можете назначить этого преподавателя при создании новой группы в разделе «Группы».
            </p>
            <div className="mt-3">
              <Link href="/groups" className="md-btn md-btn-tonal md-btn-sm" style={{ gap: '4px' }}>
                <Plus size={14} /> Назначить в группу
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeGroups.map((grp) => (
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
        )}
      </div>
    </div>
  );
}
