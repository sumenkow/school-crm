'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { INITIAL_GROUPS, FullGroupData } from '@/lib/data/mockData';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  GraduationCap,
  MapPin,
  Plus,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  UserCheck,
  MoreHorizontal,
  Edit,
  Check,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/context/ToastContext';

export default function GroupDetailsPage() {
  const params = useParams();
  const { success } = useToast();
  const groupId = params.id as string;

  const [group, setGroup] = useState<FullGroupData>(() => {
    return INITIAL_GROUPS.find((g) => g.id === groupId) || INITIAL_GROUPS[0];
  });

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: group.name,
    courseName: group.courseName,
    teacherName: group.teacherName,
    schedule: group.schedule,
    room: group.room,
    capacity: group.capacity,
    status: group.status,
    notes: group.notes || '',
  });

  const handleOpenEdit = () => {
    setEditForm({
      name: group.name,
      courseName: group.courseName,
      teacherName: group.teacherName,
      schedule: group.schedule,
      room: group.room,
      capacity: group.capacity,
      status: group.status,
      notes: group.notes || '',
    });
    setIsEditModalOpen(true);
  };

  const handleSaveGroup = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: FullGroupData = {
      ...group,
      name: editForm.name.trim() || group.name,
      courseName: editForm.courseName.trim() || group.courseName,
      teacherName: editForm.teacherName.trim() || group.teacherName,
      schedule: editForm.schedule.trim() || group.schedule,
      room: editForm.room.trim() || group.room,
      capacity: Number(editForm.capacity) || group.capacity,
      status: editForm.status as any,
      notes: editForm.notes.trim() || undefined,
    };
    setGroup(updated);

    const idx = INITIAL_GROUPS.findIndex((g) => g.id === group.id);
    if (idx !== -1) {
      INITIAL_GROUPS[idx] = updated;
    }

    success('Данные группы успешно обновлены!');
    setIsEditModalOpen(false);
  };

  const [activeTab, setActiveTab] = useState<'students' | 'lessons' | 'settings'>('students');

  // Dynamic automatic calculation of free spots (Principle 9: One Source of Truth)
  const enrolledCount = group.students.length;
  const freeSpots = group.capacity - enrolledCount;
  const occupancyPercent = Math.min(100, Math.round((enrolledCount / group.capacity) * 100));

  // Quick enroll student state
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentPhone, setNewStudentPhone] = useState('');

  const handleQuickEnroll = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim() || freeSpots <= 0) return;

    const newStudent = {
      id: `std_${Date.now()}`,
      name: newStudentName,
      status: 'active',
      attendanceRate: '100%',
      parentPhone: newStudentPhone || '+7 (999) 000-00-00',
      joinedAt: new Date().toLocaleDateString('ru-RU'),
    };

    setGroup((prev) => ({
      ...prev,
      students: [newStudent, ...prev.students],
    }));

    setNewStudentName('');
    setNewStudentPhone('');
  };

  const handleRemoveStudent = (id: string) => {
    if (confirm('Удалить ученика из состава этой группы?')) {
      setGroup((prev) => ({
        ...prev,
        students: prev.students.filter((s) => s.id !== id),
      }));
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/groups" className="inline-flex items-center gap-1 hover:text-slate-900 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
          Назад к списку групп
        </Link>
        <span>/</span>
        <span className="text-slate-800 font-semibold">{group.name}</span>
      </div>

      {/* Hero Header Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-600 font-bold text-white text-2xl shadow-sm">
              <GraduationCap className="h-8 w-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                  Курс: {group.courseName}
                </span>
                <span
                  className={cn(
                    'rounded-full px-2.5 py-0.5 text-[10px] font-bold border',
                    group.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                  )}
                >
                  {group.status === 'active' ? 'Идут занятия' : 'Идет набор'}
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
                {group.name}
              </h1>

              <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-600">
                <span className="flex items-center gap-1 font-medium text-slate-800">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  {group.schedule}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  {group.room}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5 text-slate-400" />
                  Преподаватель: <Link href={`/teachers`} className="font-semibold text-blue-600 hover:underline">{group.teacherName}</Link>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenEdit}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
            >
              <Edit className="h-3.5 w-3.5 text-blue-600" />
              Изменить
            </button>
            <Link
              href="/calendar"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
            >
              <Calendar className="h-3.5 w-3.5 text-slate-500" />
              Расписание в календаре
            </Link>
          </div>
        </div>

        {/* Dynamic Capacity Calculation Bar (Section 9 requirement) */}
        <div className="mt-6 rounded-xl bg-slate-50 p-4 border border-slate-200/80">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
            <div>
              <span className="text-slate-600 font-medium">
                Заполненность группы (автоматический расчет):{' '}
                <strong className="text-slate-900 text-sm">{enrolledCount} из {group.capacity} мест</strong>
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Заполненность вычисляется на основе активных зачислений (Enrollments)
              </p>
            </div>
            <div>
              <span
                className={cn(
                  'rounded-full px-3 py-1 font-bold text-xs border',
                  freeSpots === 0
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : freeSpots <= 2
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                )}
              >
                {freeSpots === 0 ? 'Группа полностью заполнена' : `Свободно мест: ${freeSpots}`}
              </span>
            </div>
          </div>
          <div className="mt-3 h-2.5 w-full rounded-full bg-slate-200 overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                freeSpots === 0 ? 'bg-rose-500' : occupancyPercent >= 75 ? 'bg-emerald-500' : 'bg-blue-500'
              )}
              style={{ width: `${occupancyPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('students')}
          className={cn(
            'pb-3 px-3 border-b-2 transition-all',
            activeTab === 'students' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-slate-500 hover:text-slate-900'
          )}
        >
          Состав группы ({enrolledCount} уч.)
        </button>
        <button
          onClick={() => setActiveTab('lessons')}
          className={cn(
            'pb-3 px-3 border-b-2 transition-all',
            activeTab === 'lessons' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-slate-500 hover:text-slate-900'
          )}
        >
          Занятия и Журнал ({group.recentLessons.length})
        </button>
      </div>

      {/* TAB 1: СОСТАВ ГРУППЫ */}
      {activeTab === 'students' && (
        <div className="space-y-6">
          {/* Quick Add Student (if spots available) */}
          {freeSpots > 0 ? (
            <form onSubmit={handleQuickEnroll} className="rounded-2xl border border-blue-200 bg-blue-50/40 p-4 flex flex-col sm:flex-row items-center gap-3">
              <div className="flex-1 w-full">
                <input
                  type="text"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  placeholder="Имя и фамилия нового ученика..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="w-full sm:w-56">
                <input
                  type="tel"
                  value={newStudentPhone}
                  onChange={(e) => setNewStudentPhone(e.target.value)}
                  placeholder="Телефон родителя..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <button
                type="submit"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Зачислить в группу
              </button>
            </form>
          ) : (
            <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3 text-xs text-rose-800 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>Лимит мест исчерпан ({group.capacity} из {group.capacity}). Чтобы добавить ученика, увеличьте лимит мест группы.</span>
            </div>
          )}

          {/* Students Table */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50 font-semibold text-slate-600">
                <tr>
                  <th className="py-3.5 pl-4 pr-3">Ученик</th>
                  <th className="px-3 py-3.5">Статус в группе</th>
                  <th className="px-3 py-3.5">Телефон родителя</th>
                  <th className="px-3 py-3.5">Дата зачисления</th>
                  <th className="px-3 py-3.5 text-center">Посещаемость</th>
                  <th className="py-3.5 pl-3 pr-4 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {group.students.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/70">
                    <td className="py-3 pl-4 pr-3 font-semibold text-slate-900">
                      <Link href={`/students/${student.id}`} className="hover:text-blue-600">
                        {student.name}
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      <span className={cn(
                        'rounded-full px-2 py-0.5 font-semibold text-[10px]',
                        student.status === 'active' && 'bg-emerald-100 text-emerald-800',
                        student.status === 'trial' && 'bg-purple-100 text-purple-800',
                        student.status === 'paused' && 'bg-amber-100 text-amber-800'
                      )}>
                        {student.status === 'active' && 'Активен'}
                        {student.status === 'trial' && 'Пробный'}
                        {student.status === 'paused' && 'На паузе'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-600">{student.parentPhone}</td>
                    <td className="px-3 py-3 text-slate-500">{student.joinedAt}</td>
                    <td className="px-3 py-3 text-center font-bold text-slate-800">{student.attendanceRate}</td>
                    <td className="py-3 pl-3 pr-4 text-right">
                      <button
                        onClick={() => handleRemoveStudent(student.id)}
                        className="text-xs text-rose-500 hover:text-rose-700 hover:underline"
                      >
                        Исключить
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: ЗАНЯТИЯ И ЖУРНАЛ */}
      {activeTab === 'lessons' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Уроки группы</h3>
            <button className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700">
              <Plus className="h-3.5 w-3.5" />
              Добавить урок
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs divide-y divide-slate-100">
            {group.recentLessons.map((lesson) => (
              <div key={lesson.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{lesson.date}</span>
                    <span className="text-xs text-slate-500">• {lesson.time}</span>
                  </div>
                  <p className="text-xs text-slate-700 font-medium">Тема: {lesson.topic}</p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500">
                    Присутствовало: <strong>{lesson.presentCount} из {enrolledCount}</strong>
                  </span>
                  <span className={cn(
                    'rounded-full px-2.5 py-0.5 text-[10px] font-semibold',
                    lesson.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                  )}>
                    {lesson.status === 'completed' ? 'Завершён' : 'Запланирован'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* EDIT GROUP MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Edit className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Изменение параметров группы</h3>
                  <p className="text-xs text-slate-500">Название, курс, преподаватель, расписание и места</p>
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

            <form onSubmit={handleSaveGroup} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Название группы</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden"
                  placeholder="English B1 Teens (Пн/Чт 18:45)"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Курс / Направление</label>
                  <input
                    type="text"
                    value={editForm.courseName}
                    onChange={(e) => setEditForm({ ...editForm, courseName: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden"
                    placeholder="Английский язык"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Преподаватель</label>
                  <input
                    type="text"
                    value={editForm.teacherName}
                    onChange={(e) => setEditForm({ ...editForm, teacherName: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden"
                    placeholder="Мария Иванова"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Расписание занятий</label>
                  <input
                    type="text"
                    value={editForm.schedule}
                    onChange={(e) => setEditForm({ ...editForm, schedule: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden"
                    placeholder="Пн, Чт • 18:45–20:15"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Аудитория</label>
                  <input
                    type="text"
                    value={editForm.room}
                    onChange={(e) => setEditForm({ ...editForm, room: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden"
                    placeholder="Аудитория 204"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Вместимость (макс. мест)</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={editForm.capacity}
                    onChange={(e) => setEditForm({ ...editForm, capacity: parseInt(e.target.value) || 8 })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Статус группы</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden bg-white"
                  >
                    <option value="active">Идут занятия (Активна)</option>
                    <option value="recruiting">Идет набор</option>
                    <option value="completed">Завершена</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Заметки и особенности группы</label>
                <textarea
                  rows={3}
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden resize-none"
                  placeholder="Возраст, программа, учебные материалы..."
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
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors"
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
