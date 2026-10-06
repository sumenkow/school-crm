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
  ChevronDown,
} from 'lucide-react';
import { FullLessonData, INITIAL_TEACHERS, LessonTimelineEvent } from '@/lib/data/mockData';
import {
  saveLessonToStorage,
  deleteLessonFromStorage,
  recordLessonAttendanceBatch,
  restoreLessonBilling,
  getStoredLessonById,
  approveLessonInStorage,
  rejectLessonInStorage,
} from '@/lib/data/lessonStorage';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/context/ToastContext';
import { useLanguage } from '@/context/LanguageContext';
import { usePermissions, useRole } from '@/context/RoleContext';
import { getStudentLessonPaymentStatus, getTeacherAdmissionBadge } from '@/lib/data/lessonPaymentStatusHelper';
import { cn } from '@/lib/utils';

export interface LessonDetailsDrawerProps {
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
  onDelete?: (lessonId: string) => void;
  isEmbedded?: boolean;
}

export type LessonPreviewDrawerProps = LessonDetailsDrawerProps;

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

export function LessonDetailsDrawer({
  isOpen,
  lesson,
  onClose,
  onEdit,
  onLessonUpdated,
  onDuplicate,
  onDelete,
  isEmbedded = false,
}: LessonDetailsDrawerProps) {
  const toast = useToast();
  const { t } = useLanguage();
  const { canViewStudentFinancialAmounts } = usePermissions();
  const { role, userName } = useRole();
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'notes'>('overview');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const statusMenuRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
      if (statusMenuRef.current && !statusMenuRef.current.contains(event.target as Node)) {
        setIsStatusMenuOpen(false);
      }
    }
    if (isMenuOpen || isStatusMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isMenuOpen, isStatusMenuOpen]);

  // Handle ESC key to close
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (showRejectConfirm) {
          setShowRejectConfirm(false);
        } else if (showCancelConfirm) {
          setShowCancelConfirm(false);
        } else if (showDeleteConfirm) {
          setShowDeleteConfirm(false);
        } else {
          onClose();
        }
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, showCancelConfirm, showDeleteConfirm, showRejectConfirm, onClose]);

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

  // Attendance stats
  const students = lesson.students || [];
  const totalStudentsCount = students.length;
  const presentCount = students.filter((s) => s.attendanceStatus === 'present').length;
  const absentCount = students.filter((s) => s.attendanceStatus === 'absent').length;
  const attendanceRate =
    totalStudentsCount > 0 ? Math.round((presentCount / totalStudentsCount) * 100) : 0;
  const hasMarkedAttendance = students.some(
    (s) => s.attendanceStatus && s.attendanceStatus !== 'not_marked'
  );

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

    // Sync student stats and attendance history everywhere
    recordLessonAttendanceBatch({
      lessonId: lesson.id,
      topic: lesson.topic,
      homework: lesson.homework,
      teacherName: lesson.teacherName,
      status: lesson.status,
      studentRecords: updatedStudents.map((s) => ({
        studentId: s.id,
        studentName: s.name,
        status: s.attendanceStatus === 'not_marked' ? 'not_marked' : s.attendanceStatus,
        note: s.notes,
      })),
    });

    if (onLessonUpdated) onLessonUpdated(updatedLesson);
    window.dispatchEvent(new CustomEvent('crm-lessons-changed', { detail: updatedLesson }));
    window.dispatchEvent(new CustomEvent('crm-students-changed'));
  };

  // Handle Mark All Present
  const handleMarkAllPresent = () => {
    if (!students || students.length === 0) return;
    const updatedStudents = students.map((s) => ({
      ...s,
      attendanceStatus: 'present' as const,
    }));

    const updatedLesson: FullLessonData = {
      ...lesson,
      students: updatedStudents,
    };

    saveLessonToStorage(updatedLesson);

    recordLessonAttendanceBatch({
      lessonId: lesson.id,
      topic: lesson.topic,
      homework: lesson.homework,
      teacherName: lesson.teacherName,
      status: lesson.status,
      studentRecords: updatedStudents.map((s) => ({
        studentId: s.id,
        studentName: s.name,
        status: 'present',
        note: s.notes,
      })),
    });

    if (onLessonUpdated) onLessonUpdated(updatedLesson);
    window.dispatchEvent(new CustomEvent('crm-lessons-changed', { detail: updatedLesson }));
    window.dispatchEvent(new CustomEvent('crm-students-changed'));
    toast.success('Все ученики отмечены как присутствующие');
  };

  // Handle Reset Attendance with Zero Premature Billing protection
  const handleResetAttendance = () => {
    if (!lesson || !students || students.length === 0) return;

    try {
      // 1. Rollback all billing deductions for this lesson
      const { restoredCount } = restoreLessonBilling(lesson.id);

      // 2. Fetch fresh lesson after billing rollback
      const currentFresh = getStoredLessonById(lesson.id) || lesson;

      // 3. Mark all students as 'not_marked'
      const updatedStudents = (currentFresh.students || []).map((s) => ({
        ...s,
        attendanceStatus: 'not_marked' as const,
        billed: false,
      }));

      const updatedLesson: FullLessonData = {
        ...currentFresh,
        isBilled: false,
        billedStudentIds: [],
        students: updatedStudents,
      };

      saveLessonToStorage(updatedLesson);

      // 4. Sync attendance history and Supabase DB
      recordLessonAttendanceBatch({
        lessonId: updatedLesson.id,
        topic: updatedLesson.topic,
        homework: updatedLesson.homework,
        teacherName: updatedLesson.teacherName,
        status: updatedLesson.status,
        studentRecords: updatedStudents.map((s) => ({
          studentId: s.id,
          studentName: s.name,
          status: 'not_marked',
          note: s.notes,
        })),
      });

      const finalLesson = getStoredLessonById(lesson.id) || updatedLesson;
      if (onLessonUpdated) onLessonUpdated(finalLesson);
      window.dispatchEvent(new CustomEvent('crm-lessons-changed', { detail: finalLesson }));
      window.dispatchEvent(new CustomEvent('crm-students-changed'));

      if (restoredCount > 0) {
        toast.info(`Отметки сброшены. Возврат списаний выполнен для ${restoredCount} уч.`);
      } else {
        toast.info('Отметки посещаемости сброшены');
      }
    } catch (err) {
      console.error('Failed to reset attendance:', err);
      toast.error('Не удалось сбросить отметки посещаемости');
    }
  };

  // Handle Conduct lesson action
  const handleConductLesson = async () => {
    if (!lesson) return;
    try {
      const now = new Date();
      const timestampStr = `${now.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })}, ${now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
      
      const updatedEvents: LessonTimelineEvent[] = [
        ...(lesson.timelineEvents || []),
        {
          id: `ev_${Date.now()}_conduct`,
          timestamp: timestampStr,
          author: 'Администратор',
          role: 'Администратор',
          type: 'completed',
          comment: 'Занятие переведено в статус "Проведено"',
        },
      ];

      const updatedLesson: FullLessonData = {
        ...lesson,
        status: 'completed',
        timelineEvents: updatedEvents,
      };

      saveLessonToStorage(updatedLesson);

      try {
        const supabase = createClient();
        await supabase
          .from('lessons')
          .update({ status: 'completed', updated_at: new Date().toISOString() })
          .eq('id', updatedLesson.id);
      } catch (err) {
        console.warn('Supabase completed update notice:', err);
      }

      window.dispatchEvent(new CustomEvent('crm-lessons-changed', { detail: updatedLesson }));
      if (onLessonUpdated) onLessonUpdated(updatedLesson);
      setIsStatusMenuOpen(false);
      setActiveTab('attendance');
      toast.success('Занятие проведено. Отметьте посещаемость в журнале.');
    } catch (err: any) {
      console.error('Failed to conduct lesson:', err);
      toast.error('Не удалось провести занятие');
    }
  };

  // Handle Cancel lesson action
  const handleCancelLesson = async () => {
    if (!lesson) return;
    setIsCancelling(true);
    try {
      if (lesson.status === 'completed') {
        const { restoredCount } = restoreLessonBilling(lesson.id);
        if (restoredCount > 0) {
          toast.info(`Возврат списания занятия выполнен для ${restoredCount} уч.`);
        }
      }

      const freshLesson = getStoredLessonById(lesson.id) || lesson;
      const now = new Date();
      const timestampStr = `${now.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })}, ${now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
      
      const updatedEvents: LessonTimelineEvent[] = [
        ...(freshLesson.timelineEvents || []),
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
        ...freshLesson,
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

  // Handle Delete lesson action
  const handleDeleteLesson = async () => {
    if (!lesson) return;
    setIsDeleting(true);
    try {
      deleteLessonFromStorage(lesson.id);
      if (onDelete) {
        onDelete(lesson.id);
      }
      setShowDeleteConfirm(false);
      onClose();
      toast.success('Занятие удалено из расписания');
    } catch (err: any) {
      console.error('Failed to delete lesson:', err);
      toast.error('Не удалось удалить занятие');
    } finally {
      setIsDeleting(false);
    }
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

  // Handle Admin Approve lesson action
  const handleApproveLesson = async () => {
    if (!lesson) return;
    setIsApproving(true);
    try {
      const updated = await approveLessonInStorage(lesson.id);
      if (updated) {
        if (onLessonUpdated) onLessonUpdated(updated);
        toast.success('Занятие успешно подтверждено');
      } else {
        toast.error('Не удалось подтвердить занятие');
      }
    } catch (err: any) {
      console.error('Failed to approve lesson:', err);
      toast.error('Ошибка при подтверждении занятия');
    } finally {
      setIsApproving(false);
    }
  };

  // Handle Admin Reject lesson action
  const handleRejectLesson = async () => {
    if (!lesson) return;
    if (!rejectReason.trim()) {
      toast.error('Пожалуйста, укажите причину отклонения');
      return;
    }
    setIsRejecting(true);
    try {
      const updated = await rejectLessonInStorage(lesson.id, rejectReason.trim());
      if (updated) {
        if (onLessonUpdated) onLessonUpdated(updated);
        setShowRejectConfirm(false);
        setRejectReason('');
        toast.success('Занятие отклонено');
      } else {
        toast.error('Не удалось отклонить занятие');
      }
    } catch (err: any) {
      console.error('Failed to reject lesson:', err);
      toast.error('Ошибка при отклонении занятия');
    } finally {
      setIsRejecting(false);
    }
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
      <div className="p-4 border-b border-slate-100 bg-white space-y-2.5 shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {lesson.status === 'pending' && (
              <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold text-slate-900 truncate leading-snug">
                {lesson.status === 'pending'
                  ? 'Занятие (на подтверждении)'
                  : lesson.groupName.split('(')[0].trim()}
              </h2>
              <p className="text-xs text-slate-500 truncate mt-0.5 font-medium">
                {lesson.status === 'pending'
                  ? lesson.groupName.split('(')[0].trim()
                  : lesson.courseName || 'Основной курс'}
              </p>
            </div>
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

        {/* Интерактивный статус занятия и метка формата/пробного урока */}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg border shadow-2xs bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1">
            {lesson.isIndividual ? '👤 Индивидуальное' : '👥 Групповое'}
          </span>

          {lesson.status === 'completed' ? (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg border shadow-2xs bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-600" />
              <span>Проведено</span>
            </span>
          ) : lesson.status === 'cancelled' ? (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg border shadow-2xs bg-rose-50 text-rose-700 border-rose-200 flex items-center gap-1.5">
              <X className="h-3.5 w-3.5 text-rose-600" />
              <span>Отменено</span>
            </span>
          ) : lesson.status === 'pending' ? (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg border shadow-2xs bg-amber-50 text-amber-800 border-amber-300 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              <span>🟡 На подтверждении</span>
            </span>
          ) : (
            /* Активный статус для scheduled / rescheduled с выпадающим меню действий */
            <div className="relative inline-block" ref={statusMenuRef}>
              <button
                type="button"
                onClick={() => setIsStatusMenuOpen(!isStatusMenuOpen)}
                className={cn(
                  'text-xs font-semibold px-2.5 py-1 rounded-lg border shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer hover:shadow-xs',
                  lesson.status === 'rescheduled'
                    ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100/80'
                    : 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100/80'
                )}
                title="Нажмите, чтобы изменить статус занятия"
              >
                <span>{lesson.status === 'rescheduled' ? '⇄ Перенесено' : '📅 Запланировано'}</span>
                <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-150', isStatusMenuOpen && 'rotate-180')} />
              </button>

              {isStatusMenuOpen && (
                <div className="absolute left-0 mt-1.5 w-60 rounded-xl border border-slate-200/90 bg-white p-1.5 shadow-xl z-40 space-y-0.5 text-xs animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-2.5 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Действия со статусом
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsStatusMenuOpen(false);
                      handleConductLesson();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-emerald-50 text-emerald-700 font-semibold transition-colors text-left cursor-pointer group"
                  >
                    <div className="h-6 w-6 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <div className="leading-tight font-semibold">Провести занятие</div>
                      <div className="text-[10px] text-emerald-600/80 font-normal">Перейти к посещаемости</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsStatusMenuOpen(false);
                      onEdit(lesson, 'main', true);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-slate-700 font-medium transition-colors text-left cursor-pointer group"
                  >
                    <div className="h-6 w-6 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Calendar className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <div className="leading-tight font-semibold">Перенести занятие</div>
                      <div className="text-[10px] text-slate-400 font-normal">Изменить дату или время</div>
                    </div>
                  </button>

                  <div className="h-px bg-slate-100 my-1" />

                  <button
                    type="button"
                    onClick={() => {
                      setIsStatusMenuOpen(false);
                      setShowCancelConfirm(true);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-rose-50 text-rose-600 font-medium transition-colors text-left cursor-pointer group"
                  >
                    <div className="h-6 w-6 rounded-md bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <AlertCircle className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <div className="leading-tight font-semibold">Отменить занятие</div>
                      <div className="text-[10px] text-rose-400 font-normal">С сохранением в истории</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsStatusMenuOpen(false);
                      setShowDeleteConfirm(true);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-rose-50 text-rose-700 font-medium transition-colors text-left cursor-pointer group"
                  >
                    <div className="h-6 w-6 rounded-md bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Trash2 className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <div className="leading-tight font-semibold text-rose-700">Удалить занятие</div>
                      <div className="text-[10px] text-rose-400 font-normal">Безвозвратно из расписания</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}

          {lesson.isTrial && (
            <span className="text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-lg">
              Пробное
            </span>
          )}
        </div>

        {/* Дата, время и аудитория */}
        <div className="text-xs text-slate-500 mt-2 flex items-center justify-between gap-1.5 font-medium">
          <div className="flex items-center gap-1.5 truncate">
            <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="truncate">
              {dateFormattedStr} · {lesson.startTime} – {lesson.endTime} ({durationStr})
            </span>
          </div>
          {lesson.room && !isOnline && (
            <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60 shrink-0 flex items-center gap-1">
              <MapPin className="h-3 w-3 text-slate-400" />
              {lesson.room}
            </span>
          )}
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
          <div className="flex-1 py-2 px-3 bg-slate-50 text-slate-400 font-medium text-xs rounded-xl flex items-center justify-center gap-1.5 border border-slate-100">
            <Video className="h-3.5 w-3.5 text-slate-300" />
            <span className="text-[11px]">Онлайн · ссылка не указана</span>
          </div>
        )}

        <button
          type="button"
          onClick={() => onEdit(lesson, 'main')}
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
                    <span>Журнал посещаемости</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onEdit(lesson, 'history');
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-slate-700 transition-colors text-left cursor-pointer"
                  >
                    <History className="h-3.5 w-3.5 text-slate-400" />
                    <span>История изменений</span>
                  </button>
                  <div className="h-px bg-slate-100 my-1" />
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      handleDuplicateLesson();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-slate-700 transition-colors text-left cursor-pointer"
                  >
                    <Copy className="h-3.5 w-3.5 text-slate-400" />
                    <span>Дублировать занятие</span>
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
                  <div className="h-px bg-slate-100 my-1" />
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      handleDuplicateLesson();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-slate-700 transition-colors text-left cursor-pointer"
                  >
                    <Copy className="h-3.5 w-3.5 text-slate-400" />
                    <span>Дублировать занятие</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      handleDuplicateLesson();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-slate-700 transition-colors text-left cursor-pointer"
                  >
                    <Copy className="h-3.5 w-3.5 text-slate-400" />
                    <span>Дублировать занятие</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onEdit(lesson, 'history');
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-slate-700 transition-colors text-left cursor-pointer"
                  >
                    <History className="h-3.5 w-3.5 text-slate-400" />
                    <span>История изменений</span>
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
            {/* Блок причины отклонения, если есть */}
            {lesson.rejectionReason && (
              <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-rose-800 font-bold text-xs">
                  <AlertCircle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                  <span>Причина отклонения:</span>
                </div>
                <p className="text-xs text-rose-900 leading-relaxed font-medium">
                  {lesson.rejectionReason}
                </p>
              </div>
            )}

            {/* Карточка группы / направления */}
            <div className="rounded-xl border border-purple-100 bg-purple-50/50 p-3 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                <BookOpen className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-slate-900 truncate">
                  {lesson.groupName.split('(')[0].trim()}
                </div>
                <div className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                  {lesson.courseName || 'Основной курс'} • {lesson.students?.length || 0} учеников
                  {lesson.isIndividual && ' (Индивидуально)'}
                </div>
              </div>
            </div>

            {/* Мета-информация: Дата, Время, Преподаватель, Zoom */}
            <div className="rounded-xl border border-slate-100 bg-white p-3 space-y-2.5">
              <div className="flex items-center gap-2 text-xs text-slate-700">
                <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                <span className="font-semibold">{dateFormattedStr}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-700">
                <Clock className="h-4 w-4 text-slate-400 shrink-0" />
                <span className="font-semibold">{lesson.startTime} – {lesson.endTime}</span>
                <span className="text-slate-400">({durationStr})</span>
              </div>
              <div className="flex items-center justify-between gap-2 text-xs text-slate-700">
                <div className="flex items-center gap-2 min-w-0">
                  <User className="h-4 w-4 text-slate-400 shrink-0" />
                  <div className="min-w-0">
                    <span className="font-semibold text-slate-900">{lesson.teacherName}</span>
                    {lesson.created_at ? (
                      <span className="text-[10px] text-slate-400 block">
                        Создано {new Date(lesson.created_at).toLocaleDateString('ru-RU')}, {new Date(lesson.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 block">
                        Создано {dateFormattedStr}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {lesson.onlineMeetingUrl && (
                <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-indigo-50/60 border border-indigo-100 text-xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Video className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                    <span className="text-indigo-900 truncate font-mono text-[11px]">{lesson.onlineMeetingUrl}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(lesson.onlineMeetingUrl || '');
                      toast.success('Ссылка на Zoom скопирована');
                    }}
                    className="px-2 py-0.5 rounded bg-white border border-indigo-200 text-indigo-700 text-[10px] font-semibold hover:bg-indigo-50 transition-colors shrink-0 cursor-pointer"
                  >
                    Скопировать
                  </button>
                </div>
              )}
            </div>

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
                  {lesson.topic ? `Тема: ${lesson.topic}` : 'Тема не указана'}
                </p>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {lesson.homework ? `Домашнее задание: ${lesson.homework}` : 'Домашнее задание не задано'}
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
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-slate-500 font-medium">
                Состав группы: {totalStudentsCount} уч.
              </span>
              {students.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleResetAttendance}
                    disabled={!hasMarkedAttendance}
                    className={cn(
                      'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium text-[11px] border transition-colors',
                      hasMarkedAttendance
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 cursor-pointer shadow-2xs'
                        : 'bg-slate-50 text-slate-400 border-slate-200/60 cursor-not-allowed opacity-60'
                    )}
                    title="Сбросить все отметки посещаемости и вернуть списания"
                  >
                    <RotateCcw className="h-3 w-3 text-slate-500" />
                    <span>Сбросить отметки</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleMarkAllPresent}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[11px] border border-emerald-200 transition-colors cursor-pointer shadow-2xs"
                    title="Отметить всех учеников как присутствующих"
                  >
                    <Check className="h-3 w-3 text-emerald-600" />
                    <span>Отметить всех</span>
                  </button>
                </div>
              )}
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
                        </div>
                      </Link>

                      {/* Payment Status Badge */}
                      <div className="shrink-0">
                        {(() => {
                          if (!canViewStudentFinancialAmounts) {
                            const teacherBadge = getTeacherAdmissionBadge(st.id, st.isTrial);
                            return (
                              <span className={cn('whitespace-nowrap inline-block', teacherBadge.badgeClass)}>
                                {teacherBadge.label}
                              </span>
                            );
                          }
                          const payStatus = getStudentLessonPaymentStatus(st.id, st.isTrial);
                          return (
                            <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold border shrink-0', payStatus.badgeClass)}>
                              {payStatus.label}
                            </span>
                          );
                        })()}
                      </div>

                      {/* Кнопки отметки присутствия */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStudentAttendanceChange(st.id, st.attendanceStatus === 'present' ? 'not_marked' : 'present')}
                          title={st.attendanceStatus === 'present' ? 'Сбросить отметку' : 'Был'}
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
                          onClick={() => handleStudentAttendanceChange(st.id, st.attendanceStatus === 'absent' ? 'not_marked' : 'absent')}
                          title={st.attendanceStatus === 'absent' ? 'Сбросить отметку' : 'Пропуск'}
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
                          onClick={() => handleStudentAttendanceChange(st.id, st.attendanceStatus === 'excused' ? 'not_marked' : 'excused')}
                          title={st.attendanceStatus === 'excused' ? 'Сбросить отметку' : 'Болезнь / Уважительная'}
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
                {lesson.generalLessonNote || lesson.notes || (lesson.topic ? `Урок посвящен теме: "${lesson.topic}".` : 'Нет дополнительных заметок к занятию.')}
              </p>
            </div>

            {lesson.nextLessonRecommendation && (
              <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3 space-y-1.5">
                <div className="flex items-center gap-1.5 text-blue-900 font-semibold text-xs">
                  <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                  <span>Рекомендации к следующему уроку</span>
                </div>
                <p className="text-slate-700 text-xs leading-relaxed">{lesson.nextLessonRecommendation}</p>
              </div>
            )}

            {lesson.homework && (
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 space-y-2">
                <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                  <BookOpen className="h-3.5 w-3.5 text-amber-600" />
                  <span>Домашнее задание</span>
                </div>
                <p className="text-slate-600 text-xs leading-relaxed">{lesson.homework}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5. НИЖНЯЯ ЗАКРЕПЛЕННАЯ ССЫЛКА (Sticky Footer) */}
      <div className="border-t border-slate-100 bg-white p-3 space-y-2 shrink-0">
        {lesson.status === 'pending' ? (
          <>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleApproveLesson}
                disabled={isApproving}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                <span>{isApproving ? 'Подтверждение...' : 'Подтвердить'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowRejectConfirm(true)}
                disabled={isRejecting}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 font-semibold text-xs transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
              >
                <X className="h-4 w-4" />
                <span>Отклонить</span>
              </button>

              <button
                type="button"
                onClick={() => onEdit(lesson, 'main')}
                className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors shadow-2xs cursor-pointer"
                title="Изменить занятие"
              >
                <Edit3 className="h-4 w-4 text-slate-400" />
                <span>Изменить</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 px-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium text-xs transition-colors cursor-pointer text-center"
            >
              Закрыть
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => onEdit(lesson)}
            className="w-full py-2.5 text-center text-xs font-semibold text-blue-600 hover:bg-blue-50/50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Открыть полную карточку занятия</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
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

      {/* Safe Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-2xs z-60 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-150">
            {/* Header with red trash icon */}
            <div className="flex items-start gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-slate-900">Удалить занятие?</h3>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  Это действие нельзя отменить
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
                <span className="text-slate-500 font-medium">Дата и время:</span>
                <span className="font-semibold text-slate-800">{dateFormattedStr} · {lesson.startTime} – {lesson.endTime}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Преподаватель:</span>
                <span className="font-semibold text-slate-800">{lesson.teacherName}</span>
              </div>
            </div>

            {/* Warning alert block */}
            <div className="rounded-xl bg-rose-50 border border-rose-200/80 p-3 text-xs text-rose-900 leading-relaxed">
              Занятие будет <strong className="font-semibold text-rose-950">безвозвратно удалено</strong> из расписания. Если вы просто не проводите занятие в этот день, рекомендуем использовать <strong>«Отменить занятие»</strong>.
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleDeleteLesson}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-semibold text-white transition-colors cursor-pointer shadow-2xs flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeleting ? 'Удаление...' : 'Удалить занятие'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Safe Reject Confirmation Modal */}
      {showRejectConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-2xs z-60 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-150">
            {/* Header with red X icon */}
            <div className="flex items-start gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <X className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-slate-900">Отклонить занятие?</h3>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  Укажите причину отклонения. Преподаватель получит уведомление в Telegram.
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
                <span className="text-slate-500 font-medium">Дата и время:</span>
                <span className="font-semibold text-slate-800">{dateFormattedStr} · {lesson.startTime} – {lesson.endTime}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Преподаватель:</span>
                <span className="font-semibold text-slate-800">{lesson.teacherName}</span>
              </div>
            </div>

            {/* Rejection reason textarea */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                Причина отклонения *
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Например: Нет возможности в это время, выберите другой слот..."
                className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 resize-none transition-all"
              />
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowRejectConfirm(false);
                  setRejectReason('');
                }}
                disabled={isRejecting}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleRejectLesson}
                disabled={isRejecting || !rejectReason.trim()}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-semibold text-white transition-colors cursor-pointer shadow-2xs flex items-center gap-1.5 disabled:opacity-50"
              >
                {isRejecting ? 'Отклонение...' : 'Подтвердить отклонение'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export const LessonPreviewDrawer = LessonDetailsDrawer;
