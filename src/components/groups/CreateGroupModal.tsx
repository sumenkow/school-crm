'use client';

import React, { useState, useEffect } from 'react';
import { X, GraduationCap, Calendar, Users, MapPin, Check } from 'lucide-react';
import { INITIAL_COURSES, INITIAL_TEACHERS, FullGroupData, FullTeacherData } from '@/lib/data/mockData';
import { cn } from '@/lib/utils';
import { GroupScheduleBuilder, ScheduleBuilderState } from '@/components/groups/GroupScheduleBuilder';
import { generateLessonsForGroupSchedule } from '@/lib/data/lessonStorage';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (newGroup: FullGroupData) => void;
}

const TEACHER_ZOOM_LINKS: Record<string, string> = {
  t1: 'https://zoom.us/j/7492049281', // Мария Иванова
  t2: 'https://zoom.us/j/8392019482', // Денис Смирнов
  t3: 'https://zoom.us/j/9182736451', // Ольга Соколова
  t4: 'https://zoom.us/j/8291047261', // Анна Кузнецова
};

const COURSE_TARIFFS: Record<string, { rubLesson: number; rubMonth: number; eurLesson: number; eurMonth: number; level: string }> = {
  c1: { rubLesson: 1050, rubMonth: 7600, eurLesson: 15, eurMonth: 80, level: 'B1' },
  c2: { rubLesson: 1200, rubMonth: 8800, eurLesson: 18, eurMonth: 95, level: 'Junior IT' },
  c3: { rubLesson: 1100, rubMonth: 8000, eurLesson: 16, eurMonth: 85, level: 'Олимпиадный' },
  c4: { rubLesson: 1300, rubMonth: 9500, eurLesson: 19, eurMonth: 100, level: 'A2-B1' },
};

