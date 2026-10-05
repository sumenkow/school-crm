'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  RotateCw,
  Euro,
  ChevronRight,
  MoreHorizontal,
  Table as TableIcon,
  LayoutGrid,
  Check,
  Calendar,
  Clock,
  TrendingUp,
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
} from '@/lib/data/courseStorage';
import { CourseDirectionDrawer } from '@/components/settings/CourseDirectionDrawer';
import { useToast } from '@/context/ToastContext';
import { useRole } from '@/context/RoleContext';

export default function AdminCoursesPage() {
  const { success, error: toastError } = useToast();
  const { role, isOwner, isOwnerAccount, isDevAccount } = useRole();

  // Courses state
  const [courses, setCourses] = useState<CourseDirection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFormat, setSelectedFormat] = useState<CourseFormat | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<CourseStatus | 'all'>('all');

  // View mode: Table vs Cards
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Row selection state for table view
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Active actions dropdown menu state
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingDirection, setEditingDirection] = useState<CourseDirection | null>(null);

  // Permission check
  const canManage =
    isOwner || isOwnerAccount || isDevAccount || role === 'owner' || role === 'developer' || role === 'admin' || !role;

  // Load courses from SSOT
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

  // Click outside to close active action menu
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuId(null);
      }
    };
    if (activeMenuId) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [activeMenuId]);

  // Filtered courses list
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
  }, [courses, searchQuery, selectedFormat, selectedStatus]);

  // Statistics for Top 4 Summary Cards
  const stats = useMemo(() => {
    const total = courses.length;
    const groupCount = courses.filter((c) => c.format === 'group').length;
    const indivCount = courses.filter((c) => c.format === 'individual').length;
    const trialCount = courses.filter((c) => c.isTrialAvailable).length;

    const groupPct = total > 0 ? Math.round((groupCount / total) * 100) : 0;
    const indivPct = total > 0 ? Math.round((indivCount / total) * 100) : 0;

    return {
      total,
      groupCount,
      indivCount,
      trialCount,
      groupPct,
      indivPct,
    };
  }, [courses]);

  // Selection handlers
  const allFilteredSelected =
    filteredCourses.length > 0 && filteredCourses.every((c) => selectedIds.has(c.id));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCourses.map((c) => c.id)));
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Drawer handlers
  const handleCreateNew = () => {
    setEditingDirection(null);
    setIsDrawerOpen(true);
  };

  const handleEditDirection = (direction: CourseDirection) => {
    setEditingDirection(direction);
    setIsDrawerOpen(true);
    setActiveMenuId(null);
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
    setActiveMenuId(null);
  };

  const handleDeleteDirection = (direction: CourseDirection) => {
    if (!canManage) {
      toastError('У вас нет прав на удаление курсов');
      return;
    }

    if (
      confirm(
        `Вы уверены, что хотите удалить направление «${direction.name}»?\n\nВнимание: если к направлению привязаны активные группы, рекомендуется перевести его в архив вместо удаления.`
      )
    ) {
      const ok = deleteCourse(direction.id);
      if (ok) {
        success(`Направление «${direction.name}» удалено`);
        refreshCourses();
      }
    }
    setActiveMenuId(null);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedFormat('all');
    setSelectedStatus('all');
    refreshCourses();
  };

  const hasActiveFilters =
    Boolean(searchQuery) || selectedFormat !== 'all' || selectedStatus !== 'all';

  return (
    <div className="flex flex-col gap-6 p-6 max-w-[1600px] mx-auto w-full">
      {/* 1. Breadcrumbs Bar & Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Breadcrumb: ← Настройки школы > Курсы и направления */}
        <nav aria-label="Хлебные крошки" className="flex items-center gap-2 text-xs font-semibold">
          <Link
            href="/settings"
            className="inline-flex items-center gap-1.5 text-slate-500 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Настройки школы</span>
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-900 font-bold">Курсы и направления</span>
        </nav>

        {/* Action CTA: + Добавить направление */}
        <div className="flex items-center gap-2">
          {canManage && (
            <button
              type="button"
              onClick={handleCreateNew}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs hover:shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Добавить направление</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Page Header: Title & Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Курсы и направления
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
              <Euro className="w-3 h-3" />
              EUR (€)
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
              Онлайн-школа
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Управление учебными программами, параметрами обучения и тарифами
          </p>
        </div>
      </div>

      {/* 3. Top 4 Summary Cards (Ref media_1791199404731.png) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Всего направлений */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Всего направлений
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{stats.total}</div>
          <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-emerald-600">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[11px]">
              +1 с прошлого месяца
            </span>
          </div>
        </div>

        {/* Card 2: Групповые */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Групповые
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{stats.groupCount}</div>
          <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-slate-500">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-[11px]">
              {stats.groupPct}% от всех
            </span>
          </div>
        </div>

        {/* Card 3: Индивидуальные */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Индивидуальные
            </span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <User className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{stats.indivCount}</div>
          <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-slate-500">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold text-[11px]">
              {stats.indivPct}% от всех
            </span>
          </div>
        </div>

        {/* Card 4: Пробные занятия */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Пробные занятия
            </span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {stats.trialCount > 0 ? 'Доступны' : 'Недоступны'}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-slate-500">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[11px]">
              0 € по умолчанию
            </span>
          </div>
        </div>
      </div>

      {/* 4. Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Left: Search, Format, Status */}
        <div className="flex flex-1 flex-wrap items-center gap-3">
          {/* Search by name */}
          <div className="relative min-w-[240px] flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по названию..."
              className="w-full text-xs font-medium pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:outline-hidden bg-slate-50/50 focus:bg-white transition-colors"
            />
          </div>

          {/* Format Filter */}
          <div className="min-w-[140px]">
            <select
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value as CourseFormat | 'all')}
              className="w-full text-xs font-medium px-3 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:outline-hidden bg-white cursor-pointer"
            >
              <option value="all">Все форматы</option>
              <option value="group">Группа</option>
              <option value="individual">Индивидуально</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="min-w-[140px]">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as CourseStatus | 'all')}
              className="w-full text-xs font-medium px-3 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:outline-hidden bg-white cursor-pointer"
            >
              <option value="all">Все статусы</option>
              <option value="active">Активен</option>
              <option value="archived">Неактивен</option>
            </select>
          </div>

          {/* Refresh / Reset Button ↻ */}
          <button
            type="button"
            onClick={handleResetFilters}
            className="p-2.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
            title="Обновить и сбросить фильтры"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        {/* Right: View Switcher [Таблица] / [Карточки] */}
        <div className="inline-flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80 shrink-0 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'table'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span>Таблица</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('cards')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'cards'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Карточки</span>
          </button>
        </div>
      </div>

      {/* 5. Main Content: Table or Cards View */}
      {viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              {/* Table Header */}
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                  {/* [x] Checkbox column */}
                  <th className="py-3.5 px-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={toggleSelectAll}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                      aria-label="Выбрать все направления"
                    />
                  </th>
                  <th className="py-3.5 px-3">Направление</th>
                  <th className="py-3.5 px-3">Формат</th>
                  <th className="py-3.5 px-3">Возраст</th>
                  <th className="py-3.5 px-3">Длительность</th>
                  <th className="py-3.5 px-3 text-center">Вместимость</th>
                  <th className="py-3.5 px-3 text-center">Тарифы</th>
                  <th className="py-3.5 px-3 text-center">Пробное занятие</th>
                  <th className="py-3.5 px-3">Статус</th>
                  <th className="py-3.5 px-4 text-right w-12">•••</th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="divide-y divide-slate-100">
                {filteredCourses.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <div className="p-3 bg-slate-100 rounded-2xl text-slate-400">
                          <Filter className="w-6 h-6" />
                        </div>
                        <div className="text-sm font-bold text-slate-800">
                          {hasActiveFilters ? 'Направления не найдены' : 'Список направлений пуст'}
                        </div>
                        <p className="text-xs text-slate-500 max-w-sm">
                          {hasActiveFilters
                            ? 'Попробуйте изменить параметры поиска или сбросить фильтры.'
                            : 'В каталоге пока нет направлений. Нажмите «+ Добавить направление», чтобы создать.'}
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
                    const isSelected = selectedIds.has(direction.id);

                    return (
                      <tr
                        key={direction.id}
                        className={`hover:bg-slate-50/70 transition-colors group cursor-pointer ${
                          isSelected ? 'bg-indigo-50/30' : ''
                        }`}
                        onClick={() => handleEditDirection(direction)}
                      >
                        {/* 1. Checkbox [x] */}
                        <td
                          className="py-3.5 px-4 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectRow(direction.id)}
                            className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                            aria-label={`Выбрать ${direction.name}`}
                          />
                        </td>

                        {/* 2. Направление */}
                        <td className="py-3.5 px-3 min-w-[220px]">
                          <div className="flex items-start gap-2.5">
                            <span
                              className="w-2.5 h-2.5 rounded-full mt-1 shrink-0 ring-2 ring-white shadow-2xs"
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

                        {/* 3. Формат (Группа / Индивидуально) */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          {isIndiv ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200/80">
                              <User className="w-3 h-3" />
                              Индивидуально
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200/80">
                              <Users className="w-3 h-3" />
                              Группа
                            </span>
                          )}
                        </td>

                        {/* 4. Возраст */}
                        <td className="py-3.5 px-3 whitespace-nowrap text-slate-700 font-medium">
                          {direction.ageGroup || '—'}
                        </td>

                        {/* 5. Длительность */}
                        <td className="py-3.5 px-3 whitespace-nowrap text-slate-600">
                          {direction.lessonDuration || `${direction.lessonDurationMinutes} мин`}
                        </td>

                        {/* 6. Вместимость (8 / —) */}
                        <td className="py-3.5 px-3 whitespace-nowrap text-center">
                          {isIndiv ? (
                            <span
                              className="text-slate-400 font-bold text-sm select-none"
                              title="Индивидуальный формат"
                            >
                              —
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center min-w-6 h-6 px-2 rounded-md bg-slate-100 font-bold text-slate-800 text-xs">
                              {direction.capacity}
                            </span>
                          )}
                        </td>

                        {/* 7. Тарифы badge (3) */}
                        <td className="py-3.5 px-3 whitespace-nowrap text-center">
                          <span className="inline-flex items-center justify-center min-w-6 h-6 px-2 rounded-full bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200/80">
                            {direction.tariffs.length}
                          </span>
                        </td>

                        {/* 8. Пробное занятие (🔘 Доступно 0 €) */}
                        <td className="py-3.5 px-3 whitespace-nowrap text-center">
                          {direction.isTrialAvailable ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                              <span className="w-2 h-2 rounded-full bg-emerald-600 ring-2 ring-emerald-200" />
                              🔘 Доступно 0 €
                            </span>
                          ) : (
                            <span className="text-slate-400 font-bold text-sm">—</span>
                          )}
                        </td>

                        {/* 9. Статус (🟢 Активен / 🔴 Неактивен) */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          {direction.status === 'active' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                              🟢 Активен
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                              🔴 Неактивен
                            </span>
                          )}
                        </td>

                        {/* 10. ••• Action dropdown */}
                        <td
                          className="py-3.5 px-4 text-right whitespace-nowrap relative"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setActiveMenuId(activeMenuId === direction.id ? null : direction.id)
                            }
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                            aria-label="Действия"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>

                          {/* Dropdown Menu */}
                          {activeMenuId === direction.id && (
                            <div
                              ref={menuRef}
                              className="absolute right-4 top-10 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-20 text-left"
                            >
                              <button
                                type="button"
                                onClick={() => handleEditDirection(direction)}
                                className="w-full px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                                Редактировать
                              </button>
                              {canManage && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleArchiveToggle(direction)}
                                    className="w-full px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                                  >
                                    <Archive className="w-3.5 h-3.5 text-slate-400" />
                                    {direction.status === 'active'
                                      ? 'Переместить в архив'
                                      : 'Восстановить из архива'}
                                  </button>
                                  <div className="border-t border-slate-100 my-1" />
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteDirection(direction)}
                                    className="w-full px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                    Удалить направление
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer Count */}
          <div className="py-3 px-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
            <span>
              Показано <strong>{filteredCourses.length}</strong> из <strong>{courses.length}</strong>{' '}
              направлений
            </span>
            <span className="text-[11px]">
              Все цены указаны в EUR (€) • Расчёт стоимости за занятие динамический
            </span>
          </div>
        </div>
      ) : (
        /* CARDS VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCourses.length === 0 ? (
            <div className="col-span-full bg-white p-12 rounded-2xl border border-slate-200 text-center">
              <div className="p-3 bg-slate-100 rounded-2xl text-slate-400 inline-block mb-2">
                <Filter className="w-6 h-6" />
              </div>
              <div className="text-sm font-bold text-slate-800">Направления не найдены</div>
              <p className="text-xs text-slate-500 mt-1">
                Попробуйте изменить параметры поиска или сбросить фильтры.
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="mt-3 text-xs font-bold text-indigo-600 hover:text-indigo-700 underline cursor-pointer"
                >
                  Сбросить фильтры
                </button>
              )}
            </div>
          ) : (
            filteredCourses.map((direction) => {
              const isIndiv = direction.format === 'individual';

              return (
                <div
                  key={direction.id}
                  onClick={() => handleEditDirection(direction)}
                  className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer flex flex-col justify-between gap-4 group"
                >
                  {/* Card Header: Color, Subject & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full shrink-0 ring-2 ring-white shadow-2xs"
                        style={{ backgroundColor: direction.color || '#3b82f6' }}
                      />
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        {direction.subject}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {direction.status === 'active' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                          🟢 Активен
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700">
                          🔴 Неактивен
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                      {direction.name}
                    </h3>
                    {direction.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {direction.description}
                      </p>
                    )}
                  </div>

                  {/* Parameters Grid */}
                  <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-50/80 border border-slate-100 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold uppercase">
                        Формат
                      </span>
                      <span className="font-bold text-slate-800">
                        {isIndiv ? 'Индивидуально' : 'Группа'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold uppercase">
                        Возраст
                      </span>
                      <span className="font-bold text-slate-800">
                        {direction.ageGroup || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold uppercase">
                        Длительность
                      </span>
                      <span className="font-bold text-slate-800">
                        {direction.lessonDuration || `${direction.lessonDurationMinutes} мин`}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold uppercase">
                        Вместимость
                      </span>
                      <span className="font-bold text-slate-800">
                        {isIndiv ? '—' : `${direction.capacity} уч.`}
                      </span>
                    </div>
                  </div>

                  {/* Bottom Badges */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[11px]">
                      {direction.tariffs.length} тарифа
                    </span>

                    {direction.isTrialAvailable ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                        🔘 Доступно 0 €
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs font-semibold">Без пробных</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 6. Slide-over Drawer */}
      <CourseDirectionDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        direction={editingDirection}
        onSaved={refreshCourses}
      />
    </div>
  );
}
