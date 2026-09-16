'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, Video, Check, BookOpen, Users, Edit3 } from 'lucide-react';
import { FullLessonData, TimelineInteraction } from '@/lib/data/mockData';
import { saveLessonToStorage } from '@/lib/data/lessonStorage';
import { saveInteractionToStorage } from '@/lib/data/timelineStorage';
import { getStoredStudents } from '@/lib/data/studentStorage';
import { useToast } from '@/context/ToastContext';
import { useRole } from '@/context/RoleContext';
import { useLanguage } from '@/context/LanguageContext';

export interface EditLessonModalProps {
  isOpen: boolean;
  onClose: () => void;
  lesson: FullLessonData;
  onSaved: (updatedLesson: FullLessonData) => void;
}

export function EditLessonModal({ isOpen, onClose, lesson, onSaved }: EditLessonModalProps) {
  const toast = useToast();
  const { userName } = useRole();
  const { t, language } = useLanguage();
  const locale = language === 'en' ? 'en-US' : language === 'de' ? 'de-DE' : 'ru-RU';

  const [date, setDate] = useState(lesson.date);
  const [startTime, setStartTime] = useState(lesson.startTime);
  const [endTime, setEndTime] = useState(lesson.endTime);
  const [topic, setTopic] = useState(lesson.topic || '');
  const [homework, setHomework] = useState(lesson.homework || '');
  const [teacherName, setTeacherName] = useState(lesson.teacherName);
  const [room, setRoom] = useState(lesson.room);
  const [status, setStatus] = useState<FullLessonData['status']>(lesson.status);
  const [onlineMeetingUrl, setOnlineMeetingUrl] = useState(lesson.onlineMeetingUrl || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDate(lesson.date);
      setStartTime(lesson.startTime);
      setEndTime(lesson.endTime);
      setTopic(lesson.topic || '');
      setHomework(lesson.homework || '');
      setTeacherName(lesson.teacherName);
      setRoom(lesson.room);
      setStatus(lesson.status);
      setOnlineMeetingUrl(lesson.onlineMeetingUrl || '');
    }
  }, [isOpen, lesson]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const dateFormatted = new Date(date).toLocaleDateString(locale, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });

      const dayOfWeek = new Date(date).getDay() === 0 ? 6 : new Date(date).getDay() - 1;

      const updatedLesson: FullLessonData = {
        ...lesson,
        date,
        dateFormatted,
        dayOfWeek,
        startTime,
        endTime,
        topic: topic.trim() || 'Плановое занятие',
        homework: homework.trim() || undefined,
        teacherName: teacherName.trim() || lesson.teacherName,
        room: room.trim() || lesson.room,
        status,
        onlineMeetingUrl: onlineMeetingUrl.trim() || undefined,
      };

      // 1. Persist to Storage & Supabase
      saveLessonToStorage(updatedLesson);

      // 2. Add Timeline event for all students and their parents
      const allStudents = getStoredStudents();
      const now = new Date();
      const timeFormatted = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

      for (const st of lesson.students || []) {
        const fullStudent = allStudents.find((s) => s.id === st.id);
        const parentId = fullStudent?.parents?.[0]?.id;
        const parentName = fullStudent?.parents?.[0]
          ? `${fullStudent.parents[0].firstName} ${fullStudent.parents[0].lastName}`
          : undefined;

        const interaction: TimelineInteraction = {
          id: `int_edit_ls_${Date.now()}_${st.id}`,
          studentId: st.id,
          studentName: st.name,
          parentId,
          parentName,
          occurredAt: `Сегодня, ${timeFormatted}`,
          author: userName || teacherName || 'Преподаватель',
          channel: 'other',
          type: 'organizational',
          content: `✏️ Преподаватель обновил данные занятия: «${updatedLesson.groupName}» на ${dateFormatted} в ${startTime}–${endTime}. Тема: «${updatedLesson.topic}». Аудитория: ${room}. ДЗ: «${homework || 'не задано'}».`,
        };

        saveInteractionToStorage(interaction);
      }

      window.dispatchEvent(new CustomEvent('crm-lessons-changed', { detail: updatedLesson }));
      window.dispatchEvent(new CustomEvent('crm-timeline-interactions-changed'));

      toast.success('Все изменения по занятию успешно сохранены в базе данных!');
      onSaved(updatedLesson);
      onClose();
    } catch (err: any) {
      console.error('Failed to update lesson:', err);
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
              <Edit3 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white tracking-tight">{t('modal.editLesson.title', 'Редактирование занятия')}</h2>
              <p className="text-xs text-blue-100">{lesson.groupName} ({lesson.courseName})</p>
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
              placeholder={t('teacher.topicPlaceholder', 'Введите тему урока...')}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              {t('hero.homework', 'Домашнее задание')}
            </label>
            <textarea
              rows={3}
              value={homework}
              onChange={(e) => setHomework(e.target.value)}
              placeholder={t('teacher.homeworkPlaceholder', 'Опишите домашнее задание...')}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed shadow-2xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                {t('hero.teacher', 'Преподаватель')}
              </label>
              <input
                type="text"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                {t('common.status', 'Статус урока')}
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
              >
                <option value="scheduled">{t('status.scheduled', 'Запланировано')}</option>
                <option value="completed">{t('status.completed', 'Проведено (Завершено)')}</option>
                <option value="rescheduled">{t('status.rescheduled', 'Перенесено')}</option>
                <option value="cancelled">{t('status.cancelled', 'Отменено')}</option>
              </select>
            </div>
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

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              {t('lesson.onlineRoom', 'Ссылка на онлайн-класс (Zoom / Google Meet)')}
            </label>
            <input
              type="url"
              value={onlineMeetingUrl}
              onChange={(e) => setOnlineMeetingUrl(e.target.value)}
              placeholder="https://meet.google.com/..."
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-blue-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
            />
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
              {isSubmitting ? t('common.saving', 'Сохранение...') : t('action.saveChanges', 'Сохранить изменения')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
