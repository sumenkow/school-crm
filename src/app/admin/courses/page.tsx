'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Plus,
  Search,
  Users,
  User,
  Sparkles,
  Archive,
  Trash2,
  Edit3,
  Filter,
  ArrowLeft,
  RotateCcw,
  CheckCircle2,
  Euro,
  Layers,
  ChevronRight,
  HelpCircle,
} from 'lucide-react';
import {
  CourseDirection,
  CourseFormat,
  CourseStatus,
  CourseSubject,
  getCourses,
  archiveCourse,
  deleteCourse,
  resetCoursesToDefault,
  calculateLessonPrice,
} from '@/lib/data/courseStorage';
import { CourseDirectionDrawer } from '@/components/settings/CourseDirectionDrawer';
import { useToast } from '@/context/ToastContext';
import { useRole } from '@/context/RoleContext';

const SUBJECT_CATEGORIES: (CourseSubject | 'all')[] = [
  'all',
  'Иностранные языки',
  'Информатика и IT',
  'Точные науки',
  'Развитие интеллекта',
];

export default function AdminCoursesPage() {
  const { success, error: toastError } = useToast();
  const { role, isOwner, isOwnerAccount, isDevAccount } = useRole();

  // Courses state
  const [courses, setCourses] = useState<CourseDirection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<CourseSubject | 'all'>('all');
  const [selectedFormat, setSelectedFormat] = useState<CourseFormat | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<CourseStatus | 'all'>('all');

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingDirection, setEditingDirection] = useState<CourseDirection | null>(null);

  // Permission check
  const canManage =
    isOwner || isOwnerAccount || isDevAccount || role === 'owner' || role === 'developer' || role === 'admin' || !role;

  // Load courses
  const refreshCourses = useCallback(() => {
    try {
      const list = getCourses();
      setCourses(list);
    } catch (e) {
      console.error('Failed to load courses:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCourses();

    // Event listener for SSOT updates
    const handleCoursesChanged = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && Array.isArray(customEvent.detail)) {
        setCourses(customEvent.detail);
      } else {
        refreshCourses();
      }
    };

    window.addEventListener('crm-courses-changed', handleCoursesChanged);
    return () => window.removeEventListener('crm-courses-changed', handleCoursesChanged);
  }, [refreshCourses]);

  // Filtered and memoized list
  const filteredCourses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return courses.filter((c) => {
      // Search
      if (q) {
        const matchName = c.name.toLowerCase().includes(q);
        const matchSubject = c.subject.toLowerCase().includes(q);
        const matchDesc = (c.description || '').toLowerCase().includes(q);
        if (!matchName && !matchSubject && !matchDesc) return false;
      }

      // Subject
      if (selectedSubject !== 'all' && c.subject !== selectedSubject) {
        return false;
      }

      // Format
      if (selectedFormat !== 'all' && c.format !== selectedFormat) {
        return false;
      }

      // Status
      if (selectedStatus !== 'all' && c.status !== selectedStatus) {
        return false;
      }

      return true;
    });
  }, [courses, searchQuery, selectedSubject, selectedFormat, selectedStatus]);

  // Statistics
  const stats = useMemo(() => {
    const total = courses.length;
    const active = courses.filter((c) => c.status === 'active').length;
    const archived = courses.filter((c) => c.status === 'archived').length;
    const groupCount = courses.filter((c) => c.format === 'group').length;
    const indivCount = courses.filter((c) => c.format === 'individual').length;
    const trialCount = courses.filter((c) => c.isTrialAvailable).length;

    return { total, active, archived, groupCount, indivCount, trialCount };
  }, [courses]);

  // Drawer handlers
  const handleCreateNew = () => {
    setEditingDirection(null);
    setIsDrawerOpen(true);
  };

  const handleEditDirection = (direction: CourseDirection) => {
    setEditingDirection(direction);
    setIsDrawerOpen(true);
  };

  const handleArchiveToggle = (direction: CourseDirection) => {
    if (!canManage) {
      toastError('У вас нет прав на изменение курсов');
      return;
    }

    const updated = archiveCourse(direction.id);
    if (updated) {
      success(
        updated.status === 'archived'
          ? `Направление «${direction.name}» перемещено в архив`
          : `Направление «${direction.name}» активировано`
      );
      refreshCourses();
    }
  };

  const handleDeleteDirection = (direction: CourseDirection) => {
    if (!canManage) {
      toastError('У вас нет прав на удаление курсов');
      return;
    }

    if (
      confirm(
        `Вы уверены, что хотите удалить направление «${direction.name}»?\n\nВнимание: если к курсу привязаны активные группы, рекомендуется перевести его в архив вместо удаления.`
      )
    ) {
      const ok = deleteCourse(direction.id);
      if (ok) {
        success(`Направление «${direction.name}» удалено`);
        refreshCourses();
      }
    }
  };

  const handleResetCatalog = () => {
    if (!canManage) return;
    if (
      confirm(
        'Восстановить эталонный каталог из 26 направлений европейской онлайн-школы (EUR)?\n\nЭто восстановит базовые программы и тарифы.'
      )
    ) {
      resetCoursesToDefault();
      refreshCourses();
      success('Каталог из 26 направлений успешно восстановлен');
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedSubject('all');
    setSelectedFormat('all');
    setSelectedStatus('all');
  };

  const hasActiveFilters =
    Boolean(searchQuery) || selectedSubject !== 'all' || selectedFormat !== 'all' || selectedStatus !== 'all';

  return (
    <div className="flex flex-col gap-5 p-6 max-w-[1600px] mx-auto w-full">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link
            href="/settings"
            className="inline-flex items-center gap-1 font-semibold text-slate-600 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Настройки CRM
          </Link>
          <ChevronRight className="w-3 h-3 text-slate-400" />
          <span className="font-bold text-slate-800">Курсы и направления</span>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={handleResetCatalog}
            className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Восстановить базовый каталог из 26 направлений"
          >
            <RotateCcw className="w-3 h-3" />
            Сброс к эталону (26 направлений)
          </button>
        )}
      </div>

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 shadow-2xs">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Курсы и учебные направления
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200">
                <Euro className="w-3 h-3" />
                EUR (€)
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                Онлайн-школа
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Реестр образовательных программ, форматов обучения (Группа / Индивидуально), вместимости и тарифных пакетов
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-3 shrink-0">
          {canManage ? (
            <button
              type="button"
              onClick={handleCreateNew}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs hover:shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Новое направление
            </button>
          ) : (
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl">
              Режим просмотра (доступ только владельцу)
            </span>
          )}
        </div>
      </div>

      {/* KPI Stats Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Всего программ</div>
          <div className="text-lg font-black text-slate-900 mt-0.5">{stats.total}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">В каталоге школы</div>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Активные</div>
          <div className="text-lg font-black text-emerald-700 mt-0.5">{stats.active}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Доступны для набора</div>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">Групповые</div>
          <div className="text-lg font-black text-indigo-700 mt-0.5">{stats.groupCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Вместимость 6–8 чел.</div>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-purple-600 uppercase tracking-wider">Индивидуальные</div>
          <div className="text-lg font-black text-purple-700 mt-0.5">{stats.indivCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Формат 1-on-1</div>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">С пробными</div>
          <div className="text-lg font-black text-amber-700 mt-0.5">{stats.trialCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Открыты для лидов</div>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">В архиве</div>
          <div className="text-lg font-black text-slate-600 mt-0.5">{stats.archived}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Скрыты из набора</div>
        </div>
      </div>

      {/* Control Bar: Search & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        {/* Subject Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {SUBJECT_CATEGORIES.map((cat) => {
            const isSelected = selectedSubject === cat;
            const label = cat === 'all' ? 'Все направления' : cat;
            const count =
              cat === 'all' ? courses.length : courses.filter((c) => c.subject === cat).length;

            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedSubject(cat)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200/70 text-slate-600'
                }`}
              >
                <span>{label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                    isSelected ? 'bg-indigo-700/60 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Dropdown Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 pt-1">
          {/* Search input */}
          <div className="lg:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по названию или описанию..."
              className="w-full text-xs font-medium pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:outline-hidden bg-slate-50/40 focus:bg-white"
            />
          </div>

          {/* Format Filter */}
          <div className="lg:col-span-3">
            <select
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value as CourseFormat | 'all')}
              className="w-full text-xs font-medium px-3 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:outline-hidden bg-white cursor-pointer"
            >
              <option value="all">Все форматы обучения</option>
              <option value="group">Групповые занятия (мини-группы)</option>
              <option value="individual">Индивидуальные (1-on-1)</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="lg:col-span-3">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as CourseStatus | 'all')}
              className="w-full text-xs font-medium px-3 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:outline-hidden bg-white cursor-pointer"
            >
              <option value="all">Все статусы (активные и архив)</option>
              <option value="active">Только активные</option>
              <option value="archived">Только в архиве</option>
            </select>
          </div>

          {/* Reset Filters CTA */}
          <div className="lg:col-span-1 flex items-center justify-end">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="w-full h-full text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl px-2.5 py-2 border border-rose-200 transition-colors cursor-pointer"
                title="Сбросить все фильтры"
              >
                Сброс
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Registry Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            {/* Table Header */}
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                <th className="py-3.5 px-4">Направление</th>
                <th className="py-3.5 px-3">Формат</th>
                <th className="py-3.5 px-3">Возраст</th>
                <th className="py-3.5 px-3">Длительность</th>
                <th className="py-3.5 px-3 text-center">Вместимость</th>
                <th className="py-3.5 px-3">Тарифы (€)</th>
                <th className="py-3.5 px-3 text-center">Пробное</th>
                <th className="py-3.5 px-3">Статус</th>
                <th className="py-3.5 px-4 text-right">Действия</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-100">
              {filteredCourses.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="p-3 bg-slate-100 rounded-2xl text-slate-400">
                        <Filter className="w-6 h-6" />
                      </div>
                      <div className="text-sm font-bold text-slate-800">
                        {hasActiveFilters ? 'Направления не найдены' : 'Список направлений пуст'}
                      </div>
                      <p className="text-xs text-slate-500 max-w-sm">
                        {hasActiveFilters
                          ? 'Попробуйте изменить параметры поиска или сбросить активные фильтры.'
                          : 'В каталоге пока нет ни одного курса. Нажмите «+ Новое направление», чтобы создать.'}
                      </p>
                      {hasActiveFilters && (
                        <button
                          type="button"
                          onClick={handleResetFilters}
                          className="mt-2 text-xs font-bold text-indigo-600 hover:text-indigo-700 underline cursor-pointer"
                        >
                          Сбросить фильтры
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCourses.map((direction) => {
                  const isIndiv = direction.format === 'individual';
                  const prices = direction.tariffs.map((t) => t.packagePrice).filter((p) => p > 0);
                  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
                  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

                  return (
                    <tr
                      key={direction.id}
                      className="hover:bg-slate-50/60 transition-colors group cursor-pointer"
                      onClick={() => handleEditDirection(direction)}
                    >
                      {/* 1. Направление (Name + color tag + subject) */}
                      <td className="py-3.5 px-4 min-w-[240px]">
                        <div className="flex items-start gap-3">
                          <span
                            className="w-3 h-3 rounded-full mt-1 shrink-0 ring-2 ring-white shadow-xs"
                            style={{ backgroundColor: direction.color || '#3b82f6' }}
                          />
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                              {direction.name}
                            </div>
                            <div className="text-[11px] text-slate-500 line-clamp-1">
                              {direction.subject}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Формат (Badge: Группа vs Индивидуально) */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {isIndiv ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            <User className="w-3.5 h-3.5" />
                            Индивидуально
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            <Users className="w-3.5 h-3.5" />
                            Группа
                          </span>
                        )}
                      </td>

                      {/* 3. Возраст */}
                      <td className="py-3.5 px-3 whitespace-nowrap text-slate-700 font-medium">
                        {direction.ageGroup || '—'}
                      </td>

                      {/* 4. Длительность */}
                      <td className="py-3.5 px-3 whitespace-nowrap text-slate-600">
                        {direction.lessonDuration || `${direction.lessonDurationMinutes} мин`}
                      </td>

                      {/* 5. Вместимость (Numeric for Group, strictly '—' for Individual) */}
                      <td className="py-3.5 px-3 whitespace-nowrap text-center">
                        {isIndiv ? (
                          <span className="text-slate-400 font-bold text-sm select-none" title="Индивидуальный формат">—</span>
                        ) : (
                          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md bg-slate-100 font-bold text-slate-800 text-xs">
                            {direction.capacity} чел.
                          </span>
                        )}
                      </td>

                      {/* 6. Тарифы (Count & preview min–max €) */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 text-xs">
                            {minPrice === maxPrice ? `${minPrice} €` : `${minPrice}–${maxPrice} €`}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">
                            {direction.tariffs.length} {direction.tariffs.length === 1 ? 'пакет' : 'тарифа'}
                          </span>
                        </div>
                      </td>

                      {/* 7. Пробное (Badge: Доступно / —) */}
                      <td className="py-3.5 px-3 whitespace-nowrap text-center">
                        {direction.isTrialAvailable ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Sparkles className="w-3 h-3 text-emerald-600" />
                            Доступно
                          </span>
                        ) : (
                          <span className="text-slate-400 font-bold text-sm">—</span>
                        )}
                      </td>

                      {/* 8. Статус (Badge: Активно / В архиве) */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {direction.status === 'active' ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                            Активно
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600">
                            В архиве
                          </span>
                        )}
                      </td>

                      {/* 9. Действия (Edit / Archive / Delete) */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div
                          className="inline-flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => handleEditDirection(direction)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                            title="Редактировать параметры направления"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {canManage && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleArchiveToggle(direction)}
                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                  direction.status === 'active'
                                    ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                                    : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                                }`}
                                title={
                                  direction.status === 'active'
                                    ? 'Переместить в архив'
                                    : 'Восстановить из архива'
                                }
                              >
                                <Archive className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteDirection(direction)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Удалить направление"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Count */}
        <div className="py-3 px-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
          <span>
            Показано <strong>{filteredCourses.length}</strong> из <strong>{courses.length}</strong> направлений
          </span>
          <span className="text-[11px]">
            Все цены указаны в EUR (€) • Расчёт стоимости за занятие динамический
          </span>
        </div>
      </div>

      {/* Slide-over Drawer Modal */}
      <CourseDirectionDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        direction={editingDirection}
        onSaved={refreshCourses}
      />
    </div>
  );
}
