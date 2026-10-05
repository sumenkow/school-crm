'use client';

import React, { useState, useEffect, useId, useMemo } from 'react';
import Link from 'next/link';
import {
  X,
  Users,
  User,
  Plus,
  Trash2,
  Check,
  Sparkles,
  HelpCircle,
  Clock,
  Palette,
  BookOpen,
  Calendar,
  Layers,
  ExternalLink,
  AlertCircle,
  Globe,
  BarChart3,
  Archive,
} from 'lucide-react';
import {
  CourseDirection,
  CourseFormat,
  CourseStatus,
  CourseSubject,
  CourseTariff,
  calculateLessonPrice,
  saveCourse,
  deleteCourse,
} from '@/lib/data/courseStorage';
import { getStoredGroups } from '@/lib/data/groupStorage';
import { FullGroupData } from '@/lib/data/mockData';
import { useToast } from '@/context/ToastContext';

interface CourseDirectionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  direction?: CourseDirection | null;
  onSaved?: (saved: CourseDirection) => void;
}

export type DrawerTabId = 'main' | 'tariffs' | 'trial' | 'groups';

export const DRAWER_TABS = [
  { id: 'main' as DrawerTabId, label: 'Основное' },
  { id: 'tariffs' as DrawerTabId, label: 'Тарифы' },
  { id: 'trial' as DrawerTabId, label: 'Пробное занятие' },
  { id: 'groups' as DrawerTabId, label: 'Группы' },
];

const SUBJECT_OPTIONS: CourseSubject[] = [
  'Иностранные языки',
  'Информатика и IT',
  'Точные науки',
  'Развитие интеллекта',
];

export const DURATION_PRESETS = [
  { label: '45 минут', minutes: 45 },
  { label: '60 минут', minutes: 60 },
  { label: '90 минут', minutes: 90 },
  { label: '120 минут', minutes: 120 },
];

const AGE_PRESETS = [
  '5–7 лет',
  '6–9 лет',
  '7–11 лет',
  '10–15 лет',
  '12+ лет',
  '14+ лет',
  'Любой возраст',
];

const COLOR_PRESETS = [
  { name: 'Синий', hex: '#3b82f6' },
  { name: 'Индиго', hex: '#4f46e5' },
  { name: 'Изумрудный', hex: '#10b981' },
  { name: 'Бирюзовый', hex: '#0d9488' },
  { name: 'Янтарный', hex: '#f59e0b' },
  { name: 'Оранжевый', hex: '#ea580c' },
  { name: 'Фиолетовый', hex: '#8b5cf6' },
  { name: 'Серый', hex: '#64748b' },
];

