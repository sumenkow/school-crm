'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Phone, MessageSquare, Mail, Calendar, GraduationCap, ChevronRight, RefreshCw, UserCheck } from 'lucide-react';
import { INITIAL_TEACHERS, FullTeacherData } from '@/lib/data/mockData';

export default function TeachersPage() {
  const router = useRouter();
  const [teachers, setTeachers] = useState<FullTeacherData[]>(INITIAL_TEACHERS);
  const [loading, setLoading] = useState(true);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/teachers');
      if (res.ok) {
        const data = await res.json();
        if (data.teachers && Array.isArray(data.teachers)) {
          setTeachers(data.teachers);
        }
      }
    } catch (err) {
      console.error('Failed to load teachers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Преподаватели</h1>
          <p className="text-sm text-slate-500">
            Список педагогического состава, расписание занятий и текущая учебная нагрузка
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchTeachers}
            className="md-btn md-btn-tonal md-btn-sm"
            style={{ width: '36px', height: '36px', padding: 0, justifyContent: 'center' }}
            title="Обновить список"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <Link
            href="/settings/team?role=teacher"
            className="md-btn md-btn-filled md-btn-sm"
            style={{ gap: '6px' }}
          >
            <Plus size={16} />
            + Добавить преподавателя
          </Link>
        </div>
      </div>

      {loading && teachers.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <div key={n} className="rounded-2xl border border-slate-200 bg-white p-5 animate-pulse space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-slate-100" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-3/4 bg-slate-100 rounded" />
                  <div className="h-3 w-1/2 bg-slate-100 rounded" />
                </div>
              </div>
              <div className="h-12 bg-slate-50 rounded-xl" />
            </div>
          ))}
        </div>
      ) : teachers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-4">
            <UserCheck size={28} />
          </div>
          <h3 className="text-base font-bold text-slate-900">Преподаватели еще не добавлены</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-6">
            Добавьте первых преподавателей школы для назначения на курсы и ведения расписания.
          </p>
          <Link
            href="/settings/team?role=teacher"
            className="md-btn md-btn-filled md-btn-sm"
            style={{ gap: '6px' }}
          >
            <Plus size={16} />
            Добавить преподавателя
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {teachers.map((t) => (
            <div
              key={t.id}
              onClick={() => router.push(`/teachers/${t.id}`)}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 font-bold text-indigo-700 text-lg flex-shrink-0">
                      {t.name ? t.name[0].toUpperCase() : 'П'}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base hover:text-blue-600 transition-colors line-clamp-1">
                        {t.name}
                      </h3>
                      <p className="text-xs text-slate-500">{t.role ? t.role.split('(')[0] : 'Преподаватель'}</p>
                    </div>
                  </div>
                  {t.status === 'archived' ? (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 border border-slate-200">
                      В архиве
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                      Активен
                    </span>
                  )}
                </div>

                <div className="mt-4 space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                    <span>{t.phone || '—'}</span>
                  </div>
                  {t.email && (
                    <div className="flex items-center gap-2 text-slate-500">
                      <Mail className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{t.email}</span>
                    </div>
                  )}
                  {t.telegram && (
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                      <span className="text-blue-600 font-medium">{t.telegram}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-center border border-slate-100">
                  <div>
                    <p className="text-base font-bold text-slate-900">{t.activeGroups ? t.activeGroups.length : 0}</p>
                    <p className="text-[10px] text-slate-500">Группы</p>
                  </div>
                  <div>
                    <p className="text-base font-bold text-slate-900">{t.studentsCount || 0}</p>
                    <p className="text-[10px] text-slate-500">Учеников</p>
                  </div>
                  <div>
                    <p className="text-base font-bold text-slate-900">{t.lessonsPerWeek || 0}</p>
                    <p className="text-[10px] text-slate-500">Уроков/нед</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Нагрузка: <strong>{t.weeklyHours || 0} ч/нед</strong></span>
                <span className="inline-flex items-center gap-0.5 text-blue-600 font-bold hover:underline">
                  Карточка <ChevronRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
