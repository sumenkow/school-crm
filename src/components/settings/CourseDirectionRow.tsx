'use client';

import React from 'react';
import { Trash2, Edit2 } from 'lucide-react';
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
    <div className="rounded-xl border border-slate-200 bg-white hover:border-slate-300 p-4 transition-all text-xs space-y-3.5 shadow-2xs">
      {/* Header Row: Course Name Input & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Course Name Input Field with clear visual affordance */}
        <div className="flex-1">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Название учебного направления *
          </label>
          <div className="relative flex items-center">
            <input
              type="text"
              value={course.name ?? ''}
              onChange={(e) => onChange(course.id, 'name', e.target.value)}
              autoComplete="off"
              spellCheck={false}
              className="w-full font-bold text-sm text-slate-900 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 outline-none transition-all placeholder:text-slate-400 placeholder:font-normal"
              placeholder="Например: Робототехника и IT"
            />
            <span className="absolute right-3 text-slate-400 pointer-events-none">
              <Edit2 className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>

        {/* Action Panel: Status Selector & Trash Button */}
        <div className="flex items-center gap-2 sm:self-end pb-0.5 shrink-0">
          <select
            disabled={!canManage}
            value={course.status === 'paused' || (course as any).status === 'archived' ? 'paused' : 'active'}
            onChange={(e) => onChange(course.id, 'status', e.target.value)}
            className={cn(
              'rounded-xl px-3 py-2 text-xs font-bold border transition-colors cursor-pointer',
              course.status === 'active'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            )}
          >
            <option value="active">● Активен</option>
            <option value="paused">○ В архиве</option>
          </select>

          {canManage && (
            <button
              type="button"
              onClick={() => onDelete(course.id)}
              className="rounded-xl p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-colors cursor-pointer"
              title="Удалить направление"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-slate-100">
        <div>
          <label className="block text-[10px] text-slate-500 font-medium">Возраст учеников</label>
          <input
            type="text"
            value={course.ageGroup ?? ''}
            onChange={(e) => onChange(course.id, 'ageGroup', e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs mt-1 focus:border-indigo-500 focus:outline-hidden bg-slate-50/50 focus:bg-white"
            placeholder="6-16 лет"
          />
        </div>

        <div>
          <label className="block text-[10px] text-slate-500 font-medium">Стоимость абонемента</label>
          <input
            type="text"
            value={course.monthlyPrice ?? ''}
            onChange={(e) => onChange(course.id, 'monthlyPrice', e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs mt-1 font-semibold text-slate-900 focus:border-indigo-500 focus:outline-hidden bg-slate-50/50 focus:bg-white"
            placeholder="7 600 ₽/мес"
          />
        </div>

        <div>
          <label className="block text-[10px] text-slate-500 font-medium">Длительность урока</label>
          <input
            type="text"
            value={course.lessonDuration ?? ''}
            onChange={(e) => onChange(course.id, 'lessonDuration', e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs mt-1 focus:border-indigo-500 focus:outline-hidden bg-slate-50/50 focus:bg-white"
            placeholder="60 мин"
          />
        </div>

        <div>
          <label className="block text-[10px] text-slate-500 font-medium">Вместимость группы</label>
          <input
            type="number"
            min={1}
            max={30}
            value={course.maxStudents ?? 8}
            onChange={(e) => onChange(course.id, 'maxStudents', parseInt(e.target.value) || 8)}
            className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs mt-1 focus:border-indigo-500 focus:outline-hidden bg-slate-50/50 focus:bg-white"
          />
        </div>
      </div>
    </div>
  );
}