export function CourseDirectionDrawer({
  isOpen,
  onClose,
  direction,
  onSaved,
}: CourseDirectionDrawerProps) {
  const { success, error: toastError } = useToast();
  const titleId = useId();

  // Active Tab state: 'main' | 'tariffs' | 'trial' | 'groups'
  const [activeTab, setActiveTab] = useState<DrawerTabId>('main');

  // Form State
  const [name, setName] = useState('');
  const [subject, setSubject] = useState<CourseSubject>('Иностранные языки');
  const [description, setDescription] = useState('');
  const [format, setFormat] = useState<CourseFormat>('group');
  const [ageGroup, setAgeGroup] = useState('14+ лет');
  const [lessonDurationMinutes, setLessonDurationMinutes] = useState(90);
  const [capacity, setCapacity] = useState(8);
  const [isTrialAvailable, setIsTrialAvailable] = useState(true);
  const [status, setStatus] = useState<CourseStatus>('active');
  const [color, setColor] = useState('#3b82f6');
  const [tariffs, setTariffs] = useState<CourseTariff[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Additional Checkbox options
  const [showOnWebsite, setShowOnWebsite] = useState(true);
  const [useInCalendar, setUseInCalendar] = useState(true);
  const [includeInAnalytics, setIncludeInAnalytics] = useState(true);
  const [isArchived, setIsArchived] = useState(false);

  // Sync state when direction changes or drawer opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab('main');
      if (direction) {
        setName(direction.name || '');
        setSubject(direction.subject || 'Иностранные языки');
        setDescription(direction.description || '');
        setFormat(direction.format || 'group');
        setAgeGroup(direction.ageGroup || '14+ лет');
        setLessonDurationMinutes(direction.lessonDurationMinutes || 90);
        setCapacity(direction.format === 'individual' ? 1 : direction.capacity || 8);
        setIsTrialAvailable(direction.isTrialAvailable !== false);
        setStatus(direction.status || 'active');
        setIsArchived(direction.status === 'archived');
        setColor(direction.color || (direction.format === 'individual' ? '#4f46e5' : '#3b82f6'));
        const rawDir = direction as any;
        setShowOnWebsite(rawDir.showOnWebsite !== false);
        setUseInCalendar(rawDir.useInCalendar !== false);
        setIncludeInAnalytics(rawDir.includeInAnalytics !== false);
        setTariffs(
          direction.tariffs && direction.tariffs.length > 0
            ? direction.tariffs.map((t) => ({ ...t }))
            : [
                { id: 't1', lessonsCount: 4, packagePrice: 70, status: 'active', name: '4 занятия' },
                { id: 't2', lessonsCount: 8, packagePrice: 130, status: 'active', name: '8 занятий' },
                { id: 't3', lessonsCount: 16, packagePrice: 240, status: 'active', name: '16 занятий' },
              ]
        );
      } else {
        // Defaults for new direction
        setName('');
        setSubject('Иностранные языки');
        setDescription('');
        setFormat('group');
        setAgeGroup('14+ лет');
        setLessonDurationMinutes(90);
        setCapacity(8);
        setIsTrialAvailable(true);
        setStatus('active');
        setIsArchived(false);
        setColor('#3b82f6');
        setShowOnWebsite(true);
        setUseInCalendar(true);
        setIncludeInAnalytics(true);
        setTariffs([
          { id: 't1', lessonsCount: 4, packagePrice: 80, status: 'active', name: '4 занятия' },
          { id: 't2', lessonsCount: 8, packagePrice: 150, status: 'active', name: '8 занятий' },
          { id: 't3', lessonsCount: 16, packagePrice: 280, status: 'active', name: '16 занятий' },
        ]);
      }
    }
  }, [isOpen, direction]);

  // Synchronize isArchived checkbox with status state
  const handleArchiveCheckboxChange = (checked: boolean) => {
    setIsArchived(checked);
    setStatus(checked ? 'archived' : 'active');
  };

  // Format change logic with capacity guard
  const handleFormatChange = (newFormat: CourseFormat) => {
    setFormat(newFormat);
    if (newFormat === 'individual') {
      setCapacity(1);
      if (color === '#3b82f6') setColor('#4f46e5');
    } else {
      if (capacity <= 1) setCapacity(8);
      if (color === '#4f46e5') setColor('#3b82f6');
    }
  };

  // Linked groups query from groupStorage
  const linkedGroups = useMemo<FullGroupData[]>(() => {
    if (!isOpen) return [];
    try {
      const allGroups = getStoredGroups();
      if (!direction) {
        // For new direction before save, match by current typed name if any
        if (!name.trim()) return [];
        const cleanName = name.trim().toLowerCase();
        return allGroups.filter(
          (g) =>
            g.courseName?.toLowerCase().includes(cleanName) ||
            cleanName.includes(g.courseName?.toLowerCase() || '')
        );
      }

      const dirId = direction.id.toLowerCase();
      const dirName = direction.name.toLowerCase();

      return allGroups.filter((g) => {
        // Direct ID match
        if (g.courseId && g.courseId.toLowerCase() === dirId) return true;

        // Specific canonical direction mapping
        if (dirId === 'c-lang-01' || dirId === 'c-lang-02' || dirId === 'c-lang-03') {
          if (
            g.courseId === 'c1' ||
            g.courseName?.toLowerCase().includes('английский') ||
            g.name?.toLowerCase().includes('english')
          ) {
            return true;
          }
        }
        if (dirId === 'c-lang-04' || dirName.includes('немецк')) {
          if (
            g.courseName?.toLowerCase().includes('немецк') ||
            g.name?.toLowerCase().includes('deutsch') ||
            g.name?.toLowerCase().includes('немецк')
          ) {
            return true;
          }
        }
        if (dirId === 'c-it-01' || dirId === 'c-it-02' || dirId === 'c-it-03') {
          if (
            g.courseId === 'c2' ||
            g.courseName?.toLowerCase().includes('робототехник') ||
            g.name?.toLowerCase().includes('robotics')
          ) {
            return true;
          }
        }
        if (dirId === 'c-sci-01' || dirId === 'c-sci-02' || dirId === 'c-sci-03') {
          if (
            g.courseId === 'c3' ||
            g.courseName?.toLowerCase().includes('математик') ||
            g.name?.toLowerCase().includes('math')
          ) {
            return true;
          }
        }

        // Fuzzy match by courseName or group name
        const groupCourseName = (g.courseName || '').toLowerCase();
        const groupName = (g.name || '').toLowerCase();
        return (
          groupCourseName.includes(dirName) ||
          dirName.includes(groupCourseName) ||
          groupName.includes(dirName) ||
          dirName.includes(groupName)
        );
      });
    } catch (e) {
      console.warn('Failed to load linked groups:', e);
      return [];
    }
  }, [isOpen, direction, name]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Tariffs handlers
  const handleAddTariff = () => {
    const defaultCounts = [4, 8, 16, 24, 32];
    const existingCounts = tariffs.map((t) => t.lessonsCount);
    const nextCount =
      defaultCounts.find((c) => !existingCounts.includes(c)) || (tariffs.length + 1) * 8;
    const basePricePerLesson =
      tariffs.length > 0 ? tariffs[0].packagePrice / tariffs[0].lessonsCount : 18;
    const estimatedPrice = Math.round(nextCount * basePricePerLesson * 0.95);

    const newTariff: CourseTariff = {
      id: `t_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      lessonsCount: nextCount,
      packagePrice: estimatedPrice > 0 ? estimatedPrice : 120,
      status: 'active',
      name: `${nextCount} занятий`,
    };

    setTariffs((prev) => [...prev, newTariff]);
  };

  const handleUpdateTariff = (index: number, field: keyof CourseTariff, value: any) => {
    setTariffs((prev) =>
      prev.map((t, idx) => {
        if (idx !== index) return t;
        const updated = { ...t, [field]: value };
        if (field === 'lessonsCount') {
          updated.name = `${value} занятий`;
        }
        return updated;
      })
    );
  };

  const handleDeleteTariff = (index: number) => {
    if (tariffs.length <= 1) {
      toastError('У направления должен быть хотя бы один тарифный пакет');
      return;
    }
    setTariffs((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleDeleteDirection = () => {
    if (!direction) return;

    if (
      confirm(
        `Вы уверены, что хотите удалить направление «${direction.name}»?\n\nВнимание: если к курсу привязаны группы, рекомендуется перевести его в архив вместо удаления.`
      )
    ) {
      const ok = deleteCourse(direction.id);
      if (ok) {
        success(`Направление «${direction.name}» удалено`);
        onClose();
      } else {
        toastError('Не удалось удалить направление');
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toastError('Укажите название учебного направления');
      setActiveTab('main');
      return;
    }

    if (tariffs.length === 0) {
      toastError('Добавьте хотя бы один тарифный пакет');
      setActiveTab('tariffs');
      return;
    }

    setIsSubmitting(true);
    try {
      const savedDirection = saveCourse({
        id: direction?.id,
        name: name.trim(),
        subject,
        description: description.trim(),
        format,
        ageGroup: ageGroup.trim() || '14+ лет',
        lessonDuration: `${lessonDurationMinutes} минут`,
        lessonDurationMinutes,
        capacity: format === 'individual' ? 1 : Math.max(1, capacity),
        isTrialAvailable,
        status: isArchived ? 'archived' : status,
        color,
        tariffs: tariffs.map((t) => ({
          ...t,
          lessonsCount: Number(t.lessonsCount) || 8,
          packagePrice: Number(t.packagePrice) || 100,
          status: t.status || 'active',
        })),
      });

      success(direction ? 'Направление успешно обновлено' : 'Новое направление успешно создано');
      onSaved?.(savedDirection);
      onClose();
    } catch (err) {
      console.error('Error saving course direction:', err);
      toastError('Ошибка при сохранении направления');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 overflow-hidden"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity duration-200"
      />

      {/* Drawer Slide-over Panel */}
      <div className="fixed inset-y-0 right-0 max-w-2xl w-full bg-white shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
        {/* 1. Header: Название направления + Status Badge + ✕ */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-2xs"
              style={{ backgroundColor: color }}
            >
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 id={titleId} className="text-base font-bold text-slate-900 truncate">
                  {name.trim() || (direction ? direction.name : 'Новое направление')}
                </h2>
                {status === 'active' && !isArchived ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    🟢 Активен
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200/80">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    🔴 Неактивен
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 truncate mt-0.5">
                {subject} • {format === 'individual' ? 'Индивидуально' : `Группа (${capacity} уч.)`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer shrink-0"
            aria-label="✕ Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. 4-Tab Navigation Header */}
        <div className="px-6 border-b border-slate-200 bg-slate-50/60 shrink-0">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
            {DRAWER_TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              let badge: string | null = null;
              if (tab.id === 'tariffs') badge = `${tariffs.length}`;
              if (tab.id === 'groups') badge = `${linkedGroups.length}`;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-3 px-3.5 border-b-2 text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                  }`}
                >
                  <span>{tab.label}</span>
                  {badge !== null && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                        isActive
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Drawer Body (Scrollable with 4 Tabs) */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: Основное */}
          {activeTab === 'main' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Format Selector: Group vs Individual with Capacity Guard */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Формат обучения *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleFormatChange('group')}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      format === 'group'
                        ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600/10'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg ${
                        format === 'group'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">Группа</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Обучение в мини-группе от 2 до 8 учеников
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleFormatChange('individual')}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      format === 'individual'
                        ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600/10'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg ${
                        format === 'individual'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">Индивидуально</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Формат 1-on-1, вместимость отключена (—)
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Name & Subject */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Название направления *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Например: Немецкий язык (A1–B1)"
                    className="w-full text-sm font-medium rounded-xl border border-slate-200 px-3.5 py-2.5 focus:border-indigo-500 focus:outline-hidden bg-slate-50/40 focus:bg-white transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Образовательное направление *
                  </label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value as CourseSubject)}
                    className="w-full text-xs font-medium rounded-xl border border-slate-200 px-3 py-2.5 focus:border-indigo-500 focus:outline-hidden bg-white cursor-pointer"
                  >
                    {SUBJECT_OPTIONS.map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Возраст учеников
                  </label>
                  <input
                    type="text"
                    value={ageGroup}
                    onChange={(e) => setAgeGroup(e.target.value)}
                    placeholder="Например: 14+ лет"
                    className="w-full text-xs font-medium rounded-xl border border-slate-200 px-3 py-2.5 focus:border-indigo-500 focus:outline-hidden bg-slate-50/40 focus:bg-white"
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {AGE_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setAgeGroup(preset)}
                        className={`text-[10px] px-1.5 py-0.5 rounded-md transition-colors cursor-pointer ${
                          ageGroup === preset
                            ? 'bg-indigo-600 text-white font-bold'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Описание направления
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ключевые цели обучения, уровень и программа подготовки..."
                  className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:border-indigo-500 focus:outline-hidden bg-slate-50/40 focus:bg-white resize-none"
                />
              </div>

              {/* Parameters row: Duration, Capacity & Color */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50/80 border border-slate-200/80">
                {/* Duration */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Длительность
                  </label>
                  <select
                    value={lessonDurationMinutes}
                    onChange={(e) => setLessonDurationMinutes(Number(e.target.value))}
                    className="w-full text-xs font-medium rounded-xl border border-slate-200 px-2.5 py-2 focus:border-indigo-500 focus:outline-hidden bg-white cursor-pointer"
                  >
                    {DURATION_PRESETS.map((d) => (
                      <option key={d.minutes} value={d.minutes}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Capacity */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Максимальная вместимость</span>
                    {format === 'individual' && (
                      <span className="text-[10px] text-indigo-600 font-bold">1-on-1</span>
                    )}
                  </label>
                  {format === 'individual' ? (
                    <div className="relative">
                      <input
                        type="text"
                        disabled
                        value="—"
                        className="w-full text-xs font-bold text-slate-400 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 cursor-not-allowed select-none text-center"
                      />
                      <span className="text-[10px] text-slate-400 block mt-1">
                        Для индивидуального формата
                      </span>
                    </div>
                  ) : (
                    <div>
                      <div className="relative flex items-center">
                        <input
                          type="number"
                          min={2}
                          max={30}
                          value={capacity}
                          onChange={(e) =>
                            setCapacity(Math.max(2, parseInt(e.target.value) || 8))
                          }
                          className="w-full text-xs font-bold text-slate-900 rounded-xl border border-slate-200 bg-white px-3 py-2 focus:border-indigo-500 focus:outline-hidden text-center"
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 block mt-1">
                        Обычно 8 учеников
                      </span>
                    </div>
                  )}
                </div>

                {/* Color */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-slate-400" />
                    Цветовой маркер
                  </label>
                  <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                    {COLOR_PRESETS.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setColor(c.hex)}
                        style={{ backgroundColor: c.hex }}
                        className={`w-5 h-5 rounded-full transition-transform cursor-pointer ${
                          color === c.hex
                            ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110'
                            : 'hover:scale-105'
                        }`}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Additional Checkbox Options */}
              <div className="space-y-3 p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block mb-1">
                  Дополнительные параметры
                </span>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showOnWebsite}
                    onChange={(e) => setShowOnWebsite(e.target.checked)}
                    className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-medium text-slate-800">
                      Показывать направление при записи на сайте
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Доступно клиентам в публичной форме онлайн-записи
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useInCalendar}
                    onChange={(e) => setUseInCalendar(e.target.checked)}
                    className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-medium text-slate-800">
                      Использовать в календаре
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Разрешить планирование расписания и сетки занятий
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeInAnalytics}
                    onChange={(e) => setIncludeInAnalytics(e.target.checked)}
                    className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-medium text-slate-800">
                      Учитывать в аналитике
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Включать доходы и посещаемость курса в финансовые отчеты
                    </span>
                  </div>
                </label>

                <div className="border-t border-slate-100 pt-2">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isArchived}
                      onChange={(e) => handleArchiveCheckboxChange(e.target.checked)}
                      className="mt-0.5 rounded text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-medium text-rose-800">
                        Архивировать направление
                      </span>
                      <span className="text-[11px] text-slate-500 block">
                        Скрыть направление из активного набора новых групп
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Тарифы (N) */}
          {activeTab === 'tariffs' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Тарифная сетка в EUR (€)
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Стоимость за занятие рассчитывается строго динамически: packagePrice / lessonsCount
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddTariff}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Добавить тариф
                </button>
              </div>

              {/* Tariffs Table */}
              <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-[10px] uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Занятий</th>
                      <th className="py-2.5 px-3">Цена пакета (€)</th>
                      <th className="py-2.5 px-3">
                        <span className="flex items-center gap-1 text-indigo-700">
                          За 1 занятие (расчёт)
                          <span title="Динамический расчет: packagePrice / lessonsCount (€/зан.)">
                            <HelpCircle className="w-3 h-3 text-slate-400" />
                          </span>
                        </span>
                      </th>
                      <th className="py-2.5 px-3">Статус</th>
                      <th className="py-2.5 px-3 text-right">Удалить</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tariffs.map((tariff, index) => {
                      const pricePerLesson = calculateLessonPrice(
                        tariff.packagePrice,
                        tariff.lessonsCount
                      );

                      return (
                        <tr key={tariff.id} className="hover:bg-slate-50/50 transition-colors">
                          {/* Lessons count */}
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min={1}
                                max={100}
                                value={tariff.lessonsCount}
                                onChange={(e) =>
                                  handleUpdateTariff(
                                    index,
                                    'lessonsCount',
                                    parseInt(e.target.value) || 1
                                  )
                                }
                                className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold text-slate-900 focus:border-indigo-500 focus:outline-hidden text-center bg-white"
                              />
                              <span className="text-slate-500 text-[11px]">зан.</span>
                            </div>
                          </td>

                          {/* Package Price (€) */}
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min={1}
                                value={tariff.packagePrice}
                                onChange={(e) =>
                                  handleUpdateTariff(
                                    index,
                                    'packagePrice',
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold text-slate-900 focus:border-indigo-500 focus:outline-hidden text-right bg-white"
                              />
                              <span className="text-slate-600 font-bold text-xs">€</span>
                            </div>
                          </td>

                          {/* Strictly Read-Only Calculated Lesson Price */}
                          <td className="py-2 px-3">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-xs">
                              {pricePerLesson.toFixed(2)} €/зан.
                            </span>
                          </td>

                          {/* Tariff Status */}
                          <td className="py-2 px-3">
                            <select
                              value={tariff.status}
                              onChange={(e) =>
                                handleUpdateTariff(
                                  index,
                                  'status',
                                  e.target.value as 'active' | 'archived'
                                )
                              }
                              className={`rounded-lg px-2 py-1 text-[11px] font-bold border cursor-pointer ${
                                tariff.status === 'active'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                              }`}
                            >
                              <option value="active">Активен</option>
                              <option value="archived">В архиве</option>
                            </select>
                          </td>

                          {/* Delete tariff */}
                          <td className="py-2 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteTariff(index)}
                              disabled={tariffs.length <= 1}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Удалить тариф"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
                <span className="font-bold block text-slate-700">Правило честного ценообразования:</span>
                <p className="text-[11px] text-slate-500">
                  Стоимость 1 занятия вычисляется по формуле: <code>packagePrice / lessonsCount</code>.
                  Ручной ввод цены занятия запрещён для предотвращения расхождений с фактурами Faktura SEPA.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: Пробное занятие */}
          {activeTab === 'trial' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Trial Switch Card with 0 € toggle */}
              <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2.5 rounded-xl ${
                        isTrialAvailable
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <span>Доступно пробное занятие</span>
                        {isTrialAvailable ? (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            🔘 Доступно 0 €
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                            Отключено
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Разрешить запись новых лидов на ознакомительный вводный урок
                      </p>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isTrialAvailable}
                      onChange={(e) => setIsTrialAvailable(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[11px] font-semibold text-slate-500 block">
                      Стоимость для лида
                    </span>
                    <span className="text-lg font-black text-slate-900 mt-0.5 block">
                      0 € <span className="text-xs text-emerald-600 font-bold">(Бесплатно)</span>
                    </span>
                    <span className="text-[10px] text-slate-400">
                      По умолчанию для всех пробных уроков
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[11px] font-semibold text-slate-500 block">
                      Формат проведения
                    </span>
                    <span className="text-sm font-bold text-slate-900 mt-1 block">
                      Онлайн (Zoom)
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Ссылка отправляется через Telegram-бота
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/70 text-xs text-amber-800 space-y-1">
                <span className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Модель пробных уроков:
                </span>
                <p className="text-[11px] text-amber-900/80">
                  Пробное занятие не создает дублирующих сущностей курсов или групп. При записи лида
                  направление привязывается напрямую к лиду с параметром <code>isTrialAvailable</code>.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: Группы (N) */}
          {activeTab === 'groups' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Связанные группы ({linkedGroups.length})
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Группы из groupStorage, обучающиеся по данной учебной программе
                  </p>
                </div>

                <Link
                  href="/groups"
                  className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700"
                >
                  Все группы
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>

              {linkedGroups.length === 0 ? (
                <div className="p-8 rounded-2xl border border-slate-200 bg-slate-50/50 text-center space-y-2">
                  <div className="p-3 bg-white rounded-xl text-slate-400 inline-block shadow-2xs">
                    <Users className="w-5 h-5" />
                  </div>
                  <div className="text-xs font-bold text-slate-800">
                    С этим направлением пока не связано ни одной группы
                  </div>
                  <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                    Вы можете создать новую группу в разделе «Обучение → Группы» и выбрать данное
                    направление.
                  </p>
                  <Link
                    href="/groups"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-bold shadow-2xs mt-2"
                  >
                    <span>Перейти к созданию группы</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-[10px] uppercase">
                      <tr>
                        <th className="py-2.5 px-3">Группа</th>
                        <th className="py-2.5 px-3">Преподаватель</th>
                        <th className="py-2.5 px-3">Расписание</th>
                        <th className="py-2.5 px-3 text-center">Учеников</th>
                        <th className="py-2.5 px-3">Статус</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {linkedGroups.map((group) => {
                        const studentsCount = group.students?.length || 0;
                        const capacityLimit = group.capacity || 8;

                        return (
                          <tr key={group.id} className="hover:bg-slate-50/60 transition-colors">
                            {/* Group name */}
                            <td className="py-2.5 px-3 font-bold text-slate-900">
                              <Link
                                href={`/groups/${group.id}`}
                                className="hover:text-indigo-600 transition-colors inline-flex items-center gap-1"
                              >
                                {group.name}
                                <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                              </Link>
                            </td>

                            {/* Teacher */}
                            <td className="py-2.5 px-3 text-slate-600">
                              {group.teacherName || 'Не назначен'}
                            </td>

                            {/* Schedule */}
                            <td className="py-2.5 px-3 text-slate-600">
                              {group.schedule || 'По согласованию'}
                            </td>

                            {/* Students / Capacity */}
                            <td className="py-2.5 px-3 text-center font-bold">
                              <span
                                className={`inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[11px] ${
                                  studentsCount >= capacityLimit
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {studentsCount} / {capacityLimit}
                              </span>
                            </td>

                            {/* Status badge */}
                            <td className="py-2.5 px-3">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  group.status === 'active'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : group.status === 'recruiting'
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {group.status === 'active'
                                  ? 'Активна'
                                  : group.status === 'recruiting'
                                  ? 'Идёт набор'
                                  : group.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </form>

        {/* 4. Footer: Удалить (danger) | Отмена | Сохранить изменения */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between shrink-0">
          <div>
            {direction && (
              <button
                type="button"
                onClick={handleDeleteDirection}
                disabled={isSubmitting}
                className="px-3.5 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer border border-rose-200/80 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Удалить направление</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Сохранение...' : 'Сохранить изменения'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
