'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Calendar,
  Clock,
  Video,
  ExternalLink,
  Check,
  Copy,
  User,
  Users,
  Lock,
  MessageSquare,
  History,
  Trash2,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ChevronDown,
  Mail,
  Send,
  BarChart2,
  RotateCcw,
  CalendarDays,
  XCircle,
  ArrowRight,
} from 'lucide-react';
import {
  FullLessonData,
  INITIAL_TEACHERS,
  LessonTimelineEvent,
  LessonRescheduleInfo,
} from '@/lib/data/mockData';
import {
  saveLessonToStorage,
  deleteLessonFromStorage,
  recordLessonAttendanceBatch,
} from '@/lib/data/lessonStorage';
import { useToast } from '@/context/ToastContext';
import { useRole } from '@/context/RoleContext';
import { useLanguage } from '@/context/LanguageContext';
import { getStudentLessonPaymentStatus } from '@/lib/data/lessonPaymentStatusHelper';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

export type LessonModalTab = 'main' | 'attendance' | 'feedback' | 'history';

export interface StudentAttendanceItem {
  studentId: string;
  name: string;
  status: 'present' | 'absent' | 'excused';
  chargeBalance: boolean;
  feedback?: string;
  isPrivateFeedback?: boolean;
}

const QUICK_FEEDBACK_TAGS = [
  'Отличная работа на уроке',
  'Повторить слова к теме',
  'Не выполнил домашнее задание',
  'Активно работал в группе',
  'Нужно подтянуть грамматику',
  'Отличное произношение',
];

function calculateDurationString(start: string, end: string): string {
  if (!start || !end) return '';
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) return '';

  let diffMins = endH * 60 + endM - (startH * 60 + startM);
  if (diffMins < 0) diffMins += 24 * 60;

  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;

  if (hours > 0 && mins > 0) return `${hours} ч ${mins} мин`;
  if (hours > 0) return `${hours} ч`;
  return `${mins} мин`;
}

function formatFullDateWithWeekday(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const weekday = d.toLocaleDateString('ru-RU', { weekday: 'short' });
    const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
    const day = d.getDate();
    const month = d.toLocaleDateString('ru-RU', { month: 'long' });
    const year = d.getFullYear();
    return `${capitalizedWeekday}, ${day} ${month} ${year} г.`;
  } catch {
    return dateStr;
  }
}

export interface LessonModalProps {
  isOpen: boolean;
  lesson: FullLessonData | null;
  initialTab?: LessonModalTab;
  highlightReschedule?: boolean;
  onClose: () => void;
  onSave: (updatedLesson: FullLessonData) => void;
  onDelete?: (lessonId: string) => void;
}

export type DesktopLessonModalProps = LessonModalProps;

