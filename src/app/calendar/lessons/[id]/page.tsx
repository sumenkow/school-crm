'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  INITIAL_LESSONS,
  FullLessonData,
  LessonRescheduleInfo,
  LessonTimelineEvent,
  TimelineInteraction,
} from '@/lib/data/mockData';
import { getStudentLessonPaymentStatus } from '@/lib/data/lessonPaymentStatusHelper';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  Video,
  ExternalLink,
  Copy,
  Check,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Save,
  BookOpen,
  History,
  RotateCcw,
  MessageSquare,
  Send,
  UserCheck,
  CalendarClock,
  ShieldCheck,
  Mail,
  Edit,
  ChevronDown,
  Phone,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { RescheduleLessonModal } from '@/components/calendar/RescheduleLessonModal';
import { EditLessonModal } from '@/components/calendar/EditLessonModal';
import SendHomeworkModal from '@/components/lessons/SendHomeworkModal';
import { saveLessonToStorage, getStoredLessons, processAutomaticLessonBilling } from '@/lib/data/lessonStorage';
import { saveInteractionToStorage } from '@/lib/data/timelineStorage';
import { getStoredStudents } from '@/lib/data/studentStorage';
import { useRole } from '@/context/RoleContext';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';

const WhatsAppIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={cn('fill-current', className)} viewBox="0 0 24 24">
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
  </svg>
);

const TelegramIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={cn('fill-current', className)} viewBox="0 0 24 24">
    <path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.121l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.536-.196 1.006.128.833.942z" />
  </svg>
);

interface LessonStudentRowProps {
  student: FullLessonData['students'][number];
  lesson: FullLessonData;
  onSetAttendance: (studentId: string, status: 'present' | 'absent' | 'excused' | 'rescheduled') => void;
  onUpdateNotes: (studentId: string, notes: string) => void;
  t: (key: string, fallback: string) => string;
}

