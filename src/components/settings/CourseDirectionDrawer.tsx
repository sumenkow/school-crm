'use client';

import React, { useState, useEffect, useId } from 'react';
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
} from 'lucide-react';
import {
  CourseDirection,
  CourseFormat,
  CourseStatus,
  CourseSubject,
  CourseTariff,
  calculateLessonPrice,
  saveCourse,
} from '@/lib/data/courseStorage';
import { useToast } from '@/context/ToastContext';

interface CourseDirectionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  direction?: CourseDirection | null;
  onSaved?: (saved: CourseDirection) => void;
}

const SUBJECT_OPTIONS: CourseSubject[] = [
  'Иностранные языки',
  'Информатика и IT',
  'Точные науки',
  'Развитие интеллекта',
];

const DURATION_PRESETS = [
  { label: '45 мин', minutes: 45 },
  { label: '60 мин', minutes: 60 },
  { label: '90 мин', minutes: 90 },
  { label: '120 мин', minutes: 120 },
];

const AGE_PRESETS = ['5–7 лет', '6–9 лет', '7–11 лет', '10–15 лет', '12+ лет', '14+ лет', 'Любой возраст'];

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

  // Form State
  const [name, setName] = useState('');
  const [subject, setSubject] = useState<CourseSubject>('Иностранные языки');
  const [description, setDescription] = useState('');
  const [format, setFormat] = useState<CourseFormat>('group');
  const [ageGroup, setAgeGroup] = useState('7–14 лет');
  const [lessonDurationMinutes, setLessonDurationMinutes] = useState(60);
  const [capacity, setCapacity] = useState(8);
  const [isTrialAvailable, setIsTrialAvailable] = useState(true);
  const [status, setStatus] = useState<CourseStatus>('active');
  const [color, setColor] = useState('#3b82f6');
  const [tariffs, setTariffs] = useState<CourseTariff[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state when direction changes or drawer opens
  useEffect(() => {
    if (isOpen) {
      if (direction) {
        setName(direction.name || '');
        setSubject(direction.subject || 'Иностранные языки');
        setDescription(direction.description || '');
        setFormat(direction.format || 'group');
        setAgeGroup(direction.ageGroup || '7–14 лет');
        setLessonDurationMinutes(direction.lessonDurationMinutes || 60);
        setCapacity(direction.format === 'individual' ? 1 : direction.capacity || 8);
        setIsTrialAvailable(direction.isTrialAvailable !== false);
        setStatus(direction.status || 'active');
        setColor(direction.color || (direction.format === 'individual' ? '#4f46e5' : '#3b82f6'));
        setTariffs(
          direction.tariffs && direction.tariffs.length > 0
            ? direction.tariffs.map((t) => ({ ...t }))
            : [
                { id: 't1', lessonsCount: 4, packagePrice: 65, status: 'active', name: '4 занятия' },
                { id: 't2', lessonsCount: 8, packagePrice: 120, status: 'active', name: '8 занятий' },
                { id: 't3', lessonsCount: 16, packagePrice: 220, status: 'active', name: '16 занятий' },
              ]
        );
      } else {
        // Defaults for new direction
        setName('');
        setSubject('Иностранные языки');
        setDescription('');
        setFormat('group');
        setAgeGroup('7–14 лет');
        setLessonDurationMinutes(60);
        setCapacity(8);
        setIsTrialAvailable(true);
        setStatus('active');
        setColor('#3b82f6');
        setTariffs([
          { id: 't1', lessonsCount: 4, packagePrice: 70, status: 'active', name: '4 занятия' },
          { id: 't2', lessonsCount: 8, packagePrice: 130, status: 'active', name: '8 занятий' },
          { id: 't3', lessonsCount: 16, packagePrice: 240, status: 'active', name: '16 занятий' },
        ]);
      }
    }
  }, [isOpen, direction]);

  // Handle format change
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
    const nextCount = defaultCounts.find((c) => !existingCounts.includes(c)) || (tariffs.length + 1) * 8;
    const basePricePerLesson = tariffs.length > 0 ? tariffs[0].packagePrice / tariffs[0].lessonsCount : 15;
    const estimatedPrice = Math.round(nextCount * basePricePerLesson * 0.95);

    const newTariff: CourseTariff = {
      id: `t_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      lessonsCount: nextCount,
      packagePrice: estimatedPrice > 0 ? estimatedPrice : 100,
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toastError('Укажите название учебного направления');
      return;
    }

    if (tariffs.length === 0) {
      toastError('Добавьте хотя бы один тарифный пакет');
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
        ageGroup: ageGroup.trim() || 'Любой возраст',
        lessonDuration: `${lessonDurationMinutes} мин`,
        lessonDurationMinutes,
        capacity: format === 'individual' ? 1 : Math.max(1, capacity),
        isTrialAvailable,
        status,
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

      {/* Drawer Panel */}
      <div className="fixed inset-y-0 right-0 max-w-2xl w-full bg-white shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xs"
              style={{ backgroundColor: color }}
            >
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 id={titleId} className="text-base font-bold text-slate-900">
                {direction ? 'Редактирование направления' : 'Новое учебное направление'}
              </h2>
              <p className="text-xs text-slate-500">
                Конфигурация формата обучения, вместимости и тарифной сетки в EUR (€)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            aria-label="Закрыть панель"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body (Scrollable) */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Format Selector: Group vs Individual */}
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
                    format === 'group' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Групповое обучение</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Мини-группы от 2 до 8 учеников. Фиксированное расписание
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
                    format === 'individual' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Индивидуально (1-on-1)</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Персональный формат, вместимость строго 1 ученик
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Core Info: Name & Category */}
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
                placeholder="Например: Английский язык для подростков (Teens B1)"
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
                Возрастная категория
              </label>
              <input
                type="text"
                value={ageGroup}
                onChange={(e) => setAgeGroup(e.target.value)}
                placeholder="Например: 10–15 лет"
                className="w-full text-xs font-medium rounded-xl border border-slate-200 px-3 py-2.5 focus:border-indigo-500 focus:outline-hidden bg-slate-50/40 focus:bg-white"
              />
              <div className="flex flex-wrap gap-1 mt-1.5">
                {AGE_PRESETS.slice(0, 5).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAgeGroup(preset)}
                    className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Duration, Capacity, Color */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50/70 border border-slate-200/80">
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

            {/* Capacity logic: disabled/fixed for Individual */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span>Вместимость</span>
                {format === 'individual' && (
                  <span className="text-[10px] text-indigo-600 font-bold">1-on-1</span>
                )}
              </label>
              {format === 'individual' ? (
                <div className="relative">
                  <input
                    type="text"
                    disabled
                    value="— (Индивидуально)"
                    className="w-full text-xs font-bold text-slate-400 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 cursor-not-allowed select-none"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Фиксировано: 1 ученик
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
                      onChange={(e) => setCapacity(Math.max(2, parseInt(e.target.value) || 6))}
                      className="w-full text-xs font-bold text-slate-900 rounded-xl border border-slate-200 bg-white px-3 py-2 focus:border-indigo-500 focus:outline-hidden"
                    />
                    <span className="absolute right-3 text-xs text-slate-400 pointer-events-none">
                      чел.
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-1">
                    Обычно 6–8 для онлайн-группы
                  </span>
                </div>
              )}
            </div>

            {/* Color Accent */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-slate-400" />
                Цветовой маркер
              </label>
              <div className="flex items-center gap-1.5 pt-1">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setColor(c.hex)}
                    style={{ backgroundColor: c.hex }}
                    className={`w-5 h-5 rounded-full transition-transform cursor-pointer ${
                      color === c.hex ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110' : 'hover:scale-105'
                    }`}
                    title={c.name}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Trial Toggle Card */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
            <div className="flex items-start gap-3">
              <div
                className={`p-2 rounded-xl ${
                  isTrialAvailable ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-400'
                }`}
              >
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  Пробное занятие доступно
                  {isTrialAvailable && (
                    <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Активно
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Разрешить запись новых лидов на вводный пробный урок по данному направлению
                </div>
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

          {/* Tariffs Table: Dynamic Calculated Pricing SSOT */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Тарифная сетка и пакеты занятий
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Цены строго в EUR (€). Стоимость за занятие рассчитывается строго динамически.
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

            <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-[10px] uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Кол-во занятий</th>
                    <th className="py-2.5 px-3">Цена пакета (€)</th>
                    <th className="py-2.5 px-3">
                      <span className="flex items-center gap-1 text-indigo-700">
                        За 1 занятие (расчёт)
                        <span title="Рассчитывается автоматически как: Цена пакета / Кол-во занятий">
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
                    const pricePerLesson = calculateLessonPrice(tariff.packagePrice, tariff.lessonsCount);

                    return (
                      <tr key={tariff.id} className="hover:bg-slate-50/50 transition-colors">
                        {/* Lessons Count */}
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min={1}
                              max={100}
                              value={tariff.lessonsCount}
                              onChange={(e) =>
                                handleUpdateTariff(index, 'lessonsCount', parseInt(e.target.value) || 1)
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
                                handleUpdateTariff(index, 'packagePrice', parseFloat(e.target.value) || 0)
                              }
                              className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold text-slate-900 focus:border-indigo-500 focus:outline-hidden text-right bg-white"
                            />
                            <span className="text-slate-600 font-bold text-xs">€</span>
                          </div>
                        </td>

                        {/* Strictly Calculated Lesson Price (NO manual input) */}
                        <td className="py-2 px-3">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-xs">
                            {pricePerLesson.toFixed(2)} €/зан.
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-2 px-3">
                          <select
                            value={tariff.status}
                            onChange={(e) =>
                              handleUpdateTariff(index, 'status', e.target.value as 'active' | 'archived')
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

                        {/* Delete action */}
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
          </div>

          {/* Description & Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Краткое описание курса (для методистов и клиентов)
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ключевые темы программы, используемые платформы и учебные цели..."
                className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:border-indigo-500 focus:outline-hidden bg-slate-50/40 focus:bg-white resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Статус направления
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as CourseStatus)}
                className={`w-full text-xs font-bold rounded-xl border px-3 py-2.5 cursor-pointer ${
                  status === 'active'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <option value="active">● Активно в каталоге</option>
                <option value="archived">○ В архиве</option>
              </select>
            </div>
          </div>
        </form>

        {/* Drawer Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            {format === 'group' ? (
              <span>Групповой формат (до {capacity} уч.)</span>
            ) : (
              <span>Индивидуальный формат (1-on-1)</span>
            )}
            {' • '}
            <span>{tariffs.length} тарифа</span>
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
              {isSubmitting ? 'Сохранение...' : 'Сохранить направление'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
