'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CheckCircle2,
  Calendar,
  Clock,
  User,
  Users,
  Send,
  Plus,
  X,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import { FullLessonData } from '@/types';

export interface LessonCreatedSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateAnother: () => void;
  lesson: FullLessonData | null;
  userRole?: string;
}

export function LessonCreatedSuccessModal({
  isOpen,
  onClose,
  onCreateAnother,
  lesson,
  userRole,
}: LessonCreatedSuccessModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted || !lesson) return null;

  const isTeacherRole = userRole === 'teacher' || lesson.createdByRole === 'teacher';
  const isPendingStatus = lesson.status === 'pending';

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="lesson-created-success-title"
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-emerald-100 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3 shadow-sm">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h3
            id="lesson-created-success-title"
            className="text-lg font-bold text-slate-900"
          >
            Занятие создано
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {isPendingStatus || isTeacherRole
              ? 'Занятие отправлено на подтверждение'
              : 'Занятие успешно запланировано в расписании'}
          </p>
        </div>

        {/* Content Body / Summary Card (F26, F27) */}
        <div className="px-6 py-2 space-y-3.5">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5 text-xs">
            {/* Format & Target Entity */}
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">Формат:</span>
              <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                {lesson.isIndividual ? (
                  <>
                    <User className="w-3.5 h-3.5 text-purple-600" />
                    <span>
                      Индивидуальное: {lesson.studentName || lesson.students?.[0]?.name || 'Ученик'}
                    </span>
                  </>
                ) : (
                  <>
                    <Users className="w-3.5 h-3.5 text-blue-600" />
                    <span>Групповое: {lesson.groupName}</span>
                  </>
                )}
              </div>
            </div>

            {/* Course */}
            {lesson.courseName && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500 font-medium">Направление:</span>
                <span className="font-semibold text-slate-800">{lesson.courseName}</span>
              </div>
            )}

            {/* Date & Time */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500 font-medium">Дата и время:</span>
              <span className="font-semibold text-slate-900">
                {lesson.dateFormatted || lesson.date} · {lesson.startTime} – {lesson.endTime}
              </span>
            </div>

            {/* Teacher */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500 font-medium">Преподаватель:</span>
              <span className="font-semibold text-slate-800">{lesson.teacherName}</span>
            </div>

            {/* Status & Options */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/60">
              <span className="text-slate-500 font-medium">Статус:</span>
              <div className="flex items-center gap-1.5">
                {isPendingStatus ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-900 border border-amber-200">
                    <span>🟡</span>
                    <span>На подтверждении</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-900 border border-blue-200">
                    <span>🔵</span>
                    <span>Запланировано</span>
                  </span>
                )}
                {lesson.isTrial && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-900 border border-purple-200">
                    <span>🎯</span>
                    <span>Пробное</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Telegram / Helper Notice */}
          {isPendingStatus || isTeacherRole ? (
            <div className="p-3 bg-blue-50 border border-blue-200/80 rounded-xl text-blue-900 text-xs flex items-start gap-2.5">
              <Send className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
              <p className="leading-snug">
                Администратор или руководитель проверит занятие и подтвердит его. Вы получите уведомление в Telegram.
              </p>
            </div>
          ) : (
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-slate-700 text-xs flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <p className="leading-snug">
                Занятие успешно зафиксировано в календаре школы. Уведомления участникам будут отправлены.
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons (F27) */}
        <div className="px-6 py-5 bg-white flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onCreateAnother}
            className="flex-1 px-4 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Создать ещё одно занятие</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

export default LessonCreatedSuccessModal;
