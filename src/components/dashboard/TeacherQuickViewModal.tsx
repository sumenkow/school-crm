'use client';

import React from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { getStoredLessons } from '@/lib/data/lessonStorage';

interface TeacherQuickViewModalProps {
  teacherId: string | null;
  teacherName?: string;
  onClose: () => void;
}

export function TeacherQuickViewModal({
  teacherId,
  teacherName = 'Преподаватель',
  onClose,
}: TeacherQuickViewModalProps) {
  if (!teacherId) return null;

  const initials = teacherName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const allLessons = typeof window !== 'undefined' ? getStoredLessons() : [];
  const teacherLessons = allLessons.filter(
    (l) => l.teacherId === teacherId || l.teacherName === teacherName
  );

  const upcomingLessons = teacherLessons.slice(0, 3);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 animate-in fade-in-50 zoom-in-95 duration-150">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-base shadow-xs">
              {initials || 'ПР'}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">{teacherName}</h3>
              <p className="text-xs text-slate-500">Преподаватель • +7 (999) 000-00-00</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Ближайшие уроки</span>
            <div className="mt-2 space-y-2">
              {upcomingLessons.length > 0 ? (
                upcomingLessons.map((lesson) => (
                  <Link
                    key={lesson.id}
                    href={`/calendar/lessons/${lesson.id}`}
                    onClick={onClose}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:bg-slate-50 text-xs transition-colors"
                  >
                    <div>
                      <div className="font-semibold text-slate-800">{lesson.groupName}</div>
                      <div className="text-slate-400">
                        {lesson.date || 'Сегодня'} • {lesson.startTime}–{lesson.endTime}
                      </div>
                    </div>
                    <span className="text-blue-600 font-semibold flex items-center gap-1">
                      Перейти →
                    </span>
                  </Link>
                ))
              ) : (
                <div className="p-3 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                  Нет ближайших уроков
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
