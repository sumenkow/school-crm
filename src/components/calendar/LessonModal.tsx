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
  Users,
  MessageSquare,
  History,
  Trash2,
  FileText,
  AlertTriangle,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Mail,
  Send,
  BarChart2,
  RotateCcw,
  CalendarDays,
  XCircle,
  Paperclip,
  CheckCircle2,
  ArrowLeftRight,
  HelpCircle,
} from 'lucide-react';
import {
  FullLessonData,
  LessonStatus,
  INITIAL_TEACHERS,
  LessonTimelineEvent,
  LessonRescheduleInfo,
} from '@/lib/data/mockData';
import {
  saveLessonToStorage,
  deleteLessonFromStorage,
  recordLessonAttendanceBatch,
  getStoredLessonById,
  getStoredLessons,
  restoreLessonBilling,
} from '@/lib/data/lessonStorage';
import { getStoredGroups } from '@/lib/data/groupStorage';
import { getStoredStudents } from '@/lib/data/studentStorage';
import { saveInteractionToStorage } from '@/lib/data/timelineStorage';
import { useToast } from '@/context/ToastContext';
import { useRole, usePermissions } from '@/context/RoleContext';
import { useLanguage } from '@/context/LanguageContext';
import { getStudentLessonPaymentStatus, getTeacherAdmissionBadge } from '@/lib/data/lessonPaymentStatusHelper';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import {
  checkThreeWayCollision,
  CandidateLesson,
  ConflictDetail,
  AvailableSlot,
} from '@/lib/data/collisionHelper';
import { CollisionWarningModal } from './CollisionWarningModal';
import { ScheduleLessonModal } from './ScheduleLessonModal';

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
    return `${capitalizedWeekday}, ${day} ${month} ${year}`;
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
  const { role, userName } = useRole();
  const { canViewStudentFinancialAmounts } = usePermissions();
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);

  // Tabs
  const [activeTab, setActiveTab] = useState<LessonModalTab>('main');

  // Status & Menu State
  const [currentStatus, setCurrentStatus] = useState<LessonStatus>('scheduled');
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [showCancelConfirmModal, setShowCancelConfirmModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('Отмена по запросу');

  // Unsaved changes confirmation
  const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState(false);

  // Communication confirmation modals
  const [showEmailConfirmModal, setShowEmailConfirmModal] = useState(false);
  const [showTgConfirmModal, setShowTgConfirmModal] = useState(false);
  const [showAttendanceReportConfirmModal, setShowAttendanceReportConfirmModal] = useState(false);

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
  const [isCollisionModalOpen, setIsCollisionModalOpen] = useState(false);
  const [collisionData, setCollisionData] = useState<{
    conflicts: ConflictDetail[];
    nearestSlots: AvailableSlot[];
  } | null>(null);

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
      setShowUnsavedChangesModal(false);
      setShowEmailConfirmModal(false);
      setShowTgConfirmModal(false);
      setShowAttendanceReportConfirmModal(false);
      setIsStatusDropdownOpen(false);
      setCurrentStatus(lesson.status || 'scheduled');
      setTopic(lesson.topic || '');
      setHomework(lesson.homework || '');
      setGeneralLessonNote(lesson.generalLessonNote || lesson.notes || '');
      setGeneralLessonNoteVisibility(lesson.generalLessonNoteVisibility || 'parents');
      setNextLessonRecommendation(lesson.nextLessonRecommendation || '');
      setNextLessonRecommendationVisibility(lesson.nextLessonRecommendationVisibility || 'parents');
      setZoomUrl(lesson.onlineMeetingUrl || 'https://zoom.us/j/123456789');
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

  // Track if any changes have been made (dirty checking)
  const isDirty = useMemo(() => {
    if (!lesson) return false;
    const initialDate = lesson.date || '';
    const initialStartTime = lesson.startTime || '';
    const initialEndTime = lesson.endTime || '';
    const initialTopic = lesson.topic || '';
    const initialHomework = lesson.homework || '';
    const initialZoom = lesson.onlineMeetingUrl || 'https://zoom.us/j/123456789';
    const initialNote = lesson.generalLessonNote || lesson.notes || '';
    const initialStatus = lesson.status || 'scheduled';

    if (date !== initialDate) return true;
    if (startTime !== initialStartTime) return true;
    if (endTime !== initialEndTime) return true;
    if (topic !== initialTopic) return true;
    if (homework !== initialHomework) return true;
    if (zoomUrl !== initialZoom) return true;
    if (generalLessonNote !== initialNote) return true;
    if (currentStatus !== initialStatus) return true;

    // Check attendance status changes
    for (const item of attendance) {
      const original = (lesson.students || []).find((s) => s.id === item.studentId);
      const originalStatus = original?.attendanceStatus === 'excused' ? 'excused' : original?.attendanceStatus === 'absent' ? 'absent' : 'present';
      if (item.status !== originalStatus) return true;
      if ((item.feedback || '') !== (original?.notes || '')) return true;
    }

    return false;
  }, [lesson, date, startTime, endTime, topic, homework, zoomUrl, generalLessonNote, currentStatus, attendance]);

  // Real-time 3-Way Collision Check (F23, F24, F25)
  const inlineCollision = useMemo(() => {
    if (!lesson || !isOpen || !date || !startTime || !endTime) {
      return { hasConflict: false, conflicts: [], nearestSlots: [] };
    }
    const existingLessons = getStoredLessons();
    const candidate: CandidateLesson = {
      id: lesson.id,
      date,
      startTime,
      endTime,
      teacherId: teacherId || lesson.teacherId,
      teacherName: teacherName || lesson.teacherName,
      groupId: lesson.groupId,
      groupName: lesson.groupName,
      studentId: lesson.studentId,
      studentName: lesson.studentName,
      students: lesson.students,
      isIndividual: lesson.isIndividual,
      room: lesson.room || 'Онлайн (Zoom)',
    };
    return checkThreeWayCollision(existingLessons, candidate);
  }, [lesson, isOpen, date, startTime, endTime, teacherId, teacherName]);

  // Safe Close with Confirmation
  const handleSafeClose = () => {
    if (isDirty) {
      setShowUnsavedChangesModal(true);
    } else {
      onClose();
    }
  };

  // Load group details for extra metadata
  const groupMetadata = useMemo(() => {
    if (!lesson) return null;
    const groups = getStoredGroups();
    const g = groups.find((grp) => grp.id === lesson.groupId || grp.name === lesson.groupName);
    return {
      level: g?.level || 'B1',
      ageRange: '13–16 лет',
      totalEnrolled: lesson.students?.length || g?.students?.length || 7,
    };
  }, [lesson]);

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
      toast.success('Ссылка на занятие скопирована');
    }
  };

  // Lifecycle Status Transitions
  const handleConductLesson = () => {
    setCurrentStatus('completed');
    setActiveTab('attendance');
    setIsStatusDropdownOpen(false);

    // Save immediate transition to storage
    if (lesson) {
      const updated: FullLessonData = {
        ...lesson,
        status: 'completed',
        timelineEvents: [
          ...(lesson.timelineEvents || []),
          {
            id: `ev_${Date.now()}_conduct`,
            timestamp: `${new Date().toLocaleDateString('ru-RU')}, ${new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`,
            author: teacherName || 'Преподаватель',
            role: 'Преподаватель',
            type: 'completed',
            comment: 'Статус занятия изменен на «Проведено». Открыт журнал посещаемости.',
          },
        ],
      };
      saveLessonToStorage(updated);
      window.dispatchEvent(new CustomEvent('crm-lessons-changed', { detail: updated }));
    }

    toast.success('Статус изменен на "Проведено". Отметьте присутствующих');
  };

  const handleFocusReschedule = () => {
    setActiveTab('main');
    setIsStatusDropdownOpen(false);
    setTimeout(() => {
      dateInputRef.current?.focus();
    }, 100);
  };

  const handleConfirmCancelLesson = () => {
    if (lesson && (lesson.status === 'completed' || currentStatus === 'completed')) {
      const { restoredCount } = restoreLessonBilling(lesson.id);
      if (restoredCount > 0) {
        toast.info(`Возврат списания занятия выполнен для ${restoredCount} уч.`);
      }
    }
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

  // Quick Action Handlers
  const handleSendHomeworkConfirm = () => {
    setShowEmailConfirmModal(false);
    toast.success(`Домашнее задание успешно отправлено родителям (${attendance.length} писем)`);
  };

  const handleSendTelegramConfirm = () => {
    setShowTgConfirmModal(false);
    toast.success('Напоминание о занятии отправлено в Telegram-чат группы');
  };

  const handleSendAttendanceReportConfirm = () => {
    setShowAttendanceReportConfirmModal(false);
    const present = attendance.filter((a) => a.status === 'present').length;
    toast.success(`Результаты посещаемости (${present}/${attendance.length}) отправлены родителям`);
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

      // Collision Guard: verify 3-way collision & school hours when saving / rescheduling
      if (inlineCollision.hasConflict && newStatus !== 'cancelled') {
        setCollisionData({
          conflicts: inlineCollision.conflicts,
          nearestSlots: inlineCollision.nearestSlots,
        });
        setIsCollisionModalOpen(true);
        setIsSubmitting(false);
        return;
      }

      // If status is changing to 'cancelled' from 'completed', restore billing
      const storedLessonBeforeAtt = getStoredLessonById(lesson.id);
      const prevLessonState = storedLessonBeforeAtt || lesson;
      if ((lesson.status === 'completed' || prevLessonState.status === 'completed') && newStatus === 'cancelled') {
        const { restoredCount } = restoreLessonBilling(lesson.id);
        if (restoredCount > 0) {
          toast.info(`Возврат списания занятия выполнен для ${restoredCount} уч.`);
        }
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

      if (newStatus === 'cancelled') {
        restoreLessonBilling(lesson.id);
      }

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
          author: userName || 'Администратор',
          role: 'Администратор',
          type: 'rescheduled',
          comment: `Занятие перенесено с ${lesson.date} (${lesson.startTime}–${lesson.endTime}) на ${date} (${startTime}–${endTime})`,
        });

        // Send structured signal to Director's attention feed
        const allStudents = getStoredStudents();
        const timeFormatted = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

        for (const st of lesson.students || []) {
          const fullStudent = allStudents.find((s) => s.id === st.id);
          const parentId = fullStudent?.parents?.[0]?.id;
          const parentName = fullStudent?.parents?.[0]
            ? `${fullStudent.parents[0].firstName} ${fullStudent.parents[0].lastName}`
            : undefined;

          saveInteractionToStorage({
            id: `int_resched_${Date.now()}_${st.id}`,
            studentId: st.id,
            studentName: st.name,
            parentId,
            parentName,
            occurredAt: `Сегодня, ${timeFormatted}`,
            author: userName || 'Администратор',
            channel: 'other',
            type: 'organizational',
            content: `🔄 Перенесено занятие группы «${lesson.groupName}» с ${lesson.date} (${lesson.startTime}–${lesson.endTime}) на ${date} (${startTime}–${endTime}). Преподаватель: ${teacherName}.`,
          });
        }
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
            changedBy: userName || 'Администратор',
            changedRole: 'Администратор',
            changedAt: timestampStr,
            notifyParents: true,
          }
        : lesson.rescheduleInfo;

      // 3. Build updated lesson object from fresh storage state (preserving billedStudentIds and billingDetails)
      const storedLesson = getStoredLessonById(lesson.id);
      const freshLesson = storedLesson || lesson;

      const updatedLesson: FullLessonData = {
        ...freshLesson,
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
        status: newStatus,
        rescheduleInfo,
        timelineEvents: updatedEvents,
        scheduleOverride: isRescheduled ? true : (lesson as any).scheduleOverride,
        billedStudentIds: freshLesson.billedStudentIds,
        billingDetails: freshLesson.billingDetails,
        isBilled: freshLesson.isBilled,
        students: (freshLesson.students || []).map((s) => {
          const att = attendance.find((a) => a.studentId === s.id);
          return {
            ...s,
            attendanceStatus: att ? att.status : s.attendanceStatus,
            notes: att?.feedback?.trim() || s.notes,
          };
        }),
      };

      // 4. Persist to storage
      saveLessonToStorage(updatedLesson, { bypassCollisionCheck: true });

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
      window.dispatchEvent(new CustomEvent('crm-timeline-interactions-changed'));

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

  if (!isOpen || !mounted) return null;

  if (!lesson) {
    return (
      <ScheduleLessonModal
        isOpen={isOpen}
        onClose={onClose}
        onScheduled={(newLesson) => onSave(newLesson)}
      />
    );
  }

  const isCompleted = currentStatus === 'completed';
  const isScheduled = currentStatus === 'scheduled';
  const presentCount = attendance.filter((a) => a.status === 'present').length;
  const absentCount = attendance.filter((a) => a.status === 'absent').length;
  const excusedCount = attendance.filter((a) => a.status === 'excused').length;
  const totalStudents = attendance.length;
  const attendancePct = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;
  const feedbackCount = attendance.filter((a) => a.feedback && a.feedback.trim().length > 0).length;
  const durationText = calculateDurationString(startTime, endTime);
  const fullDateText = formatFullDateWithWeekday(date);

  const statusConfigMap: Record<LessonStatus, { label: string; icon: any; color: string; dotColor: string }> = {
    pending: {
      label: 'На подтверждении',
      icon: Clock,
      color: 'bg-amber-50 text-amber-700 border-amber-200',
      dotColor: 'bg-amber-500',
    },
    planned: {
      label: 'Запланировано',
      icon: CalendarDays,
      color: 'bg-blue-50 text-blue-700 border-blue-200',
      dotColor: 'bg-blue-500',
    },
    scheduled: {
      label: 'Запланировано',
      icon: CalendarDays,
      color: 'bg-blue-50 text-blue-700 border-blue-200',
      dotColor: 'bg-blue-500',
    },
    conducted: {
      label: 'Проведено',
      icon: CheckCircle2,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dotColor: 'bg-emerald-500',
    },
    completed: {
      label: 'Проведено',
      icon: CheckCircle2,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dotColor: 'bg-emerald-500',
    },
    rescheduled: {
      label: 'Перенесено',
      icon: RotateCcw,
      color: 'bg-amber-50 text-amber-700 border-amber-200',
      dotColor: 'bg-amber-500',
    },
    cancelled: {
      label: 'Отменено',
      icon: XCircle,
      color: 'bg-rose-50 text-rose-700 border-rose-200',
      dotColor: 'bg-rose-500',
    },
    rejected: {
      label: 'Отклонено',
      icon: XCircle,
      color: 'bg-rose-50 text-rose-700 border-rose-200',
      dotColor: 'bg-rose-500',
    },
  };
  const statusConfig = statusConfigMap[currentStatus || 'scheduled'] || statusConfigMap.scheduled;

  // Donut chart calculations
  const circumference = 2 * Math.PI * 26;
  const presentOffset = circumference * (1 - (totalStudents > 0 ? presentCount / totalStudents : 0));
  const absentOffset = circumference * (1 - (totalStudents > 0 ? (presentCount + absentCount) / totalStudents : 0));

  return createPortal(
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      {/* Background overlay */}
      <div className="fixed inset-0" onClick={handleSafeClose} />

      {/* Main Modal Card Container */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden z-10 border border-slate-100 animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* ================= 1. COMPACT TARGET HEADER ================= */}
        <div className="px-6 pt-5 pb-0 bg-white shrink-0">
          <div className="flex items-start justify-between gap-6">
            {/* Left Area: Title, Course, Status + Teacher, Date/Time, Next Lesson banner */}
            <div className="min-w-0 flex-1 space-y-2.5 pb-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight leading-none truncate">
                  {lesson.groupName}
                </h2>
                <p className="text-xs font-medium text-slate-500 mt-1">
                  {lesson.courseName || 'Английский язык'}
                </p>
              </div>

              {/* Status and Teacher Badge Row */}
              <div className="flex items-center gap-3.5 flex-wrap">
                {/* Interactive Status Pill */}
                <div className="relative" ref={statusDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-bold border shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer hover:shadow-xs',
                      statusConfig.color
                    )}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{statusConfig.label}</span>
                    <ChevronDown className="w-3.5 h-3.5 opacity-60 ml-0.5" />
                  </button>

                  {/* Status Dropdown Menu */}
                  {isStatusDropdownOpen && (
                    <div className="absolute left-0 top-full mt-1.5 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
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
                            <span>Проведено</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleFocusReschedule}
                            className="w-full text-left px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50 flex items-center gap-2 cursor-pointer transition-colors"
                          >
                            <RotateCcw className="w-4 h-4 text-amber-600" />
                            <span>Перенести</span>
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
                            <span>Отменить</span>
                          </button>
                        </>
                      )}

                      {currentStatus === 'completed' && (
                        <div className="px-3 py-2 text-xs text-slate-500 bg-slate-50">
                          <span className="font-semibold text-emerald-700 block">Занятие завершено</span>
                          <span className="text-[11px] text-slate-500">
                            Проведенные занятия нельзя отменять или переносить.
                          </span>
                        </div>
                      )}

                      {currentStatus === 'cancelled' && (
                        <button
                          type="button"
                          onClick={handleRestoreLesson}
                          className="w-full text-left px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 flex items-center gap-2 cursor-pointer transition-colors"
                        >
                          <RotateCcw className="w-4 h-4 text-blue-600" />
                          <span>Восстановить в расписание</span>
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

                {/* Single Teacher Profile Badge */}
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-2xs">
                    {teacherName
                      ? teacherName
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                      : 'ОИ'}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="font-bold text-slate-900 text-xs leading-tight">
                      {teacherName || 'Ольга Ивановна'}
                    </span>
                    <span className="text-[11px] text-slate-500 leading-tight">
                      Ведущий преподаватель
                    </span>
                  </div>
                </div>
              </div>

              {/* Date & Time Row */}
              <div className="flex items-center gap-3 text-xs font-medium text-slate-600 pt-0.5">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  {fullDateText}
                </span>
                <span>·</span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-slate-400" />
                  {startTime} – {endTime} {durationText && `(${durationText})`}
                </span>
              </div>

              {/* Next Lesson Indicator Pill (if scheduled/active) */}
              <div className="inline-flex items-center gap-2 bg-blue-50/70 border border-blue-100 rounded-xl px-3 py-1.5 text-xs text-blue-900 shadow-2xs max-w-full">
                <CalendarDays className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="text-slate-600 font-medium">Следующее занятие:</span>
                <span className="font-bold text-blue-700 truncate">
                  {fullDateText ? `Вт, 8 сентября 2026 · ${startTime} – ${endTime}` : 'По расписанию группы'}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-blue-500 shrink-0 ml-auto" />
              </div>
            </div>

            {/* Right Area: Attendance Donut Block + Top Cross in one line */}
            <div className="flex items-start gap-3 shrink-0">
              {/* Compact Attendance Card */}
              <div className="bg-slate-50/80 rounded-2xl border border-slate-100 p-3 shadow-2xs w-64">
                <div className="text-xs font-bold text-slate-900 mb-2">Посещаемость</div>
                <div className="flex items-center justify-between gap-3">
                  {/* Circular Donut Chart */}
                  <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
                    <svg className="w-14 h-14 transform -rotate-90" viewBox="0 0 64 64">
                      <circle
                        cx="32"
                        cy="32"
                        r="26"
                        stroke="#e2e8f0"
                        strokeWidth="5.5"
                        fill="transparent"
                      />
                      {totalStudents > 0 && (
                        <>
                          <circle
                            cx="32"
                            cy="32"
                            r="26"
                            stroke="#10b981"
                            strokeWidth="5.5"
                            fill="transparent"
                            strokeDasharray={circumference}
                            strokeDashoffset={presentOffset}
                            strokeLinecap="round"
                            className="transition-all duration-500"
                          />
                          {absentCount > 0 && (
                            <circle
                              cx="32"
                              cy="32"
                              r="26"
                              stroke="#f43f5e"
                              strokeWidth="5.5"
                              fill="transparent"
                              strokeDasharray={circumference}
                              strokeDashoffset={absentOffset}
                              className="transition-all duration-500"
                            />
                          )}
                        </>
                      )}
                    </svg>
                    <span className="absolute text-xs font-bold text-slate-900">
                      {attendancePct}%
                    </span>
                  </div>

                  {/* Legend stats */}
                  <div className="space-y-1 text-xs flex-1">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-600 text-[11px]">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                        Были
                      </span>
                      <span className="font-bold text-slate-900 text-xs">{presentCount}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-600 text-[11px]">
                        <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                        Пропуск
                      </span>
                      <span className="font-bold text-slate-900 text-xs">{absentCount}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-600 text-[11px]">
                        <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                        Болезнь
                      </span>
                      <span className="font-bold text-slate-900 text-xs">{excusedCount}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Top Close Button aligned with the top of Attendance block */}
              <button
                type="button"
                onClick={handleSafeClose}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shrink-0 -mr-1"
                title="Закрыть"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* ================= 2. TAB NAVIGATION (Border aligned with bottom of attendance block) ================= */}
        <div className="px-6 border-b border-slate-200 bg-white flex items-center gap-6 shrink-0 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('main')}
            className={cn(
              'py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 shrink-0',
              activeTab === 'main'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
            )}
          >
            <FileText className="w-4 h-4" />
            <span>Основное</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('attendance')}
            className={cn(
              'py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 shrink-0',
              activeTab === 'attendance'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
            )}
          >
            <Users className="w-4 h-4" />
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
              'py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 shrink-0',
              activeTab === 'feedback'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
            )}
          >
            <MessageSquare className="w-4 h-4" />
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
              'py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 shrink-0',
              activeTab === 'history'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
            )}
          >
            <History className="w-4 h-4" />
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
        <div className="p-5 overflow-y-auto flex-1 min-h-0 space-y-3.5 bg-white">
          {/* ----------------- TAB 1: ОСНОВНОЕ ----------------- */}
          {activeTab === 'main' && (
            <div className="space-y-3 animate-in fade-in duration-100">
              {/* Row 1: Учебная группа & Ссылка на занятие */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Column 1: Group */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Учебная группа
                  </label>
                  <div className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 bg-white flex items-center justify-between shadow-2xs">
                    <span className="truncate">{lesson.groupName}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs text-slate-400 font-normal">
                        {lesson.courseName || 'Английский язык'}
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 pl-1">
                    {groupMetadata?.totalEnrolled || 6} учеников · Возраст: {groupMetadata?.ageRange || '13–16 лет'} · Уровень: {groupMetadata?.level || 'B1'}
                  </p>
                </div>

                {/* Column 2: Link */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Ссылка на занятие
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1 flex items-center">
                      <input
                        type="url"
                        value={zoomUrl}
                        onChange={(e) => setZoomUrl(e.target.value)}
                        placeholder="https://zoom.us/j/123456789"
                        className="w-full text-xs font-medium border border-slate-200 rounded-xl pl-3.5 pr-9 py-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400 shadow-2xs"
                      />
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="absolute right-2 text-slate-400 hover:text-slate-700 rounded-md transition-colors cursor-pointer p-1"
                        title="Скопировать ссылку"
                      >
                        {copiedLink ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    {zoomUrl && (
                      <a
                        href={zoomUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3.5 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-xl border border-blue-200 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-2xs"
                      >
                        <span>Войти</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Row 2: Дата, Начало, Окончание */}
              <div className="space-y-1">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Дата занятия <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        ref={dateInputRef}
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        disabled={!canEditSchedule || isCompleted}
                        title={isCompleted ? 'Занятие уже проведено. Дату и время изменить нельзя.' : undefined}
                        className={cn(
                          'w-full border rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-2xs',
                          isCompleted ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed' : 'border-slate-200'
                        )}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Время начала <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      disabled={!canEditSchedule || isCompleted}
                      title={isCompleted ? 'Занятие уже проведено. Дату и время изменить нельзя.' : undefined}
                      className={cn(
                        'w-full border rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-2xs',
                        isCompleted ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed' : 'border-slate-200'
                      )}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Время окончания <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      disabled={!canEditSchedule || isCompleted}
                      title={isCompleted ? 'Занятие уже проведено. Дату и время изменить нельзя.' : undefined}
                      className={cn(
                        'w-full border rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-2xs',
                        isCompleted ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed' : 'border-slate-200'
                      )}
                    />
                  </div>
                </div>

                {/* Info message about rescheduling */}
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 pt-0.5">
                  <span className="text-blue-600 font-bold">ℹ</span>
                  <span>
                    Изменение даты или времени перенесёт только это занятие. Регулярное расписание группы не изменится.
                  </span>
                </div>

                {/* Inline 3-Way Collision Warning Banner & 1-Click Free Slot Chips */}
                {inlineCollision.hasConflict && currentStatus !== 'cancelled' && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 space-y-2 animate-in fade-in duration-150">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="text-xs space-y-0.5">
                        <div className="font-bold text-amber-950">
                          ⚠️ Обнаружена накладка в расписании
                        </div>
                        <div className="text-[11px] text-amber-800">
                          {inlineCollision.conflicts.map((c) => c.message).join('. ')}
                        </div>
                      </div>
                    </div>

                    {inlineCollision.nearestSlots.length > 0 && (
                      <div className="pt-1 border-t border-amber-200/80">
                        <div className="text-[11px] font-semibold text-amber-900 mb-1.5 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                          <span>Свободное время в рабочих часах (кликните для выбора):</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {inlineCollision.nearestSlots.map((slot, sIdx) => (
                            <button
                              key={sIdx}
                              type="button"
                              onClick={() => {
                                setStartTime(slot.startTime);
                                setEndTime(slot.endTime);
                                if (slot.date) setDate(slot.date);
                                toast.success(`Выбрано свободное время: ${slot.startTime} – ${slot.endTime}`);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-white border border-amber-300 hover:border-blue-500 hover:bg-blue-50 text-blue-900 text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1"
                            >
                              <span>🕒 {slot.startTime} – {slot.endTime}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Row 3: Тема занятия */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Тема занятия
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Плановое занятие"
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white placeholder:text-slate-400 shadow-2xs"
                />
              </div>

              {/* Row 4: Домашнее задание */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Домашнее задание
                </label>
                <div className="relative">
                  <textarea
                    rows={2}
                    value={homework}
                    onChange={(e) => setHomework(e.target.value)}
                    placeholder="Workbook p. 18–20, устное эссе"
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 pr-10 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white placeholder:text-slate-400 leading-relaxed shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => toast.info('Прикрепление файлов доступно')}
                    className="absolute right-3 bottom-2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                    title="Прикрепить файл"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Row 5: Быстрые действия (3 contextual cards) */}
              <div className="pt-1">
                <span className="text-xs font-bold text-slate-800 block mb-1.5">
                  Быстрые действия
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Card 1: Mail HW */}
                  <div
                    onClick={() => setShowEmailConfirmModal(true)}
                    className="p-2.5 bg-slate-50/70 hover:bg-blue-50/50 rounded-2xl border border-slate-100 hover:border-blue-200 flex items-center justify-between gap-2.5 transition-all cursor-pointer shadow-2xs group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-800 group-hover:text-blue-600 truncate">
                          Отправить ДЗ на почту
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          Родителям и/или ученикам
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 shrink-0" />
                  </div>

                  {/* Card 2: Telegram Reminder (Contextual: only for upcoming/scheduled) */}
                  {isScheduled ? (
                    <div
                      onClick={() => setShowTgConfirmModal(true)}
                      className="p-2.5 bg-slate-50/70 hover:bg-blue-50/50 rounded-2xl border border-slate-100 hover:border-blue-200 flex items-center justify-between gap-2.5 transition-all cursor-pointer shadow-2xs group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                          <Send className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-800 group-hover:text-blue-600 truncate">
                            Напомнить о занятии (Telegram)
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">
                            Родителям и/или ученикам
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 shrink-0" />
                    </div>
                  ) : (
                    <div className="p-2.5 bg-slate-50/30 rounded-2xl border border-slate-100/60 flex items-center justify-between gap-2.5 opacity-50 cursor-not-allowed">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
                          <Send className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-500 truncate">
                            Напомнить о занятии (Telegram)
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">
                            Занятие завершено
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Card 3: Attendance Report */}
                  <div
                    onClick={() => setShowAttendanceReportConfirmModal(true)}
                    className="p-2.5 bg-slate-50/70 hover:bg-blue-50/50 rounded-2xl border border-slate-100 hover:border-blue-200 flex items-center justify-between gap-2.5 transition-all cursor-pointer shadow-2xs group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                        <Users className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-800 group-hover:text-blue-600 truncate">
                          Отправить результат посещаемости
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          Родителям и/или ученикам
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 shrink-0" />
                  </div>
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
                    const teacherBadge = getTeacherAdmissionBadge(st.studentId);
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
                              {canViewStudentFinancialAmounts && st.status === 'absent' && (
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
                            {!canViewStudentFinancialAmounts ? (
                              <span
                                className={cn(
                                  'whitespace-nowrap text-center shadow-2xs inline-block',
                                  teacherBadge.badgeClass
                                )}
                              >
                                {teacherBadge.label}
                              </span>
                            ) : (
                              <span
                                className={cn(
                                  'rounded-full px-2 py-0.5 text-[10px] font-bold border text-center shadow-2xs',
                                  payStatus.badgeClass
                                )}
                              >
                                {payStatus.label}
                              </span>
                            )}
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

        {/* ================= 4. FOOTER ================= */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-white flex items-center justify-between gap-3 shrink-0">
          {/* Left Action: Delete with confirm */}
          <div>
            {!isConfirmingDelete ? (
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(true)}
                disabled={isSubmitting}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1.5 cursor-pointer transition-colors p-1"
              >
                <Trash2 className="w-4 h-4" />
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
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSafeClose}
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSubmitting}
              className="px-6 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-md transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'Сохранение...' : 'Сохранить изменения'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Safety Confirmation Modal: Unsaved Changes */}
      {showUnsavedChangesModal && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Вы хотите сохранить изменения?</h3>
                <p className="text-xs text-slate-500">
                  В карточке есть несохраненные данные.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 flex-wrap">
              <button
                type="button"
                onClick={() => setShowUnsavedChangesModal(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Продолжить редактирование
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowUnsavedChangesModal(false);
                  onClose();
                }}
                className="px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl cursor-pointer transition-colors"
              >
                Не сохранять
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowUnsavedChangesModal(false);
                  handleSave();
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-2xs cursor-pointer transition-colors"
              >
                Сохранить изменения
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal 1: Cancel Lesson */}
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
                  Занятие останется в истории со статусом «Отменено».
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

      {/* Confirmation Modal 2: Send Homework Email */}
      {showEmailConfirmModal && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Отправить домашнее задание?</h3>
                <p className="text-xs text-slate-500">
                  Отправить домашнее задание родителям {attendance.length} учеников группы «{lesson.groupName}»?
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700">
              <span className="font-semibold block mb-1">Текст ДЗ:</span>
              <p className="italic text-slate-600">
                {homework.trim() || 'Домашнее задание не заполнено'}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowEmailConfirmModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleSendHomeworkConfirm}
                disabled={!homework.trim()}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-2xs cursor-pointer transition-colors disabled:opacity-50"
              >
                Отправить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal 3: Send Telegram Reminder */}
      {showTgConfirmModal && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center shrink-0">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Напомнить о занятии?</h3>
                <p className="text-xs text-slate-500">
                  Отправить напоминание в Telegram-чат группы «{lesson.groupName}»?
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 space-y-1">
              <span className="font-semibold block">Шаблон сообщения:</span>
              <p className="text-slate-600">
                📅 Напоминание: занятие <strong>{lesson.groupName}</strong> в {startTime}–{endTime}.<br />
                👨‍🏫 Преподаватель: {teacherName}.<br />
                🔗 Ссылка: {zoomUrl}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowTgConfirmModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleSendTelegramConfirm}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-2xs cursor-pointer transition-colors"
              >
                Отправить напоминание
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal 4: Send Attendance Results */}
      {showAttendanceReportConfirmModal && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Отправить результаты посещаемости?</h3>
                <p className="text-xs text-slate-500">
                  Отправить отчет родителям {attendance.length} учеников?
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 space-y-1">
              <div className="flex items-center justify-between font-semibold">
                <span>Присутствовали: {presentCount} из {attendance.length}</span>
                <span className="text-emerald-700">{attendancePct}%</span>
              </div>
              <p className="text-slate-500 text-[11px]">
                Родители получат статус посещения урока своим ребенком.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAttendanceReportConfirmModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleSendAttendanceReportConfirm}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-2xs cursor-pointer transition-colors"
              >
                Отправить результаты
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3-Way Collision Warning & Alternative Slots Modal */}
      <CollisionWarningModal
        isOpen={isCollisionModalOpen}
        onClose={() => setIsCollisionModalOpen(false)}
        conflicts={collisionData?.conflicts || []}
        nearestSlots={collisionData?.nearestSlots || []}
        candidateDate={date}
        candidateStartTime={startTime}
        candidateEndTime={endTime}
        onSelectSlot={(slot) => {
          setStartTime(slot.startTime);
          setEndTime(slot.endTime);
          if (slot.date) setDate(slot.date);
          setIsCollisionModalOpen(false);
          toast.success(`Применено свободное время: ${slot.startTime} – ${slot.endTime}`);
        }}
      />
    </div>,
    document.body
  );
}

export const DesktopLessonModal = LessonModal;
