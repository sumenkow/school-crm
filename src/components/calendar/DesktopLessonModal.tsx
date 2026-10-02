'use client';

import React, { useState, useEffect, useCallback, memo, useMemo } from 'react';
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
  MapPin,
  Sparkles,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
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

/**
 * Calculates duration string between two HH:MM strings.
 */
function calculateDurationString(start: string, end: string): string {
  if (!start || !end) return '';
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) return '';

  let diffMins = (endH * 60 + endM) - (startH * 60 + startM);
  if (diffMins < 0) diffMins += 24 * 60;

  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;

  if (hours > 0 && mins > 0) return `${hours} ч ${mins} мин`;
  if (hours > 0) return `${hours} ч`;
  return `${mins} мин`;
}

/**
 * Formats full Russian date string with day of week.
 */
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

interface DesktopLessonModalProps {
  isOpen: boolean;
  lesson: FullLessonData | null;
  onClose: () => void;
  onSave: (updatedLesson: FullLessonData) => void;
  onDelete?: (lessonId: string) => void;
}

export function DesktopLessonModal({
  isOpen,
  lesson,
  onClose,
  onSave,
  onDelete,
}: DesktopLessonModalProps) {
  const toast = useToast();
  const { role } = useRole();
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<LessonModalTab>('main');

  // Editable Form Fields
  const [topic, setTopic] = useState('');
  const [homework, setHomework] = useState('');
  const [generalLessonNote, setGeneralLessonNote] = useState('');
  const [generalLessonNoteVisibility, setGeneralLessonNoteVisibility] = useState<'parents' | 'internal'>('parents');
  const [nextLessonRecommendation, setNextLessonRecommendation] = useState('');
  const [nextLessonRecommendationVisibility, setNextLessonRecommendationVisibility] = useState<'parents' | 'internal'>('parents');
  const [zoomUrl, setZoomUrl] = useState('');
  const [isOnlineFormat, setIsOnlineFormat] = useState(true);
  const [room, setRoom] = useState('');
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

  const canEditSchedule = ['developer', 'owner', 'admin', 'administrator', 'superadmin'].includes(role);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync state with incoming lesson
  useEffect(() => {
    if (isOpen && lesson) {
      setActiveTab('main');
      setIsConfirmingDelete(false);
      setTopic(lesson.topic || '');
      setHomework(lesson.homework || '');
      setGeneralLessonNote('');
      setGeneralLessonNoteVisibility('parents');
      setNextLessonRecommendation('');
      setNextLessonRecommendationVisibility('parents');
      setZoomUrl(lesson.onlineMeetingUrl || '');
      setIsOnlineFormat(
        !!(lesson.onlineMeetingUrl || lesson.room?.toLowerCase().includes('онлайн') || lesson.room?.toLowerCase().includes('zoom'))
      );
      setRoom(lesson.room || 'Онлайн (Zoom)');
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
  }, [isOpen, lesson]);

  // Handle teacher change
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

  const handleToggleFeedbackVisibility = useCallback((studentId: string) => {
    setAttendance((prev) =>
      prev.map((s) =>
        s.studentId === studentId
          ? { ...s, isPrivateFeedback: !s.isPrivateFeedback }
          : s
      )
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

      // 1. Record attendance batch (updates student history & localStorage)
      recordLessonAttendanceBatch({
        lessonId: lesson.id,
        topic: topic.trim() || lesson.topic,
        homework: homework.trim() || undefined,
        teacherName: teacherName || lesson.teacherName,
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
      const timestampStr = `${now.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })}, ${now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
      
      const updatedEvents: LessonTimelineEvent[] = [
        ...(lesson.timelineEvents || []),
        {
          id: `ev_${Date.now()}`,
          timestamp: timestampStr,
          author: teacherName || 'Преподаватель',
          role: 'Преподаватель',
          type: 'attendance_marked',
          comment: `Обновлены параметры урока и журнал посещаемости (${attendance.filter((a) => a.status === 'present').length}/${attendance.length} присутствуют)`,
        },
      ];

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
        onlineMeetingUrl: isOnlineFormat ? zoomUrl.trim() || undefined : undefined,
        room: isOnlineFormat ? 'Онлайн (Zoom)' : room.trim() || 'Аудитория 1',
        status: 'completed',
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

      // 4. Persist to local & in-memory storage
      saveLessonToStorage(updatedLesson);

      // 5. Supabase cloud sync
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
            room: updatedLesson.room,
            status: 'completed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', updatedLesson.id);

        const attendancePayload = attendance.map((st) => ({
          lesson_id: updatedLesson.id,
          student_id: st.studentId,
          status: st.status,
          charge_balance: st.status === 'present' || (st.status === 'absent' && st.chargeBalance),
          feedback: st.feedback?.trim() || null,
          updated_at: new Date().toISOString(),
        }));

        await supabase
          .from('lesson_attendance')
          .upsert(attendancePayload, { onConflict: 'lesson_id,student_id' });
      } catch (err) {
        console.warn('Supabase save notice:', err);
      }

      // 6. Notify global listeners
      window.dispatchEvent(new CustomEvent('crm-lessons-changed', { detail: updatedLesson }));
      window.dispatchEvent(new CustomEvent('crm-students-changed'));

      toast.success('Данные занятия и журнал сохранены');
      onSave(updatedLesson);
      onClose();
    } catch (err: any) {
      console.error('Failed to save desktop lesson:', err);
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
      window.dispatchEvent(new CustomEvent('crm-lessons-changed', { detail: { lessonId: lesson.id, deleted: true } }));
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

    // 1. Reschedule event if exists
    if (lesson.rescheduleInfo) {
      items.push({
        id: 'hist_reschedule',
        date: lesson.rescheduleInfo.changedAt || 'Недавно',
        author: lesson.rescheduleInfo.changedBy || 'Администратор',
        role: lesson.rescheduleInfo.changedRole || 'Администратор',
        type: 'Перенос занятия',
        comment: `Занятие перенесено с ${lesson.rescheduleInfo.previousDate} (${lesson.rescheduleInfo.previousTime}) на ${lesson.rescheduleInfo.newDate} (${lesson.rescheduleInfo.newTime}). Причина: ${lesson.rescheduleInfo.reason || 'По расписанию'}`,
        badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
      });
    }

    // 2. Custom timeline events
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
      // Fallback baseline creation & completion events
      items.push({
        id: 'hist_created',
        date: `${formatFullDateWithWeekday(lesson.date)}, 10:00`,
        author: 'Анна Админ',
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
          comment: `Урок проведен. Заполнена тема: «${lesson.topic}» и выставлены оценки посещаемости.`,
          badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        });
      }
    }

    return items;
  }, [lesson]);

  if (!isOpen || !lesson || !mounted) return null;

  // Counts for tab badges
  const presentCount = attendance.filter((a) => a.status === 'present').length;
  const totalStudents = attendance.length;
  const feedbackCount = attendance.filter((a) => a.feedback && a.feedback.trim().length > 0).length;
  const durationText = calculateDurationString(startTime, endTime);
  const fullDateText = formatFullDateWithWeekday(date);

  // Status configuration
  const statusConfig = {
    completed: { label: '✓ Проведено', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    scheduled: { label: 'Запланировано', classes: 'bg-blue-50 text-blue-700 border-blue-200' },
    rescheduled: { label: 'Перенесено', classes: 'bg-amber-50 text-amber-700 border-amber-200' },
    cancelled: { label: 'Отменено', classes: 'bg-rose-50 text-rose-700 border-rose-200' },
  }[lesson.status || 'scheduled'];

  return createPortal(
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      {/* Backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Centered Modal Container */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden z-10 border border-slate-100 animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* 1. HEADER */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-900 truncate">
                  {lesson.groupName}
                </h3>
                {/* Status chips */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={cn('text-[11px] font-bold px-2 py-0.5 rounded-full border shadow-2xs', statusConfig.classes)}>
                    {statusConfig.label}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-full">
                    {lesson.courseName || 'Основной курс'}
                  </span>
                  {isOnlineFormat ? (
                    <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Video className="w-3 h-3 text-indigo-600" />
                      Онлайн (Zoom)
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {room || 'Офлайн'}
                    </span>
                  )}
                </div>
              </div>

              {/* Subtitle with date, time, and duration */}
              <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 font-medium">
                <span className="flex items-center gap-1 text-slate-600">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {fullDateText}
                </span>
                <span>·</span>
                <span className="flex items-center gap-1 text-slate-600">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {startTime} – {endTime} {durationText && `(${durationText})`}
                </span>
              </div>
            </div>

            {/* Teacher Pill & Close Button */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 shadow-2xs">
                <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold">
                  {teacherName ? teacherName.split(' ').map((n) => n[0]).join('') : 'Т'}
                </div>
                <span className="truncate max-w-[130px]">{teacherName || 'Преподаватель'}</span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
                title="Закрыть (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* 2. 4-TAB NAVIGATION BAR */}
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
            <span>Обратная связь</span>
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

        {/* 3. TAB CONTENT BODY */}
        <div className="p-6 overflow-y-auto flex-1 min-h-0 space-y-5 bg-white">
          {/* ================= TAB 1: ОСНОВНОЕ ================= */}
          {activeTab === 'main' && (
            <div className="space-y-4 animate-in fade-in duration-100">
              {/* Row 1: Group & Teacher Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                    Группа
                  </label>
                  <div className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 bg-slate-50 flex items-center justify-between">
                    <span className="truncate">{lesson.groupName}</span>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">
                      {lesson.courseName || 'Курс'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                    Преподаватель
                  </label>
                  <select
                    value={teacherId}
                    onChange={(e) => handleTeacherChange(e.target.value)}
                    disabled={!canEditSchedule}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500 cursor-pointer"
                  >
                    {INITIAL_TEACHERS.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.role || 'Преподаватель'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Date & Start / End Time */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                    Дата урока
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    disabled={!canEditSchedule}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                    Время начала
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    disabled={!canEditSchedule}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                    Время окончания
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    disabled={!canEditSchedule}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
                  />
                </div>
              </div>

              {/* Row 3: Format (Online/Offline) & Meeting URL */}
              <div className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/40 space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsOnlineFormat(true)}
                      className={cn(
                        'px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer',
                        isOnlineFormat
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                          : 'bg-white text-indigo-900 border-indigo-200 hover:bg-indigo-100/50'
                      )}
                    >
                      <Video className="w-3.5 h-3.5 inline mr-1" />
                      Онлайн (Zoom)
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsOnlineFormat(false)}
                      className={cn(
                        'px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer',
                        !isOnlineFormat
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                          : 'bg-white text-indigo-900 border-indigo-200 hover:bg-indigo-100/50'
                      )}
                    >
                      <MapPin className="w-3.5 h-3.5 inline mr-1" />
                      Офлайн в классе
                    </button>
                  </div>

                  {isOnlineFormat && zoomUrl && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-indigo-200 shadow-2xs cursor-pointer"
                      >
                        {copiedLink ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>{copiedLink ? 'Скопировано' : 'Скопировать'}</span>
                      </button>
                      <a
                        href={zoomUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors shadow-2xs"
                      >
                        <span>Войти</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>

                {isOnlineFormat ? (
                  <input
                    type="url"
                    value={zoomUrl}
                    onChange={(e) => setZoomUrl(e.target.value)}
                    placeholder="https://zoom.us/j/123456789 или ссылка на Google Meet..."
                    className="w-full text-xs font-medium border border-indigo-200 rounded-xl px-3 py-2 bg-white text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-indigo-300"
                  />
                ) : (
                  <input
                    type="text"
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    placeholder="Аудитория 302, Главный корпус..."
                    className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
                  />
                )}
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
                  rows={3}
                  value={homework}
                  onChange={(e) => setHomework(e.target.value)}
                  placeholder="Workbook p. 12-14, выучить 10 неправильных глаголов..."
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white placeholder:text-slate-400 leading-relaxed shadow-2xs"
                />
              </div>

              {!canEditSchedule && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium">
                  <Lock className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>
                    Режим преподавателя: изменять дату, время и состав группы может только администратор
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ================= TAB 2: ПОСЕЩАЕМОСТЬ ================= */}
          {activeTab === 'attendance' && (
            <div className="space-y-3.5 animate-in fade-in duration-100">
              {/* 1. ВЕРХНЯЯ ПАНЕЛЬ ДЕЙСТВИЙ */}
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleMarkAllPresent}
                  className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>+ Отметить всех присутствующими</span>
                </button>

                <div className="text-xs font-semibold text-slate-500">
                  Присутствуют: <span className="text-emerald-700 font-bold">{presentCount}</span> из {totalStudents}
                </div>
              </div>

              {/* 2. ТАБЛИЦА / СПИСОК УЧЕНИКОВ */}
              <div className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-2xs">
                {/* Заголовок колонок */}
                <div className="grid grid-cols-12 gap-2 px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <div className="col-span-4 flex items-center gap-1">
                    <span>Ученик ({attendance.length})</span>
                  </div>
                  <div className="col-span-2 text-center">
                    <span>Оплата</span>
                  </div>
                  <div className="col-span-4 text-center">
                    <span>Статус посещения</span>
                  </div>
                  <div className="col-span-2 text-right">
                    <span>Комментарий</span>
                  </div>
                </div>

                {/* Список строк учеников */}
                <div className="divide-y divide-slate-100">
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
                            {/* 1. Ученик: круглый аватар с инициалами + ФИО */}
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

                            {/* 2. Оплата: аккуратный бейдж */}
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

                            {/* 3. Статус посещения: интерактивная группа кнопок-переключателей */}
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
                                title="Отметить: был(а) на уроке"
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
                                title="Отметить: пропуск занятия"
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
                                title="Отметить: пропуск по уважительной причине (болезнь)"
                              >
                                <span className="text-[9px]">●</span>
                                <span>Болезнь</span>
                              </button>
                            </div>

                            {/* 4. Комментарий преподавателя: иконка 💬 + текст */}
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
                                title={hasComment ? 'Изменить комментарий' : 'Добавить комментарий'}
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
                                  'text-xs truncate max-w-[90px] cursor-pointer block',
                                  hasComment
                                    ? 'text-slate-600 font-medium hover:text-blue-600'
                                    : 'text-slate-400 italic hover:text-slate-600'
                                )}
                                title={st.feedback || 'Добавить заметку'}
                              >
                                {st.feedback ? st.feedback : 'Заметка'}
                              </span>
                            </div>
                          </div>

                          {/* Inline Comment Editor (Expandable on click) */}
                          {isEditingComment && (
                            <div className="mt-2 pt-2 border-t border-slate-100 space-y-2 animate-in fade-in duration-150">
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  autoFocus
                                  value={st.feedback || ''}
                                  onChange={(e) => handleFeedbackChange(st.studentId, e.target.value)}
                                  placeholder="Заметка к уроку (успехи, активность, ДЗ)..."
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

                              {/* Quick tags */}
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
            </div>
          )}

          {/* ================= TAB 3: ОБРАТНАЯ СВЯЗЬ ================= */}
          {activeTab === 'feedback' && (
            <div className="space-y-4 animate-in fade-in duration-100">
              {/* Блок 1: "Общий комментарий по занятию" */}
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
                    <option value="parents">👁️ Виден родителям ▾</option>
                    <option value="internal">🔒 Только для школы ▾</option>
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

              {/* Блок 2: "Рекомендации к следующему занятию" */}
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
                    <option value="parents">👁️ Виден родителям ▾</option>
                    <option value="internal">🔒 Только для школы ▾</option>
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

              {/* Блок 3: "Индивидуальные комментарии" */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Индивидуальные комментарии ({attendance.length})
                  </h4>
                  <span className="text-[10px] text-slate-400 font-medium">
                    Синхронизируется с личным кабинетом
                  </span>
                </div>

                <div className="space-y-2">
                  {attendance.map((st) => (
                    <div
                      key={st.studentId}
                      className="p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors space-y-2 shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5">
                        {/* Avatar */}
                        <div className="h-7 w-7 rounded-full bg-slate-100 font-bold text-slate-700 flex items-center justify-center text-[10px] shrink-0 border border-slate-200">
                          {st.name.split(' ').map((n) => n[0]).join('')}
                        </div>

                        {/* Name */}
                        <span className="text-xs font-semibold text-slate-800 w-36 truncate shrink-0">
                          {st.name}
                        </span>

                        {/* Note Input */}
                        <input
                          type="text"
                          value={st.feedback || ''}
                          onChange={(e) => handleFeedbackChange(st.studentId, e.target.value)}
                          placeholder="Заметка к уроку..."
                          className="flex-1 h-8 text-xs border border-slate-200 rounded-lg px-2.5 bg-slate-50 focus:bg-white focus:border-blue-500 text-slate-800 placeholder:text-slate-400 focus:outline-none transition-colors"
                        />

                        {/* Visibility Selector */}
                        <select
                          value={st.isPrivateFeedback ? 'internal' : 'parents'}
                          onChange={(e) => {
                            const isPrivate = e.target.value === 'internal';
                            setAttendance((prev) =>
                              prev.map((item) =>
                                item.studentId === st.studentId
                                  ? { ...item, isPrivateFeedback: isPrivate }
                                  : item
                              )
                            );
                          }}
                          className="text-[11px] font-semibold bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 cursor-pointer shrink-0 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
                        >
                          <option value="parents">👁️ Виден родителям ▾</option>
                          <option value="internal">🔒 Только внутренний ▾</option>
                        </select>
                      </div>

                      {/* Quick Chips */}
                      <div className="flex flex-wrap items-center gap-1 pl-9">
                        {QUICK_FEEDBACK_TAGS.map((chip) => (
                          <button
                            key={chip}
                            type="button"
                            onClick={() => handleAppendChipToFeedback(st.studentId, chip)}
                            className="text-[10px] font-medium bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200/70 transition-colors cursor-pointer"
                          >
                            + {chip}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 4: ИСТОРИЯ ================= */}
          {activeTab === 'history' && (
            <div className="space-y-4 animate-in fade-in duration-100">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-slate-400" />
                  <span>Таймлайн аудита занятия</span>
                </h4>
                <span className="text-[11px] text-slate-400">
                  Всего записей: {historyItems.length}
                </span>
              </div>

              {/* Vertical timeline */}
              <div className="relative pl-6 space-y-3.5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {historyItems.map((item) => (
                  <div key={item.id} className="relative group">
                    {/* Timeline bullet */}
                    <div className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-white border-2 border-blue-500 shadow-xs" />

                    <div className="p-3 bg-slate-50/80 hover:bg-slate-50 rounded-xl border border-slate-200 transition-colors space-y-1.5">
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

              {/* System Metadata Info Box */}
              <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/80 text-[11px] text-slate-500 space-y-0.5">
                <div className="flex items-center justify-between">
                  <span>Создано:</span>
                  <span className="font-semibold text-slate-700">
                    {lesson.dateFormatted || lesson.date}, 10:00 · Анна Админ
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Последнее изменение:</span>
                  <span className="font-semibold text-slate-700">
                    {lesson.dateFormatted || lesson.date}, {lesson.endTime || '20:15'} · {teacherName || lesson.teacherName}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 4. UNIFIED STICKY FOOTER */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
          {/* Left Action: Delete Lesson with inline confirmation */}
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

          {/* Right Action: Cancel / Save or Close on History tab */}
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
    </div>,
    document.body
  );
}

