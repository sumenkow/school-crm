'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, Video, Check } from 'lucide-react';
import { INITIAL_GROUPS, FullLessonData } from '@/lib/data/mockData';

interface ScheduleLessonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScheduled: (newLesson: FullLessonData) => void;
  initialDate?: string;
}

export function ScheduleLessonModal({ isOpen, onClose, onScheduled, initialDate }: ScheduleLessonModalProps) {
  const [groupId, setGroupId] = useState('1');
  const [date, setDate] = useState(initialDate || '2026-09-04');
  const [startTime, setStartTime] = useState('18:45');
  const [endTime, setEndTime] = useState('20:15');

  useEffect(() => {
    if (initialDate) {
      setDate(initialDate);
    }
  }, [initialDate]);
  const [room, setRoom] = useState('Онлайн (Zoom 1)');
  const [topic, setTopic] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [onlineUrl, setOnlineUrl] = useState('');

  if (!isOpen) return null;

  const selectedGroup = INITIAL_GROUPS.find((g) => g.id === groupId) || INITIAL_GROUPS[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newLesson: FullLessonData = {
      id: `l_${Date.now()}`,
      groupId,
      groupName: selectedGroup.name,
      courseName: selectedGroup.courseName,
      teacherId: selectedGroup.teacherId,
      teacherName: selectedGroup.teacherName,
      date,
      dateFormatted: new Date(date).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' }),
      dayOfWeek: new Date(date).getDay() === 0 ? 6 : new Date(date).getDay() - 1,
      startTime,
      endTime,
      room,
      topic: topic || 'Плановое занятие',
      onlineMeetingUrl: isOnline ? (onlineUrl || 'https://meet.google.com/new') : undefined,
      status: 'scheduled',
      students: selectedGroup.students.map((s) => ({
        id: s.id,
        name: s.name,
        attendanceStatus: 'not_marked',
      })),
    };

    onScheduled(newLesson);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Запланировать занятие</h2>
              <p className="text-xs text-slate-500">Добавление урока в расписание школы</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-700">Группа *</label>
            <select
              value={groupId}
              onChange={(e) => {
                setGroupId(e.target.value);
                const g = INITIAL_GROUPS.find((grp) => grp.id === e.target.value);
                if (g) setRoom(g.room);
              }}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {INITIAL_GROUPS.map((g) => (
                <option key={g.id} value={g.id}>{g.name} ({g.teacherName})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-700">Дата *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">Начало *</label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">Окончание *</label>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700">Тема занятия</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Например: Повторение грамматики Unit 2..."
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700">Формат / Онлайн-кабинет</label>
            <input
              type="text"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="Онлайн (Zoom / веб-класс)"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2 border-t border-slate-100 pt-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isOnline}
                onChange={(e) => setIsOnline(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs font-medium text-slate-700">Онлайн-занятие (Google Meet / Zoom)</span>
            </label>

            {isOnline && (
              <input
                type="url"
                value={onlineUrl}
                onChange={(e) => setOnlineUrl(e.target.value)}
                placeholder="https://meet.google.com/..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            )}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
            >
              <Check className="h-4 w-4" />
              Запланировать
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
