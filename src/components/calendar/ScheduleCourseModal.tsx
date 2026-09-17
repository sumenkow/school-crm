'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Video, Check, Users, Sparkles, Send, BookOpen } from 'lucide-react';
import { FullLessonData, TimelineInteraction } from '@/lib/data/mockData';
import { getStoredGroups } from '@/lib/data/groupStorage';
import { getStoredStudents } from '@/lib/data/studentStorage';
import { saveLessonToStorage } from '@/lib/data/lessonStorage';
import { saveInteractionToStorage } from '@/lib/data/timelineStorage';
import { useToast } from '@/context/ToastContext';
import { useRole } from '@/context/RoleContext';
import { cn } from '@/lib/utils';

interface ScheduleCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCourseScheduled?: (newLessons: FullLessonData[]) => void;
}

const DAYS_MAP = [
  { dayIndex: 0, short: 'Пн', full: 'Понедельник' },
  { dayIndex: 1, short: 'Вт', full: 'Вторник' },
  { dayIndex: 2, short: 'Ср', full: 'Среда' },
  { dayIndex: 3, short: 'Чт', full: 'Четверг' },
  { dayIndex: 4, short: 'Пт', full: 'Пятница' },
  { dayIndex: 5, short: 'Сб', full: 'Суббота' },
  { dayIndex: 6, short: 'Вс', full: 'Воскресенье' },
];

