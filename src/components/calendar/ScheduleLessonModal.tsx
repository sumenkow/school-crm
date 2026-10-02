'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Check,
  AlertCircle,
  Users,
  GraduationCap,
  Video,
  Sparkles,
  Clock,
  Calendar,
  Copy,
  Send,
  Mail,
} from 'lucide-react';
import { FullLessonData, TimelineInteraction, INITIAL_TEACHERS } from '@/lib/data/mockData';
import { getStoredGroups } from '@/lib/data/groupStorage';
import { getStoredStudents } from '@/lib/data/studentStorage';
import { saveLessonToStorage, getStoredLessons } from '@/lib/data/lessonStorage';
import { saveInteractionToStorage } from '@/lib/data/timelineStorage';
import { useToast } from '@/context/ToastContext';
import { useRole } from '@/context/RoleContext';
import { useLanguage } from '@/context/LanguageContext';
import { ResponsiveModal } from '@/components/ui/ResponsiveModal';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

export interface ScheduleLessonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScheduled?: (newLesson: FullLessonData) => void;
  initialDate?: string;
  initialStartTime?: string;
  initialEndTime?: string;
  defaultGroupId?: string;
}

function getStudentWord(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 19) return `${count} учеников`;
  if (mod10 === 1) return `${count} ученик`;
  if (mod10 >= 2 && mod10 <= 4) return `${count} ученика`;
  return `${count} учеников`;
}

function calculateEndTime(start: string, durationMinutes: number = 90): string {
  try {
    const [h, m] = start.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return '20:15';
    const totalMinutes = h * 60 + m + durationMinutes;
    const endH = Math.floor(totalMinutes / 60) % 24;
    const endM = totalMinutes % 60;
    return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
  } catch {
    return '20:15';
  }
}

