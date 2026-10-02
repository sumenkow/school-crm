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
  ArrowRight,
  FileText,
  RotateCcw,
  History,
  Check,
} from 'lucide-react';
import { FullLessonData, INITIAL_TEACHERS, LessonTimelineEvent } from '@/lib/data/mockData';
import { saveLessonToStorage } from '@/lib/data/lessonStorage';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/context/ToastContext';
import { useLanguage } from '@/context/LanguageContext';
import { cn } from '@/lib/utils';

export interface LessonPreviewDrawerProps {
  isOpen: boolean;
  lesson: FullLessonData | null;
  onClose: () => void;
  onEdit: (
    lesson: FullLessonData,
    initialTab?: 'main' | 'attendance' | 'feedback' | 'history',
    highlightReschedule?: boolean
  ) => void;
  onLessonUpdated?: (lesson: FullLessonData) => void;
  onDuplicate?: (lesson: FullLessonData) => void;
  isEmbedded?: boolean;
}

function getStudentWord(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 19) return `${count} учеников`;
  if (mod10 === 1) return `${count} ученик`;
  if (mod10 >= 2 && mod10 <= 4) return `${count} ученика`;
  return `${count} учеников`;
}

function getAbsentWord(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 19) return `${count} пропусков`;
  if (mod10 === 1) return `${count} пропуск`;
  if (mod10 >= 2 && mod10 <= 4) return `${count} пропуска`;
  return `${count} пропусков`;
}

function getPresentWord(count: number): string {
  if (count === 1) return '1 был';
  return `${count} были`;
}