export function CreateGroupModal({ isOpen, onClose, onCreated }: CreateGroupModalProps) {
  const [courseId, setCourseId] = useState('c1');
  const [name, setName] = useState('');
  const [teachersList, setTeachersList] = useState<FullTeacherData[]>(INITIAL_TEACHERS);
  const [teacherId, setTeacherId] = useState('t1');
  const [capacity, setCapacity] = useState(8);
  const [schedule, setSchedule] = useState('Пн, Чт • 18:45–20:15');
  const [scheduleState, setScheduleState] = useState<ScheduleBuilderState | null>(null);
  const [room, setRoom] = useState('Онлайн (Zoom: https://zoom.us/j/7492049281)');
  const [startDate, setStartDate] = useState('2026-09-15');
  const [currency, setCurrency] = useState<'RUB' | 'EUR'>('RUB');
  const [pricePerLesson, setPricePerLesson] = useState('1050');
  const [pricePerMonth, setPricePerMonth] = useState('7600');

  // Auto-generate group name & sync tariffs and Zoom link
  useEffect(() => {
    const course = INITIAL_COURSES.find((c) => c.id === courseId);
    const tariff = COURSE_TARIFFS[courseId] || { level: 'Базовый', rubLesson: 1050, rubMonth: 7600, eurLesson: 15, eurMonth: 80 };
    
    // Formula: [Название курса] + [Уровень] + ([Расписание])
    const generated = `${course?.name || 'Курс'} ${tariff.level} (${schedule})`;
    setName(generated);

    // Sync prices from tariff
    if (currency === 'EUR') {
      setPricePerLesson(String(tariff.eurLesson));
      setPricePerMonth(String(tariff.eurMonth));
    } else {
      setPricePerLesson(String(tariff.rubLesson));
      setPricePerMonth(String(tariff.rubMonth));
    }
  }, [courseId, schedule, currency]);

  // Auto-substitute teacher Zoom link
  useEffect(() => {
    const zoomUrl = TEACHER_ZOOM_LINKS[teacherId] || `https://zoom.us/j/school-room-${teacherId}`;
    setRoom(`Онлайн (Zoom: ${zoomUrl})`);
  }, [teacherId]);

  useEffect(() => {
    async function loadTeachers() {
      try {
        const res = await fetch('/api/teachers');
        if (res.ok) {
          const data = await res.json();
          if (data.teachers && Array.isArray(data.teachers) && data.teachers.length > 0) {
            setTeachersList(data.teachers);
            if (!teacherId || teacherId === 't1') {
              setTeacherId(data.teachers[0].id);
            }
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

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Пожалуйста, укажите название группы');
      return;
    }

    const course = INITIAL_COURSES.find((c) => c.id === courseId);
    const teacher = teachersList.find((t) => t.id === teacherId) || INITIAL_TEACHERS.find((t) => t.id === teacherId);

    const currencySign = currency === 'EUR' ? '€' : '₽';
    const numLesson = Number(pricePerLesson) || 1050;
    const numMonth = Number(pricePerMonth) || 7600;

    const createdGroupId = `grp_${Date.now()}`;
    const newGroup = {
      id: createdGroupId,
      name,
      courseId,
      courseName: course?.name || 'Курс',
      teacherId,
      teacherName: teacher?.name || 'Преподаватель',
      schedule,
      room,
      capacity: Number(capacity),
      status: 'recruiting' as const,
      startDate,
      students: [],
      recentLessons: [],
      pricing: {
        pricePerLesson: numLesson,
        pricePerLessonFormatted: `${numLesson.toLocaleString('ru-RU')} ${currencySign}`,
        pricePerMonth: numMonth,
        pricePerMonthFormatted: `${numMonth.toLocaleString('ru-RU')} ${currencySign} / месяц`,
        currency,
      },
    };

    if (scheduleState && scheduleState.generateLessons && scheduleState.daysOfWeek.length > 0) {
      generateLessonsForGroupSchedule({
        groupId: createdGroupId,
        groupName: newGroup.name,
        courseName: newGroup.courseName,
        teacherId: newGroup.teacherId,
        teacherName: newGroup.teacherName,
        room: newGroup.room,
        daysOfWeek: scheduleState.daysOfWeek,
        startTime: scheduleState.startTime,
        endTime: scheduleState.endTime,
        startDate: scheduleState.startDate,
        horizon: scheduleState.horizon,
        customEndDate: scheduleState.customEndDate,
        students: [],
        topicPrefix: newGroup.courseName,
      });
    }

    onCreated(newGroup);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Создание новой группы</h2>
              <p className="text-xs text-slate-500">Курс, преподаватель и шаблон расписания</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-700">Учебный курс / Направление *</label>
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {INITIAL_COURSES.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.subject})</option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">Название группы (автогенерация)</label>
              <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                🔒 Формула: [Курс] + [Уровень] + ([Расписание])
              </span>
            </div>
            <input
              type="text"
              readOnly
              value={name}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-100/80 px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none cursor-not-allowed"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-700">Преподаватель *</label>
              <select
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {teachersList.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} ({t.role.split(' ')[0]})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">Лимит мест в группе</label>
              <input
                type="number"
                min="1"
                max="30"
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* INTERACTIVE 3-STEP SCHEDULE BUILDER */}
          <GroupScheduleBuilder
            initialSchedule={schedule}
            onScheduleChange={(formatted, state) => {
              setSchedule(formatted);
              setScheduleState(state);
            }}
          />

          <div>
            <label className="text-xs font-medium text-slate-700">Формат / Кабинет (онлайн)</label>
            <input
              type="text"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="Онлайн (Zoom / веб-класс)"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Course Pricing Settings */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">
                Тариф и стоимость курса
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrency('RUB')}
                  className={cn(
                    'rounded-md px-2 py-0.5 text-[11px] font-bold transition-colors cursor-pointer',
                    currency === 'RUB'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-white text-slate-600 border border-slate-200'
                  )}
                >
                  ₽ Рубли
                </button>
                <button
                  type="button"
                  onClick={() => setCurrency('EUR')}
                  className={cn(
                    'rounded-md px-2 py-0.5 text-[11px] font-bold transition-colors cursor-pointer',
                    currency === 'EUR'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-white text-slate-600 border border-slate-200'
                  )}
                >
                  € Евро
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-semibold text-slate-700">
                    1 занятие ({currency === 'EUR' ? '€' : '₽'})
                  </label>
                  <span className="text-[9px] font-bold text-slate-500">🔒 Тариф</span>
                </div>
                <input
                  type="number"
                  readOnly
                  value={pricePerLesson}
                  className="w-full rounded-lg border border-slate-200 bg-slate-100/80 px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none cursor-not-allowed"
                />
                <p className="text-[10px] text-slate-500 mt-0.5">Привязано к тарифу курса</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-semibold text-slate-700">
                    Абонемент ({currency === 'EUR' ? '€' : '₽'})
                  </label>
                  <span className="text-[9px] font-bold text-slate-500">🔒 Тариф</span>
                </div>
                <input
                  type="number"
                  readOnly
                  value={pricePerMonth}
                  className="w-full rounded-lg border border-slate-200 bg-slate-100/80 px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none cursor-not-allowed"
                />
                <p className="text-[10px] text-slate-500 mt-0.5">Фиксированный тариф направления</p>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700">Дата старта занятий</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white shadow-xs hover:bg-blue-700"
            >
              <Check className="h-4 w-4" />
              Создать группу
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
