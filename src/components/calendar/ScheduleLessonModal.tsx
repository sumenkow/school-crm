'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, Video, Check, Users, BookOpen, Send, Sparkles, AlertCircle } from 'lucide-react';
import { FullLessonData, TimelineInteraction } from '@/lib/data/mockData';
import { getStoredGroups } from '@/lib/data/groupStorage';
import { getStoredStudents } from '@/lib/data/studentStorage';
import { saveLessonToStorage, getStoredLessons } from '@/lib/data/lessonStorage';
import { saveInteractionToStorage } from '@/lib/data/timelineStorage';
import { useToast } from '@/context/ToastContext';
import { useRole } from '@/context/RoleContext';
import { useLanguage } from '@/context/LanguageContext';

interface ScheduleLessonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScheduled?: (newLesson: FullLessonData) => void;
  initialDate?: string;
  defaultGroupId?: string;
}

export function ScheduleLessonModal({
  isOpen,
  onClose,
  onScheduled,
  initialDate,
  defaultGroupId,
}: ScheduleLessonModalProps) {
  const toast = useToast();
  const { userName } = useRole();
  const { t, language } = useLanguage();
  const locale = language === 'en' ? 'en-US' : language === 'de' ? 'de-DE' : 'ru-RU';

  const [groups, setGroups] = useState(() => (typeof window !== 'undefined' ? getStoredGroups() : []));
  const [groupId, setGroupId] = useState(defaultGroupId || '1');
  const [date, setDate] = useState(initialDate || new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState('18:45');
  const [endTime, setEndTime] = useState('20:15');
  const [room, setRoom] = useState('Онлайн (Zoom 1)');
  const [topic, setTopic] = useState('');
  const [homework, setHomework] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [onlineUrl, setOnlineUrl] = useState('https://zoom.us/j/teachermaria');
  const [isTrial, setIsTrial] = useState(false);
  const [notifyParents, setNotifyParents] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);

  // Helper to sync fields when group changes
  const applyGroupDefaults = (grpId: string, currentGroups = groups) => {
    const g = currentGroups.find((grp) => grp.id === grpId);
    if (!g) return;

    if (g.room) setRoom(g.room);

    // Auto-pull schedule times from group (e.g. "Пн, Чт • 18:45–20:15")
    if (g.schedule) {
      const timeMatch = g.schedule.match(/(\d{1,2}:\d{2})\s*[–\-]\s*(\d{1,2}:\d{2})/);
      if (timeMatch) {
        setStartTime(timeMatch[1]);
        setEndTime(timeMatch[2]);
      }
    }

    // Auto-pull Zoom link for teacher
    const teacherName = g.teacherName || '';
    if (teacherName.toLowerCase().includes('мария')) {
      setOnlineUrl('https://zoom.us/j/teacher-maria-english');
    } else if (teacherName.toLowerCase().includes('денис')) {
      setOnlineUrl('https://zoom.us/j/teacher-denis-robotics');
    } else if (teacherName.toLowerCase().includes('ольга')) {
      setOnlineUrl('https://zoom.us/j/teacher-olga-math');
    } else if (teacherName.toLowerCase().includes('алексей')) {
      setOnlineUrl('https://zoom.us/j/teacher-alexey-phys');
    } else {
      setOnlineUrl(`https://zoom.us/my/${encodeURIComponent(teacherName.toLowerCase().replace(/\s+/g, ''))}`);
    }

    if (g.room && g.room.toLowerCase().includes('онлайн')) {
      setIsOnline(true);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const stored = getStoredGroups();
      setGroups(stored);
      const targetId = defaultGroupId || (stored.length > 0 ? stored[0].id : '1');
      setGroupId(targetId);
      applyGroupDefaults(targetId, stored);

      if (initialDate) {
        setDate(initialDate);
      }
    }
  }, [isOpen, initialDate, defaultGroupId]);

  // Close all modals event listener
  useEffect(() => {
    const handleCloseAll = () => onClose();
    window.addEventListener('close-all-modals', handleCloseAll);
    return () => window.removeEventListener('close-all-modals', handleCloseAll);
  }, [onClose]);

  // Real-time conflict detection
  useEffect(() => {
    if (!isOpen) return;
    try {
      const existing = getStoredLessons();
      const conflict = existing.find((l) =>
        l.date === date &&
        (l.groupId === groupId) &&
        !(endTime <= l.startTime || startTime >= l.endTime)
      );
      if (conflict) {
        setConflictWarning(`Внимание: В это время (${conflict.startTime}–${conflict.endTime}) у группы уже есть урок «${conflict.topic}»`);
      } else {
        setConflictWarning(null);
      }
    } catch {
      setConflictWarning(null);
    }
  }, [isOpen, date, startTime, endTime, groupId]);

  if (!isOpen) return null;

  const selectedGroup = groups.find((g) => g.id === groupId) || groups[0] || {
    id: '1',
    name: 'English B1 Teens',
    courseName: 'Английский язык',
    teacherId: 't1',
    teacherName: 'Мария Иванова',
    students: [],
    room: 'Онлайн (Zoom 1)',
  };

  const handleGroupChange = (newGroupId: string) => {
    setGroupId(newGroupId);
    applyGroupDefaults(newGroupId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Conflict confirmation if detected
      if (conflictWarning) {
        if (!confirm(`${conflictWarning}\n\nВы уверены, что хотите добавить занятие?`)) {
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

      // Match enrolled students with studentStorage to get parents
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

      const newLesson: FullLessonData = {
        id: `l_${Date.now()}`,
        groupId: selectedGroup.id,
        groupName: selectedGroup.name,
        courseName: selectedGroup.courseName,
        teacherId: selectedGroup.teacherId || 't1',
        teacherName: selectedGroup.teacherName || 'Мария Иванова',
        date,
        dateFormatted,
        dayOfWeek,
        startTime,
        endTime,
        room,
        topic: topic.trim() || 'Плановое занятие',
        homework: homework.trim() || undefined,
        onlineMeetingUrl: isOnline ? (onlineUrl.trim() || 'https://zoom.us/j/school') : undefined,
        status: 'scheduled',
        isTrial,
        students: enrolledStudents,
      };

      // 1. Save lesson to Storage & Supabase
      saveLessonToStorage(newLesson);

      // 2. Add Timeline interaction for each student and their parents
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
          content: `📅 Запланировано занятие: «${newLesson.groupName}» на ${dateFormatted} в ${startTime}–${endTime}. Аудитория/ссылка: ${isOnline ? onlineUrl : room}.`,
        };

        saveInteractionToStorage(interaction);
      }

      // 3. Dispatch events to refresh cache
      window.dispatchEvent(new CustomEvent('crm-lessons-changed', { detail: newLesson }));
      window.dispatchEvent(new CustomEvent('crm-timeline-interactions-changed'));

      toast.success(`Занятие «${newLesson.groupName}» (${dateFormatted}) успешно запланировано!`);

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

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-xs">
      <div className="relative flex flex-col w-full max-w-lg max-h-[92vh] rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Sticky Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-linear-to-r from-blue-600 to-indigo-700 p-4 sm:p-5 text-white sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl sm:rounded-2xl bg-white/15 backdrop-blur-md shadow-inner text-white">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-white tracking-tight">
                {t('modal.scheduleLesson.title', 'Запланировать занятие')}
              </h2>
              <p className="text-[11px] sm:text-xs text-blue-100">
                {selectedGroup.teacherName ? `Преподаватель: ${selectedGroup.teacherName}` : 'Синхронизация с Zoom и расписанием'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-white/80 hover:bg-white/20 hover:text-white transition-colors cursor-pointer"
            aria-label="Закрыть"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form id="schedule-lesson-form" onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Conflict Warning Banner */}
          {conflictWarning && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <span>{conflictWarning}</span>
            </div>
          )}

          {/* GROUP SELECTOR */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              {t('modal.selectGroup', 'Учебная группа')} *
            </label>
            <select
              value={groupId}
              onChange={(e) => handleGroupChange(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.courseName || t('calendar.filterCourse', 'Курс')}) • {g.teacherName || 'Преподаватель'}
                </option>
              ))}
            </select>
          </div>

          {/* DATE & TIME (AUTO-FILLED) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">{t('modal.lessonDate', 'Дата')} *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">{t('common.startTime', 'Начало')} *</label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">{t('common.endTime', 'Окончание')} *</label>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
              />
            </div>
          </div>

          {/* TOPIC & HOMEWORK */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              {t('hero.topic', 'Тема занятия')}
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Например: Unit 3: Conditionals and Future in the Past"
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              {t('hero.homework', 'Домашнее задание')}
            </label>
            <input
              type="text"
              value={homework}
              onChange={(e) => setHomework(e.target.value)}
              placeholder="Например: Прочитать стр. 45-48, подготовить диалог"
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
            />
          </div>

          {/* ROOM & ONLINE */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              {t('lesson.roomFormat', 'Аудитория / Локация')}
            </label>
            <input
              type="text"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="Онлайн (Zoom 1) или Аудитория 204"
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
            />
          </div>

          <div className="space-y-3 rounded-2xl bg-slate-50 p-4 border border-slate-200/80">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isOnline}
                onChange={(e) => setIsOnline(e.target.checked)}
                className="h-4 w-4 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs font-bold text-slate-800">
                🌐 {t('lesson.onlineRoom', 'Онлайн-занятие (подключение по видеосвязи)')}
              </span>
            </label>

            {isOnline && (
              <div className="pt-1">
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Ссылка Zoom / Google Meet (подтянута для {selectedGroup.teacherName || 'преподавателя'}):
                </label>
                <input
                  type="url"
                  value={onlineUrl}
                  onChange={(e) => setOnlineUrl(e.target.value)}
                  placeholder="https://zoom.us/j/..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-blue-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            <label className="flex items-center gap-2.5 cursor-pointer pt-1 border-t border-slate-200/60">
              <input
                type="checkbox"
                checked={isTrial}
                onChange={(e) => setIsTrial(e.target.checked)}
                className="h-4 w-4 rounded-md border-slate-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-xs font-bold text-slate-800">
                🎯 {t('status.trial', 'Пробный урок для новых учеников')}
              </span>
            </label>
          </div>
        </form>

        {/* Sticky Footer */}
        <div className="flex items-center justify-end gap-2.5 p-4 border-t border-slate-100 bg-white sticky bottom-0 z-10 shrink-0 pb-[calc(14px+env(safe-area-inset-bottom,0px))]">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
          >
            {t('action.cancel', 'Отмена')}
          </button>
          <button
            type="submit"
            form="schedule-lesson-form"
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            {isSubmitting ? t('common.saving', 'Сохранение...') : t('action.scheduleLesson', 'Запланировать занятие')}
          </button>
        </div>
      </div>
    </div>
  );
}
