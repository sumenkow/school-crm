'use client';

import React, { useState, useEffect } from 'react';
import { Check, AlertCircle } from 'lucide-react';
import { FullLessonData, TimelineInteraction } from '@/lib/data/mockData';
import { getStoredGroups } from '@/lib/data/groupStorage';
import { getStoredStudents } from '@/lib/data/studentStorage';
import { saveLessonToStorage, getStoredLessons } from '@/lib/data/lessonStorage';
import { saveInteractionToStorage } from '@/lib/data/timelineStorage';
import { useToast } from '@/context/ToastContext';
import { useRole } from '@/context/RoleContext';
import { useLanguage } from '@/context/LanguageContext';
import { ResponsiveModal } from '@/components/ui/ResponsiveModal';

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
  const [onlineUrl, setOnlineUrl] = useState('https://zoom.us/j/teacher-maria-english');
  const [isTrial, setIsTrial] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);

  // Helper to sync fields when group changes
  const applyGroupDefaults = (grpId: string, currentGroups = groups) => {
    const g = currentGroups.find((grp) => grp.id === grpId);
    if (!g) return;

    if (g.room) setRoom(g.room);

    if (g.schedule) {
      const timeMatch = g.schedule.match(/(\d{1,2}:\d{2})\s*[–\-]\s*(\d{1,2}:\d{2})/);
      if (timeMatch) {
        setStartTime(timeMatch[1]);
        setEndTime(timeMatch[2]);
      }
    }

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

      saveLessonToStorage(newLesson);

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

  const modalSubtitle = selectedGroup.teacherName
    ? `Преподаватель: ${selectedGroup.teacherName}`
    : 'Синхронизация с Zoom и расписанием';

  const modalFooter = (
    <div className="flex items-center justify-end gap-3 w-full">
      <button
        type="button"
        onClick={onClose}
        disabled={isSubmitting}
        className="w-1/3 md:w-auto px-4 py-2.5 text-xs md:text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
      >
        Отмена
      </button>
      <button
        type="submit"
        form="schedule-lesson-form"
        disabled={isSubmitting}
        className="flex-1 md:flex-initial px-6 py-2.5 text-xs md:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
      >
        <Check className="h-4 w-4" />
        <span>{isSubmitting ? t('common.saving', 'Сохранение...') : 'Сохранить занятие'}</span>
      </button>
    </div>
  );

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title={t('modal.scheduleLesson.title', 'Запланировать новое занятие')}
      subtitle={modalSubtitle}
      headerBg="bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
      footer={modalFooter}
    >
      <form id="schedule-lesson-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Conflict Warning Banner */}
        {conflictWarning && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <span>{conflictWarning}</span>
          </div>
        )}

        {/* GROUP SELECTOR */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">
            {t('modal.selectGroup', 'Учебная группа')} *
          </label>
          <select
            value={groupId}
            onChange={(e) => handleGroupChange(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500"
          >
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} ({g.courseName || t('calendar.filterCourse', 'Курс')}) • {g.teacherName || 'Преподаватель'}
              </option>
            ))}
          </select>
        </div>

        {/* DATE & TIME (GRID 3 COLUMNS ON DESKTOP) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">
              {t('modal.lessonDate', 'Дата занятия')} *
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">
              {t('common.startTime', 'Начало')} *
            </label>
            <input
              type="time"
              required
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">
              {t('common.endTime', 'Окончание')} *
            </label>
            <input
              type="time"
              required
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* TOPIC & HOMEWORK */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">
              {t('hero.topic', 'Тема занятия')}
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Например: Unit 3: Conditionals"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">
              {t('hero.homework', 'Домашнее задание')}
            </label>
            <input
              type="text"
              value={homework}
              onChange={(e) => setHomework(e.target.value)}
              placeholder="Например: Прочитать стр. 45-48"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* ROOM & ONLINE ROOM & TRIAL */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_online"
              checked={isOnline}
              onChange={(e) => setIsOnline(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <label htmlFor="is_online" className="text-xs font-medium text-slate-700 cursor-pointer">
              {t('lesson.onlineRoom', 'Онлайн-комната занятия (Zoom / Meet)')}
            </label>
          </div>

          {isOnline && (
            <input
              type="url"
              value={onlineUrl}
              onChange={(e) => setOnlineUrl(e.target.value)}
              placeholder="https://zoom.us/j/teacher-maria-english"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-blue-500"
            />
          )}

          <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60">
            <input
              type="checkbox"
              id="has_trial"
              checked={isTrial}
              onChange={(e) => setIsTrial(e.target.checked)}
              className="rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
            />
            <label htmlFor="has_trial" className="text-xs font-medium text-slate-700 cursor-pointer">
              🎯 {t('status.trial', 'Присутствует пробный ученик')}
            </label>
          </div>
        </div>
      </form>
    </ResponsiveModal>
  );
}
