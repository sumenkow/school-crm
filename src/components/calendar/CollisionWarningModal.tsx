'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  Clock,
  User,
  Users,
  X,
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Building,
} from 'lucide-react';
import { ConflictDetail, AvailableSlot } from '@/lib/data/collisionHelper';

export interface CollisionWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  conflicts: ConflictDetail[];
  nearestSlots: AvailableSlot[];
  onSelectSlot: (slot: AvailableSlot) => void;
  candidateDate?: string;
  candidateStartTime?: string;
  candidateEndTime?: string;
}

export function CollisionWarningModal({
  isOpen,
  onClose,
  conflicts = [],
  nearestSlots = [],
  onSelectSlot,
  candidateDate,
  candidateStartTime,
  candidateEndTime,
}: CollisionWarningModalProps) {
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

  if (!isOpen || !mounted) return null;

  // Determine unique conflict categories present
  const hasTeacherConflict = conflicts.some((c) => c.type === 'teacher');
  const hasGroupConflict = conflicts.some((c) => c.type === 'group');
  const hasStudentConflict = conflicts.some((c) => c.type === 'student');
  const hasHoursConflict = conflicts.some((c) => c.type === 'hours');
  const hasRoomConflict = conflicts.some((c) => c.type === 'room');

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="collision-warning-title"
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-amber-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-amber-50/80 border-b border-amber-100 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700 shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 id="collision-warning-title" className="text-base font-bold text-amber-950 flex items-center gap-2">
                <span>⚠️ Время занято</span>
              </h3>
              <p className="text-xs text-amber-800/90 mt-0.5">
                Невозможно создать занятие в выбранное время
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-white/80 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Conflict Category Badges (F24) */}
          <div className="flex flex-wrap gap-1.5 items-center">
            {hasTeacherConflict && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                <User className="w-3.5 h-3.5" />
                <span>Конфликт преподавателя</span>
              </span>
            )}
            {hasGroupConflict && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                <Users className="w-3.5 h-3.5" />
                <span>Конфликт группы</span>
              </span>
            )}
            {hasStudentConflict && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                <User className="w-3.5 h-3.5" />
                <span>Конфликт ученика</span>
              </span>
            )}
            {hasHoursConflict && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-800 border border-orange-200">
                <Clock className="w-3.5 h-3.5" />
                <span>Вне рабочих часов</span>
              </span>
            )}
            {hasRoomConflict && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                <Building className="w-3.5 h-3.5" />
                <span>Конфликт аудитории</span>
              </span>
            )}
          </div>

          {/* Requested Time Reference */}
          {(candidateStartTime || candidateDate) && (
            <div className="text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 flex items-center justify-between">
              <span>Запрошенное время:</span>
              <span className="font-semibold text-slate-700">
                {candidateDate ? `${candidateDate} · ` : ''}
                {candidateStartTime && candidateEndTime
                  ? `${candidateStartTime} – ${candidateEndTime}`
                  : candidateStartTime || ''}
              </span>
            </div>
          )}

          {/* Conflict Details Cards (F23) */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Детали пересечений:
            </h4>
            {conflicts.map((conflict, index) => {
              const lesson = conflict.conflictingLesson;
              return (
                <div
                  key={index}
                  className="p-3 rounded-xl bg-amber-50/50 border border-amber-200/80 text-xs text-slate-700 space-y-1.5"
                >
                  <div className="flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="font-medium text-slate-800 leading-snug">
                      {conflict.message}
                    </p>
                  </div>

                  {lesson && (
                    <div className="pl-6 space-y-1 text-slate-600 border-l-2 border-amber-200 ml-1 mt-1 pt-0.5">
                      {lesson.teacherName && (
                        <div>
                          <span className="text-slate-500">Преподаватель:</span>{' '}
                          <span className="font-medium text-slate-800">{lesson.teacherName}</span>
                        </div>
                      )}
                      {lesson.groupName && (
                        <div>
                          <span className="text-slate-500">Группа:</span>{' '}
                          <span className="font-medium text-slate-800">{lesson.groupName}</span>
                        </div>
                      )}
                      {lesson.studentName && (
                        <div>
                          <span className="text-slate-500">Ученик:</span>{' '}
                          <span className="font-medium text-slate-800">{lesson.studentName}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-slate-500">Занятое время:</span>{' '}
                        <span className="font-semibold text-rose-600">
                          {lesson.startTime} – {lesson.endTime}
                        </span>
                      </div>
                      {lesson.topic && (
                        <div>
                          <span className="text-slate-500">Тема:</span>{' '}
                          <span className="text-slate-700">«{lesson.topic}»</span>
                        </div>
                      )}
                      <div>
                        <span className="text-slate-500">Статус:</span>{' '}
                        <span className="inline-block px-1.5 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-900">
                          {lesson.status === 'pending' ? '🟡 На подтверждении' : '🔵 Запланировано'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Nearest Free Slot Suggestions (F24, F25) */}
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Ближайшее свободное время:</span>
            </div>

            {nearestSlots && nearestSlots.length > 0 ? (
              <div className="space-y-2">
                <p className="text-[11px] text-slate-500">
                  Выберите свободный интервал в рабочих часах школы (09:00 – 21:00):
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {nearestSlots.map((slot, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => onSelectSlot(slot)}
                      className="p-2.5 rounded-xl border border-blue-200 bg-blue-50/60 hover:bg-blue-100/80 active:bg-blue-200 text-blue-900 transition-all flex flex-col items-center justify-center gap-1 group text-center cursor-pointer shadow-2xs hover:shadow-xs"
                    >
                      <span className="font-bold text-xs group-hover:text-blue-950">
                        {slot.startTime} – {slot.endTime}
                      </span>
                      <span className="text-[11px] text-blue-700 font-medium flex items-center gap-1">
                        <span>Выбрать время {slot.startTime}</span>
                        <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                На выбранную дату нет свободных слотов в рабочих часах школы (09:00 – 21:00).
                Пожалуйста, выберите другую дату или скорректируйте длительность.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 hover:border-slate-300 rounded-xl transition-colors cursor-pointer"
          >
            Изменить время вручную
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

export default CollisionWarningModal;
