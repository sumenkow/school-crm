'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, GraduationCap, Calendar, Users, MapPin, Check, Settings2 } from 'lucide-react';
import { INITIAL_COURSES, INITIAL_TEACHERS, FullGroupData, FullTeacherData } from '@/lib/data/mockData';
import { cn } from '@/lib/utils';
import { useRole } from '@/context/RoleContext';
import { GroupScheduleBuilder, ScheduleBuilderState } from '@/components/groups/GroupScheduleBuilder';
import { generateLessonsForGroupSchedule } from '@/lib/data/lessonStorage';
import { CoursesSettingsModal, CourseSettingItem, deduplicateCourseItems } from '@/components/settings/CoursesSettingsModal';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (newGroup: FullGroupData) => void;
}

interface LoadedCourse {
  id: string;
  name: string;
  subject: string;
  description?: string;
  isActive?: boolean;
  rubLesson: number;
  rubMonth: number;
  eurLesson: number;
  eurMonth: number;
  ageGroup?: string;
  lessonDuration?: string;
  maxStudents?: number;
}

const DEFAULT_COURSES: LoadedCourse[] = [
  { id: 'c1', name: 'Английский язык', subject: 'Иностранные языки', description: 'Кембриджская программа (A1 - C1)', rubLesson: 1050, rubMonth: 7600, eurLesson: 15, eurMonth: 80, isActive: true },
  { id: 'c2', name: 'Робототехника и IT', subject: 'Информатика и IT', description: 'Arduino, Python, конструирование', rubLesson: 1200, rubMonth: 8800, eurLesson: 18, eurMonth: 95, isActive: true },
  { id: 'c3', name: 'Олимпиадная математика', subject: 'Точные науки', description: 'Логика, нестандартные задачи', rubLesson: 1100, rubMonth: 8000, eurLesson: 16, eurMonth: 85, isActive: true },
  { id: 'c4', name: 'Скорочтение и память', subject: 'Развитие интеллекта', description: 'Развитие памяти и внимания', rubLesson: 950, rubMonth: 6500, eurLesson: 14, eurMonth: 70, isActive: true },
];

const TEACHER_ZOOM_LINKS: Record<string, string> = {
  t1: 'https://zoom.us/j/7492049281', // Мария Иванова
  t2: 'https://zoom.us/j/8392019482', // Денис Смирнов
  t3: 'https://zoom.us/j/9182736451', // Ольга Соколова
  t4: 'https://zoom.us/j/8291047261', // Анна Кузнецова
};