export function LessonModal({
  isOpen,
  lesson,
  initialTab,
  highlightReschedule,
  onClose,
  onSave,
  onDelete,
}: LessonModalProps) {
  const toast = useToast();
  const { role } = useRole();
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);

  // Tabs
  const [activeTab, setActiveTab] = useState<LessonModalTab>('main');

  // Status & Menu State
  const [currentStatus, setCurrentStatus] = useState<'scheduled' | 'completed' | 'cancelled' | 'rescheduled'>('scheduled');
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [showCancelConfirmModal, setShowCancelConfirmModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('Отмена по запросу');

  // Editable Form Fields
  const [topic, setTopic] = useState('');
  const [homework, setHomework] = useState('');
  const [generalLessonNote, setGeneralLessonNote] = useState('');
  const [generalLessonNoteVisibility, setGeneralLessonNoteVisibility] = useState<'parents' | 'internal'>('parents');
  const [nextLessonRecommendation, setNextLessonRecommendation] = useState('');
  const [nextLessonRecommendationVisibility, setNextLessonRecommendationVisibility] = useState<'parents' | 'internal'>('parents');
  const [zoomUrl, setZoomUrl] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [attendance, setAttendance] = useState<StudentAttendanceItem[]>([]);
  const [editingCommentStudentId, setEditingCommentStudentId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  const canEditSchedule = ['developer', 'owner', 'admin', 'administrator', 'superadmin'].includes(role);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) {
        setIsStatusDropdownOpen(false);
      }
    }
    if (isStatusDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isStatusDropdownOpen]);

  // Sync state with incoming lesson
  useEffect(() => {
    if (isOpen && lesson) {
      setActiveTab(initialTab || 'main');
      setIsConfirmingDelete(false);
      setShowCancelConfirmModal(false);
      setIsStatusDropdownOpen(false);
      setCurrentStatus(lesson.status || 'scheduled');
      setTopic(lesson.topic || '');
      setHomework(lesson.homework || '');
      setGeneralLessonNote(lesson.generalLessonNote || lesson.notes || '');
      setGeneralLessonNoteVisibility(lesson.generalLessonNoteVisibility || 'parents');
      setNextLessonRecommendation(lesson.nextLessonRecommendation || '');
      setNextLessonRecommendationVisibility(lesson.nextLessonRecommendationVisibility || 'parents');
      setZoomUrl(lesson.onlineMeetingUrl || 'https://zoom.us/j/teacher-room-english');
      setDate(lesson.date || new Date().toISOString().slice(0, 10));
      setStartTime(lesson.startTime || '18:45');
      setEndTime(lesson.endTime || '20:15');
      setTeacherId(lesson.teacherId || 't1');
      setTeacherName(lesson.teacherName || 'Мария Иванова');

      const initialAttendance: StudentAttendanceItem[] = (lesson.students || []).map((s) => ({
        studentId: s.id,
        name: s.name,
        status:
          s.attendanceStatus === 'excused'
            ? 'excused'
            : s.attendanceStatus === 'absent'
            ? 'absent'
            : 'present',
        chargeBalance: true,
        feedback: s.notes || '',
        isPrivateFeedback: false,
      }));

      setAttendance(initialAttendance);
    }
  }, [isOpen, lesson, initialTab]);

  // Teacher change handler
  const handleTeacherChange = (id: string) => {
    setTeacherId(id);
    const found = INITIAL_TEACHERS.find((t) => t.id === id);
    if (found) {
      setTeacherName(found.name);
    }
  };

  // Attendance handlers
  const handleMarkAllPresent = useCallback(() => {
    setAttendance((prev) => prev.map((s) => ({ ...s, status: 'present' })));
    toast.success('Все ученики отмечены как присутствующие');
  }, [toast]);

  const handleStatusChange = useCallback(
    (studentId: string, status: 'present' | 'absent' | 'excused') => {
      setAttendance((prev) =>
        prev.map((s) => (s.studentId === studentId ? { ...s, status } : s))
      );
    },
    []
  );

  const handleToggleChargeBalance = useCallback((studentId: string) => {
    setAttendance((prev) =>
      prev.map((s) =>
        s.studentId === studentId ? { ...s, chargeBalance: !s.chargeBalance } : s
      )
    );
  }, []);

  const handleFeedbackChange = useCallback((studentId: string, feedback: string) => {
    setAttendance((prev) =>
      prev.map((s) => (s.studentId === studentId ? { ...s, feedback } : s))
    );
  }, []);

  const handleAppendChipToFeedback = (studentId: string, chip: string) => {
    setAttendance((prev) =>
      prev.map((s) => {
        if (s.studentId !== studentId) return s;
        const current = s.feedback?.trim() || '';
        const updated = current ? `${current}. ${chip}` : chip;
        return { ...s, feedback: updated };
      })
    );
  };

  const handleCopyLink = () => {
    if (zoomUrl) {
      navigator.clipboard.writeText(zoomUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      toast.success('Ссылка на Zoom скопирована');
    }
  };

  // Lifecycle Quick Actions
  const handleConductLesson = () => {
    setCurrentStatus('completed');
    setActiveTab('attendance');
    setIsStatusDropdownOpen(false);
    toast.success('Статус изменен на "Проведено". Заполните посещаемость');
  };

  const handleFocusReschedule = () => {
    setActiveTab('main');
    setIsStatusDropdownOpen(false);
    setTimeout(() => {
      dateInputRef.current?.focus();
    }, 100);
  };

  const handleConfirmCancelLesson = () => {
    setCurrentStatus('cancelled');
    setShowCancelConfirmModal(false);
    setIsStatusDropdownOpen(false);
    toast.info('Занятие отменено');
  };

  const handleRestoreLesson = () => {
    setCurrentStatus('scheduled');
    setIsStatusDropdownOpen(false);
    toast.success('Занятие восстановлено со статусом "Запланировано"');
  };

  // Quick Action Buttons
  const handleSendHomeworkEmail = () => {
    if (!homework.trim()) {
      toast.info('Сначала заполните поле "Домашнее задание"');
      return;
    }
    toast.success(`Домашнее задание отправлено родителям (${attendance.length} писем)`);
  };

  const handleSendTelegramReminder = () => {
    toast.success('Напоминание о занятии отправлено в Telegram-чат группы');
  };

  const handleSendAttendanceReport = () => {
    const present = attendance.filter((a) => a.status === 'present').length;
    toast.success(`Отчет о посещаемости (${present}/${attendance.length}) отправлен родителям`);
  };

  // Save lesson
  const handleSave = async () => {
    if (!lesson) return;
    setIsSubmitting(true);

    try {
      const dateFormatted = new Date(date).toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      const dayOfWeek = new Date(date).getDay() === 0 ? 6 : new Date(date).getDay() - 1;

      const isRescheduled =
        date !== lesson.date ||
        startTime !== lesson.startTime ||
        endTime !== lesson.endTime;

      let newStatus = currentStatus;
      if (isRescheduled && currentStatus === 'scheduled') {
        newStatus = 'rescheduled';
      }

      // 1. Record attendance batch
      recordLessonAttendanceBatch({
        lessonId: lesson.id,
        topic: topic.trim() || lesson.topic,
        homework: homework.trim() || undefined,
        teacherName: teacherName || lesson.teacherName,
        status: newStatus,
        studentRecords: attendance.map((a) => ({
          studentId: a.studentId,
          studentName: a.name,
          status: a.status,
          note:
            a.feedback?.trim() ||
            (a.status === 'absent' && !a.chargeBalance ? 'Без списания баланса' : undefined),
        })),
      });

      // 2. Build updated timeline events
      const now = new Date();
      const timestampStr = `${now.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })}, ${now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;

      const updatedEvents: LessonTimelineEvent[] = [...(lesson.timelineEvents || [])];

      if (isRescheduled) {
        updatedEvents.push({
          id: `ev_${Date.now()}_resched`,
          timestamp: timestampStr,
          author: teacherName || 'Администратор',
          role: 'Администратор',
          type: 'rescheduled',
          comment: `Занятие перенесено с ${lesson.date} (${lesson.startTime}–${lesson.endTime}) на ${date} (${startTime}–${endTime})`,
        });
      } else if (newStatus === 'completed' && lesson.status !== 'completed') {
        updatedEvents.push({
          id: `ev_${Date.now()}_conduct`,
          timestamp: timestampStr,
          author: teacherName || 'Преподаватель',
          role: 'Преподаватель',
          type: 'completed',
          comment: `Урок проведен. Присутствовали: ${attendance.filter((a) => a.status === 'present').length}/${attendance.length}`,
        });
      } else if (newStatus === 'cancelled' && lesson.status !== 'cancelled') {
        updatedEvents.push({
          id: `ev_${Date.now()}_cancel`,
          timestamp: timestampStr,
          author: teacherName || 'Администратор',
          role: 'Администратор',
          type: 'cancelled',
          comment: `Занятие отменено (${cancelReason})`,
        });
      } else {
        updatedEvents.push({
          id: `ev_${Date.now()}`,
          timestamp: timestampStr,
          author: teacherName || 'Преподаватель',
          role: 'Преподаватель',
          type: 'attendance_marked',
          comment: `Обновлены параметры урока и посещаемость (${attendance.filter((a) => a.status === 'present').length}/${attendance.length})`,
        });
      }

      const rescheduleInfo: LessonRescheduleInfo | undefined = isRescheduled
        ? {
            previousDate: lesson.date,
            previousTime: `${lesson.startTime} – ${lesson.endTime}`,
            newDate: dateFormatted,
            newTime: `${startTime} – ${endTime}`,
            rawNewDate: date,
            newStartTime: startTime,
            newEndTime: endTime,
            room: 'Онлайн (Zoom)',
            reason: 'Перенос занятия',
            changedBy: teacherName || 'Администратор',
            changedRole: 'Администратор',
            changedAt: timestampStr,
            notifyParents: true,
          }
        : lesson.rescheduleInfo;

      // 3. Build updated lesson object
      const updatedLesson: FullLessonData = {
        ...lesson,
        date,
        dateFormatted,
        dayOfWeek,
        startTime,
        endTime,
        teacherId: teacherId || lesson.teacherId,
        teacherName: teacherName.trim() || lesson.teacherName,
        topic: topic.trim() || 'Тема урока',
        homework: homework.trim() || undefined,
        generalLessonNote: generalLessonNote.trim() || undefined,
        generalLessonNoteVisibility,
        nextLessonRecommendation: nextLessonRecommendation.trim() || undefined,
        nextLessonRecommendationVisibility,
        notes: generalLessonNote.trim() || lesson.notes,
        onlineMeetingUrl: zoomUrl.trim() || undefined,
        room: 'Онлайн (Zoom)',
        status: newStatus,
        rescheduleInfo,
        timelineEvents: updatedEvents,
        students: (lesson.students || []).map((s) => {
          const att = attendance.find((a) => a.studentId === s.id);
          return {
            ...s,
            attendanceStatus: att ? att.status : s.attendanceStatus,
            notes: att?.feedback?.trim() || s.notes,
          };
        }),
      };

      // 4. Persist to storage
      saveLessonToStorage(updatedLesson);

      // 5. Supabase sync
      try {
        const supabase = createClient();
        await supabase
          .from('lessons')
          .update({
            topic: updatedLesson.topic,
            homework: updatedLesson.homework,
            zoom_url: updatedLesson.onlineMeetingUrl,
            teacher_id: updatedLesson.teacherId,
            date: updatedLesson.date,
            start_time: updatedLesson.startTime,
            end_time: updatedLesson.endTime,
            status: newStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', updatedLesson.id);
      } catch (err) {
        console.warn('Supabase save notice:', err);
      }

      // 6. Global events
      window.dispatchEvent(new CustomEvent('crm-lessons-changed', { detail: updatedLesson }));
      window.dispatchEvent(new CustomEvent('crm-students-changed'));

      toast.success(isRescheduled ? 'Занятие успешно перенесено' : 'Данные занятия сохранены');
      onSave(updatedLesson);
      onClose();
    } catch (err: any) {
      console.error('Failed to save lesson:', err);
      toast.error(err.message || 'Ошибка при сохранении занятия');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete lesson
  const handleDeleteLesson = () => {
    if (!lesson) return;
    deleteLessonFromStorage(lesson.id);
    toast.success('Занятие успешно удалено');
    if (onDelete) {
      onDelete(lesson.id);
    } else {
      window.dispatchEvent(
        new CustomEvent('crm-lessons-changed', {
          detail: { lessonId: lesson.id, deleted: true },
        })
      );
    }
    onClose();
  };

  // Dynamic audit history items
  const historyItems = useMemo(() => {
    if (!lesson) return [];
    const items: Array<{
      id: string;
      date: string;
      author: string;
      role: string;
      type: string;
      comment: string;
      badgeColor: string;
    }> = [];

    if (lesson.rescheduleInfo) {
      items.push({
        id: 'hist_reschedule',
        date: lesson.rescheduleInfo.changedAt || 'Недавно',
        author: lesson.rescheduleInfo.changedBy || 'Администратор',
        role: lesson.rescheduleInfo.changedRole || 'Администратор',
        type: 'Перенос занятия',
        comment: `Занятие перенесено с ${lesson.rescheduleInfo.previousDate} (${lesson.rescheduleInfo.previousTime}) на ${lesson.rescheduleInfo.newDate} (${lesson.rescheduleInfo.newTime}).`,
        badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
      });
    }

    if (lesson.timelineEvents && lesson.timelineEvents.length > 0) {
      lesson.timelineEvents.forEach((ev) => {
        let badgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
        let typeLabel = 'Аудит';
        if (ev.type === 'attendance_marked' || ev.type === 'completed') {
          badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
          typeLabel = 'Посещаемость';
        } else if (ev.type === 'rescheduled') {
          badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
          typeLabel = 'Перенос';
        } else if (ev.type === 'cancelled') {
          badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
          typeLabel = 'Отмена';
        } else if (ev.type === 'created') {
          badgeColor = 'bg-slate-100 text-slate-700 border-slate-200';
          typeLabel = 'Создание';
        }

        items.push({
          id: ev.id,
          date: ev.timestamp,
          author: ev.author,
          role: ev.role,
          type: typeLabel,
          comment: ev.comment,
          badgeColor,
        });
      });
    } else {
      items.push({
        id: 'hist_created',
        date: `${formatFullDateWithWeekday(lesson.date)}, 10:00`,
        author: 'Администратор',
        role: 'Администратор',
        type: 'Создание занятия',
        comment: `Занятие добавлено в расписание группы «${lesson.groupName}»`,
        badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
      });

      if (lesson.status === 'completed') {
        items.push({
          id: 'hist_completed',
          date: `${formatFullDateWithWeekday(lesson.date)}, ${lesson.endTime}`,
          author: lesson.teacherName || 'Преподаватель',
          role: 'Преподаватель',
          type: 'Проведение урока',
          comment: `Урок проведен. Заполнена тема: «${lesson.topic}» и отмечена посещаемость.`,
          badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        });
      }
    }

    return items;
  }, [lesson]);

  if (!isOpen || !lesson || !mounted) return null;

  const presentCount = attendance.filter((a) => a.status === 'present').length;
  const absentCount = attendance.filter((a) => a.status === 'absent' || a.status === 'excused').length;
  const totalStudents = attendance.length;
  const attendancePct = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;
  const feedbackCount = attendance.filter((a) => a.feedback && a.feedback.trim().length > 0).length;
  const durationText = calculateDurationString(startTime, endTime);
  const fullDateText = formatFullDateWithWeekday(date);

  const statusConfig = {
    completed: {
      label: 'Проведено',
      icon: Check,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-400/20',
      dotColor: 'bg-emerald-500',
    },
    scheduled: {
      label: 'Запланировано',
      icon: CalendarDays,
      color: 'bg-blue-50 text-blue-700 border-blue-200 ring-blue-400/20',
      dotColor: 'bg-blue-500',
    },
    rescheduled: {
      label: 'Перенесено',
      icon: RotateCcw,
      color: 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-400/20',
      dotColor: 'bg-amber-500',
    },
    cancelled: {
      label: 'Отменено',
      icon: XCircle,
      color: 'bg-rose-50 text-rose-700 border-rose-200 ring-rose-400/20',
      dotColor: 'bg-rose-500',
    },
  }[currentStatus || 'scheduled'];

  return createPortal(
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      {/* Background click overlay */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Main Centered Modal Window */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden z-10 border border-slate-100 animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* ================= 1. HEADER ================= */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
          <div className="flex items-start justify-between gap-3">
            {/* Left: Title, Subtitle, Status, Date/Time */}
            <div className="min-w-0 flex-1 space-y-2">
              <div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight truncate">
                  {lesson.groupName}
                </h2>
                <p className="text-xs font-semibold text-slate-500 truncate">
                  {lesson.courseName || 'Основной курс'}
                </p>
              </div>

              {/* Status and Action Row */}
              <div className="flex items-center gap-2.5 flex-wrap">
                {/* Status Dropdown */}
                <div className="relative" ref={statusDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                    className={cn(
                      'px-2.5 py-1 rounded-full text-xs font-bold border shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer hover:shadow-xs',
                      statusConfig.color
                    )}
                  >
                    <span className={cn('w-2 h-2 rounded-full', statusConfig.dotColor)} />
                    <span>{statusConfig.label}</span>
                    <ChevronDown className="w-3.5 h-3.5 opacity-60 ml-0.5" />
                  </button>

                  {/* Status Dropdown Menu */}
                  {isStatusDropdownOpen && (
                    <div className="absolute left-0 top-full mt-1.5 w-60 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                      <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Управление статусом
                      </div>

                      {currentStatus === 'scheduled' && (
                        <>
                          <button
                            type="button"
                            onClick={handleConductLesson}
                            className="w-full text-left px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 flex items-center gap-2 cursor-pointer transition-colors"
                          >
                            <Check className="w-4 h-4 text-emerald-600" />
                            <span>Провести занятие</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleFocusReschedule}
                            className="w-full text-left px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50 flex items-center gap-2 cursor-pointer transition-colors"
                          >
                            <RotateCcw className="w-4 h-4 text-amber-600" />
                            <span>Перенести занятие</span>
                          </button>

                          <div className="my-1 border-t border-slate-100" />

                          <button
                            type="button"
                            onClick={() => {
                              setIsStatusDropdownOpen(false);
                              setShowCancelConfirmModal(true);
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 flex items-center gap-2 cursor-pointer transition-colors"
                          >
                            <XCircle className="w-4 h-4 text-rose-600" />
                            <span>Отменить занятие</span>
                          </button>
                        </>
                      )}

                      {currentStatus === 'completed' && (
                        <>
                          <div className="px-3 py-2 text-xs text-slate-500 bg-slate-50 border-y border-slate-100">
                            <span className="font-semibold text-emerald-700 block">Занятие проведено</span>
                            <span className="text-[11px] text-slate-500">
                              Проведенные занятия нельзя отменять или переносить.
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab('attendance');
                              setIsStatusDropdownOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                          >
                            <Users className="w-4 h-4 text-blue-600" />
                            <span>Журнал посещаемости</span>
                          </button>
                        </>
                      )}

                      {currentStatus === 'cancelled' && (
                        <button
                          type="button"
                          onClick={handleRestoreLesson}
                          className="w-full text-left px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 flex items-center gap-2 cursor-pointer transition-colors"
                        >
                          <RotateCcw className="w-4 h-4 text-blue-600" />
                          <span>Восстановить занятие</span>
                        </button>
                      )}

                      {currentStatus === 'rescheduled' && (
                        <>
                          <button
                            type="button"
                            onClick={handleConductLesson}
                            className="w-full text-left px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 flex items-center gap-2 cursor-pointer"
                          >
                            <Check className="w-4 h-4 text-emerald-600" />
                            <span>Провести занятие</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleFocusReschedule}
                            className="w-full text-left px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50 flex items-center gap-2 cursor-pointer"
                          >
                            <RotateCcw className="w-4 h-4 text-amber-600" />
                            <span>Изменить дату/время</span>
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Date & Time Text */}
                <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {fullDateText}
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1 font-semibold text-slate-800">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {startTime}–{endTime} {durationText && `(${durationText})`}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Single Teacher Badge & Close Button */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white rounded-xl border border-slate-200 text-xs font-medium text-slate-700 shadow-2xs">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold">
                  {teacherName
                    ? teacherName
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                    : 'П'}
                </div>
                <div className="flex flex-col text-left">
                  <span className="font-bold text-slate-900 leading-tight">
                    {teacherName || 'Преподаватель'}
                  </span>
                  <span className="text-[10px] text-slate-400 leading-tight">
                    Ведущий преподаватель
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/70 rounded-xl transition-colors cursor-pointer"
                title="Закрыть (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* ================= 2. 4-TAB NAVIGATION ================= */}
        <div className="px-6 border-b border-slate-200 bg-white flex items-center gap-6 shrink-0 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('main')}
            className={cn(
              'py-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 shrink-0',
              activeTab === 'main'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
            )}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Основное</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('attendance')}
            className={cn(
              'py-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 shrink-0',
              activeTab === 'attendance'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
            )}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Посещаемость</span>
            <span
              className={cn(
                'text-[10px] px-1.5 py-0.2 rounded-full font-bold',
                activeTab === 'attendance'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-slate-100 text-slate-600'
              )}
            >
              {presentCount}/{totalStudents}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('feedback')}
            className={cn(
              'py-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 shrink-0',
              activeTab === 'feedback'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
            )}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Заметки</span>
            {feedbackCount > 0 && (
              <span
                className={cn(
                  'text-[10px] px-1.5 py-0.2 rounded-full font-bold',
                  activeTab === 'feedback'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-emerald-100 text-emerald-700'
                )}
              >
                {feedbackCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={cn(
              'py-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 shrink-0',
              activeTab === 'history'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
            )}
          >
            <History className="w-3.5 h-3.5" />
            <span>История</span>
            <span
              className={cn(
                'text-[10px] px-1.5 py-0.2 rounded-full font-bold',
                activeTab === 'history'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-slate-100 text-slate-600'
              )}
            >
              {historyItems.length}
            </span>
          </button>
        </div>

        {/* ================= 3. TAB CONTENT ================= */}
        <div className="p-6 overflow-y-auto flex-1 min-h-0 space-y-5 bg-white">
          {/* ----------------- TAB 1: ОСНОВНОЕ ----------------- */}
          {activeTab === 'main' && (
            <div className="space-y-4 animate-in fade-in duration-100">
              {/* Row 1: Group & Zoom Link */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                    Учебная группа <span className="text-rose-500">*</span>
                  </label>
                  <div className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 bg-slate-50 flex items-center justify-between shadow-2xs">
                    <span className="truncate">{lesson.groupName}</span>
                    <span className="text-[10px] text-slate-500 font-semibold uppercase">
                      {lesson.courseName || 'Курс'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                    Преподаватель <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={teacherId}
                    onChange={(e) => handleTeacherChange(e.target.value)}
                    disabled={!canEditSchedule || currentStatus === 'completed'}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500 cursor-pointer shadow-2xs"
                  >
                    {INITIAL_TEACHERS.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.role || 'Преподаватель'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Zoom Meeting Link with copy & open actions */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                  Ссылка на занятие (Zoom)
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="url"
                      value={zoomUrl}
                      onChange={(e) => setZoomUrl(e.target.value)}
                      placeholder="https://zoom.us/j/..."
                      className="w-full text-xs font-medium border border-slate-200 rounded-xl pl-8 pr-3 py-2.5 bg-slate-50/50 focus:bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400 shadow-2xs"
                    />
                    <Video className="w-3.5 h-3.5 text-indigo-500 absolute left-2.5 top-3" />
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-3 py-2.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 hover:border-slate-300 rounded-xl shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                    title="Скопировать ссылку"
                  >
                    {copiedLink ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                    )}
                    <span>{copiedLink ? 'Скопировано' : 'Скопировать'}</span>
                  </button>

                  {zoomUrl && (
                    <a
                      href={zoomUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-2xs flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
                    >
                      <span>Войти</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>

              {/* Row 3: Date, Start Time, End Time & Helper Banner */}
              <div
                className={cn(
                  'rounded-xl transition-all space-y-2',
                  highlightReschedule && 'bg-blue-50/70 border border-blue-200 p-3.5 ring-2 ring-blue-400/30'
                )}
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                      Дата занятия <span className="text-rose-500">*</span>
                    </label>
                    <input
                      ref={dateInputRef}
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      disabled={!canEditSchedule || currentStatus === 'completed'}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500 shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                      Начало <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      disabled={!canEditSchedule || currentStatus === 'completed'}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500 shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                      Окончание <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      disabled={!canEditSchedule || currentStatus === 'completed'}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500 shadow-2xs"
                    />
                  </div>
                </div>

                {/* Helper Banner */}
                <p className="text-[11px] text-slate-500 italic flex items-center gap-1.5 pt-1">
                  <span>ℹ</span>
                  <span>
                    При изменении даты или времени занятие будет перенесено в календаре. Это не изменяет регулярное расписание группы.
                  </span>
                </p>
              </div>

              {/* Row 4: Topic */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                  Тема занятия
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Например: Unit 1: Present Perfect vs Past Simple in conversation"
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white placeholder:text-slate-400 shadow-2xs"
                />
              </div>

              {/* Row 5: Homework */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                  Домашнее задание
                </label>
                <textarea
                  rows={2}
                  value={homework}
                  onChange={(e) => setHomework(e.target.value)}
                  placeholder="Workbook p. 12-14, выучить 10 неправильных глаголов..."
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white placeholder:text-slate-400 leading-relaxed shadow-2xs"
                />
              </div>

              {/* Attendance Summary Box */}
              <div
                className={cn(
                  'p-4 rounded-xl border transition-all flex items-center justify-between gap-4',
                  currentStatus === 'completed'
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                    : 'bg-slate-50/90 border-slate-200 text-slate-800'
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border',
                      currentStatus === 'completed'
                        ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                        : 'bg-slate-200 text-slate-600 border-slate-300'
                    )}
                  >
                    {currentStatus === 'completed' ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <Users className="w-5 h-5" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate">
                      {currentStatus === 'completed'
                        ? `Посещаемость: ${attendancePct}% • Были ${presentCount} из ${totalStudents}`
                        : `Посещаемость не отмечена · ${totalStudents} учеников`}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {currentStatus === 'completed'
                        ? 'Журнал зафиксирован. Вы можете просмотреть или скорректировать данные.'
                        : 'Проведите урок, чтобы зафиксировать присутствие учеников.'}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (currentStatus !== 'completed') {
                      setCurrentStatus('completed');
                    }
                    setActiveTab('attendance');
                  }}
                  className={cn(
                    'px-3.5 py-2 text-xs font-bold rounded-xl shadow-2xs flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors',
                    currentStatus === 'completed'
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  )}
                >
                  <span>
                    {currentStatus === 'completed'
                      ? 'Открыть журнал →'
                      : 'Провести и открыть журнал →'}
                  </span>
                </button>
              </div>

              {/* Quick Actions Box */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Быстрые действия
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSendHomeworkEmail}
                    className="px-3 py-1.5 bg-white hover:bg-blue-50 hover:text-blue-700 text-slate-700 border border-slate-200 hover:border-blue-200 rounded-xl text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Mail className="w-3.5 h-3.5 text-blue-600" />
                    <span>Отправить ДЗ на email</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSendTelegramReminder}
                    className="px-3 py-1.5 bg-white hover:bg-blue-50 hover:text-blue-700 text-slate-700 border border-slate-200 hover:border-blue-200 rounded-xl text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5 text-sky-500" />
                    <span>Напомнить в Telegram</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSendAttendanceReport}
                    disabled={currentStatus !== 'completed' && presentCount === 0}
                    className="px-3 py-1.5 bg-white hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 border border-slate-200 hover:border-emerald-200 rounded-xl text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <BarChart2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Отправить отчет посещаемости</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ----------------- TAB 2: ПОСЕЩАЕМОСТЬ ----------------- */}
          {activeTab === 'attendance' && (
            <div className="space-y-3.5 animate-in fade-in duration-100">
              {/* Header Actions */}
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleMarkAllPresent}
                  className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Отметить всех</span>
                </button>

                <div className="text-xs font-semibold text-slate-600">
                  Состав группы: <span className="font-bold text-slate-900">{totalStudents}</span> уч. ·
                  Присутствуют: <span className="text-emerald-700 font-bold">{presentCount}</span>
                </div>
              </div>

              {/* Student List */}
              <div className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-2xs divide-y divide-slate-100">
                {/* Column Headers */}
                <div className="grid grid-cols-12 gap-2 px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <div className="col-span-4">Ученик ({attendance.length})</div>
                  <div className="col-span-2 text-center">Оплата</div>
                  <div className="col-span-4 text-center">Посещение</div>
                  <div className="col-span-2 text-right">Заметка</div>
                </div>

                {attendance.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    В группе нет прикрепленных учеников
                  </div>
                ) : (
                  attendance.map((st) => {
                    const payStatus = getStudentLessonPaymentStatus(st.studentId);
                    const isEditingComment = editingCommentStudentId === st.studentId;
                    const hasComment = Boolean(st.feedback && st.feedback.trim().length > 0);

                    return (
                      <div
                        key={st.studentId}
                        className="px-3.5 py-2 hover:bg-slate-50/70 transition-colors"
                      >
                        <div className="grid grid-cols-12 gap-2 items-center min-h-[44px]">
                          {/* 1. Student Avatar + Name */}
                          <div className="col-span-4 flex items-center gap-2.5 min-w-0">
                            <div className="h-7 w-7 rounded-full bg-slate-100 font-bold text-slate-700 flex items-center justify-center text-[10px] shrink-0 border border-slate-200">
                              {st.name.split(' ').map((n) => n[0]).join('')}
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="text-xs font-semibold text-slate-800 truncate block">
                                {st.name}
                              </span>
                              {st.status === 'absent' && (
                                <label className="mt-0.5 flex items-center gap-1 text-[10px] text-rose-700 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={st.chargeBalance}
                                    onChange={() => handleToggleChargeBalance(st.studentId)}
                                    className="rounded text-rose-600 focus:ring-rose-500 h-3 w-3 border-rose-300"
                                  />
                                  <span>Списать с баланса</span>
                                </label>
                              )}
                            </div>
                          </div>

                          {/* 2. Payment Badge */}
                          <div className="col-span-2 flex justify-center">
                            <span
                              className={cn(
                                'rounded-full px-2 py-0.5 text-[10px] font-bold border text-center shadow-2xs',
                                payStatus.badgeClass
                              )}
                            >
                              {payStatus.label}
                            </span>
                          </div>

                          {/* 3. Status Switcher Buttons */}
                          <div className="col-span-4 flex items-center justify-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleStatusChange(st.studentId, 'present')}
                              className={cn(
                                'px-2 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer border flex items-center gap-1',
                                st.status === 'present'
                                  ? 'bg-emerald-500 text-white border-emerald-500 shadow-2xs font-bold'
                                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                              )}
                            >
                              <span className="text-[9px]">●</span>
                              <span>Был</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleStatusChange(st.studentId, 'absent')}
                              className={cn(
                                'px-2 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer border flex items-center gap-1',
                                st.status === 'absent'
                                  ? 'bg-rose-500 text-white border-rose-500 shadow-2xs font-bold'
                                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                              )}
                            >
                              <span className="text-[9px]">●</span>
                              <span>Пропуск</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleStatusChange(st.studentId, 'excused')}
                              className={cn(
                                'px-2 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer border flex items-center gap-1',
                                st.status === 'excused'
                                  ? 'bg-amber-500 text-white border-amber-500 shadow-2xs font-bold'
                                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                              )}
                            >
                              <span className="text-[9px]">●</span>
                              <span>Болезнь</span>
                            </button>
                          </div>

                          {/* 4. Teacher Note */}
                          <div className="col-span-2 flex items-center justify-end gap-1.5 min-w-0">
                            <button
                              type="button"
                              onClick={() =>
                                setEditingCommentStudentId(
                                  isEditingComment ? null : st.studentId
                                )
                              }
                              className={cn(
                                'p-1.5 rounded-lg border transition-colors cursor-pointer shrink-0',
                                hasComment || isEditingComment
                                  ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                                  : 'bg-slate-50 text-slate-400 border-slate-200 hover:text-slate-600 hover:bg-slate-100'
                              )}
                              title={hasComment ? 'Изменить заметку' : 'Добавить заметку'}
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </button>
                            <span
                              onClick={() =>
                                setEditingCommentStudentId(
                                  isEditingComment ? null : st.studentId
                                )
                              }
                              className={cn(
                                'text-xs truncate max-w-[80px] cursor-pointer block',
                                hasComment
                                  ? 'text-slate-700 font-medium hover:text-blue-600'
                                  : 'text-slate-400 italic hover:text-slate-600'
                              )}
                              title={st.feedback || 'Добавить заметку'}
                            >
                              {st.feedback ? st.feedback : 'Заметка'}
                            </span>
                          </div>
                        </div>

                        {/* Inline Expandable Comment Editor */}
                        {isEditingComment && (
                          <div className="mt-2 pt-2 border-t border-slate-100 space-y-2 animate-in fade-in duration-150">
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                autoFocus
                                value={st.feedback || ''}
                                onChange={(e) => handleFeedbackChange(st.studentId, e.target.value)}
                                placeholder="Заметка к уроку (активность, успехи, поведение)..."
                                className="flex-1 text-xs bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-lg px-2.5 py-1.5 text-slate-800 placeholder:text-slate-400 focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => setEditingCommentStudentId(null)}
                                className="px-2.5 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer"
                              >
                                Готово
                              </button>
                            </div>

                            <div className="flex flex-wrap items-center gap-1">
                              {QUICK_FEEDBACK_TAGS.slice(0, 4).map((chip) => (
                                <button
                                  key={chip}
                                  type="button"
                                  onClick={() => handleAppendChipToFeedback(st.studentId, chip)}
                                  className="text-[10px] font-medium bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200/80 transition-colors cursor-pointer"
                                >
                                  + {chip}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ----------------- TAB 3: ЗАМЕТКИ ----------------- */}
          {activeTab === 'feedback' && (
            <div className="space-y-4 animate-in fade-in duration-100">
              {/* General Lesson Note */}
              <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/90 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5 uppercase">
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span>Общий комментарий по занятию</span>
                  </label>
                  <select
                    value={generalLessonNoteVisibility}
                    onChange={(e) =>
                      setGeneralLessonNoteVisibility(e.target.value as 'parents' | 'internal')
                    }
                    className="text-[11px] font-semibold bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
                  >
                    <option value="parents">👁️ Виден родителям</option>
                    <option value="internal">🔒 Только для школы</option>
                  </select>
                </div>
                <textarea
                  rows={2}
                  value={generalLessonNote}
                  onChange={(e) => setGeneralLessonNote(e.target.value)}
                  placeholder="Что происходило на уроке, успехи группы, пройденные темы..."
                  className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400 leading-relaxed shadow-2xs"
                />
              </div>

              {/* Next Lesson Recommendation */}
              <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/90 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5 uppercase">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Рекомендации к следующему занятию</span>
                  </label>
                  <select
                    value={nextLessonRecommendationVisibility}
                    onChange={(e) =>
                      setNextLessonRecommendationVisibility(
                        e.target.value as 'parents' | 'internal'
                      )
                    }
                    className="text-[11px] font-semibold bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
                  >
                    <option value="parents">👁️ Виден родителям</option>
                    <option value="internal">🔒 Только для школы</option>
                  </select>
                </div>
                <textarea
                  rows={2}
                  value={nextLessonRecommendation}
                  onChange={(e) => setNextLessonRecommendation(e.target.value)}
                  placeholder="На что обратить внимание к следующему занятию, что повторить..."
                  className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400 leading-relaxed shadow-2xs"
                />
              </div>

              {/* Individual Student Notes List */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Индивидуальные заметки по ученикам ({attendance.length})
                  </h4>
                </div>

                <div className="space-y-2">
                  {attendance.map((st) => (
                    <div
                      key={st.studentId}
                      className="p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors space-y-2 shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-full bg-slate-100 font-bold text-slate-700 flex items-center justify-center text-[10px] shrink-0 border border-slate-200">
                          {st.name.split(' ').map((n) => n[0]).join('')}
                        </div>
                        <span className="text-xs font-semibold text-slate-800 w-36 truncate shrink-0">
                          {st.name}
                        </span>
                        <input
                          type="text"
                          value={st.feedback || ''}
                          onChange={(e) => handleFeedbackChange(st.studentId, e.target.value)}
                          placeholder="Индивидуальная заметка к уроку..."
                          className="flex-1 h-8 text-xs border border-slate-200 rounded-lg px-2.5 bg-slate-50 focus:bg-white focus:border-blue-500 text-slate-800 placeholder:text-slate-400 focus:outline-none transition-colors"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ----------------- TAB 4: ИСТОРИЯ ----------------- */}
          {activeTab === 'history' && (
            <div className="space-y-4 animate-in fade-in duration-100">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-slate-400" />
                  <span>Таймлайн аудита занятия</span>
                </h4>
                <span className="text-[11px] text-slate-400">
                  Всего событий: {historyItems.length}
                </span>
              </div>

              {/* Vertical timeline */}
              <div className="relative pl-6 space-y-3.5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {historyItems.map((item) => (
                  <div key={item.id} className="relative group">
                    <div className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-white border-2 border-blue-500 shadow-xs" />
                    <div className="p-3 bg-slate-50/80 hover:bg-slate-50 rounded-xl border border-slate-200 transition-colors space-y-1">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[9px] font-bold shrink-0">
                            {item.author.split(' ').map((n) => n[0]).join('')}
                          </div>
                          <span className="text-xs font-bold text-slate-800">
                            {item.author}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            · {item.role}
                          </span>
                          <span className={cn('text-[10px] font-bold px-1.5 py-0.2 rounded-full border', item.badgeColor)}>
                            {item.type}
                          </span>
                        </div>
                        <span className="text-[11px] font-medium text-slate-400">
                          {item.date}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed font-normal pl-7">
                        {item.comment}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ================= 4. UNIFIED FOOTER ================= */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
          {/* Left Action: Delete with confirm safety */}
          <div>
            {!isConfirmingDelete ? (
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(true)}
                disabled={isSubmitting}
                className="px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 border border-transparent hover:border-rose-200"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Удалить занятие</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 animate-in fade-in duration-100">
                <span className="text-xs font-bold text-rose-700">Удалить точно?</span>
                <button
                  type="button"
                  onClick={handleDeleteLesson}
                  className="px-2.5 py-1 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
                >
                  Да, удалить
                </button>
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(false)}
                  className="px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Отмена
                </button>
              </div>
            )}
          </div>

          {/* Right Actions: Cancel / Save */}
          <div className="flex items-center gap-2.5">
            {activeTab === 'history' ? (
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 text-xs font-bold text-slate-700 bg-slate-200 hover:bg-slate-300 rounded-xl transition-colors cursor-pointer shadow-2xs"
              >
                Закрыть
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200/70 rounded-xl transition-colors cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-md transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmitting ? 'Сохранение...' : 'Сохранить изменения'}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Cancel Confirmation Dialog */}
      {showCancelConfirmModal && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Отменить занятие?</h3>
                <p className="text-xs text-slate-500">
                  Занятие останется в истории и календаре со статусом «Отменено».
                </p>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Причина отмены
              </label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Болезнь преподавателя, праздничный день..."
                className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelConfirmModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Назад
              </button>
              <button
                type="button"
                onClick={handleConfirmCancelLesson}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-2xs cursor-pointer transition-colors"
              >
                Да, отменить занятие
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}

export const DesktopLessonModal = LessonModal;
