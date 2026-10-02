'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  X,
  Calendar,
  Clock,
  Video,
  Users,
  User,
  BookOpen,
  MapPin,
  MoreHorizontal,
  ExternalLink,
  Edit3,
  Copy,
  Trash2,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { FullLessonData, INITIAL_TEACHERS } from '@/lib/data/mockData';
import { saveLessonToStorage } from '@/lib/data/lessonStorage';
import { useToast } from '@/context/ToastContext';
import { useLanguage } from '@/context/LanguageContext';
import { cn } from '@/lib/utils';

export interface LessonPreviewDrawerProps {
  isOpen: boolean;
  lesson: FullLessonData | null;
  onClose: () => void;
  onEdit: (lesson: FullLessonData) => void;
  onLessonUpdated?: (lesson: FullLessonData) => void;
  onDuplicate?: (lesson: FullLessonData) => void;
}

export function LessonPreviewDrawer({
  isOpen,
  lesson,
  onClose,
  onEdit,
  onLessonUpdated,
  onDuplicate,
}: LessonPreviewDrawerProps) {
  const toast = useToast();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'details' | 'attendance' | 'notes'>('details');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isMenuOpen]);

  // Handle ESC key to close
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (showCancelConfirm) {
          setShowCancelConfirm(false);
        } else {
          onClose();
        }
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, showCancelConfirm, onClose]);

  if (!isOpen || !lesson) return null;

  // Teacher details
  const teacher = INITIAL_TEACHERS.find((t) => t.id === lesson.teacherId) || {
    id: lesson.teacherId || 't1',
    name: lesson.teacherName,
    role: 'Ведущий преподаватель',
  };

  const teacherInitials =
    teacher.name
      .trim()
      .split(' ')
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase() || 'ПР';

  // Date formatting in Russian
  const daysRu = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];
  const monthsRu = [
    'января',
    'февраля',
    'марта',
    'апреля',
    'мая',
    'июня',
    'июля',
    'августа',
    'сентября',
    'октября',
    'ноября',
    'декабря',
  ];

  let dateFormattedStr = lesson.dateFormatted || lesson.date;
  if (lesson.date) {
    const d = new Date(lesson.date);
    const dayName = daysRu[lesson.dayOfWeek !== undefined ? lesson.dayOfWeek : d.getDay() === 0 ? 6 : d.getDay() - 1] || 'ДЕНЬ';
    const dayNum = d.getDate();
    const monthName = monthsRu[d.getMonth()];
    const year = d.getFullYear();
    dateFormattedStr = `${dayName}, ${dayNum} ${monthName} ${year}`;
  }

  // Duration calculation
  const startParts = (lesson.startTime || '18:45').split(':').map(Number);
  const endParts = (lesson.endTime || '20:15').split(':').map(Number);
  const startMin = (startParts[0] || 0) * 60 + (startParts[1] || 0);
  const endMin = (endParts[0] || 0) * 60 + (endParts[1] || 0);
  const durationMin = Math.max(0, endMin - startMin);
  const durHours = Math.floor(durationMin / 60);
  const durMins = durationMin % 60;
  const durationStr =
    durHours > 0 && durMins > 0
      ? `${durHours} ч ${durMins} мин`
      : durHours > 0
      ? `${durHours} ч`
      : `${durMins} мин`;

  const trialCount =
    lesson.students?.filter((s) => (s as any).isTrial || s.name?.includes('Пробное')).length ||
    lesson.trialStudentsCount ||
    (lesson.isTrial ? lesson.students?.length : 0) ||
    0;

  // Status Chip config
  const statusConfig = {
    completed: {
      label: '✓ Проведено',
      classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    rescheduled: {
      label: '⇄ Перенесено',
      classes: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    cancelled: {
      label: '✕ Отменено',
      classes: 'bg-rose-50 text-rose-700 border-rose-200',
    },
    scheduled: {
      label: '📅 Запланировано',
      classes: 'bg-blue-50 text-blue-700 border-blue-200',
    },
  }[lesson.status || 'scheduled'];

  // Handle student attendance status change inside Drawer
  const handleStudentAttendanceChange = (
    studentId: string,
    newStatus: 'present' | 'absent' | 'excused' | 'rescheduled' | 'cancelled' | 'not_marked'
  ) => {
    const updatedStudents = (lesson.students || []).map((s) =>
      s.id === studentId ? { ...s, attendanceStatus: newStatus } : s
    );

    const updatedLesson: FullLessonData = {
      ...lesson,
      students: updatedStudents,
    };

    saveLessonToStorage(updatedLesson);
    if (onLessonUpdated) onLessonUpdated(updatedLesson);
    toast.success('Посещаемость обновлена');
  };

  // Handle Cancel lesson action
  const handleCancelLesson = () => {
    const updatedLesson: FullLessonData = {
      ...lesson,
      status: 'cancelled',
    };
    saveLessonToStorage(updatedLesson);
    if (onLessonUpdated) onLessonUpdated(updatedLesson);
    setShowCancelConfirm(false);
    toast.success('Занятие отменено');
  };

  // Handle Duplicate lesson action
  const handleDuplicateLesson = () => {
    if (onDuplicate) {
      onDuplicate(lesson);
      return;
    }

    const dupLesson: FullLessonData = {
      ...lesson,
      id: `l_dup_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      status: 'scheduled',
      students: (lesson.students || []).map((s) => ({
        ...s,
        attendanceStatus: 'not_marked',
      })),
    };

    saveLessonToStorage(dupLesson);
    if (onLessonUpdated) onLessonUpdated(dupLesson);
    toast.success('Занятие успешно продублировано');
  };

  return (
    <>
      {/* 1. Backdrop Overlay */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/30 backdrop-blur-2xs z-40 transition-opacity animate-in fade-in duration-200"
      />

      {/* 2. Slide-over Right Drawer Container */}
      <div
        className="fixed inset-y-0 right-0 z-50 w-full sm:w-[400px] bg-white border-l border-slate-200 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* SHAPKA DRAWER */}
        <div className="p-4 border-b border-slate-100 bg-white space-y-2.5 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-bold text-slate-900 truncate leading-snug">
                {lesson.groupName.split('(')[0].trim()}
              </h2>
              <p className="text-xs text-slate-500 truncate mt-0.5">{lesson.courseName || 'Курс школы'}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              title="Закрыть (Esc)"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Status and Type Badges */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span
              className={cn(
                'text-xs font-semibold px-2.5 py-0.5 rounded-full border shadow-2xs',
                statusConfig.classes
              )}
            >
              {statusConfig.label}
            </span>
            <span className="text-xs font-medium text-slate-600 bg-slate-100 border border-slate-200/60 px-2.5 py-0.5 rounded-full">
              {lesson.isTrial ? 'Пробное' : 'Основной курс'}
            </span>
            {lesson.onlineMeetingUrl || lesson.room?.toLowerCase().includes('онлайн') ? (
              <span className="text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Video className="h-3 w-3 text-indigo-600" />
                Онлайн (Zoom)
              </span>
            ) : (
              <span className="text-xs font-medium text-slate-600 bg-slate-100 border border-slate-200/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                <MapPin className="h-3 w-3 text-slate-400" />
                {lesson.room || 'Аудитория'}
              </span>
            )}
          </div>

          {/* Date and Time Information */}
          <div className="pt-1 text-xs text-slate-600 space-y-1">
            <div className="flex items-center gap-1.5 font-medium text-slate-700">
              <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span>{dateFormattedStr}</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-500 font-medium">
              <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span>
                {lesson.startTime} – {lesson.endTime} ({durationStr})
              </span>
            </div>
          </div>
        </div>

        {/* 3. QUICK ACTIONS */}
        <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2 shrink-0">
          {lesson.onlineMeetingUrl ? (
            <a
              href={lesson.onlineMeetingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors border border-blue-200/80 shadow-2xs cursor-pointer"
            >
              <Video className="h-3.5 w-3.5 text-blue-600" />
              <span>Открыть в Zoom</span>
              <ExternalLink className="h-3 w-3 opacity-60 ml-0.5" />
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="flex-1 py-2 bg-slate-100 text-slate-400 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 border border-slate-200 cursor-not-allowed opacity-60"
            >
              <Video className="h-3.5 w-3.5" />
              <span>Zoom ссылка не указана</span>
            </button>
          )}

          {/* More actions menu */}
          <div className="relative shrink-0" ref={menuRef}>
            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              title="Дополнительные действия"
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer shadow-2xs"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg z-30 space-y-1 text-xs animate-in fade-in zoom-in-95 duration-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onEdit(lesson);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-slate-700 transition-colors text-left cursor-pointer"
                >
                  <Edit3 className="h-3.5 w-3.5 text-slate-400" />
                  <span>Редактировать</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    handleDuplicateLesson();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-slate-700 transition-colors text-left cursor-pointer"
                >
                  <Copy className="h-3.5 w-3.5 text-slate-400" />
                  <span>Дублировать</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setShowCancelConfirm(true);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-rose-50 text-rose-600 transition-colors text-left cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Отменить урок</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 4. LINKED ENTITIES (GROUP, TEACHER, STUDENTS) */}
        <div className="px-4 py-3 border-b border-slate-100 space-y-2.5 bg-white shrink-0">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Связанные сущности
          </div>

          <div className="space-y-1.5">
            {/* Group Link */}
            <Link
              href={`/groups/${lesson.groupId || '1'}`}
              className="flex items-center justify-between p-2 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-7 w-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-105 transition-transform">
                  <BookOpen className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-900 group-hover:text-blue-600 truncate transition-colors">
                    {lesson.groupName}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {lesson.students?.length || 0} учеников · {lesson.courseName || 'Курс'}
                  </p>
                </div>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-blue-500 transition-colors shrink-0" />
            </Link>

            {/* Teacher Link */}
            <Link
              href={`/teachers/${lesson.teacherId || 't1'}`}
              className="flex items-center justify-between p-2 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-7 w-7 rounded-full bg-rose-500 text-white flex items-center justify-center font-bold text-[10px] shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                  {teacherInitials}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-900 group-hover:text-blue-600 truncate transition-colors">
                    {lesson.teacherName}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {teacher.role || 'Ведущий преподаватель'}
                  </p>
                </div>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-blue-500 transition-colors shrink-0" />
            </Link>

            {/* Students Overlap Avatars Row */}
            <div
              onClick={() => setActiveTab('attendance')}
              className="flex items-center justify-between p-2 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-7 w-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-blue-100 group-hover:text-blue-700 transition-colors">
                  <Users className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                    Ученики ({lesson.students?.length || 0})
                  </p>
                  <p className="text-[10px] text-slate-400">Нажмите для просмотра посещаемости</p>
                </div>
              </div>

              {/* Overlapping student avatar bubbles */}
              <div className="flex items-center pl-2 shrink-0">
                {(lesson.students || []).slice(0, 4).map((st, i) => {
                  const sInitials = st.name
                    .trim()
                    .split(' ')
                    .slice(0, 2)
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase() || 'У';

                  return (
                    <div
                      key={st.id || i}
                      title={st.name}
                      className={cn(
                        'h-6 w-6 rounded-full bg-slate-100 border-2 border-white font-bold text-slate-700 flex items-center justify-center text-[9px] shadow-2xs',
                        i > 0 && '-ml-2'
                      )}
                    >
                      {sInitials}
                    </div>
                  );
                })}
                {(lesson.students?.length || 0) > 4 && (
                  <div className="h-6 w-6 rounded-full bg-blue-50 border-2 border-white font-bold text-blue-700 flex items-center justify-center text-[9px] shadow-2xs -ml-2">
                    +{(lesson.students?.length || 0) - 4}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 5. TABS ROW */}
        <div className="flex border-b border-slate-100 px-4 bg-white text-xs font-semibold shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={cn(
              'py-2.5 px-3 border-b-2 transition-colors cursor-pointer',
              activeTab === 'details'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            )}
          >
            Детали
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('attendance')}
            className={cn(
              'py-2.5 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5',
              activeTab === 'attendance'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            )}
          >
            <span>Посещаемость</span>
            <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded-full">
              {lesson.students?.length || 0}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('notes')}
            className={cn(
              'py-2.5 px-3 border-b-2 transition-colors cursor-pointer',
              activeTab === 'notes'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            )}
          >
            Заметки
          </button>
        </div>

        {/* TAB CONTENTS (SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {/* TAB 1: DETAILS */}
          {activeTab === 'details' && (
            <div className="space-y-4">
              {/* Topic & Homework */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 space-y-2">
                <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                  <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                  <span>Тема занятия</span>
                </div>
                <p className="text-slate-800 text-xs font-medium pl-5 leading-relaxed">
                  {lesson.topic || 'Тема не указана'}
                </p>

                {lesson.homework && (
                  <div className="pt-2 border-t border-slate-200/60 mt-2">
                    <div className="flex items-center gap-1.5 text-slate-700 font-semibold mb-1">
                      <BookOpen className="h-3.5 w-3.5 text-amber-600" />
                      <span>Домашнее задание</span>
                    </div>
                    <p className="text-slate-600 text-xs pl-5 leading-relaxed">
                      {lesson.homework}
                    </p>
                  </div>
                )}
              </div>

              {/* Two-column Key-Value Details */}
              <div className="rounded-xl border border-slate-100 divide-y divide-slate-100">
                <div className="flex items-center justify-between p-2.5">
                  <span className="text-slate-400">Тип занятия</span>
                  <span className="font-semibold text-slate-800">
                    {lesson.isTrial ? 'Пробное занятие' : 'Основной курс'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2.5">
                  <span className="text-slate-400">Формат</span>
                  <span className="font-semibold text-slate-800">
                    {lesson.onlineMeetingUrl || lesson.room?.toLowerCase().includes('онлайн')
                      ? 'Онлайн (Zoom)'
                      : lesson.room || 'Офлайн'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2.5">
                  <span className="text-slate-400">Длительность</span>
                  <span className="font-semibold text-slate-800">{durationStr}</span>
                </div>
                <div className="flex items-center justify-between p-2.5">
                  <span className="text-slate-400">Статус</span>
                  <span className="font-semibold text-slate-800">{statusConfig.label}</span>
                </div>
                <div className="flex items-center justify-between p-2.5">
                  <span className="text-slate-400">Пробные ученики</span>
                  <span className="font-semibold text-slate-800">
                    {trialCount > 0 ? `Да (${trialCount} уч.)` : 'Нет'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2.5">
                  <span className="text-slate-400">Списание баланса</span>
                  <span className="font-semibold text-slate-800">
                    {lesson.isBilled ? '✓ Списано' : 'Авто при завершении'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ATTENDANCE */}
          {activeTab === 'attendance' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                <span>Состав группы: {lesson.students?.length || 0} уч.</span>
                <span>Статус присутствия</span>
              </div>

              {(!lesson.students || lesson.students.length === 0) ? (
                <div className="py-8 text-center text-slate-400">
                  <Users className="h-6 w-6 mx-auto mb-1.5 opacity-40" />
                  <p>В этой группе пока нет добавленных учеников</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 rounded-xl border border-slate-100 overflow-hidden">
                  {lesson.students.map((st) => {
                    const stInitials = st.name
                      .trim()
                      .split(' ')
                      .slice(0, 2)
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase() || 'У';

                    return (
                      <div
                        key={st.id}
                        className="p-2.5 bg-white hover:bg-slate-50 flex items-center justify-between gap-2 transition-colors"
                      >
                        <Link
                          href={`/students/${st.id}`}
                          className="flex items-center gap-2 min-w-0 flex-1 group"
                        >
                          <div className="h-7 w-7 rounded-full bg-slate-100 font-bold text-slate-700 flex items-center justify-center text-[10px] shrink-0 border border-slate-200 group-hover:border-blue-400 transition-colors">
                            {stInitials}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 group-hover:text-blue-600 truncate transition-colors">
                              {st.name}
                            </p>
                            {st.isTrial && (
                              <span className="text-[9px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-1 py-0.2 rounded">
                                Пробное
                              </span>
                            )}
                          </div>
                        </Link>

                        {/* Quick Attendance Selector */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleStudentAttendanceChange(st.id, 'present')}
                            title="Был"
                            className={cn(
                              'px-2 py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer',
                              st.attendanceStatus === 'present'
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            )}
                          >
                            Был
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStudentAttendanceChange(st.id, 'absent')}
                            title="Пропуск"
                            className={cn(
                              'px-2 py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer',
                              st.attendanceStatus === 'absent'
                                ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            )}
                          >
                            Пропуск
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStudentAttendanceChange(st.id, 'excused')}
                            title="Болезнь / Уважительная"
                            className={cn(
                              'px-2 py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer',
                              st.attendanceStatus === 'excused'
                                ? 'bg-amber-500 text-white border-amber-500 shadow-2xs'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            )}
                          >
                            Болезнь
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: NOTES */}
          {activeTab === 'notes' && (
            <div className="space-y-3">
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 space-y-2">
                <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                  <MessageSquare className="h-3.5 w-3.5 text-blue-600" />
                  <span>Заметки преподавателя</span>
                </div>
                <p className="text-slate-600 text-xs leading-relaxed">
                  {lesson.topic ? `Урок посвящен теме: "${lesson.topic}".` : 'Нет дополнительных заметок к занятию.'}
                </p>
              </div>

              {lesson.homework && (
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 space-y-2">
                  <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                    <BookOpen className="h-3.5 w-3.5 text-amber-600" />
                    <span>Материалы и ссылки</span>
                  </div>
                  <p className="text-slate-600 text-xs leading-relaxed">
                    {lesson.homework}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 6. ACTION FOOTER (PINNED AT BOTTOM) */}
        <div className="p-3 border-t border-slate-100 bg-white flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onEdit(lesson)}
            className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <Edit3 className="h-3.5 w-3.5" />
            <span>Изменить</span>
          </button>

          <button
            type="button"
            onClick={handleDuplicateLesson}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
            title="Создать копию занятия"
          >
            <Copy className="h-3.5 w-3.5 text-slate-400" />
            <span className="hidden sm:inline">Дублировать</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCancelConfirm(true)}
            className="px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-medium text-xs transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
            title="Отменить занятие"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Отменить</span>
          </button>
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs z-60 flex items-center justify-center p-4 animate-in fade-in duration-100">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Отменить занятие?</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Статус урока будет изменен на «Отменено».
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelConfirm(false)}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Назад
              </button>
              <button
                type="button"
                onClick={handleCancelLesson}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-semibold text-white transition-colors cursor-pointer shadow-2xs"
              >
                Да, отменить
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
