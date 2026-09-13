'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  X,
  Calendar,
  Clock,
  User,
  Video,
  ExternalLink,
  Copy,
  Check,
  BookOpen,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RotateCcw
} from 'lucide-react';
import { FullLessonData } from '@/lib/data/mockData';
import { cn } from '@/lib/utils';

interface LessonQuickViewModalProps {
  isOpen: boolean;
  lesson: FullLessonData | null;
  onClose: () => void;
  onUpdateAttendance: (
    lessonId: string,
    studentId: string,
    status: 'present' | 'absent' | 'excused' | 'rescheduled' | 'cancelled' | 'not_marked'
  ) => void;
}

export function LessonQuickViewModal({
  isOpen,
  lesson,
  onClose,
  onUpdateAttendance,
}: LessonQuickViewModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen || !lesson) return null;

  const handleCopyLink = () => {
    if (lesson.onlineMeetingUrl) {
      navigator.clipboard.writeText(lesson.onlineMeetingUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const attendanceOptions: Array<{
    status: 'present' | 'excused' | 'absent' | 'rescheduled';
    label: string;
    activeClass: string;
  }> = [
    { status: 'present', label: 'Был', activeClass: 'bg-emerald-600 text-white font-semibold shadow-xs' },
    { status: 'excused', label: 'Болел', activeClass: 'bg-blue-600 text-white font-semibold shadow-xs' },
    { status: 'absent', label: 'Пропуск', activeClass: 'bg-rose-600 text-white font-semibold shadow-xs' },
    { status: 'rescheduled', label: 'Отработка', activeClass: 'bg-amber-600 text-white font-semibold shadow-xs' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                <Clock className="w-3 h-3" />
                {lesson.startTime} – {lesson.endTime}
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-700">
                <Calendar className="w-3 h-3" />
                {lesson.dateFormatted}
              </span>
              <span
                className={cn(
                  'text-[11px] font-semibold px-2 py-0.5 rounded-full',
                  lesson.status === 'completed'
                    ? 'bg-emerald-100 text-emerald-800'
                    : lesson.status === 'rescheduled'
                    ? 'bg-amber-100 text-amber-900'
                    : lesson.status === 'cancelled'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-indigo-100 text-indigo-800'
                )}
              >
                {lesson.status === 'completed'
                  ? 'Завершён'
                  : lesson.status === 'rescheduled'
                  ? 'Перенесён'
                  : lesson.status === 'cancelled'
                  ? 'Отменён'
                  : 'Запланирован'}
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 leading-snug">
              {lesson.groupName}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Тема: <span className="text-slate-800 font-medium">{lesson.topic}</span>
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Teacher and Room info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
              <span className="text-[11px] font-medium text-slate-500">Преподаватель</span>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-sm font-bold text-slate-900">{lesson.teacherName}</span>
                <Link
                  href={`/teachers/${lesson.teacherId}`}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-0.5 hover:underline"
                >
                  Профиль <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
              <span className="text-[11px] font-medium text-slate-500">Аудитория / Формат</span>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-sm font-bold text-slate-900">{lesson.room}</span>
                {lesson.groupId && (
                  <Link
                    href={`/groups/${lesson.groupId}`}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-0.5 hover:underline"
                  >
                    Группа <ExternalLink className="w-3 h-3" />
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Online Meeting Link Callout */}
          {lesson.onlineMeetingUrl && (
            <div className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/60 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                  <Video className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-indigo-950">Онлайн-комната занятия</p>
                  <p className="text-[11px] text-indigo-700 truncate">{lesson.onlineMeetingUrl}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="p-1.5 rounded-lg border border-indigo-300 bg-white text-indigo-700 hover:bg-indigo-50 transition-colors text-xs flex items-center gap-1"
                  title="Скопировать ссылку"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">{copiedLink ? 'Скопировано' : 'Копия'}</span>
                </button>
                <a
                  href={lesson.onlineMeetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  Войти <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}

          {/* Attendance Fast Marking Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Список учеников и посещаемость ({lesson.students.length})
              </h3>
              <span className="text-[11px] text-slate-400">Быстрая отметка в 1 клик</span>
            </div>

            <div className="space-y-2 border border-slate-200 rounded-xl p-2 bg-slate-50/30">
              {lesson.students.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">В группе пока нет учеников</p>
              ) : (
                lesson.students.map((student) => (
                  <div
                    key={student.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-white border border-slate-100 hover:border-slate-200 transition-all shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                        {student.name.charAt(0)}
                      </div>
                      <Link
                        href={`/students/${student.id}`}
                        className="text-xs font-semibold text-slate-800 hover:text-blue-600 truncate transition-colors flex items-center gap-1"
                      >
                        {student.name}
                        <ExternalLink className="w-2.5 h-2.5 opacity-40 hover:opacity-100" />
                      </Link>
                    </div>

                    {/* Attendance Status Buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      {attendanceOptions.map((opt) => {
                        const isActive = student.attendanceStatus === opt.status;
                        return (
                          <button
                            key={opt.status}
                            type="button"
                            onClick={() => onUpdateAttendance(lesson.id, student.id, opt.status)}
                            className={cn(
                              'px-2 py-1 text-[11px] rounded-md transition-all border',
                              isActive
                                ? opt.activeClass
                                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                            )}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Homework if present */}
          {lesson.homework && (
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Домашнее задание
              </span>
              <p className="text-xs text-slate-700">{lesson.homework}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3">
          <Link
            href={`/calendar/lessons/${lesson.id}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
          >
            <BookOpen className="w-4 h-4" />
            Перейти в полный журнал урока →
          </Link>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
