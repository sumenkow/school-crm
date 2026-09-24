'use client';

import React, { useState, useEffect } from 'react';
import { X, BookOpen, Plus, Check } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { useRole } from '@/context/RoleContext';
import { CourseDirectionRow } from '@/components/settings/CourseDirectionRow';

export interface CourseSettingItem {
  id: string;
  name: string;
  ageGroup: string;
  monthlyPrice: string;
  lessonDuration: string;
  maxStudents: number;
  status: 'active' | 'paused' | 'archived';
  color: string;
  // Supabase compatibility fields:
  target_age?: string;
  price_monthly?: number | string;
  lesson_duration_minutes?: number | string;
  max_students?: number;
  is_active?: boolean;
}

interface CoursesSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  courses: CourseSettingItem[];
  onSave: (courses: CourseSettingItem[]) => void;
}

export function deduplicateCourseItems<T extends { id?: string; name?: string }>(items: T[]): T[] {
  const seenNames = new Set<string>();
  const seenIds = new Set<string>();
  const result: T[] = [];

  for (const item of items) {
    if (!item) continue;
    const normName = (item.name || '').trim().toLowerCase();
    const idKey = item.id?.trim();

    if (idKey && seenIds.has(idKey)) continue;
    if (normName && seenNames.has(normName)) continue;

    if (idKey) seenIds.add(idKey);
    if (normName) seenNames.add(normName);
    result.push(item);
  }
  return result;
}

export function CoursesSettingsModal({ isOpen, onClose, courses, onSave }: CoursesSettingsModalProps) {
  const { success, error: toastError } = useToast();
  const { role, isOwner } = useRole();
  const [isSaving, setIsSaving] = useState(false);
  const canManageCourses = isOwner || role === 'owner' || role === 'developer';

  // Strict initial filter and deduplication to prevent multiplying cards
  const [courseList, setCourseList] = useState<CourseSettingItem[]>(() => {
    return deduplicateCourseItems(
      (courses || []).filter(Boolean).filter((c) => Boolean(c && c.id))
    );
  });

  // Strict sync only when modal opens to prevent overwriting user input during parent re-renders
  useEffect(() => {
    if (isOpen) {
      let initial: CourseSettingItem[] = [];
      try {
        const saved = typeof window !== 'undefined' ? localStorage.getItem('crm_courses_v1') : null;
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            initial = parsed;
          }
        }
      } catch {}

      if (!initial || initial.length === 0) {
        initial = (courses || [])
          .filter(Boolean)
          .filter((c) => Boolean(c && c.id));
      }

      const cleanInitial = deduplicateCourseItems(initial);
      if (cleanInitial.length > 0) {
        setCourseList(cleanInitial);
      }
    }
  }, [isOpen, courses]);

  if (!isOpen) return null;

  // Filter valid items for rendering: keep item mounted even when user temporarily deletes the name to retype it!
  const validCourses = deduplicateCourseItems(
    courseList.filter(Boolean).filter((c) => Boolean(c && c.id))
  );

  const handleAddCourse = () => {
    if (!canManageCourses) {
      toastError('Только владелец школы может добавлять новые направления');
      return;
    }

    const uniqueId = `course_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newCourse: CourseSettingItem = {
      id: uniqueId,
      name: 'Новое направление',
      ageGroup: '7-14 лет',
      monthlyPrice: '6 500 ₽',
      lessonDuration: '60 мин',
      maxStudents: 8,
      status: 'active',
      color: '#4f46e5',
      is_active: true,
    };

    setCourseList((prev) => [
      ...prev.filter(Boolean).filter((c) => Boolean(c && c.id)),
      newCourse,
    ]);
  };

  const handleUpdateCourse = (id: string, field: keyof CourseSettingItem, value: any) => {
    setCourseList((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const handleDeleteCourse = (id: string) => {
    if (!canManageCourses) {
      toastError('Только владелец школы может удалять направления');
      return;
    }
    if (confirm('Внимание: к этому направлению могут быть привязаны активные группы. Вы уверены, что хотите удалить направление?')) {
      setCourseList((prev) => prev.filter((c) => c.id !== id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);

    const cleanedList = deduplicateCourseItems(
      courseList
        .filter(Boolean)
        .filter((c) => Boolean(c && c.id))
        .map((c) => ({
          ...c,
          name: (c.name || '').trim() || 'Новое направление',
          is_active: c.status === 'active',
        }))
    );

    let finalSyncedCourses = cleanedList;

    // Single reliable source of persistence via server API (handles DB updates, deduplication and UUID assignment)
    try {
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, courses: cleanedList }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.courses && Array.isArray(data.courses) && data.courses.length > 0) {
          finalSyncedCourses = data.courses.map((c: any) => ({
            id: c.id,
            name: c.name,
            ageGroup: c.ageGroup || '7-15 лет',
            monthlyPrice: `${c.rubMonth || 7600} ₽`,
            lessonDuration: c.lessonDuration || '60 мин',
            maxStudents: c.maxStudents || 8,
            status: c.isActive !== false ? 'active' : 'paused',
            color: '#4f46e5',
            is_active: c.isActive !== false,
          }));
        }
      }
    } catch (apiErr) {
      console.warn('Server sync note:', apiErr);
    } finally {
      setIsSaving(false);
    }

    // Local persistence with canonical deduplicated data
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('crm_courses_v1', JSON.stringify(finalSyncedCourses));
      } catch {}
      window.dispatchEvent(new CustomEvent('crm-courses-changed', { detail: finalSyncedCourses }));
      window.dispatchEvent(new CustomEvent('crm-groups-changed'));
      
      if ((window as any).__queryClient) {
        (window as any).__queryClient.invalidateQueries?.({ queryKey: ['courses'] });
        (window as any).__queryClient.invalidateQueries?.({ queryKey: ['groups'] });
      }
    }

    onSave(finalSyncedCourses);
    success('Направления и тарифы успешно сохранены.');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
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
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">
              Всего направлений: <strong>{validCourses.length}</strong>
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
            {validCourses.map((course) => (
              <CourseDirectionRow
                key={course.id}
                course={course}
                canManage={canManageCourses}
                onChange={handleUpdateCourse}
                onDelete={handleDeleteCourse}
              />
            ))}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" />
              {isSaving ? 'Сохранение...' : 'Сохранить изменения'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
