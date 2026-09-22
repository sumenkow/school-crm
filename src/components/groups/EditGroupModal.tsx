'use client';

import React, { useState, useEffect } from 'react';
import { X, GraduationCap, Calendar, Users, MapPin, Check } from 'lucide-react';
import { INITIAL_COURSES, INITIAL_TEACHERS, FullGroupData, FullTeacherData } from '@/lib/data/mockData';
import { cn } from '@/lib/utils';
import { GroupScheduleBuilder, ScheduleBuilderState } from '@/components/groups/GroupScheduleBuilder';
import { generateLessonsForGroupSchedule } from '@/lib/data/lessonStorage';

interface EditGroupModalProps {
  group: FullGroupData | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (updated: FullGroupData) => void;
}

export function EditGroupModal({ group, isOpen, onClose, onSaved }: EditGroupModalProps) {
  const [courseId, setCourseId] = useState(group?.courseId || 'c1');
  const [name, setName] = useState(group?.name || '');
  const [teachersList, setTeachersList] = useState<FullTeacherData[]>(INITIAL_TEACHERS);
  const [teacherId, setTeacherId] = useState(group?.teacherId || 't1');
  const [capacity, setCapacity] = useState(group?.capacity || 8);
  const [schedule, setSchedule] = useState(group?.schedule || 'Пн, Чт • 17:00–18:30');
  const [scheduleState, setScheduleState] = useState<ScheduleBuilderState | null>(null);
  const [room, setRoom] = useState(group?.room || 'Онлайн (Zoom)');
  const [status, setStatus] = useState<FullGroupData['status']>(group?.status || 'active');

  useEffect(() => {
    if (group) {
      setCourseId(group.courseId || 'c1');
      setName(group.name || '');
      setTeacherId(group.teacherId || 't1');
      setCapacity(group.capacity || 8);
      setSchedule(group.schedule || 'Пн, Чт • 17:00–18:30');
      setRoom(group.room || 'Онлайн (Zoom)');
      setStatus(group.status || 'active');
    }
  }, [group]);

  useEffect(() => {
    async function loadTeachers() {
      try {
        const res = await fetch('/api/teachers');
        if (res.ok) {
          const data = await res.json();
          if (data.teachers && Array.isArray(data.teachers) && data.teachers.length > 0) {
            setTeachersList(data.teachers);
          }
        }
      } catch (err) {
        console.error('Failed to load teachers list:', err);
      }
    }
    if (isOpen) {
      loadTeachers();
    }
  }, [isOpen]);

  if (!isOpen || !group) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Пожалуйста, укажите название группы');
      return;
    }

    const course = INITIAL_COURSES.find((c) => c.id === courseId);
    const teacher = teachersList.find((t) => t.id === teacherId) || INITIAL_TEACHERS.find((t) => t.id === teacherId);

    const updated: FullGroupData = {
      ...group,
      name: name.trim(),
      courseId,
      courseName: course?.name || group.courseName,
      teacherId,
      teacherName: teacher?.name || group.teacherName,
      schedule,
      room,
      capacity: Number(capacity),
      status,
    };

    if (scheduleState && scheduleState.generateLessons && scheduleState.daysOfWeek.length > 0) {
      generateLessonsForGroupSchedule({
        groupId: updated.id,
        groupName: updated.name,
        courseName: updated.courseName,
        teacherId: updated.teacherId,
        teacherName: updated.teacherName,
        room: updated.room,
        daysOfWeek: scheduleState.daysOfWeek,
        startTime: scheduleState.startTime,
        endTime: scheduleState.endTime,
        startDate: scheduleState.startDate,
        horizon: scheduleState.horizon,
        customEndDate: scheduleState.customEndDate,
        students: updated.students || [],
        topicPrefix: updated.courseName,
      });
    }

    onSaved(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Редактировать группу</h3>
              <p className="text-xs text-slate-500">{group.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Направление / Курс
            </label>
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {INITIAL_COURSES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.description ? `(${c.description})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Название группы *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Преподаватель
              </label>
              <select
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {teachersList.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Вместимость (чел)
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Interactive 3-step Schedule Builder */}
          <GroupScheduleBuilder
            initialSchedule={schedule}
            onScheduleChange={(formatted, state) => {
              setSchedule(formatted);
              setScheduleState(state);
            }}
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Формат / Аудитория
              </label>
              <input
                type="text"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Статус
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="active">Идут занятия (активна)</option>
                <option value="recruiting">Идет набор</option>
                <option value="paused">Приостановлена</option>
                <option value="archived">Архив</option>
              </select>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
            >
              Сохранить изменения
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