export function ScheduleCourseModal({
  isOpen,
  onClose,
  onCourseScheduled,
}: ScheduleCourseModalProps) {
  const toast = useToast();
  const { userName } = useRole();

  const [groups, setGroups] = useState(() => (typeof window !== 'undefined' ? getStoredGroups() : []));
  const [groupId, setGroupId] = useState('1');
  const [startDate, setStartDate] = useState('2026-09-01');
  const [endDate, setEndDate] = useState('2026-09-30');
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 4]); // Tue, Fri by default
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('19:30');
  const [room, setRoom] = useState('Онлайн (Zoom 1)');
  const [courseTopic, setCourseTopic] = useState('Интенсивный модуль: основы и разговорная практика');
  const [onlineUrl, setOnlineUrl] = useState('https://meet.google.com/school-crm-course');
  const [notifyParents, setNotifyParents] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const stored = getStoredGroups();
      setGroups(stored);
      if (stored.length > 0) {
        setGroupId(stored[0].id);
        setRoom(stored[0].room || 'Онлайн (Zoom 1)');
      }
    }
  }, [isOpen]);

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

  const toggleDay = (dayIndex: number) => {
    setSelectedDays((prev) =>
      prev.includes(dayIndex) ? prev.filter((d) => d !== dayIndex) : [...prev, dayIndex].sort()
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDays.length === 0) {
      alert('Выберите хотя бы один день недели для проведения занятий курса');
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      alert('Дата начала курса не может быть позже даты окончания');
      return;
    }

    setIsSubmitting(true);
    try {
      const allStudents = getStoredStudents();
      const enrolledStudents = (selectedGroup.students || []).map((s) => ({
        id: s.id,
        name: s.name,
        attendanceStatus: 'not_marked' as const,
      }));

      const start = new Date(startDate);
      const end = new Date(endDate);
      const generatedLessons: FullLessonData[] = [];

      let current = new Date(start);
      let lessonCounter = 1;

      while (current <= end) {
        // JS getDay(): 0 = Sun, 1 = Mon, ..., 6 = Sat
        // Our dayIndex: 0 = Mon, ..., 6 = Sun
        const jsDay = current.getDay();
        const ourDayIndex = jsDay === 0 ? 6 : jsDay - 1;

        if (selectedDays.includes(ourDayIndex)) {
          const pad = (n: number) => String(n).padStart(2, '0');
          const dateStr = `${current.getFullYear()}-${pad(current.getMonth() + 1)}-${pad(current.getDate())}`;
          const dateFormatted = current.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          });

          const lessonId = `course_les_${Date.now()}_${lessonCounter}`;
          const newLesson: FullLessonData = {
            id: lessonId,
            groupId: selectedGroup.id,
            groupName: selectedGroup.name,
            courseName: selectedGroup.courseName || 'Курс',
            teacherId: selectedGroup.teacherId || 't1',
            teacherName: selectedGroup.teacherName || 'Преподаватель',
            date: dateStr,
            dateFormatted,
            dayOfWeek: ourDayIndex,
            startTime,
            endTime,
            room: room || 'Онлайн (Zoom)',
            topic: `Урок ${lessonCounter}: ${courseTopic}`,
            onlineMeetingUrl: onlineUrl,
            status: 'scheduled',
            students: enrolledStudents,
          };

          generatedLessons.push(newLesson);
          await saveLessonToStorage(newLesson);
          lessonCounter++;
        }

        current.setDate(current.getDate() + 1);
      }

      // If notify parents enabled, dispatch timeline notifications
      if (notifyParents && enrolledStudents.length > 0) {
        const nowStr = new Date().toLocaleString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });

        for (const st of enrolledStudents) {
          const fullSt = allStudents.find((s) => s.id === st.id);
          const parent = fullSt?.parents?.[0];
          const parentId = parent?.id || `p_${st.id}`;
          const parentName = parent ? `${parent.firstName} ${parent.lastName}`.trim() : 'Родитель';

          const notification: TimelineInteraction = {
            id: `int_course_${Date.now()}_${st.id}`,
            studentId: st.id,
            studentName: st.name,
            parentId,
            parentName,
            occurredAt: nowStr,
            channel: 'email',
            type: 'status_change',
            author: userName || 'Администратор',
            content: `Уведомление родителям: для ученика ${st.name} запланирован курс «${selectedGroup.courseName}» (${generatedLessons.length} занятий) с ${startDate} по ${endDate}. Ссылка на онлайн-класс: ${onlineUrl}. За 1 день до каждого урока отправляется напоминание.`,
            result: 'Email отправлен родителям',
            targetType: 'parent',
            targetName: parentName,
            targetRole: 'Родитель',
          };

          await saveInteractionToStorage(notification);
        }
      }

      toast.success(
        `Запланирован курс: создано ${generatedLessons.length} занятий!${
          notifyParents ? ' Уведомления родителям отправлены.' : ''
        }`
      );

      if (onCourseScheduled) {
        onCourseScheduled(generatedLessons);
      }
      onClose();
    } catch (err) {
      console.error('Error scheduling course:', err);
      toast.error('Произошла ошибка при планировании курса');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="relative max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl border border-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-5 bg-linear-to-r from-blue-50/50 to-indigo-50/50 rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Запланировать курс</h2>
              <p className="text-xs text-slate-500">Генерация серии занятий и оповещение родителей</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Group selection */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Учебная группа и курс *
            </label>
            <select
              value={groupId}
              onChange={(e) => {
                setGroupId(e.target.value);
                const g = groups.find((grp) => grp.id === e.target.value);
                if (g) setRoom(g.room || 'Онлайн (Zoom 1)');
              }}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} — {g.courseName} ({g.teacherName})
                </option>
              ))}
            </select>
          </div>

          {/* Period: Start and End Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">
                Дата начала курса *
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">
                Дата окончания курса *
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              />
            </div>
          </div>

          {/* Days of week checkboxes */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-2">
              Дни проведения занятий в неделю:
            </label>
            <div className="grid grid-cols-7 gap-1.5">
              {DAYS_MAP.map((day) => {
                const isSelected = selectedDays.includes(day.dayIndex);
                return (
                  <button
                    key={day.dayIndex}
                    type="button"
                    onClick={() => toggleDay(day.dayIndex)}
                    className={cn(
                      'py-2 px-1 rounded-xl text-xs font-bold transition-all text-center border cursor-pointer',
                      isSelected
                        ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300'
                    )}
                  >
                    <div>{day.short}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time & Room */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Начало *</label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Окончание *</label>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Аудитория / Платформа</label>
              <input
                type="text"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder="Онлайн (Zoom 1)"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none bg-white"
              />
            </div>
          </div>

          {/* Video meeting link */}
          <div>
            <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5 mb-1">
              <Video className="h-3.5 w-3.5 text-blue-600" />
              Ссылка на онлайн-конференцию (Zoom / Google Meet)
            </label>
            <input
              type="url"
              value={onlineUrl}
              onChange={(e) => setOnlineUrl(e.target.value)}
              placeholder="https://meet.google.com/..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
            />
          </div>

          {/* Course Topic / Description */}
          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">Тема или описание курса</label>
            <input
              type="text"
              value={courseTopic}
              onChange={(e) => setCourseTopic(e.target.value)}
              placeholder="Тематический блок или модуль..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none bg-white"
            />
          </div>

          {/* Notify Parents Checkbox */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 flex items-start gap-2.5">
            <input
              type="checkbox"
              id="notifyParentsCourse"
              checked={notifyParents}
              onChange={(e) => setNotifyParents(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <label htmlFor="notifyParentsCourse" className="text-xs text-slate-700 cursor-pointer leading-relaxed">
              <span className="font-semibold text-slate-900 block">Отправить оповещения родителям</span>
              Автоматическая рассылка email со списком занятий курса, персональной ссылкой на Zoom/Meet и планированием напоминаний за 1 день до каждого урока.
            </label>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>Планирование...</>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Сгенерировать курс
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
