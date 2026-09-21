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
  Plus,
  Edit,
  Check,
  X
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';

export default function TeacherDetailsPage() {
  const params = useParams();
  const { success } = useToast();
  const teacherId = params.id as string;

  const [teacher, setTeacher] = useState<FullTeacherData | null>(() => {
    const cleaned = decodeURIComponent(teacherId).trim();
    const lower = cleaned.toLowerCase();
    return INITIAL_TEACHERS.find(
      (t) =>
        t.id === cleaned ||
        t.id === `t${cleaned}` ||
        t.id.replace(/^t/, '') === cleaned.replace(/^t/, '') ||
        t.name.toLowerCase() === lower ||
        t.name.toLowerCase().includes(lower)
    ) || INITIAL_TEACHERS[0] || null;
  });
  const [loading, setLoading] = useState(!teacher);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: teacher?.name || '',
    role: teacher?.role || '',
    phone: teacher?.phone || '',
    email: teacher?.email || '',
    telegram: teacher?.telegram || '',
    status: teacher?.status || 'active',
    bio: teacher?.bio || '',
    weeklyHours: teacher?.weeklyHours || 12,
  });

  const handleOpenEdit = () => {
    if (!teacher) return;
    setEditForm({
      name: teacher.name,
      role: teacher.role,
      phone: teacher.phone,
      email: teacher.email || '',
      telegram: teacher.telegram || '',
      status: teacher.status,
      bio: teacher.bio || '',
      weeklyHours: teacher.weeklyHours,
    });
    setIsEditModalOpen(true);
  };

  const handleSaveTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacher) return;
    const updated: FullTeacherData = {
      ...teacher,
      name: editForm.name.trim() || teacher.name,
      role: editForm.role.trim() || teacher.role,
      phone: editForm.phone.trim() || teacher.phone,
      email: editForm.email.trim() || teacher.email,
      telegram: editForm.telegram.trim() || teacher.telegram,
      status: editForm.status as any,
      bio: editForm.bio.trim() || teacher.bio,
      weeklyHours: Number(editForm.weeklyHours) || teacher.weeklyHours,
    };
    setTeacher(updated);

    const idx = INITIAL_TEACHERS.findIndex((t) => t.id === teacher.id);
    if (idx !== -1) {
      INITIAL_TEACHERS[idx] = updated;
    }

    success('Данные преподавателя успешно обновлены!');
    setIsEditModalOpen(false);
  };

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/teachers?id=${encodeURIComponent(teacherId)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.teacher) {
            setTeacher(data.teacher);
          } else {
            const cleaned = decodeURIComponent(teacherId).trim().toLowerCase();
            const fallback = INITIAL_TEACHERS.find(
              (t) =>
                t.id === teacherId ||
                t.id === `t${teacherId}` ||
                t.id.replace(/^t/, '') === teacherId.replace(/^t/, '') ||
                t.name.toLowerCase().includes(cleaned)
            );
            if (fallback) setTeacher(fallback);
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
            <button
              type="button"
              onClick={handleOpenEdit}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
            >
              <Edit className="h-3.5 w-3.5 text-indigo-600" />
              Изменить
            </button>
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

      {/* EDIT TEACHER MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Edit className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Изменение данных преподавателя</h3>
                  <p className="text-xs text-slate-500">Профиль, контакты, предмет и нагрузка</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTeacher} className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ФИО преподавателя</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-hidden"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Статус</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-hidden bg-white"
                  >
                    <option value="active">Активен</option>
                    <option value="archived">В архиве</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Должность и специализация</label>
                <input
                  type="text"
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-hidden"
                  placeholder="Ведущий преподаватель английского языка"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Телефон</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-hidden"
                    placeholder="+7 (999) 000-00-00"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Telegram</label>
                  <input
                    type="text"
                    value={editForm.telegram}
                    onChange={(e) => setEditForm({ ...editForm, telegram: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-hidden"
                    placeholder="@username"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-hidden"
                    placeholder="teacher@school.ru"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Нагрузка (часов в неделю)</label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={editForm.weeklyHours}
                    onChange={(e) => setEditForm({ ...editForm, weeklyHours: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Биография и профессиональные достижения</label>
                <textarea
                  rows={3}
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-hidden resize-none"
                  placeholder="Опыт, сертификаты, дипломы..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition-colors"
                >
                  <Check className="h-3.5 w-3.5" />
                  Сохранить изменения
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
