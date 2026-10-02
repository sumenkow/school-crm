'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Check, AlertCircle, Users, GraduationCap, Video, MapPin, Sparkles, Clock, Calendar } from 'lucide-react';
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
  const [date, setDate] = useState(initialDate || new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState(initialStartTime || '18:45');
  const [endTime, setEndTime] = useState(initialEndTime || '20:15');
  const [room, setRoom] = useState('Онлайн (Zoom 1)');
  const [topic, setTopic] = useState('');
  const [homework, setHomework] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [onlineUrl, setOnlineUrl] = useState('https://zoom.us/j/teacher-maria-english');
  const [isTrial, setIsTrial] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);

  // Parse standard duration of a group in minutes
  const getGroupDurationMinutes = (g?: { schedule?: string }) => {
    if (!g?.schedule) return 90;
    const timeMatch = g.schedule.match(/(\d{1,2}:\d{2})\s*[–\-]\s*(\d{1,2}:\d{2})/);
    if (timeMatch) {
      const [sH, sM] = timeMatch[1].split(':').map(Number);
      const [eH, eM] = timeMatch[2].split(':').map(Number);
      const diff = (eH * 60 + eM) - (sH * 60 + sM);
      if (diff > 0) return diff;
    }
    return 90;
  };

  // Helper to sync fields when group changes
  const applyGroupDefaults = (grpId: string, currentGroups = groups, userStartTime?: string) => {
    const g = currentGroups.find((grp) => grp.id === grpId);
    if (!g) return;

    if (g.room) setRoom(g.room);

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

    if (g.room && (g.room.toLowerCase().includes('онлайн') || g.room.toLowerCase().includes('zoom'))) {
      setIsOnline(true);
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
    return groups.find((g) => g.id === groupId) || groups[0] || {
      id: '1',
      name: 'English B1 Teens',
      courseName: 'Английский язык',
      teacherId: 't1',
      teacherName: 'Мария Иванова',
      students: [],
      room: 'Онлайн (Zoom 1)',
      schedule: 'Пн, Чт • 18:45–20:15',
    };
  }, [groups, groupId]);

  // Real-time conflict detection
  useEffect(() => {
    if (!isOpen) return;
    try {
      const existing = getStoredLessons();
      const conflict = existing.find((l) =>
        l.date === date &&
        (l.groupId === groupId || (selectedGroup.teacherId && l.teacherId === selectedGroup.teacherId)) &&
        !(endTime <= l.startTime || startTime >= l.endTime)
      );
      if (conflict) {
        if (conflict.groupId === groupId) {
          setConflictWarning(`Внимание: В это время (${conflict.startTime}–${conflict.endTime}) у группы уже запланировано занятие «${conflict.topic}»`);
        } else {
          setConflictWarning(`Внимание: В это время (${conflict.startTime}–${conflict.endTime}) преподаватель ${selectedGroup.teacherName} уже ведет занятие в группе «${conflict.groupName}»`);
        }
      } else {
        setConflictWarning(null);
      }
    } catch {
      setConflictWarning(null);
    }
  }, [isOpen, date, startTime, endTime, groupId, selectedGroup]);

  if (!isOpen) return null;

  const handleGroupChange = (newGroupId: string) => {
    setGroupId(newGroupId);
    applyGroupDefaults(newGroupId);
  };

  const handleStartTimeChange = (newStart: string) => {
    setStartTime(newStart);
    const durMin = getGroupDurationMinutes(selectedGroup);
    setEndTime(calculateEndTime(newStart, durMin));
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
          content: `📅 Добавлено занятие: «${newLesson.groupName}» на ${dateFormatted} в ${startTime}–${endTime}. Аудитория/ссылка: ${isOnline ? onlineUrl : room}.`,
        };

        saveInteractionToStorage(interaction);
      }

      window.dispatchEvent(new CustomEvent('crm-lessons-changed', { detail: newLesson }));
      window.dispatchEvent(new CustomEvent('crm-timeline-interactions-changed'));

      toast.success(`Занятие «${newLesson.groupName}» (${dateFormatted}) успешно добавлено!`);

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
        className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
      >
        Отмена
      </button>
      <button
        type="submit"
        form="schedule-lesson-form"
        disabled={isSubmitting}
        className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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
      title="Добавить занятие"
      subtitle={`Отдельное занятие для группы «${selectedGroup.name}»`}
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

        {/* 1. ВЫБОР ГРУППЫ */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Учебная группа <span className="text-rose-500">*</span>
          </label>
          <select
            value={groupId}
            onChange={(e) => handleGroupChange(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
          >
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} • {g.teacherName || 'Преподаватель'} ({g.students?.length || 0} уч.)
              </option>
            ))}
          </select>

          {/* Карточка-паспорт выбранной группы (наследуемые параметры) */}
          <div className="mt-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
            <div className="flex items-center gap-1.5">
              <GraduationCap className="h-3.5 w-3.5 text-blue-600" />
              <span className="font-semibold text-slate-800">{selectedGroup.courseName || 'Основной курс'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Преподаватель:</span>
              <span className="font-medium text-slate-700">{selectedGroup.teacherName}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-slate-400" />
              <span>{getStudentWord(studentCount)}</span>
            </div>
          </div>
        </div>

        {/* 2. ДАТА И ВРЕМЯ ЗАНЯТИЯ */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Дата занятия <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Начало <span className="text-rose-500">*</span>
            </label>
            <input
              type="time"
              required
              value={startTime}
              onChange={(e) => handleStartTimeChange(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Окончание <span className="text-rose-500">*</span>
            </label>
            <input
              type="time"
              required
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
            />
          </div>
        </div>

        {/* 3. ТЕМА И ДОМАШНЕЕ ЗАДАНИЕ */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Тема занятия
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Например: Введение в циклы for и while"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 text-slate-800 placeholder:text-slate-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Домашнее задание
            </label>
            <input
              type="text"
              value={homework}
              onChange={(e) => setHomework(e.target.value)}
              placeholder="Например: Задачи 1-5 на платформе"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 text-slate-800 placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* 4. ФОРМАТ / ОНЛАЙН-КОМНАТА И ПРОБНОЕ ЗАНЯТИЕ */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_online"
                checked={isOnline}
                onChange={(e) => setIsOnline(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="is_online" className="text-xs font-semibold text-slate-700 cursor-pointer flex items-center gap-1.5">
                <Video className="h-3.5 w-3.5 text-blue-600" />
                Онлайн-комната (Zoom / Meet)
              </label>
            </div>
            <span className="text-[10px] text-slate-400">Унаследовано из группы</span>
          </div>

          {isOnline && (
            <input
              type="url"
              value={onlineUrl}
              onChange={(e) => setOnlineUrl(e.target.value)}
              placeholder="https://zoom.us/j/teacher-room"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-blue-500 font-mono text-slate-700"
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
            <label htmlFor="has_trial" className="text-xs font-medium text-slate-700 cursor-pointer flex items-center gap-1">
              <span>🎯</span>
              <span>Отметить как пробное занятие</span>
            </label>
          </div>
        </div>
      </form>
    </ResponsiveModal>
  );
}

