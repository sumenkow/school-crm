'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, Video, Check, Users, BookOpen, Send, Sparkles } from 'lucide-react';
import { FullLessonData, TimelineInteraction } from '@/lib/data/mockData';
import { getStoredGroups } from '@/lib/data/groupStorage';
import { getStoredStudents } from '@/lib/data/studentStorage';
import { saveLessonToStorage } from '@/lib/data/lessonStorage';
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
  const { t } = useLanguage();

  const [groups, setGroups] = useState(() => (typeof window !== 'undefined' ? getStoredGroups() : []));
  const [groupId, setGroupId] = useState(defaultGroupId || '1');
  const [date, setDate] = useState(initialDate || new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState('18:45');
  const [endTime, setEndTime] = useState('20:15');
  const [room, setRoom] = useState('Онлайн (Zoom 1)');
  const [topic, setTopic] = useState('');
  const [homework, setHomework] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [onlineUrl, setOnlineUrl] = useState('https://meet.google.com/new');
  const [isTrial, setIsTrial] = useState(false);
  const [notifyParents, setNotifyParents] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const stored = getStoredGroups();
      setGroups(stored);
      if (defaultGroupId) {
        setGroupId(defaultGroupId);
        const g = stored.find((grp) => grp.id === defaultGroupId);
        if (g) setRoom(g.room || 'Онлайн (Zoom 1)');
      } else if (stored.length > 0 && !groupId) {
        setGroupId(stored[0].id);
        setRoom(stored[0].room || 'Онлайн (Zoom 1)');
      }
      if (initialDate) {
        setDate(initialDate);
      }
    }
  }, [isOpen, initialDate, defaultGroupId]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const dateFormatted = new Date(date).toLocaleDateString('ru-RU', {
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
        onlineMeetingUrl: isOnline ? (onlineUrl.trim() || 'https://meet.google.com/new') : undefined,
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
          content: `📅 Запланировано новое занятие: «${newLesson.groupName}» на ${dateFormatted} в ${startTime}–${endTime}. Тема: «${newLesson.topic}». Аудитория: ${room}.`,
        };

        saveInteractionToStorage(interaction);
      }

      // 3. Send notification if requested
      if (notifyParents && enrolledStudents.length > 0) {
        const recipientsList: Array<{
          studentId: string;
          studentName: string;
          parentName?: string;
          email?: string;
          telegram?: string;
          channel?: 'email' | 'telegram' | 'both';
        }> = [];

        enrolledStudents.forEach((st) => {
          const fullStudent = allStudents.find((s) => s.id === st.id);
          const parent = fullStudent?.parents?.[0];
          if (parent) {
            recipientsList.push({
              studentId: st.id,
              studentName: st.name,
              parentName: `${parent.firstName} ${parent.lastName}`,
              email: parent.email,
              telegram: parent.telegram,
              channel: (parent.preferredChannel?.toLowerCase() as any) || (parent.email && parent.telegram ? 'both' : parent.telegram ? 'telegram' : 'email'),
            });
          } else if (fullStudent) {
            recipientsList.push({
              studentId: st.id,
              studentName: st.name,
              email: (fullStudent as any).email,
              telegram: fullStudent.telegram,
              channel: 'email',
            });
          }
        });

        if (recipientsList.length > 0) {
          fetch('/api/lessons/notify/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'schedule',
              lessonId: newLesson.id,
              groupName: newLesson.groupName,
              courseName: newLesson.courseName,
              lessonDate: dateFormatted,
              lessonTime: `${startTime}–${endTime}`,
              room: newLesson.room,
              onlineMeetingUrl: newLesson.onlineMeetingUrl,
              teacherName: newLesson.teacherName,
              topic: newLesson.topic,
              recipients: recipientsList,
            }),
          }).catch((err) => console.warn('Notification error:', err));
        }
      }

      window.dispatchEvent(new CustomEvent('crm-lessons-changed', { detail: newLesson }));
      window.dispatchEvent(new CustomEvent('crm-timeline-interactions-changed'));

      toast.success(`Занятие «${newLesson.groupName}» (${dateFormatted}) успешно создано и сохранено в базе данных!`);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-linear-to-r from-blue-600 to-indigo-700 p-5 text-white rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-md shadow-inner text-white">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white tracking-tight">{t('modal.scheduleLesson.title', 'Запланировать занятие')}</h2>
              <p className="text-xs text-blue-100">{t('calendar.subtitle', 'Создание нового урока с синхронизацией в расписании')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-white/80 hover:bg-white/20 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              {t('modal.selectGroup', 'Учебная группа')} *
            </label>
            <select
              value={groupId}
              onChange={(e) => {
                setGroupId(e.target.value);
                const g = groups.find((grp) => grp.id === e.target.value);
                if (g && g.room) setRoom(g.room);
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.courseName || t('calendar.filterCourse', 'Курс')}) • {g.teacherName || t('hero.teacher', 'Преподаватель')}
                </option>
              ))}
            </select>
          </div>

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

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              {t('hero.topic', 'Тема занятия')}
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Например: Unit 3: Conditionals and Future in the Past"
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
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
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
            />
          </div>

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
                <input
                  type="url"
                  value={onlineUrl}
                  onChange={(e) => setOnlineUrl(e.target.value)}
                  placeholder="https://meet.google.com/..."
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

            <label className="flex items-center gap-2.5 cursor-pointer pt-1 border-t border-slate-200/60">
              <input
                type="checkbox"
                checked={notifyParents}
                onChange={(e) => setNotifyParents(e.target.checked)}
                className="h-4 w-4 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs font-semibold text-slate-700">
                ✉️ {t('modal.notifyParents', 'Разослать дату и время родителям (Email / Telegram)')}
              </span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
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
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              {isSubmitting ? t('common.saving', 'Сохранение...') : t('action.scheduleLesson', 'Запланировать занятие')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
