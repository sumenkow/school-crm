'use client';

import React, { useState } from 'react';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  AlertTriangle,
  Bell,
  ShieldCheck,
  UserCheck,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import { FullLessonData, LessonRescheduleInfo } from '@/lib/data/mockData';
import { useRole } from '@/context/RoleContext';
import { cn } from '@/lib/utils';

interface RescheduleLessonModalProps {
  isOpen: boolean;
  onClose: () => void;
  lesson: FullLessonData;
  onReschedule: (info: LessonRescheduleInfo) => void;
}

const PRESET_REASONS = [
  'По просьбе родителей / группы',
  'Болезнь преподавателя',
  'Праздничный день / школьные каникулы',
  'Технические неполадки / смена аудитории',
  'Другая причина',
];

const ROOM_OPTIONS = [
  'Аудитория 204 (Языковая)',
  'Аудитория 102 (Младшие классы)',
  'IT Лаборатория (Компьютерный класс)',
  'Аудитория 101 (Математика)',
  'Онлайн (Google Meet)',
];

export function RescheduleLessonModal({
  isOpen,
  onClose,
  lesson,
  onReschedule,
}: RescheduleLessonModalProps) {
  const { role, userName } = useRole();

  // Next day default or +2 days
  const [newDate, setNewDate] = useState(() => {
    const d = new Date(lesson.date || '2026-09-04');
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  });

  const [newStartTime, setNewStartTime] = useState(lesson.startTime || '18:45');
  const [newEndTime, setNewEndTime] = useState(lesson.endTime || '20:15');
  const [newRoom, setNewRoom] = useState(lesson.room || 'Аудитория 204');
  const [selectedReason, setSelectedReason] = useState(PRESET_REASONS[0]);
  const [customComment, setCustomComment] = useState('');
  const [notifyParents, setNotifyParents] = useState(true);

  if (!isOpen) return null;

  const roleTitle =
    role === 'owner'
      ? 'Владелец школы'
      : role === 'admin'
      ? 'Администратор'
      : 'Преподаватель';

  const authorName = userName || (role === 'teacher' ? lesson.teacherName : 'Елена Менеджер');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const formattedNewDate = new Date(newDate).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const fullReason =
      selectedReason === 'Другая причина'
        ? customComment || 'По решению руководства'
        : customComment
        ? `${selectedReason} (${customComment})`
        : selectedReason;

    const rescheduleInfo: LessonRescheduleInfo = {
      previousDate: lesson.dateFormatted || lesson.date,
      previousTime: `${lesson.startTime} – ${lesson.endTime}`,
      newDate: formattedNewDate,
      newTime: `${newStartTime} – ${newEndTime}`,
      room: newRoom,
      reason: fullReason,
      changedBy: authorName,
      changedRole: roleTitle,
      changedAt: new Date().toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      notifyParents,
    };

    onReschedule(rescheduleInfo);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-200 shadow-xs">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Перенос занятия</h2>
              <p className="text-xs text-slate-500">{lesson.groupName} • {lesson.courseName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Current Lesson Info Banner */}
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 text-xs text-slate-600 space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Текущие параметры урока:</span>
          <div className="flex flex-wrap items-center justify-between gap-2 font-medium text-slate-900">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-blue-600" />
              {lesson.dateFormatted} ({lesson.startTime} – {lesson.endTime})
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              {lesson.room}
            </span>
            <span>Преподаватель: <b>{lesson.teacherName}</b></span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* New Date & Time Pickers */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-4 space-y-3">
            <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-amber-600" />
              Новые дата и время проведения
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <label className="text-[11px] font-semibold text-slate-700">Новая дата</label>
                <input
                  type="date"
                  required
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 font-semibold focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-2xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700">Время начала</label>
                <input
                  type="time"
                  required
                  value={newStartTime}
                  onChange={(e) => setNewStartTime(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 font-semibold focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-2xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700">Время окончания</label>
                <input
                  type="time"
                  required
                  value={newEndTime}
                  onChange={(e) => setNewEndTime(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 font-semibold focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-2xs"
                />
              </div>
            </div>

            {/* Room selection */}
            <div>
              <label className="text-[11px] font-semibold text-slate-700">Аудитория / Локация</label>
              <select
                value={newRoom}
                onChange={(e) => setNewRoom(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-2xs"
              >
                {ROOM_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Reason Section */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700">Причина переноса</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRESET_REASONS.map((reason) => (
                <button
                  type="button"
                  key={reason}
                  onClick={() => setSelectedReason(reason)}
                  className={cn(
                    'text-left rounded-xl p-2.5 text-xs font-medium border transition-all',
                    selectedReason === reason
                      ? 'border-amber-500 bg-amber-50/60 text-amber-950 font-bold shadow-2xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  )}
                >
                  {reason}
                </button>
              ))}
            </div>

            <textarea
              rows={2}
              placeholder="Дополнительный комментарий к причине (будет отражен в таймлайне учеников)..."
              value={customComment}
              onChange={(e) => setCustomComment(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* Role & Notifications Strip */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Инициатор переноса:</span>
              <span className="inline-flex items-center gap-1.5 font-bold text-slate-900">
                <ShieldCheck className="h-4 w-4 text-indigo-600" />
                {authorName} <span className="rounded bg-indigo-100 text-indigo-800 text-[10px] px-1.5 py-0.5">{roleTitle}</span>
              </span>
            </div>

            <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={notifyParents}
                  onChange={(e) => setNotifyParents(e.target.checked)}
                  className="h-4 w-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300"
                />
                <span className="font-semibold text-slate-700 flex items-center gap-1">
                  <Bell className="h-3.5 w-3.5 text-slate-500" />
                  Уведомить родителей и учеников (Telegram / WhatsApp)
                </span>
              </label>
              <span className="text-[10px] text-slate-400">Группа: {lesson.students?.length || 7} чел.</span>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="rounded-xl bg-amber-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-700 transition-colors flex items-center gap-1.5"
            >
              <CheckCircle2 className="h-4 w-4" />
              Подтвердить перенос занятия
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