function LessonStudentAttendanceRow({
  student,
  lesson,
  onSetAttendance,
  onUpdateNotes,
  t,
}: LessonStudentRowProps) {
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const toast = useToast();
  const currentStatus = student.attendanceStatus || 'not_marked';

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  const parentInfo = React.useMemo(() => {
    const allStudents = typeof window !== 'undefined' ? getStoredStudents() : [];
    const fullStudent = allStudents.find((s) => s.id === student.id);
    const primaryParent = fullStudent?.parents?.[0];
    const parentName = primaryParent
      ? `${primaryParent.firstName} ${primaryParent.lastName}`.trim()
      : 'Родитель';
    const rawPhone = primaryParent?.phone || (fullStudent as any)?.phone || (fullStudent as any)?.parentPhone || '';
    const cleanPhone = rawPhone.replace(/\D/g, '');
    const parentTelegram = (primaryParent?.telegram || (fullStudent as any)?.telegram || '').replace('@', '');
    const parentEmail = primaryParent?.email || (fullStudent as any)?.email || '';
    const hasPhone = Boolean(cleanPhone && cleanPhone.length >= 7);
    return { parentName, parentPhone: rawPhone, cleanPhone, parentTelegram, parentEmail, hasPhone };
  }, [student.id]);

  return (
    <div className="py-3.5 space-y-2.5">
      {/* ROW 1: Student info & Payment badge (Left) | Fixed Status Selector (Right w-[360px]) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Student Info */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-full bg-slate-100 font-bold text-slate-700 flex items-center justify-center text-xs shrink-0 border border-slate-200">
            {student.name.split(' ').map((n) => n[0]).join('')}
          </div>
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <Link
              href={`/students/${student.id}`}
              className="font-bold text-slate-900 text-xs hover:text-blue-600 transition-colors truncate"
            >
              {student.name}
            </Link>
            {(() => {
              const payStatus = getStudentLessonPaymentStatus(student.id, student.isTrial);
              return (
                <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold border shrink-0', payStatus.badgeClass)}>
                  {payStatus.label}
                </span>
              );
            })()}
          </div>
        </div>

        {/* Segmented Status Selector with strictly fixed width w-[360px] */}
        <div className="flex items-center justify-end gap-1.5 shrink-0 w-[360px]">
          <button
            type="button"
            onClick={() => onSetAttendance(student.id, 'present')}
            className={cn(
              'flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer',
              currentStatus === 'present'
                ? 'bg-emerald-600 text-white shadow-2xs ring-2 ring-emerald-600/30 font-bold'
                : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
            )}
          >
            <Check className="h-3.5 w-3.5" />
            {t('lesson.studentAttendanceWas', 'Был')}
          </button>

          <button
            type="button"
            onClick={() => onSetAttendance(student.id, 'excused')}
            className={cn(
              'flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer',
              currentStatus === 'excused'
                ? 'bg-amber-600 text-white shadow-2xs ring-2 ring-amber-600/30 font-bold'
                : 'bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-800'
            )}
          >
            <AlertCircle className="h-3.5 w-3.5" />
            {t('lesson.studentAttendanceExcused', 'Болел')}
          </button>

          <button
            type="button"
            onClick={() => onSetAttendance(student.id, 'absent')}
            className={cn(
              'flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer',
              currentStatus === 'absent'
                ? 'bg-rose-600 text-white shadow-2xs ring-2 ring-rose-600/30 font-bold'
                : 'bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-700'
            )}
          >
            <XCircle className="h-3.5 w-3.5" />
            {t('lesson.studentAttendanceAbsent', 'Пропуск')}
          </button>

          <button
            type="button"
            onClick={() => onSetAttendance(student.id, 'rescheduled')}
            className={cn(
              'flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer',
              currentStatus === 'rescheduled'
                ? 'bg-purple-600 text-white shadow-2xs ring-2 ring-purple-600/30 font-bold'
                : 'bg-slate-100 text-slate-600 hover:bg-purple-50 hover:text-purple-700'
            )}
          >
            <CalendarClock className="h-3.5 w-3.5" />
            {t('lesson.studentAttendanceRescheduled', 'Отработка')}
          </button>
        </div>
      </div>

      {/* ROW 2: Feedback input (Left, flex-1) | Parent Multi-channel Dropdown (Right, shrink-0) */}
      <div className="flex items-center justify-between gap-3 w-full">
        <div className="flex-1 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Заметка для родителей (успехи, сложности, рекомендация к уроку)..."
              value={student.notes || ''}
              onChange={(e) => onUpdateNotes(student.id, e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 placeholder:text-slate-400 w-full focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-wrap items-center gap-1 pl-5.5">
            {['Отличная работа', 'Повторить слова', 'Не выполнил ДЗ', 'Активен на уроке'].map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => {
                  const cur = student.notes?.trim() || '';
                  const updated = cur ? `${cur}. ${chip}` : chip;
                  onUpdateNotes(student.id, updated);
                }}
                className="text-[9px] font-medium bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200/50 transition-colors cursor-pointer"
              >
                + {chip}
              </button>
            ))}
          </div>
        </div>

        {/* Multi-channel Contact Dropdown (shown only when absent or excused) */}
        {(currentStatus === 'absent' || currentStatus === 'excused') && (
          <div className="relative shrink-0 self-start mt-0.5" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5 text-blue-600" />
              <span>Связаться с родителем</span>
              <ChevronDown className="w-3.5 h-3.5 text-blue-400" />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 top-full mt-1 z-30 w-64 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-100 text-xs">
                {/* 1. WhatsApp */}
                {parentInfo.hasPhone ? (
                  <a
                    href={`https://wa.me/${parentInfo.cleanPhone}?text=${encodeURIComponent(
                      `Здравствуйте, ${parentInfo.parentName}! ${student.name} сегодня отсутствовал(а) на занятии ${lesson.courseName} (${lesson.dateFormatted || lesson.date}). Уточните, пожалуйста, причину пропуска?`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors font-medium"
                  >
                    <WhatsAppIcon className="w-4 h-4 text-[#25D366]" />
                    <span>Написать в WhatsApp</span>
                  </a>
                ) : (
                  <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-400 font-medium cursor-not-allowed opacity-60">
                    <WhatsAppIcon className="w-4 h-4 text-slate-400" />
                    <span>WhatsApp (номер не указан)</span>
                  </div>
                )}

                {/* 2. Telegram */}
                <a
                  href={parentInfo.parentTelegram ? `https://t.me/${parentInfo.parentTelegram}?text=${encodeURIComponent(
                    `Здравствуйте, ${parentInfo.parentName}! ${student.name} сегодня отсутствовал(а) на занятии ${lesson.courseName} (${lesson.dateFormatted || lesson.date}). Уточните, пожалуйста, причину пропуска?`
                  )}` : parentInfo.hasPhone ? `https://wa.me/${parentInfo.cleanPhone}?text=${encodeURIComponent(
                    `Здравствуйте, ${parentInfo.parentName}! ${student.name} сегодня отсутствовал(а) на занятии ${lesson.courseName} (${lesson.dateFormatted || lesson.date}). Уточните, пожалуйста, причину пропуска?`
                  )}` : '#'}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setIsDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-700 hover:bg-sky-50 hover:text-sky-800 transition-colors font-medium"
                >
                  <TelegramIcon className="w-4 h-4 text-[#229ED9]" />
                  <span>Написать в Telegram</span>
                </a>

                {/* 3. Email */}
                {parentInfo.parentEmail ? (
                  <a
                    href={`mailto:${parentInfo.parentEmail}?subject=${encodeURIComponent(
                      `Пропуск занятия: ${lesson.courseName} — ${student.name}`
                    )}&body=${encodeURIComponent(
                      `Здравствуйте, ${parentInfo.parentName}!\n\n${student.name} сегодня отсутствовал(а) на занятии ${lesson.courseName} (${lesson.dateFormatted || lesson.date}). Уточните, пожалуйста, причину пропуска?\n\nС уважением,\nШкола`
                    )}`}
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-700 hover:bg-indigo-50 hover:text-indigo-800 transition-colors font-medium"
                  >
                    <Mail className="w-4 h-4 text-indigo-600" />
                    <span>Отправить на Email</span>
                  </a>
                ) : (
                  <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-400 font-medium cursor-not-allowed opacity-60">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span>Email (не указан)</span>
                  </div>
                )}

                {/* 4. Copy Phone */}
                {parentInfo.hasPhone ? (
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(parentInfo.parentPhone);
                      toast.success('Номер телефона скопирован в буфер обмена');
                      setIsDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors font-medium cursor-pointer border-t border-slate-100 mt-1"
                  >
                    <Phone className="w-4 h-4 text-slate-500" />
                    <span className="truncate">Скопировать ({parentInfo.parentPhone})</span>
                  </button>
                ) : (
                  <div className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-400 font-medium cursor-not-allowed opacity-60 border-t border-slate-100 mt-1">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span>Телефон не указан</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function LessonDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const lessonId = params.id as string;
  const { role, userName } = useRole();
  const { t, language } = useLanguage();
  const toast = useToast();

  const [lesson, setLesson] = useState<FullLessonData>(() => {
    const stored = typeof window !== 'undefined' ? getStoredLessons() : INITIAL_LESSONS;
    return stored.find((l) => l.id === lessonId) || INITIAL_LESSONS.find((l) => l.id === lessonId) || INITIAL_LESSONS[0];
  });

  const [copied, setCopied] = useState(false);
  const [topic, setTopic] = useState(lesson.topic);
  const [homework, setHomework] = useState(lesson.homework || '');
  const [status, setStatus] = useState<FullLessonData['status']>(lesson.status);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSendHomeworkModalOpen, setIsSendHomeworkModalOpen] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [newTimelineComment, setNewTimelineComment] = useState('');

  const currentRoleTitle =
    role === 'owner'
      ? t('role.owner', 'Владелец школы')
      : role === 'admin'
      ? t('role.admin', 'Администратор')
      : t('role.teacher', 'Преподаватель');
  const authorName = userName || (role === 'teacher' ? lesson.teacherName : 'Елена Менеджер');
  const locale = language === 'en' ? 'en-US' : language === 'de' ? 'de-DE' : 'ru-RU';

  const handleCopyMeetingUrl = () => {
    if (lesson.onlineMeetingUrl) {
      navigator.clipboard.writeText(lesson.onlineMeetingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Status Change Handler with immediate DB persistence and unified event
  const handleStatusChange = (newStatus: FullLessonData['status']) => {
    if (newStatus === 'rescheduled') {
      setIsRescheduleModalOpen(true);
      return;
    }

    const statusLabels: Record<string, string> = {
      completed: t('status.completed', 'Проведено'),
      scheduled: t('status.scheduled', 'Запланировано'),
      cancelled: t('status.cancelled', 'Отменено'),
    };

    const newEvent: LessonTimelineEvent = {
      id: `ev_${Date.now()}`,
      timestamp: new Date().toLocaleDateString(locale, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      author: authorName,
      role: currentRoleTitle,
      type: newStatus === 'completed' ? 'completed' : newStatus === 'cancelled' ? 'cancelled' : 'status_change',
      comment: statusLabels[newStatus] || `${t('common.status', 'Статус')}: ${newStatus}`,
    };

    setStatus(newStatus);
    const updatedLesson: FullLessonData = {
      ...lesson,
      status: newStatus,
      timelineEvents: [newEvent, ...(lesson.timelineEvents || [])],
    };
    setLesson(updatedLesson);
    saveLessonToStorage(updatedLesson);
    window.dispatchEvent(new CustomEvent('crm-lessons-changed', { detail: updatedLesson }));

    if (newStatus === 'completed') {
      const presentStudents = lesson.students.filter((s) => s.attendanceStatus === 'present' || !s.attendanceStatus || s.attendanceStatus === 'not_marked').map((s) => s.id);
      if (presentStudents.length > 0) {
        const { billedCount } = processAutomaticLessonBilling({
          lessonId: lesson.id,
          studentIdsToBill: presentStudents,
        });
        if (billedCount > 0) {
          toast.success(`Урок проведен. Автосписание: списано занятие с абонементов ${billedCount} уч.`);
          return;
        }
      }
    }

    toast.success(`Статус урока изменен: ${statusLabels[newStatus] || newStatus}`);
  };

  // Handle Reschedule Event
  const handleRescheduleConfirmed = (info: LessonRescheduleInfo) => {
    const newEvent: LessonTimelineEvent = {
      id: `ev_${Date.now()}`,
      timestamp: info.changedAt,
      author: info.changedBy,
      role: info.changedRole,
      type: 'rescheduled',
      comment: `${t('lesson.rescheduledNotice', 'Занятие перенесено')} ${info.previousDate} (${info.previousTime}) → ${info.newDate} (${info.newTime}) [${info.room}]. ${t('lesson.rescheduleReason', 'Причина')}: ${info.reason}`,
    };

    const targetDateISO = info.rawNewDate || lesson.date;
    const targetStartTime = info.newStartTime || info.newTime?.split('–')[0]?.trim() || lesson.startTime;
    const targetEndTime = info.newEndTime || info.newTime?.split('–')[1]?.trim() || lesson.endTime;
    const targetDateObj = new Date(targetDateISO);
    const dayOfWeek = targetDateObj.getDay() === 0 ? 6 : targetDateObj.getDay() - 1;
    const dateFormatted = targetDateObj.toLocaleDateString(locale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const updatedLesson: FullLessonData = {
      ...lesson,
      date: targetDateISO,
      dateFormatted,
      dayOfWeek,
      startTime: targetStartTime,
      endTime: targetEndTime,
      room: info.room || lesson.room,
      status: 'rescheduled',
      rescheduleInfo: info,
      timelineEvents: [newEvent, ...(lesson.timelineEvents || [])],
    };

    setStatus('rescheduled');
    setLesson(updatedLesson);
    saveLessonToStorage(updatedLesson);

    // Save timeline interactions for all students in this group
    const allStudents = getStoredStudents();
    const now = new Date();
    const timeFormatted = now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });

    for (const st of lesson.students || []) {
      const fullStudent = allStudents.find((s) => s.id === st.id);
      const parentId = fullStudent?.parents?.[0]?.id;
      const parentName = fullStudent?.parents?.[0]
        ? `${fullStudent.parents[0].firstName} ${fullStudent.parents[0].lastName}`
        : undefined;

      const interaction: TimelineInteraction = {
        id: `int_resch_${Date.now()}_${st.id}`,
        studentId: st.id,
        studentName: st.name,
        parentId,
        parentName,
        occurredAt: `Сегодня, ${timeFormatted}`,
        author: authorName,
        channel: 'other',
        type: 'organizational',
        content: `🔄 Занятие перенесено: «${lesson.groupName}» с ${info.previousDate} (${info.previousTime}) на ${info.newDate} (${info.newTime}) [${info.room}]. Причина: ${info.reason}.`,
      };

      saveInteractionToStorage(interaction);
    }

    window.dispatchEvent(new CustomEvent('crm-lessons-changed', { detail: updatedLesson }));
    window.dispatchEvent(new CustomEvent('crm-timeline-interactions-changed'));

    toast.success(`Занятие успешно перенесено на ${info.newDate} (${info.newTime})`);
  };

  // Save Topic and Homework with Timeline record & DB persistence
  const handleSaveDetails = (e: React.FormEvent) => {
    e.preventDefault();

    const newEvent: LessonTimelineEvent = {
      id: `ev_${Date.now()}`,
      timestamp: new Date().toLocaleDateString(locale, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      author: authorName,
      role: currentRoleTitle,
      type: 'status_change',
      comment: `${t('lesson.curriculumAndHomework', 'Учебный план')}: "${topic}". ${t('hero.homework', 'ДЗ')}: "${homework || '-'}"`,
    };

    const updatedLesson: FullLessonData = {
      ...lesson,
      topic,
      homework,
      status,
      timelineEvents: [newEvent, ...(lesson.timelineEvents || [])],
    };

    setLesson(updatedLesson);
    saveLessonToStorage(updatedLesson);

    // Save timeline interactions for all students and their parents
    const allStudents = getStoredStudents();
    const now = new Date();
    const timeFormatted = now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });

    for (const st of lesson.students || []) {
      const fullStudent = allStudents.find((s) => s.id === st.id);
      const parentId = fullStudent?.parents?.[0]?.id;
      const parentName = fullStudent?.parents?.[0]
        ? `${fullStudent.parents[0].firstName} ${fullStudent.parents[0].lastName}`
        : undefined;

      const interaction: TimelineInteraction = {
        id: `int_det_${Date.now()}_${st.id}`,
        studentId: st.id,
        studentName: st.name,
        parentId,
        parentName,
        occurredAt: `${timeFormatted}`,
        author: authorName,
        channel: 'other',
        type: 'organizational',
        content: `«${lesson.groupName}» (${lesson.dateFormatted}): ${t('hero.topic', 'Тема')} «${topic}», ${t('hero.homework', 'ДЗ')}: «${homework || '-'}».`,
      };

      saveInteractionToStorage(interaction);
    }

    window.dispatchEvent(new CustomEvent('crm-lessons-changed', { detail: updatedLesson }));
    window.dispatchEvent(new CustomEvent('crm-timeline-interactions-changed'));

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  // Attendance Handlers
  const handleSetStudentAttendance = (
    studentId: string,
    newStatus: 'present' | 'absent' | 'excused' | 'rescheduled' | 'not_marked'
  ) => {
    setLesson((prev) => {
      const shouldPromoteToCompleted =
        prev.status === 'scheduled' &&
        (newStatus === 'present' || newStatus === 'absent' || newStatus === 'excused');
      const updatedStatus = shouldPromoteToCompleted ? 'completed' : prev.status;
      if (shouldPromoteToCompleted) {
        setStatus('completed');
      }

      const updated: FullLessonData = {
        ...prev,
        status: updatedStatus,
        students: prev.students.map((s) =>
          s.id === studentId ? { ...s, attendanceStatus: newStatus } : s
        ),
      };
      saveLessonToStorage(updated);
      window.dispatchEvent(new CustomEvent('crm-lessons-changed', { detail: updated }));

      if (newStatus === 'present') {
        processAutomaticLessonBilling({
          lessonId: prev.id,
          studentIdsToBill: [studentId],
        });
      }

      return updated;
    });
  };

  const handleUpdateStudentNotes = (studentId: string, notes: string) => {
    setLesson((prev) => {
      const updated: FullLessonData = {
        ...prev,
        students: prev.students.map((s) => (s.id === studentId ? { ...s, notes } : s)),
      };
      saveLessonToStorage(updated);
      window.dispatchEvent(new CustomEvent('crm-lessons-changed', { detail: updated }));
      return updated;
    });
  };

  // Quick 1-click actions for whole group
  const handleMarkAllPresent = () => {
    const newEvent: LessonTimelineEvent = {
      id: `ev_${Date.now()}`,
      timestamp: new Date().toLocaleDateString(locale, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      author: authorName,
      role: currentRoleTitle,
      type: 'attendance_marked',
      comment: `${t('lesson.markAllPresent', 'Все ученики отмечены присутствующими')} (${lesson.students.length})`,
    };

    setStatus('completed');
    const allStudentIds = lesson.students.map((s) => s.id);
    setLesson((prev) => {
      const updated: FullLessonData = {
        ...prev,
        status: 'completed',
        students: prev.students.map((s) => ({ ...s, attendanceStatus: 'present' as const })),
        timelineEvents: [newEvent, ...(prev.timelineEvents || [])],
      };
      saveLessonToStorage(updated);
      window.dispatchEvent(new CustomEvent('crm-lessons-changed', { detail: updated }));
      return updated;
    });

    const { billedCount } = processAutomaticLessonBilling({
      lessonId: lesson.id,
      studentIdsToBill: allStudentIds,
    });

    if (billedCount > 0) {
      toast.success(`Все ученики отмечены. Автосписание: списано занятие с абонементов ${billedCount} уч.`);
    } else {
      toast.success('Все ученики отмечены присутствующими, урок переведен в статус «Проведено»');
    }
  };

  const handleResetAttendance = () => {
    setLesson((prev) => {
      const updated: FullLessonData = {
        ...prev,
        students: prev.students.map((s) => ({ ...s, attendanceStatus: 'not_marked' as const })),
      };
      saveLessonToStorage(updated);
      window.dispatchEvent(new CustomEvent('crm-lessons-changed', { detail: updated }));
      return updated;
    });
  };

  // Add Comment to Lesson Timeline
  const handleAddTimelineComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTimelineComment.trim()) return;

    const newEvent: LessonTimelineEvent = {
      id: `ev_${Date.now()}`,
      timestamp: new Date().toLocaleDateString(locale, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      author: authorName,
      role: currentRoleTitle,
      type: 'status_change',
      comment: newTimelineComment.trim(),
    };

    setLesson((prev) => ({
      ...prev,
      timelineEvents: [newEvent, ...(prev.timelineEvents || [])],
    }));
    setNewTimelineComment('');
  };

  // Attendance metrics via useMemo
  const { totalStudents, presentCount, excusedCount, absentCount, rescheduledCount, notMarkedCount, attendanceRate } =
    React.useMemo(() => {
      const total = lesson.students.length;
      const present = lesson.students.filter((s) => s.attendanceStatus === 'present').length;
      const excused = lesson.students.filter((s) => s.attendanceStatus === 'excused').length;
      const absent = lesson.students.filter((s) => s.attendanceStatus === 'absent').length;
      const rescheduled = lesson.students.filter((s) => s.attendanceStatus === 'rescheduled').length;
      const notMarked = lesson.students.filter(
        (s) => !s.attendanceStatus || s.attendanceStatus === 'not_marked'
      ).length;
      const rate = total > 0 ? Math.round((present / total) * 100) : 0;
      return {
        totalStudents: total,
        presentCount: present,
        excusedCount: excused,
        absentCount: absent,
        rescheduledCount: rescheduled,
        notMarkedCount: notMarked,
        attendanceRate: rate,
      };
    }, [lesson.students]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/calendar" className="inline-flex items-center gap-1 hover:text-slate-900 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
          {t('lesson.backToCalendar', 'Назад к календарю')}
        </Link>
        <span>/</span>
        <span className="text-slate-800 font-semibold">
          {lesson.groupName} • {lesson.dateFormatted}
        </span>
      </div>

      {/* Hero Lesson Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                {lesson.courseName}
              </span>
              <span
                className={cn(
                  'rounded-full px-2.5 py-0.5 text-[10px] font-bold border',
                  status === 'completed' && 'bg-emerald-50 text-emerald-700 border-emerald-200',
                  status === 'scheduled' && 'bg-blue-50 text-blue-700 border-blue-200',
                  status === 'cancelled' && 'bg-rose-50 text-rose-700 border-rose-200',
                  status === 'rescheduled' && 'bg-amber-50 text-amber-800 border-amber-300'
                )}
              >
                {status === 'completed' && t('status.completed', 'Завершено (Проведено)')}
                {status === 'scheduled' && t('status.scheduled', 'Запланировано')}
                {status === 'cancelled' && t('status.cancelled', 'Отменено')}
                {status === 'rescheduled' && t('status.rescheduled', 'Перенесено')}
              </span>
              {(lesson.isTrial || (lesson.trialStudentsCount && lesson.trialStudentsCount > 0) || lesson.students.some((s) => s.isTrial)) && (
                <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-[10px] font-bold text-purple-900 border border-purple-200">
                  🎯 {t('calendar.trialLessonCount', 'Пробное занятие')} — {lesson.trialStudentsCount || lesson.students.filter((s) => s.isTrial).length || 1} {t('calendar.studentsShort', 'чел.')}
                </span>
              )}
              {lesson.isBilled ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-900 px-2.5 py-0.5 text-[10px] font-bold border border-emerald-200">
                  💳 {t('lesson.autoBilledBadge', 'Автосписание выполнено')}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-600 px-2 py-0.5 text-[10px] font-medium border border-slate-200">
                  💳 {t('lesson.autoBillActive', 'Автосписание активно')}
                </span>
              )}
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
              {lesson.groupName}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-600">
              <span className="flex items-center gap-1.5 font-bold text-slate-800">
                <Calendar className="h-3.5 w-3.5 text-blue-600" />
                {lesson.dateFormatted} ({lesson.startTime} – {lesson.endTime})
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                {lesson.room}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-slate-400" />
                {t('hero.teacher', 'Преподаватель')}:{' '}
                <Link href={`/teachers`} className="font-semibold text-blue-600 hover:underline">
                  {lesson.teacherName}
                </Link>
              </span>
            </div>
          </div>

          {/* Status selector & Actions */}
          <div className="flex flex-col items-end gap-2.5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/80 px-3.5 py-1.5 text-xs font-bold text-blue-700 shadow-2xs hover:bg-blue-100 hover:border-blue-300 transition-all cursor-pointer"
              >
                <Edit className="h-3.5 w-3.5 text-blue-600" />
                <span>{t('lesson.editLessonBtn', 'Редактировать')}</span>
              </button>
            </div>
            
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-500">{t('common.status', 'Статус')}:</span>
              <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-semibold gap-1">
                <button
                  type="button"
                  onClick={() => handleStatusChange('scheduled')}
                  className={cn(
                    'rounded-lg px-3 py-1.5 transition-all cursor-pointer',
                    status === 'scheduled'
                      ? 'bg-white shadow-xs font-bold text-blue-700'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  {t('status.scheduled', 'Запланировано')}
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange('completed')}
                  className={cn(
                    'rounded-lg px-3 py-1.5 transition-all cursor-pointer',
                    status === 'completed'
                      ? 'bg-white shadow-xs font-bold text-emerald-700'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  {t('status.completed', 'Проведено')}
                </button>
                <button
                  type="button"
                  onClick={() => setIsRescheduleModalOpen(true)}
                  className={cn(
                    'rounded-lg px-3 py-1.5 transition-all flex items-center gap-1 cursor-pointer',
                    status === 'rescheduled'
                      ? 'bg-amber-100 shadow-xs font-bold text-amber-900 border border-amber-300'
                      : 'text-slate-600 hover:text-amber-700 hover:bg-amber-50'
                  )}
                >
                  <CalendarClock className="h-3.5 w-3.5" />
                  {t('lesson.reschedule', 'Перенести')}
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange('cancelled')}
                  className={cn(
                    'rounded-lg px-3 py-1.5 transition-all cursor-pointer',
                    status === 'cancelled'
                      ? 'bg-white shadow-xs font-bold text-rose-700'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  {t('action.cancel', 'Отмена')}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Rescheduled Notice Banner */}
        {status === 'rescheduled' && lesson.rescheduleInfo && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-950 animate-in fade-in duration-150">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-bold text-amber-900">
                  <CalendarClock className="h-4 w-4 text-amber-600" />
                  <span>
                    {t('lesson.rescheduledNotice', 'Занятие перенесено')} → <strong>{lesson.rescheduleInfo.newDate}</strong> (
                    {lesson.rescheduleInfo.newTime}) в {lesson.rescheduleInfo.room}
                  </span>
                </div>
                <p className="text-amber-800">
                  {t('lesson.rescheduleReason', 'Причина переноса')}: <strong>{lesson.rescheduleInfo.reason}</strong>
                </p>
                <p className="text-[11px] text-amber-700">
                  {t('lesson.rescheduleInitiator', 'Инициатор переноса:')} {lesson.rescheduleInfo.changedBy} ({lesson.rescheduleInfo.changedRole}) •{' '}
                  {lesson.rescheduleInfo.changedAt}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsRescheduleModalOpen(true)}
                className="inline-flex items-center gap-1 self-start rounded-lg bg-white px-3 py-1.5 font-bold text-amber-800 border border-amber-300 shadow-2xs hover:bg-amber-100/50 transition-colors"
              >
                {t('lesson.editRescheduleParams', 'Изменить параметры переноса')}
              </button>
            </div>
          </div>
        )}

        {/* Online URL Box */}
        {lesson.onlineMeetingUrl && (
          <div className="flex items-center justify-between rounded-xl bg-indigo-50/70 p-3.5 border border-indigo-100 text-xs">
            <div className="flex items-center gap-2 text-indigo-900 font-medium">
              <Video className="h-4 w-4 text-indigo-600" />
              <span>
                {t('lesson.onlineLink', 'Ссылка на онлайн-занятие:')} <strong className="font-mono">{lesson.onlineMeetingUrl}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyMeetingUrl}
                className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 font-semibold text-indigo-700 border border-indigo-200 shadow-xs hover:bg-indigo-50"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? t('common.copied', 'Скопировано') : t('common.copy', 'Копировать')}
              </button>
              <a
                href={lesson.onlineMeetingUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1 font-semibold text-white shadow-xs hover:bg-indigo-700"
              >
                {t('action.connect', 'Подключиться')} <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Lesson Details Form (Topic & Homework) */}
      <form onSubmit={handleSaveDetails} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-blue-600" />
            {t('lesson.curriculumAndHomework', 'Учебный план и домашнее задание')}
          </h2>
          {savedSuccess && (
            <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 animate-fade-in">
              <CheckCircle2 className="h-3.5 w-3.5" /> {t('lesson.savedSuccessNotice', 'Сохранено в карточке и таймлайне!')}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-700">{t('lesson.topicLabel', 'Тема занятия')}</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Unit 4. Past Simple vs Present Perfect..."
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">{t('lesson.homeworkLabel', 'Домашнее задание к следующему уроку')}</label>
            <input
              type="text"
              value={homework}
              onChange={(e) => setHomework(e.target.value)}
              placeholder="..."
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setIsSendHomeworkModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 px-4 py-2 text-xs font-bold hover:bg-indigo-100 shadow-2xs transition-colors"
          >
            <Mail className="h-3.5 w-3.5 text-indigo-600" />
            {t('lesson.sendHomeworkEmail', 'Разослать ДЗ родителям на Email')}
          </button>

          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
          >
            <Save className="h-3.5 w-3.5" />
            {t('lesson.saveTopicStatus', 'Сохранить тему и статус урока')}
          </button>
        </div>
      </form>

      {/* ОЧЕВИДНЫЙ ЖУРНАЛ ПОСЕЩАЕМОСТИ ЗАНЯТИЯ */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-emerald-600" />
              {t('lesson.attendanceJournal', 'Журнал посещаемости занятия')}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('lesson.attendanceJournalSubtitle', 'Интерактивная фиксация присутствия учеников, причин отсутствия и заметок преподавателя')}
            </p>
          </div>

          {/* Quick Group Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleMarkAllPresent}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors"
            >
              <Check className="h-4 w-4" />
              {t('lesson.markAllPresent', 'Отметить всех присутствующими')}
            </button>
            <button
              type="button"
              onClick={handleResetAttendance}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              title={t('lesson.reset', 'Сбросить все статусы')}
            >
              <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
              {t('lesson.reset', 'Сброс')}
            </button>
          </div>
        </div>

        {/* Attendance KPI Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
            <div className="text-slate-500 text-[11px] font-medium">{t('lesson.kpiPresent', 'Присутствуют')}</div>
            <div className="text-lg font-bold text-emerald-700 mt-0.5">
              {presentCount} <span className="text-xs font-normal text-emerald-600">({attendanceRate}%)</span>
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3">
            <div className="text-slate-500 text-[11px] font-medium">{t('lesson.kpiExcused', 'Болел / Уважительная')}</div>
            <div className="text-lg font-bold text-amber-800 mt-0.5">{excusedCount}</div>
          </div>

          <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3">
            <div className="text-slate-500 text-[11px] font-medium">{t('lesson.kpiAbsent', 'Пропуск без причины')}</div>
            <div className="text-lg font-bold text-rose-700 mt-0.5">{absentCount}</div>
          </div>

          <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-3">
            <div className="text-slate-500 text-[11px] font-medium">{t('lesson.kpiRescheduled', 'Перенос / Отработка')}</div>
            <div className="text-lg font-bold text-purple-700 mt-0.5">{rescheduledCount}</div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-slate-500 text-[11px] font-medium">{t('lesson.kpiNotMarked', 'Не отмечено')}</div>
            <div className="text-lg font-bold text-slate-700 mt-0.5">{notMarkedCount}</div>
          </div>
        </div>

        {/* Student Attendance List */}
        <div className="divide-y divide-slate-100 border-t border-slate-100">
          {lesson.students.map((student) => (
            <LessonStudentAttendanceRow
              key={student.id}
              student={student}
              lesson={lesson}
              onSetAttendance={handleSetStudentAttendance}
              onUpdateNotes={handleUpdateStudentNotes}
              t={t}
            />
          ))}
        </div>
      </div>

      {/* ТАЙМЛАЙН И ИСТОРИЯ СОБЫТИЙ ЗАНЯТИЯ */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <History className="h-5 w-5 text-indigo-600" />
              {t('lesson.timelineTitle', 'Таймлайн и история событий занятия')}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('lesson.timelineSubtitle', 'Хронология создания, переносов, завершения и записей педагогов с отражением в истории учеников')}
            </p>
          </div>
        </div>

        {/* Timeline Events Feed */}
        <div className="space-y-3 pt-2">
          {(!lesson.timelineEvents || lesson.timelineEvents.length === 0) ? (
            <p className="text-xs text-slate-400 py-2">{t('lesson.timelineEmpty', 'События пока не зафиксированы.')}</p>
          ) : (
            lesson.timelineEvents.map((ev) => (
              <div
                key={ev.id}
                className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs"
              >
                <div
                  className={cn(
                    'mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg font-bold text-white shrink-0',
                    ev.type === 'rescheduled' && 'bg-amber-500',
                    ev.type === 'completed' && 'bg-emerald-600',
                    ev.type === 'cancelled' && 'bg-rose-600',
                    ev.type === 'created' && 'bg-blue-600',
                    ev.type === 'attendance_marked' && 'bg-teal-600',
                    ev.type === 'status_change' && 'bg-indigo-600'
                  )}
                >
                  {ev.type === 'rescheduled' ? (
                    <CalendarClock className="h-3.5 w-3.5" />
                  ) : ev.type === 'completed' ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <History className="h-3.5 w-3.5" />
                  )}
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{ev.author}</span>
                      <span className="rounded bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
                        {ev.role}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">{ev.timestamp}</span>
                  </div>
                  <p className="text-slate-700 leading-relaxed">{ev.comment}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Quick Add Note / Event to Timeline */}
        <form onSubmit={handleAddTimelineComment} className="mt-4 pt-3 border-t border-slate-100 flex gap-2">
          <input
            type="text"
            value={newTimelineComment}
            onChange={(e) => setNewTimelineComment(e.target.value)}
            placeholder={t('lesson.timelinePlaceholder', 'Добавить комментарий или служебную отметку в таймлайн урока...')}
            className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={!newTimelineComment.trim()}
            className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-40 transition-colors"
          >
            <Send className="h-3.5 w-3.5" />
            {t('lesson.timelineSubmit', 'Зафиксировать')}
          </button>
        </form>
      </div>

      {/* MODAL: Edit Lesson Parameters */}
      <EditLessonModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        lesson={lesson}
        onSaved={(upd) => {
          setLesson(upd);
          setTopic(upd.topic);
          setHomework(upd.homework || '');
          setStatus(upd.status);
        }}
      />

      {/* MODAL: Reschedule Lesson */}
      <RescheduleLessonModal
        isOpen={isRescheduleModalOpen}
        onClose={() => setIsRescheduleModalOpen(false)}
        lesson={lesson}
        onReschedule={handleRescheduleConfirmed}
      />

      {/* MODAL: Send Homework Emails */}
      {isSendHomeworkModalOpen && (
        <SendHomeworkModal
          isOpen={isSendHomeworkModalOpen}
          onClose={() => setIsSendHomeworkModalOpen(false)}
          lesson={{
            id: lesson.id,
            groupName: lesson.groupName,
            courseName: lesson.courseName,
            date: lesson.date,
            startTime: lesson.startTime,
            endTime: lesson.endTime,
            teacherName: lesson.teacherName,
            topic: topic || lesson.topic,
            homework: homework || lesson.homework,
            students: lesson.students.map((s) => ({ id: s.id, name: s.name })),
          }}
        />
      )}
    </div>
  );
}
