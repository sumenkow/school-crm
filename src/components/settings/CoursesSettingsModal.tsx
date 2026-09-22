'use client';

import React, { useState } from 'react';
import { X, BookOpen, Plus, Trash2, Check, Edit2 } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { useRole } from '@/context/RoleContext';
import { cn } from '@/lib/utils';

export interface CourseSettingItem {
  id: string;
  name: string;
  ageGroup: string;
  monthlyPrice: string;
  lessonDuration: string;
  maxStudents: number;
  status: 'active' | 'paused';
  color: string;
}

interface CoursesSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  courses: CourseSettingItem[];
  onSave: (courses: CourseSettingItem[]) => void;
}

export function CoursesSettingsModal({ isOpen, onClose, courses, onSave }: CoursesSettingsModalProps) {
  const { success, error: toastError } = useToast();
  const { role, isOwner } = useRole();
  const canManageCourses = isOwner || role === 'owner' || role === 'developer';

  const [courseList, setCourseList] = useState<CourseSettingItem[]>(courses);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Sync course list when prop changes
  React.useEffect(() => {
    if (courses && courses.length > 0) {
      setCourseList(courses);
    }
  }, [courses]);

  if (!isOpen) return null;

  const handleAddCourse = () => {
    if (!canManageCourses) {
      toastError('Только владелец школы может добавлять новые направления');
      return;
    }

    const newCourse: CourseSettingItem = {
      id: `course_${Date.now()}`,
      name: 'Новое направление',
      ageGroup: '7-14 лет',
      monthlyPrice: '6 500 ₽',
      lessonDuration: '60 мин',
      maxStudents: 8,
      status: 'active',
      color: 'bg-indigo-600',
    };
    setCourseList([...courseList, newCourse]);
    setEditingId(newCourse.id);
  };

  const handleUpdateCourse = (id: string, field: keyof CourseSettingItem, value: any) => {
    if (!canManageCourses) {
      toastError('Только владелец школы может редактировать параметры направления');
      return;
    }
    setCourseList((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const handleDeleteCourse = (id: string) => {
    if (!canManageCourses) {
      toastError('Только владелец школы может удалять направления');
      return;
    }
    if (confirm('Вы уверены, что хотите удалить этот курс?')) {
      setCourseList((prev) => prev.filter((c) => c.id !== id));
      if (editingId === id) setEditingId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageCourses) {
      toastError('Только владелец школы имеет права на сохранение направлений.');
      return;
    }

    try {
      await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, courses: courseList }),
      });
      // Fire custom event to notify open modals and pages
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('crm-courses-changed', { detail: courseList }));
      }
    } catch (err) {
      console.error('Failed to sync courses to server:', err);
    }

    onSave(courseList);
    success('Курсы и направления успешно обновлены');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Курсы и учебные направления</h2>
              <p className="text-xs text-slate-500">Управление образовательными программами, ценами и форматами</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">
              Всего направлений: <strong>{courseList.length}</strong>
            </span>
            {canManageCourses ? (
              <button
                type="button"
                onClick={handleAddCourse}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                Добавить направление
              </button>
            ) : (
              <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                🔒 Добавление доступно только владельцу
              </span>
            )}
          </div>

          {/* List of Courses */}
          <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
            {courseList.map((course) => (
              <div
                key={course.id}
                className={cn(
                  'rounded-xl border p-3.5 transition-all text-xs space-y-3',
                  editingId === course.id
                    ? 'border-indigo-500 bg-indigo-50/20 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                )}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 flex-1">
                    <span className={cn('h-3.5 w-3.5 rounded-full shrink-0', course.color)} />
                    <input
                      type="text"
                      value={course.name}
                      onChange={(e) => handleUpdateCourse(course.id, 'name', e.target.value)}
                      className="font-bold text-slate-900 border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-hidden px-1 py-0.5 w-full max-w-xs"
                      placeholder="Название курса"
                      required
                    />
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={course.status}
                      onChange={(e) => handleUpdateCourse(course.id, 'status', e.target.value)}
                      className={cn(
                        'rounded-lg px-2 py-1 text-[11px] font-bold border',
                        course.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      )}
                    >
                      <option value="active">Активен</option>
                      <option value="paused">Приостановлен</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => setEditingId(editingId === course.id ? null : course.id)}
                      className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                      title="Настройки параметров"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteCourse(course.id)}
                      className="rounded-lg p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Удалить курс"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-[10px] text-slate-400 font-medium">Возраст учеников</label>
                    <input
                      type="text"
                      value={course.ageGroup}
                      onChange={(e) => handleUpdateCourse(course.id, 'ageGroup', e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs mt-0.5 focus:border-indigo-500 focus:outline-hidden"
                      placeholder="6-16 лет"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 font-medium">Стоимость абонемента</label>
                    <input
                      type="text"
                      value={course.monthlyPrice}
                      onChange={(e) => handleUpdateCourse(course.id, 'monthlyPrice', e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs mt-0.5 font-semibold text-slate-900 focus:border-indigo-500 focus:outline-hidden"
                      placeholder="7 600 ₽/мес"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 font-medium">Длительность урока</label>
                    <input
                      type="text"
                      value={course.lessonDuration}
                      onChange={(e) => handleUpdateCourse(course.id, 'lessonDuration', e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs mt-0.5 focus:border-indigo-500 focus:outline-hidden"
                      placeholder="60 мин"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 font-medium">Вместимость группы</label>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={course.maxStudents}
                      onChange={(e) => handleUpdateCourse(course.id, 'maxStudents', parseInt(e.target.value) || 8)}
                      className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs mt-0.5 focus:border-indigo-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
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
  );
}