export function LessonPreviewDrawer({
  isOpen,
  lesson,
  onClose,
  onEdit,
  onLessonUpdated,
  onDuplicate,
  isEmbedded = false,
}: LessonPreviewDrawerProps) {
  const toast = useToast();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'notes'>('overview');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
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
    name: lesson.teacherName || 'Преподаватель',
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

  const teacherColorMap: Record<string, string> = {
    t1: 'bg-rose-500',
    t2: 'bg-amber-500',
    t3: 'bg-emerald-500',
    t4: 'bg-indigo-500',
  };
  const teacherBg = teacherColorMap[teacher.id] || 'bg-blue-500';

  // Date formatting in Russian
  const daysRu = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
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
    const dayName =
      daysRu[
        lesson.dayOfWeek !== undefined ? lesson.dayOfWeek : d.getDay() === 0 ? 6 : d.getDay() - 1
      ] || 'ДЕНЬ';
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

  // Attendance stats
  const students = lesson.students || [];
  const totalStudentsCount = students.length;
  const presentCount = students.filter((s) => s.attendanceStatus === 'present').length;
  const absentCount = students.filter((s) => s.attendanceStatus === 'absent').length;
  const attendanceRate =
    totalStudentsCount > 0 ? Math.round((presentCount / totalStudentsCount) * 100) : 0;

  // Handle student attendance status change inside Drawer
  const handleStudentAttendanceChange = (
    studentId: string,
    newStatus: 'present' | 'absent' | 'excused' | 'rescheduled' | 'cancelled' | 'not_marked'
  ) => {
    const updatedStudents = students.map((s) =>
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
  const handleCancelLesson = async () => {
    if (!lesson) return;
    setIsCancelling(true);
    try {
      const now = new Date();
      const timestampStr = `${now.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })}, ${now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
      
      const updatedEvents: LessonTimelineEvent[] = [
        ...(lesson.timelineEvents || []),
        {
          id: `ev_${Date.now()}_cancel`,
          timestamp: timestampStr,
          author: 'Администратор',
          role: 'Администратор',
          type: 'cancelled',
          comment: cancelReason.trim() ? `Отмена занятия: ${cancelReason.trim()}` : 'Занятие отменено',
        },
      ];

      const updatedLesson: FullLessonData = {
        ...lesson,
        status: 'cancelled',
        timelineEvents: updatedEvents,
      };

      saveLessonToStorage(updatedLesson);

      try {
        const supabase = createClient();
        await supabase
          .from('lessons')
          .update({ status: 'cancelled', updated_at: new Date().toISOString() })
          .eq('id', updatedLesson.id);
      } catch (err) {
        console.warn('Supabase cancel update notice:', err);
      }

      window.dispatchEvent(new CustomEvent('crm-lessons-changed', { detail: updatedLesson }));
      if (onLessonUpdated) onLessonUpdated(updatedLesson);
      setShowCancelConfirm(false);
      setCancelReason('');
      toast.success('Занятие отменено');
    } catch (err: any) {
      console.error('Failed to cancel lesson:', err);
      toast.error('Не удалось отменить занятие');
    } finally {
      setIsCancelling(false);
    }
  };

  // Handle Revert to scheduled
  const handleRevertToScheduled = () => {
    const updatedLesson: FullLessonData = {
      ...lesson,
      status: 'scheduled',
    };
    saveLessonToStorage(updatedLesson);
    if (onLessonUpdated) onLessonUpdated(updatedLesson);
    setIsMenuOpen(false);
    toast.success('Занятие возвращено в статус "Запланировано"');
  };

  // Handle Restore lesson
  const handleRestoreLesson = () => {
    const updatedLesson: FullLessonData = {
      ...lesson,
      status: 'scheduled',
    };
    saveLessonToStorage(updatedLesson);
    if (onLessonUpdated) onLessonUpdated(updatedLesson);
    setIsMenuOpen(false);
    toast.success('Занятие успешно восстановлено');
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
      students: students.map((s) => ({
        ...s,
        attendanceStatus: 'not_marked',
      })),
    };

    saveLessonToStorage(dupLesson);
    if (onLessonUpdated) onLessonUpdated(dupLesson);
    toast.success('Занятие успешно продублировано');
  };

  const isOnline = !!(lesson.onlineMeetingUrl || lesson.room?.toLowerCase().includes('онлайн'));

  const drawerContent = (
    <div
      className={cn(
        'bg-white flex flex-col',
        isEmbedded
          ? 'w-full h-full rounded-2xl border border-slate-200 shadow-2xs overflow-hidden max-h-[860px]'
          : 'fixed inset-y-0 right-0 z-50 w-full sm:w-[400px] border-l border-slate-200 shadow-2xl animate-in slide-in-from-right duration-200'
      )}
      role="dialog"
      aria-modal="true"
    >
      {/* 1. ШАПКА ПАНЕЛИ */}
      <div className="p-4 border-b border-slate-100 bg-white space-y-2 shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-slate-900 truncate leading-snug">
              {lesson.groupName.split('(')[0].trim()}
            </h2>
            <p className="text-xs text-slate-500 truncate mt-0.5 font-medium">
              {lesson.courseName || 'Робототехника'}
            </p>
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

        {/* Чипсы статусов в один ряд */}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span
            className={cn(
              'text-xs font-semibold px-2 py-0.5 rounded-full border shadow-2xs',
              statusConfig.classes
            )}
          >
            {statusConfig.label}
          </span>
          <span className="text-xs font-medium text-slate-600 bg-slate-100 border border-slate-200/60 px-2 py-0.5 rounded-full">
            {lesson.isTrial ? 'Пробное' : 'Основной курс'}
          </span>
          {isOnline ? (
            <span className="text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Video className="h-3 w-3 text-blue-600" />
              Онлайн (Zoom)
            </span>
          ) : (
            <span className="text-xs font-medium text-slate-600 bg-slate-100 border border-slate-200/60 px-2 py-0.5 rounded-full flex items-center gap-1">
              <MapPin className="h-3 w-3 text-slate-400" />
              {lesson.room || 'Аудитория'}
            </span>
          )}
        </div>

        {/* Дата и время */}
        <div className="text-xs text-slate-500 mt-2 flex items-center gap-1.5 font-medium">
          <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span>
            {dateFormattedStr} · {lesson.startTime} – {lesson.endTime} ({durationStr})
          </span>
        </div>

        {/* Плашка преподавателя */}
        <Link
          href={`/teachers/${lesson.teacherId || 't1'}`}
          className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-50 border border-slate-100/80 hover:bg-slate-100/80 transition-colors group cursor-pointer"
        >
          <div
            className={cn(
              'h-6 w-6 rounded-full text-white font-bold text-[10px] flex items-center justify-center shrink-0 shadow-2xs',
              teacherBg
            )}
          >
            {teacherInitials}
          </div>
          <span className="text-xs text-slate-700 font-medium group-hover:text-blue-600 transition-colors truncate">
            {lesson.teacherName} · {getStudentWord(totalStudentsCount)}
          </span>
          <ChevronRight className="h-3.5 w-3.5 text-slate-300 ml-auto group-hover:text-blue-500 transition-colors shrink-0" />
        </Link>
      </div>

      {/* 2. КНОПКИ БЫСТРОГО ДЕЙСТВИЯ (в один ряд) */}
      <div className="px-4 py-2.5 border-b border-slate-100 bg-white flex items-center gap-2 shrink-0">
        {lesson.onlineMeetingUrl ? (
          <a
            href={lesson.onlineMeetingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <Video className="h-3.5 w-3.5" />
            <span>Открыть Zoom</span>
            <ExternalLink className="h-3 w-3 opacity-70 ml-0.5" />
          </a>
        ) : (
          <button
            type="button"
            disabled
            title="Zoom ссылка не указана для этого занятия"
            className="flex-1 py-2 px-4 bg-slate-100 text-slate-400 font-medium text-xs rounded-xl flex items-center justify-center gap-1.5 border border-slate-200 cursor-not-allowed opacity-60"
          >
            <Video className="h-3.5 w-3.5" />
            <span>Zoom не указан</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => onEdit(lesson)}
          className="py-2 px-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
          title="Редактировать параметры занятия"
        >
          <Edit3 className="h-3.5 w-3.5 text-slate-500" />
          <span>Изменить</span>
        </button>

        {/* Меню дополнительных действий [ ··· ] */}
        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            title="Дополнительные действия"
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer shadow-2xs"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 mt-1.5 w-56 rounded-xl border border-slate-200/90 bg-white p-1.5 shadow-lg z-30 space-y-1 text-xs animate-in fade-in zoom-in-95 duration-100">
              {lesson.status === 'completed' ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onEdit(lesson, 'main');
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-slate-700 transition-colors text-left cursor-pointer"
                  >
                    <Edit3 className="h-3.5 w-3.5 text-slate-400" />
                    <span>Редактировать данные</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onEdit(lesson, 'attendance');
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-slate-700 transition-colors text-left cursor-pointer"
                  >
                    <Users className="h-3.5 w-3.5 text-slate-400" />
                    <span>Открыть журнал посещаемости</span>
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
                  <div className="h-px bg-slate-100 my-1" />
                  <button
                    type="button"
                    onClick={handleRevertToScheduled}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-amber-50 text-amber-700 transition-colors text-left cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5 text-amber-500" />
                    <span>Вернуть в статус Запланировано</span>
                  </button>
                </>
              ) : lesson.status === 'cancelled' ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onEdit(lesson, 'history');
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-slate-700 transition-colors text-left cursor-pointer"
                  >
                    <History className="h-3.5 w-3.5 text-slate-400" />
                    <span>Просмотр истории</span>
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
                  <div className="h-px bg-slate-100 my-1" />
                  <button
                    type="button"
                    onClick={handleRestoreLesson}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-emerald-50 text-emerald-700 font-semibold transition-colors text-left cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Восстановить занятие</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onEdit(lesson, 'attendance');
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-slate-700 transition-colors text-left cursor-pointer"
                  >
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Провести занятие</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onEdit(lesson, 'main', true);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-slate-700 transition-colors text-left cursor-pointer"
                  >
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <span>Перенести занятие</span>
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
                  <div className="h-px bg-slate-100 my-1" />
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setShowCancelConfirm(true);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-rose-50 text-rose-600 transition-colors text-left cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Отменить занятие</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 3. ВКЛАДКИ ПАНЕЛИ */}
      <div className="flex border-b border-slate-100 px-4 bg-white text-xs shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={cn(
            'py-2.5 px-3 transition-colors cursor-pointer font-semibold',
            activeTab === 'overview'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'border-b-2 border-transparent text-slate-500 hover:text-slate-800'
          )}
        >
          Обзор
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('attendance')}
          className={cn(
            'py-2.5 px-3 transition-colors cursor-pointer font-semibold flex items-center gap-1.5',
            activeTab === 'attendance'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'border-b-2 border-transparent text-slate-500 hover:text-slate-800'
          )}
        >
          <span>Посещаемость</span>
          <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded-full">
            {totalStudentsCount}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('notes')}
          className={cn(
            'py-2.5 px-3 transition-colors cursor-pointer font-semibold',
            activeTab === 'notes'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'border-b-2 border-transparent text-slate-500 hover:text-slate-800'
          )}
        >
          Заметки
        </button>
      </div>

      {/* 4. СОДЕРЖИМОЕ ВКЛАДОК */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* ВКЛАДКА 1: ОБЗОР */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Блок «Тема и задание» */}
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-slate-800 font-bold text-xs">
                  <FileText className="h-3.5 w-3.5 text-blue-600" />
                  <span>Тема и задание</span>
                </div>
                <button
                  type="button"
                  onClick={() => onEdit(lesson)}
                  className="text-[11px] font-medium text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
                >
                  Изменить
                </button>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-800 leading-snug">
                  {lesson.topic || 'Тема не указана'}
                </p>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {lesson.homework ? `ДЗ: ${lesson.homework}` : 'Домашнее задание не задано'}
                </p>
              </div>
            </div>

            {/* Блок «Посещаемость» */}
            <div className="rounded-xl border border-slate-100 bg-white p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-slate-800 font-bold text-xs">
                  <Users className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Посещаемость</span>
                </div>
                <button
                  type="button"
                  onClick={() => onEdit(lesson)}
                  className="text-[11px] font-medium text-blue-600 hover:text-blue-700 transition-colors cursor-pointer flex items-center gap-0.5"
                >
                  <span>Открыть журнал</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>

              {/* Сводка чипсов: [ ● 3 были ] [ ● 1 пропуск ] [ ◷ 75% ] */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span>{getPresentWord(presentCount)}</span>
                </span>
                <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                  <span>{getAbsentWord(absentCount)}</span>
                </span>
                <span className="bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1">
                  <span>◷ {attendanceRate}%</span>
                </span>
              </div>

              {/* Компактный список учеников (строки по ~30px) */}
              {students.length === 0 ? (
                <p className="text-slate-400 text-xs py-2 text-center">Нет привязанных учеников</p>
              ) : (
                <div className="divide-y divide-slate-100 pt-1">
                  {students.map((st) => {
                    const stInitials =
                      st.name
                        .trim()
                        .split(' ')
                        .slice(0, 2)
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase() || 'У';

                    const isPresent = st.attendanceStatus === 'present';
                    const isAbsent = st.attendanceStatus === 'absent';
                    const isExcused = st.attendanceStatus === 'excused';

                    // Determine gender suffix for Russian name
                    const firstName = st.name.trim().split(' ')[0] || '';
                    const isFemale =
                      firstName.endsWith('а') ||
                      firstName.endsWith('я') ||
                      firstName.endsWith('ь');
                    const presentLabel = isFemale ? 'Была' : 'Был';

                    return (
                      <div
                        key={st.id}
                        className="h-[30px] flex items-center justify-between gap-2 py-1 text-xs"
                      >
                        <Link
                          href={`/students/${st.id}`}
                          className="flex items-center gap-2 min-w-0 flex-1 group"
                        >
                          <div className="h-5 w-5 rounded-full bg-slate-100 text-slate-700 font-bold text-[9px] flex items-center justify-center border border-slate-200 shrink-0 group-hover:border-blue-400 transition-colors">
                            {stInitials}
                          </div>
                          <span className="font-medium text-slate-900 group-hover:text-blue-600 truncate transition-colors text-xs">
                            {st.name}
                          </span>
                        </Link>

                        <div className="shrink-0 text-[11px] font-semibold">
                          {isPresent && (
                            <span className="text-emerald-700 flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              <span>{presentLabel}</span>
                            </span>
                          )}
                          {isAbsent && (
                            <span className="text-rose-600 flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                              <span>Пропуск</span>
                            </span>
                          )}
                          {isExcused && (
                            <span className="text-amber-600 flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                              <span>Болезнь</span>
                            </span>
                          )}
                          {!isPresent && !isAbsent && !isExcused && (
                            <span className="text-slate-400 font-normal flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                              <span>Не отмечен</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ВКЛАДКА 2: ПОСЕЩАЕМОСТЬ */}
        {activeTab === 'attendance' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
              <span>Состав группы: {totalStudentsCount} уч.</span>
              <span>Статус присутствия</span>
            </div>

            {students.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                <Users className="h-6 w-6 mx-auto mb-1.5 opacity-40" />
                <p>В этой группе пока нет добавленных учеников</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-100 overflow-hidden">
                {students.map((st) => {
                  const stInitials =
                    st.name
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

                      {/* Кнопки отметки присутствия */}
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

        {/* ВКЛАДКА 3: ЗАМЕТКИ */}
        {activeTab === 'notes' && (
          <div className="space-y-3">
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                <MessageSquare className="h-3.5 w-3.5 text-blue-600" />
                <span>Заметки преподавателя</span>
              </div>
              <p className="text-slate-600 text-xs leading-relaxed">
                {lesson.topic
                  ? `Урок посвящен теме: "${lesson.topic}".`
                  : 'Нет дополнительных заметок к занятию.'}
              </p>
            </div>

            {lesson.homework && (
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 space-y-2">
                <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                  <BookOpen className="h-3.5 w-3.5 text-amber-600" />
                  <span>Материалы и ссылки</span>
                </div>
                <p className="text-slate-600 text-xs leading-relaxed">{lesson.homework}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5. НИЖНЯЯ ЗАКРЕПЛЕННАЯ ССЫЛКА (Sticky Footer) */}
      <div className="border-t border-slate-100 bg-white shrink-0">
        <button
          type="button"
          onClick={() => onEdit(lesson)}
          className="w-full py-3 text-center text-xs font-semibold text-blue-600 hover:bg-blue-50/50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <span>Открыть полную карточку занятия</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );

  return (
    <>
      {isEmbedded ? (
        drawerContent
      ) : (
        <>
          {/* Backdrop Overlay */}
          <div
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-2xs z-40 transition-opacity animate-in fade-in duration-200"
          />
          {drawerContent}
        </>
      )}

      {/* Safe Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-2xs z-60 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-150">
            {/* Header with soft red alert icon */}
            <div className="flex items-start gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-slate-900">Отменить занятие?</h3>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  Подтвердите отмену запланированного занятия
                </p>
              </div>
            </div>

            {/* Context block: Group, Date/Time, Teacher */}
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Группа:</span>
                <span className="font-bold text-slate-900 truncate max-w-[220px]">{lesson.groupName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Курс:</span>
                <span className="font-semibold text-slate-700">{lesson.courseName || 'Основной курс'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Дата и время:</span>
                <span className="font-semibold text-slate-800">{dateFormattedStr} · {lesson.startTime} – {lesson.endTime}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Преподаватель:</span>
                <span className="font-semibold text-slate-800">{lesson.teacherName}</span>
              </div>
            </div>

            {/* Warning block */}
            <div className="rounded-xl bg-amber-50 border border-amber-200/80 p-3 text-xs text-amber-900 leading-relaxed">
              Занятие будет сохранено в системе со статусом <strong className="font-semibold text-amber-950">«Отменено»</strong>. Связи с группой, преподавателем и учениками сохранятся.
            </div>

            {/* Cancellation reason input */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 block">
                Причина отмены <span className="text-slate-400 font-normal">(необязательно)</span>
              </label>
              <textarea
                rows={2}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Например: болезнь преподавателя, праздничный день..."
                className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 resize-none transition-all"
              />
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowCancelConfirm(false);
                  setCancelReason('');
                }}
                disabled={isCancelling}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
              >
                Не отменять
              </button>
              <button
                type="button"
                onClick={handleCancelLesson}
                disabled={isCancelling}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-semibold text-white transition-colors cursor-pointer shadow-2xs flex items-center gap-1.5 disabled:opacity-50"
              >
                {isCancelling ? 'Отмена...' : 'Подтвердить отмену'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
