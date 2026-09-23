'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, GraduationCap, Calendar, Users, MapPin, Check, Settings2 } from 'lucide-react';
import { INITIAL_COURSES, INITIAL_TEACHERS, FullGroupData, FullTeacherData } from '@/lib/data/mockData';
import { cn } from '@/lib/utils';
import { useRole } from '@/context/RoleContext';
import { GroupScheduleBuilder, ScheduleBuilderState } from '@/components/groups/GroupScheduleBuilder';
import { generateLessonsForGroupSchedule } from '@/lib/data/lessonStorage';
import { CoursesSettingsModal, CourseSettingItem } from '@/components/settings/CoursesSettingsModal';

interface EditGroupModalProps {
  group: FullGroupData | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (updated: FullGroupData) => void;
}

export function EditGroupModal({ group, isOpen, onClose, onSaved }: EditGroupModalProps) {
  const { role, isOwner } = useRole();
  const canManageCourses = isOwner || role === 'owner' || role === 'developer';

  const [coursesList, setCoursesList] = useState<any[]>(INITIAL_COURSES);
  const [courseId, setCourseId] = useState(group?.courseId || 'c1');
  const [isCoursesModalOpen, setIsCoursesModalOpen] = useState(false);
  const [name, setName] = useState(group?.name || '');
  const [teachersList, setTeachersList] = useState<FullTeacherData[]>(INITIAL_TEACHERS);
  const [teacherId, setTeacherId] = useState(group?.teacherId || 't1');
  const [capacity, setCapacity] = useState(group?.capacity || 8);
  const [level, setLevel] = useState(group?.level || '');
  const [schedule, setSchedule] = useState(group?.schedule || 'Пн, Чт • 17:00–18:30');
  const [scheduleState, setScheduleState] = useState<ScheduleBuilderState | null>(null);
  const [room, setRoom] = useState(group?.room || 'Онлайн (Zoom)');
  const [status, setStatus] = useState<FullGroupData['status']>(group?.status || 'active');

  const fetchCourses = useCallback(async () => {
    // 1. Immediately read from localStorage cache for instant UI response
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('crm_courses_v1') : null;
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCoursesList(parsed);
        }
      }
    } catch {}

    // 2. Fetch from server
    try {
      const res = await fetch('/api/courses');
      if (res.ok) {
        const data = await res.json();
        if (data.courses && Array.isArray(data.courses) && data.courses.length > 0) {
          setCoursesList(data.courses);
        }
      }
    } catch (err) {
      console.error('Failed to load courses in EditGroupModal:', err);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchCourses();
    }
  }, [isOpen, fetchCourses]);

  // Listen for global courses changes
  useEffect(() => {
    const handleCoursesChanged = (e: any) => {
      if (e?.detail && Array.isArray(e.detail) && e.detail.length > 0) {
        setCoursesList(e.detail);
      }
      fetchCourses();
    };
    window.addEventListener('crm-courses-changed', handleCoursesChanged);
    return () => {
      window.removeEventListener('crm-courses-changed', handleCoursesChanged);
    };
  }, [fetchCourses]);

  useEffect(() => {
    if (group) {
      setCourseId(group.courseId || 'c1');
      setName(group.name || '');
      setTeacherId(group.teacherId || 't1');
      setLevel(group.level || '');
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
      level: level.trim() || undefined,
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
    <>
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
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                Направление / Курс
              </label>
              <button
                type="button"
                onClick={() => setIsCoursesModalOpen(true)}
                className="text-xs text-blue-600 hover:text-blue-800 hover:underline cursor-pointer flex items-center gap-1 font-medium"
              >
                <Settings2 className="h-3 w-3" />
                <span>Настроить направления и тарифы</span>
              </button>
            </div>
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {coursesList
                .filter(Boolean)
                .filter((c) => Boolean(c && c.name && c.name.trim()))
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
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
                Уровень / Программа
              </label>
              <input
                type="text"
                placeholder="Например: A1, B1 Teens, Junior, ОГЭ..."
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
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
          </div>

          {/* Interactive 3-step Schedule Builder */}
          <GroupScheduleBuilder
            initialSchedule={schedule}
            onScheduleChange={(formatted, state) => {
              setSchedule(formatted);
              setScheduleState(state);
            }}
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Статус
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="active">Активна</option>
              <option value="recruiting">Идет набор</option>
              <option value="archived">Архив</option>
            </select>
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

    {/* MODAL FOR MANAGING COURSES (Owner Only) */}
    {isCoursesModalOpen && (
      <CoursesSettingsModal
        isOpen={isCoursesModalOpen}
        onClose={() => setIsCoursesModalOpen(false)}
        courses={coursesList
          .filter(Boolean)
          .filter((c) => Boolean(c && c.id && c.name && c.name.trim()))
          .map((c) => ({
            id: c.id,
            name: c.name,
            ageGroup: c.ageGroup || '7-15 лет',
            monthlyPrice: c.monthlyPrice || `${c.rubMonth || 7600} ₽`,
            lessonDuration: c.lessonDuration || '60 мин',
            maxStudents: c.maxStudents || 8,
            status: c.isActive !== false ? 'active' : 'paused',
            color: 'bg-indigo-600',
          }))}
        onSave={(updated) => {
          if (updated && updated.length > 0) {
            setCoursesList(updated);
          }
          fetchCourses();
        }}
      />
    )}
  </>
  );
}