export function CreateGroupModal({ isOpen, onClose, onCreated }: CreateGroupModalProps) {
  const { role, isOwner } = useRole();
  const canManageCourses = isOwner || role === 'owner' || role === 'developer';

  const [coursesList, setCoursesList] = useState<LoadedCourse[]>(DEFAULT_COURSES);
  const [courseId, setCourseId] = useState('c1');
  const [isCoursesModalOpen, setIsCoursesModalOpen] = useState(false);

  const [name, setName] = useState('');
  const [level, setLevel] = useState('');
  const [isNameManuallyEdited, setIsNameManuallyEdited] = useState(false);

  const [teachersList, setTeachersList] = useState<FullTeacherData[]>(INITIAL_TEACHERS);
  const [teacherId, setTeacherId] = useState('t1');
  const [capacity, setCapacity] = useState(8);
  const [schedule, setSchedule] = useState('Пн, Чт • 18:45–20:15');
  const [scheduleState, setScheduleState] = useState<ScheduleBuilderState | null>(null);
  const [room, setRoom] = useState('Онлайн (Zoom: https://zoom.us/j/7492049281)');
  const [currency, setCurrency] = useState<'RUB' | 'EUR'>('RUB');
  const [pricePerLesson, setPricePerLesson] = useState('1050');
  const [pricePerMonth, setPricePerMonth] = useState('7600');

  // Compute template name
  const computeGroupName = useCallback((cId: string, lvl: string, sched: string) => {
    const c = coursesList.find((item) => item.id === cId) || coursesList[0] || DEFAULT_COURSES[0];
    const courseName = c?.name || 'Курс';
    const trimmedLevel = lvl.trim();
    return trimmedLevel ? `${courseName} ${trimmedLevel} (${sched})` : `${courseName} (${sched})`;
  }, [coursesList]);

  // Fetch courses from localStorage/Supabase/API
  const fetchCourses = useCallback(async () => {
    // 1. Immediately read from localStorage cache for zero-latency UI
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('crm_courses_v1') : null;
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const mapped: LoadedCourse[] = parsed.map((c: any) => ({
            id: c.id,
            name: c.name,
            subject: c.subject || 'Общий курс',
            rubLesson: Number(String(c.monthlyPrice || '7600').replace(/\D/g, '')) > 0 ? Math.round(Number(String(c.monthlyPrice || '7600').replace(/\D/g, '')) / 8) : 1050,
            rubMonth: Number(String(c.monthlyPrice || '7600').replace(/\D/g, '')) || 7600,
            eurLesson: 15,
            eurMonth: 80,
            ageGroup: c.ageGroup,
            lessonDuration: c.lessonDuration,
            maxStudents: c.maxStudents,
            isActive: c.status === 'active' || c.is_active !== false,
          }));
          setCoursesList(deduplicateCourseItems(mapped));
        }
      }
    } catch {}

    // 2. Sync with server API
    try {
      const res = await fetch('/api/courses');
      if (res.ok) {
        const data = await res.json();
        if (data.courses && Array.isArray(data.courses) && data.courses.length > 0) {
          setCoursesList(deduplicateCourseItems(data.courses));
        }
      }
    } catch (err) {
      console.error('Failed to load courses:', err);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchCourses();
    }
  }, [isOpen, fetchCourses]);

  // Listen for global courses changes with instant state reflection
  useEffect(() => {
    const handleCoursesChanged = (e: any) => {
      if (e?.detail && Array.isArray(e.detail) && e.detail.length > 0) {
        const mapped: LoadedCourse[] = e.detail.map((c: any) => ({
          id: c.id,
          name: c.name,
          subject: c.subject || 'Общий курс',
          rubLesson: 1050,
          rubMonth: Number(String(c.monthlyPrice || '7600').replace(/\D/g, '')) || 7600,
          eurLesson: 15,
          eurMonth: 80,
          ageGroup: c.ageGroup,
          lessonDuration: c.lessonDuration,
          maxStudents: c.maxStudents,
          isActive: c.status === 'active' || c.is_active !== false,
        }));
        setCoursesList(deduplicateCourseItems(mapped));
      }
      fetchCourses();
    };
    window.addEventListener('crm-courses-changed', handleCoursesChanged);
    return () => {
      window.removeEventListener('crm-courses-changed', handleCoursesChanged);
    };
  }, [fetchCourses]);

  // Auto-generate group name (if not manually edited) & sync tariffs
  useEffect(() => {
    const currentCourse = coursesList.find((c) => c.id === courseId) || coursesList[0] || DEFAULT_COURSES[0];

    if (!isNameManuallyEdited) {
      setName(computeGroupName(courseId, level, schedule));
    }

    // Sync prices from tariff
    if (currency === 'EUR') {
      setPricePerLesson(String(currentCourse?.eurLesson ?? 15));
      setPricePerMonth(String(currentCourse?.eurMonth ?? 80));
    } else {
      setPricePerLesson(String(currentCourse?.rubLesson ?? 1050));
      setPricePerMonth(String(currentCourse?.rubMonth ?? 7600));
    }
  }, [courseId, coursesList, level, schedule, currency, isNameManuallyEdited, computeGroupName]);

  // Handle course change
  const handleCourseChange = (newCourseId: string) => {
    setCourseId(newCourseId);
    setName(computeGroupName(newCourseId, level, schedule));
    setIsNameManuallyEdited(false);
  };

  // Handle level change
  const handleLevelChange = (newLevel: string) => {
    setLevel(newLevel);
    setName(computeGroupName(courseId, newLevel, schedule));
    setIsNameManuallyEdited(false);
  };

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

    const course = coursesList.find((c) => c.id === courseId) || DEFAULT_COURSES[0];
    const teacher = teachersList.find((t) => t.id === teacherId) || INITIAL_TEACHERS.find((t) => t.id === teacherId);

    const currencySign = currency === 'EUR' ? '€' : '₽';
    const numLesson = Number(pricePerLesson) || 1050;
    const numMonth = Number(pricePerMonth) || 7600;

    // Single source of truth for start date: from GroupScheduleBuilder
    const finalStartDate = scheduleState?.startDate || new Date().toISOString().slice(0, 10);

    const createdGroupId = `grp_${Date.now()}`;
    const newGroup = {
      id: createdGroupId,
      name: name.trim(),
      level: level.trim() || undefined,
      courseId,
      courseName: course?.name || 'Курс',
      teacherId,
      teacherName: teacher?.name || 'Преподаватель',
      schedule,
      room,
      capacity: Number(capacity),
      status: 'recruiting' as const,
      startDate: finalStartDate,
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
        startDate: finalStartDate,
        horizon: scheduleState.horizon,
        customEndDate: scheduleState.customEndDate,
        students: [],
        topicPrefix: newGroup.courseName,
      });
    }

    onCreated(newGroup);
    onClose();
  };

  const handleCoursesSettingsSave = (updated: CourseSettingItem[]) => {
    if (updated.length > 0) {
      const mapped: LoadedCourse[] = updated.map((c) => ({
        id: c.id,
        name: c.name,
        subject: 'Общий курс',
        rubLesson: 1050,
        rubMonth: Number(String(c.monthlyPrice || '7600').replace(/\D/g, '')) || 7600,
        eurLesson: 15,
        eurMonth: 80,
        ageGroup: c.ageGroup,
        lessonDuration: c.lessonDuration,
        maxStudents: c.maxStudents,
        isActive: c.status === 'active',
      }));
      setCoursesList(mapped);

      const current = mapped.find((m) => m.id === courseId) || mapped[0];
      if (current) {
        setCourseId(current.id);
        if (!isNameManuallyEdited) {
          setName(computeGroupName(current.id, level, schedule));
        }
      }
    }
    fetchCourses();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
        <div className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 p-5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Создание новой группы</h2>
                <p className="text-xs text-slate-500">Курс, преподаватель, уровень и расписание</p>
              </div>
            </div>
            <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 cursor-pointer">
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* ROW 1: Учебный курс / Направление */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">Учебный курс / Направление *</label>
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
                onChange={(e) => handleCourseChange(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
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

            {/* ROW 2: Преподаватель and Уровень / Подуровень */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Преподаватель *</label>
                <select
                  value={teacherId}
                  onChange={(e) => setTeacherId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                >
                  {teachersList.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} ({t.role.split(' ')[0]})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Уровень / Подуровень</label>
                <input
                  type="text"
                  value={level}
                  onChange={(e) => handleLevelChange(e.target.value)}
                  placeholder="Например: A1, B1 Teens, Junior, ОГЭ..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white font-medium text-slate-800"
                />
              </div>
            </div>

            {/* ROW 3: Лимит мест and Формат / Кабинет */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Лимит мест в группе</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Формат / Кабинет (онлайн)</label>
                <input
                  type="text"
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  placeholder="Онлайн (Zoom / веб-класс)"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                />
              </div>
            </div>

            {/* ROW 4: Название группы (разблокировано для прямого ручного ввода) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">Название группы</label>
                <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  ✨ Автогенерация названия (можно изменить вручную)
                </span>
              </div>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setIsNameManuallyEdited(true);
                }}
                placeholder="Название группы..."
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* INTERACTIVE 3-STEP SCHEDULE BUILDER (Holds the single Start Date) */}
            <GroupScheduleBuilder
              initialSchedule={schedule}
              onScheduleChange={(formatted, state) => {
                setSchedule(formatted);
                setScheduleState(state);
                if (!isNameManuallyEdited) {
                  setName(computeGroupName(courseId, level, formatted));
                }
              }}
            />

            {/* Course Pricing Settings - Synced from selected course */}
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
                  <p className="text-[10px] text-slate-500 mt-0.5">Стандартный тариф направления</p>
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
                  <p className="text-[10px] text-slate-500 mt-0.5">Фиксированный абонемент направления</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white shadow-xs hover:bg-blue-700 cursor-pointer"
              >
                <Check className="h-4 w-4" />
                Создать группу
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
              monthlyPrice: `${c.rubMonth || 7600} ₽`,
              lessonDuration: c.lessonDuration || '60 мин',
              maxStudents: c.maxStudents || 8,
              status: c.isActive !== false ? 'active' : 'paused',
              color: 'bg-indigo-600',
            }))}
          onSave={handleCoursesSettingsSave}
        />
      )}
    </>
  );
}
