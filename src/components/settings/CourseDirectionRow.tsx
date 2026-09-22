'use client';

import React from 'react';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CourseSettingItem } from '@/components/settings/CoursesSettingsModal';

interface CourseDirectionRowProps {
  course: CourseSettingItem;
  canManage: boolean;
  onChange: (id: string, field: keyof CourseSettingItem, value: any) => void;
  onDelete: (id: string) => void;
}

export function CourseDirectionRow({
  course,
  canManage,
  onChange,
  onDelete,
}: CourseDirectionRowProps) {
  if (!course || !course.id) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white hover:border-slate-300 p-3.5 transition-all text-xs space-y-3 shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        {/* Course Name Input with color dot */}
        <div className="flex items-center gap-2 flex-1">
          <div
            className={cn(
              'w-3.5 h-3.5 rounded-full shrink-0 cursor-pointer',
              course.color?.startsWith('bg-') ? course.color : ''
            )}
            style={{
              backgroundColor:
                course.color && !course.color.startsWith('bg-')
                  ? course.color
                  : !course.color?.startsWith('bg-')
                  ? course.color || '#4f46e5'
                  : undefined,
            }}
            title="Выбрать цвет направления"
          />
          <input
            type="text"
            disabled={!canManage}
            value={course.name}
            onChange={(e) => onChange(course.id, 'name', e.target.value)}
            className="font-bold text-base text-slate-800 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-200 focus:border-blue-500 rounded-lg px-2 py-1 transition-all w-full max-w-md outline-none"
            placeholder="Название направления (например, Английский язык)..."
          />
        </div>

        {/* Action Panel in Header: Status Selector & Trash Button */}
        <div className="flex items-center gap-2 shrink-0">
          <select
            disabled={!canManage}
            value={course.status === 'paused' || (course as any).status === 'archived' ? 'paused' : 'active'}
            onChange={(e) => onChange(course.id, 'status', e.target.value)}
            className={cn(
              'rounded-lg px-2.5 py-1 text-xs font-bold border transition-colors cursor-pointer',
              course.status === 'active'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            )}
          >
            <option value="active">Активен ▾</option>
            <option value="paused">В архиве ▾</option>
          </select>

          {canManage && (
            <button
              type="button"
              onClick={() => onDelete(course.id)}
              className="rounded-lg p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              title="Удалить направление"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100">
        <div>
          <label className="block text-[10px] text-slate-400 font-medium">Возраст учеников</label>
          <input
            type="text"
            disabled={!canManage}
            value={course.ageGroup || (course as any).target_age || ''}
            onChange={(e) => onChange(course.id, 'ageGroup', e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs mt-0.5 focus:border-blue-500 focus:outline-hidden"
            placeholder="6-16 лет"
          />
        </div>

        <div>
          <label className="block text-[10px] text-slate-400 font-medium">Стоимость абонемента</label>
          <input
            type="text"
            disabled={!canManage}
            value={course.monthlyPrice || ((course as any).price_monthly ? `${(course as any).price_monthly} ₽` : '')}
            onChange={(e) => onChange(course.id, 'monthlyPrice', e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs mt-0.5 font-semibold text-slate-900 focus:border-blue-500 focus:outline-hidden"
            placeholder="7 600 ₽/мес"
          />
        </div>

        <div>
          <label className="block text-[10px] text-slate-400 font-medium">Длительность урока</label>
          <input
            type="text"
            disabled={!canManage}
            value={course.lessonDuration || ((course as any).lesson_duration_minutes ? `${(course as any).lesson_duration_minutes} мин` : '')}
            onChange={(e) => onChange(course.id, 'lessonDuration', e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs mt-0.5 focus:border-blue-500 focus:outline-hidden"
            placeholder="60 мин"
          />
        </div>

        <div>
          <label className="block text-[10px] text-slate-400 font-medium">Вместимость группы</label>
          <input
            type="number"
            min={1}
            max={30}
            disabled={!canManage}
            value={course.maxStudents || (course as any).max_students || 8}
            onChange={(e) => onChange(course.id, 'maxStudents', parseInt(e.target.value) || 8)}
            className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs mt-0.5 focus:border-blue-500 focus:outline-hidden"
          />
        </div>
      </div>
    </div>
  );
}
