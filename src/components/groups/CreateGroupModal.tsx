'use client';

import React, { useState, useEffect } from 'react';
import { X, GraduationCap, Calendar, Users, MapPin, Check } from 'lucide-react';
import { INITIAL_COURSES, INITIAL_TEACHERS, FullGroupData, FullTeacherData } from '@/lib/data/mockData';
import { cn } from '@/lib/utils';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (newGroup: FullGroupData) => void;
}

export function CreateGroupModal({ isOpen, onClose, onCreated }: CreateGroupModalProps) {
  const [courseId, setCourseId] = useState('c1');
  const [name, setName] = useState('');
  const [teachersList, setTeachersList] = useState<FullTeacherData[]>(INITIAL_TEACHERS);
  const [teacherId, setTeacherId] = useState('t1');
  const [capacity, setCapacity] = useState(8);
  const [schedule, setSchedule] = useState('Пн, Чт • 17:00–18:30');
  const [room, setRoom] = useState('Онлайн (Zoom)');
  const [startDate, setStartDate] = useState('2026-09-15');
  const [currency, setCurrency] = useState<'RUB' | 'EUR'>('RUB');
  const [pricePerLesson, setPricePerLesson] = useState('1050');
  const [pricePerMonth, setPricePerMonth] = useState('7600');

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

    const newGroup = {
      id: `grp_${Date.now()}`,
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

    onCreated(newGroup);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-xl">
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
            <label className="text-xs font-medium text-slate-700">Название группы *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например: English B1 Teens (Пн/Чт 17:00)"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-700">Расписание занятий</label>
              <input
                type="text"
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
                placeholder="Пн, Чт • 17:00–18:30"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
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
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Стоимость 1 онлайн-занятия ({currency === 'EUR' ? '€' : '₽'})
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  value={pricePerLesson}
                  onChange={(e) => setPricePerLesson(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder={currency === 'EUR' ? '15' : '1050'}
                  required
                />
                <p className="text-[10px] text-slate-500 mt-0.5">Для списаний с депозита</p>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Абонемент в месяц ({currency === 'EUR' ? '€' : '₽'})
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  value={pricePerMonth}
                  onChange={(e) => setPricePerMonth(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder={currency === 'EUR' ? '85' : '7600'}
                  required
                />
                <p className="text-[10px] text-slate-500 mt-0.5">Фиксированный тариф</p>
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