export function ScheduleLessonModal({
  isOpen,
  onClose,
  onScheduled,
  initialDate,
  initialStartTime,
  initialEndTime,
  defaultGroupId,
}: ScheduleLessonModalProps) {
  const toast = useToast();
  const { userName } = useRole();
  const { t, language } = useLanguage();
  const locale = language === 'en' ? 'en-US' : language === 'de' ? 'de-DE' : 'ru-RU';

  const [groups, setGroups] = useState(() => (typeof window !== 'undefined' ? getStoredGroups() : []));
  const [groupId, setGroupId] = useState(defaultGroupId || '1');
  const [teacherId, setTeacherId] = useState('t1');
  const [teacherName, setTeacherName] = useState('Мария Иванова');
  const [date, setDate] = useState(initialDate || new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState(initialStartTime || '18:45');
  const [endTime, setEndTime] = useState(initialEndTime || '20:15');
  const [topic, setTopic] = useState('');
  const [homework, setHomework] = useState('');
  const [onlineUrl, setOnlineUrl] = useState('https://zoom.us/j/teacher-room-english');
  const [isTrial, setIsTrial] = useState(false);
  const [sendHwNotification, setSendHwNotification] = useState(false);
  const [sendTgReminder, setSendTgReminder] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);

  const getGroupDurationMinutes = (g?: { schedule?: string }) => {
    if (!g?.schedule) return 90;
    const timeMatch = g.schedule.match(/(\d{1,2}:\d{2})\s*[–\-]\s*(\d{1,2}:\d{2})/);
    if (timeMatch) {
      const [sH, sM] = timeMatch[1].split(':').map(Number);
      const [eH, eM] = timeMatch[2].split(':').map(Number);
      const diff = eH * 60 + eM - (sH * 60 + sM);
      if (diff > 0) return diff;
    }
    return 90;
  };

  const applyGroupDefaults = (grpId: string, currentGroups = groups, userStartTime?: string) => {
    const g = currentGroups.find((grp) => grp.id === grpId);
    if (!g) return;

    if (g.teacherId) {
      setTeacherId(g.teacherId);
    }
    if (g.teacherName) {
      setTeacherName(g.teacherName);
    }

    const durMin = getGroupDurationMinutes(g);

    if (userStartTime) {
      setStartTime(userStartTime);
      setEndTime(calculateEndTime(userStartTime, durMin));
    } else if (g.schedule) {
      const timeMatch = g.schedule.match(/(\d{1,2}:\d{2})\s*[–\-]\s*(\d{1,2}:\d{2})/);
      if (timeMatch) {
        setStartTime(timeMatch[1]);
        setEndTime(timeMatch[2]);
      } else {
        setEndTime(calculateEndTime(startTime, durMin));
      }
    }

    const tName = g.teacherName || '';
    if (tName.toLowerCase().includes('мария')) {
      setOnlineUrl('https://zoom.us/j/teacher-maria-english');
    } else if (tName.toLowerCase().includes('денис')) {
      setOnlineUrl('https://zoom.us/j/teacher-denis-robotics');
    } else if (tName.toLowerCase().includes('ольга')) {
      setOnlineUrl('https://zoom.us/j/teacher-olga-math');
    } else if (tName.toLowerCase().includes('алексей')) {
      setOnlineUrl('https://zoom.us/j/teacher-alexey-phys');
    } else {
      setOnlineUrl('https://zoom.us/j/school-online-room');
    }
  };

  useEffect(() => {
    if (isOpen) {
      const stored = getStoredGroups();
      setGroups(stored);
      const targetId = defaultGroupId || (stored.length > 0 ? stored[0].id : '1');
      setGroupId(targetId);
      applyGroupDefaults(targetId, stored, initialStartTime);

      if (initialDate) {
        setDate(initialDate);
      }
      if (initialStartTime) {
        setStartTime(initialStartTime);
        if (initialEndTime) {
          setEndTime(initialEndTime);
        } else {
          setEndTime(calculateEndTime(initialStartTime));
        }
      }
    }
  }, [isOpen, initialDate, initialStartTime, initialEndTime, defaultGroupId]);

  const selectedGroup = useMemo(() => {
    return (
      groups.find((g) => g.id === groupId) ||
      groups[0] || {
        id: '1',
        name: 'English B1 Teens',
        courseName: 'Английский язык',
        teacherId: 't1',
        teacherName: 'Мария Иванова',
        students: [],
        schedule: 'Пн, Чт • 18:45–20:15',
      }
    );
  }, [groups, groupId]);

  // Real-time conflict detection
  useEffect(() => {
    if (!isOpen) return;
    try {
      const existing = getStoredLessons();
      const conflict = existing.find(
        (l) =>
          l.date === date &&
          l.status !== 'cancelled' &&
          (l.groupId === groupId || (teacherId && l.teacherId === teacherId)) &&
          !(endTime <= l.startTime || startTime >= l.endTime)
      );
      if (conflict) {
        if (conflict.groupId === groupId) {
          setConflictWarning(
            `Внимание: В это время (${conflict.startTime}–${conflict.endTime}) у группы уже запланировано занятие «${conflict.topic}»`
          );
        } else {
          setConflictWarning(
            `Внимание: В это время (${conflict.startTime}–${conflict.endTime}) преподаватель ${teacherName} уже ведет занятие в группе «${conflict.groupName}»`
          );
        }
      } else {
        setConflictWarning(null);
      }
    } catch {
      setConflictWarning(null);
    }
  }, [isOpen, date, startTime, endTime, groupId, teacherId, teacherName]);

  if (!isOpen) return null;

  const handleGroupChange = (newGroupId: string) => {
    setGroupId(newGroupId);
    applyGroupDefaults(newGroupId);
  };

  const handleTeacherChange = (newTeacherId: string) => {
    setTeacherId(newTeacherId);
    const found = INITIAL_TEACHERS.find((t) => t.id === newTeacherId);
    if (found) {
      setTeacherName(found.name);
    }
  };

  const handleStartTimeChange = (newStart: string) => {
    setStartTime(newStart);
    const durMin = getGroupDurationMinutes(selectedGroup);
    setEndTime(calculateEndTime(newStart, durMin));
  };

  const handleCopyLink = () => {
    if (onlineUrl) {
      navigator.clipboard.writeText(onlineUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      toast.success('Ссылка на Zoom скопирована');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (conflictWarning) {
        if (!confirm(`${conflictWarning}\n\nВы уверены, что хотите создать занятие?`)) {
          setIsSubmitting(false);
          return;
        }
      }

      const dateFormatted = new Date(date).toLocaleDateString(locale, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });

      const dayOfWeek = new Date(date).getDay() === 0 ? 6 : new Date(date).getDay() - 1;

      const allStudents = getStoredStudents();
      const enrolledStudents = (selectedGroup.students || []).map((s) => {
        const fullStudent = allStudents.find((st) => st.id === s.id);
        return {
          id: s.id,
          name: s.name,
          attendanceStatus: 'not_marked' as const,
          parentPhone: fullStudent?.parents?.[0]?.phone || fullStudent?.phone,
          isTrial,
        };
      });

      const newLessonId = `l_${Date.now()}`;
      const newLesson: FullLessonData = {
        id: newLessonId,
        groupId: selectedGroup.id,
        groupName: selectedGroup.name,
        courseName: selectedGroup.courseName,
        teacherId: teacherId || selectedGroup.teacherId || 't1',
        teacherName: teacherName || selectedGroup.teacherName || 'Мария Иванова',
        date,
        dateFormatted,
        dayOfWeek,
        startTime,
        endTime,
        room: 'Онлайн (Zoom)',
        topic: topic.trim() || 'Плановое занятие',
        homework: homework.trim() || undefined,
        onlineMeetingUrl: onlineUrl.trim() || 'https://zoom.us/j/teacher-room-english',
        status: 'scheduled',
        isTrial,
        students: enrolledStudents,
        timelineEvents: [
          {
            id: `ev_${Date.now()}_create`,
            timestamp: `${new Date().toLocaleDateString('ru-RU')}, ${new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`,
            author: userName || 'Администратор',
            role: 'Администратор',
            type: 'created',
            comment: `Создано занятие для группы «${selectedGroup.name}» на ${dateFormatted} (${startTime}–${endTime})`,
          },
        ],
      };

      // 1. Save to local storage
      saveLessonToStorage(newLesson);

      // 2. Supabase sync
      try {
        const supabase = createClient();
        await supabase.from('lessons').insert([
          {
            id: newLesson.id,
            group_id: newLesson.groupId,
            teacher_id: newLesson.teacherId,
            date: newLesson.date,
            start_time: newLesson.startTime,
            end_time: newLesson.endTime,
            topic: newLesson.topic,
            homework: newLesson.homework,
            zoom_url: newLesson.onlineMeetingUrl,
            room: 'Онлайн (Zoom)',
            status: 'scheduled',
            created_at: new Date().toISOString(),
          },
        ]);
      } catch (err) {
        console.warn('Supabase insert notice:', err);
      }

      // 3. Optional timeline interactions for parents
      const now = new Date();
      const timeFormatted = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

      for (const st of enrolledStudents) {
        const fullStudent = allStudents.find((s) => s.id === st.id);
        const parentId = fullStudent?.parents?.[0]?.id;
        const parentName = fullStudent?.parents?.[0]
          ? `${fullStudent.parents[0].firstName} ${fullStudent.parents[0].lastName}`
          : undefined;

        const interaction: TimelineInteraction = {
          id: `int_sch_${Date.now()}_${st.id}`,
          studentId: st.id,
          studentName: st.name,
          parentId,
          parentName,
          occurredAt: `Сегодня, ${timeFormatted}`,
          author: userName || newLesson.teacherName || 'Преподаватель',
          channel: 'other',
          type: 'organizational',
          content: `📅 Запланировано занятие: «${newLesson.groupName}» на ${dateFormatted} в ${startTime}–${endTime}. Ссылка: ${onlineUrl}.`,
        };

        saveInteractionToStorage(interaction);
      }

      window.dispatchEvent(new CustomEvent('crm-lessons-changed', { detail: newLesson }));
      window.dispatchEvent(new CustomEvent('crm-timeline-interactions-changed'));

      if (sendHwNotification && homework.trim()) {
        toast.info(`Домашнее задание поставлено в очередь на отправку родителям (${enrolledStudents.length} писем)`);
      }
      if (sendTgReminder) {
        toast.info('Напоминание о занятии запланировано в Telegram');
      }

      toast.success(`Занятие «${newLesson.groupName}» (${dateFormatted}) успешно создано!`);

      if (onScheduled) {
        onScheduled(newLesson);
      }
      onClose();
    } catch (err: any) {
      console.error('Failed to schedule lesson:', err);
      toast.error(err.message || 'Ошибка при сохранении занятия');
    } finally {
      setIsSubmitting(false);
    }
  };

  const studentCount = selectedGroup.students?.length || 0;

  const modalFooter = (
    <div className="flex items-center justify-end gap-3 w-full">
      <button
        type="button"
        onClick={onClose}
        disabled={isSubmitting}
        className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
      >
        Отмена
      </button>
      <button
        type="submit"
        form="schedule-lesson-form"
        disabled={isSubmitting}
        className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
      >
        <Check className="h-4 w-4" />
        <span>{isSubmitting ? 'Создание...' : 'Создать занятие'}</span>
      </button>
    </div>
  );

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title="Новое занятие"
      subtitle="Запланируйте занятие для учебной группы"
      headerBg="bg-white text-slate-900 border-b border-slate-100"
      footer={modalFooter}
    >
      <form id="schedule-lesson-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Conflict Warning Banner */}
        {conflictWarning && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs animate-in fade-in">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <span className="leading-snug">{conflictWarning}</span>
          </div>
        )}

        {/* 1. ВЫБОР ГРУППЫ И ПРЕПОДАВАТЕЛЯ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Учебная группа <span className="text-rose-500">*</span>
            </label>
            <select
              value={groupId}
              onChange={(e) => handleGroupChange(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800 shadow-2xs cursor-pointer"
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} • {g.courseName || 'Курс'} ({g.students?.length || 0} уч.)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Преподаватель <span className="text-rose-500">*</span>
            </label>
            <select
              value={teacherId}
              onChange={(e) => handleTeacherChange(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800 shadow-2xs cursor-pointer"
            >
              {INITIAL_TEACHERS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.role || 'Преподаватель'})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Карточка-паспорт выбранной группы */}
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
          <div className="flex items-center gap-1.5">
            <GraduationCap className="h-3.5 w-3.5 text-blue-600" />
            <span className="font-semibold text-slate-800">
              {selectedGroup.courseName || 'Основной курс'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-slate-400" />
            <span>{getStudentWord(studentCount)}</span>
          </div>
        </div>

        {/* 2. ДАТА И ВРЕМЯ ЗАНЯТИЯ */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Дата занятия <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800 shadow-2xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Начало <span className="text-rose-500">*</span>
            </label>
            <input
              type="time"
              required
              value={startTime}
              onChange={(e) => handleStartTimeChange(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800 shadow-2xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Окончание <span className="text-rose-500">*</span>
            </label>
            <input
              type="time"
              required
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800 shadow-2xs"
            />
          </div>
        </div>

        {/* 3. ССЫЛКА НА ЗАНЯТИЕ (ZOOM) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Ссылка на онлайн-занятие (Zoom)
          </label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="url"
                value={onlineUrl}
                onChange={(e) => setOnlineUrl(e.target.value)}
                placeholder="https://zoom.us/j/teacher-room"
                className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-500 font-medium text-slate-800 shadow-2xs"
              />
              <Video className="w-3.5 h-3.5 text-indigo-500 absolute left-2.5 top-2.5" />
            </div>
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 hover:border-slate-300 rounded-xl shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              {copiedLink ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-slate-500" />
              )}
              <span>{copiedLink ? 'Скопировано' : 'Скопировать'}</span>
            </button>
          </div>
        </div>

        {/* 4. ТЕМА И ДОМАШНЕЕ ЗАДАНИЕ */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Тема занятия
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Например: Введение в тему Present Simple"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-500 text-slate-800 placeholder:text-slate-400 shadow-2xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Домашнее задание
            </label>
            <textarea
              rows={2}
              value={homework}
              onChange={(e) => setHomework(e.target.value)}
              placeholder="Например: Учебник стр. 14, упр. 1–3..."
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-500 text-slate-800 placeholder:text-slate-400 shadow-2xs"
            />
          </div>
        </div>

        {/* 5. УВЕДОМЛЕНИЯ И ОПЦИИ */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/90 space-y-2.5">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Оповещения и параметры
          </span>

          <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={sendTgReminder}
              onChange={(e) => setSendTgReminder(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer h-3.5 w-3.5"
            />
            <span className="flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5 text-sky-500" />
              Отправить родителям напоминание в Telegram
            </span>
          </label>

          {homework.trim() && (
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none animate-in fade-in">
              <input
                type="checkbox"
                checked={sendHwNotification}
                onChange={(e) => setSendHwNotification(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer h-3.5 w-3.5"
              />
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-blue-600" />
                Отправить ДЗ родителям на email после создания
              </span>
            </label>
          )}

          <div className="pt-2 border-t border-slate-200/60 flex items-center gap-2">
            <input
              type="checkbox"
              id="has_trial"
              checked={isTrial}
              onChange={(e) => setIsTrial(e.target.checked)}
              className="rounded text-purple-600 focus:ring-purple-500 cursor-pointer h-3.5 w-3.5"
            />
            <label
              htmlFor="has_trial"
              className="text-xs font-medium text-slate-700 cursor-pointer flex items-center gap-1"
            >
              <span>🎯</span>
              <span>Отметить как открытый/пробный урок</span>
            </label>
          </div>
        </div>
      </form>
    </ResponsiveModal>
  );
}
