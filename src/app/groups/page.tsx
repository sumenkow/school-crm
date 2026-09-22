'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useFocusSync } from '@/hooks/useFocusSync';
import { useRouter } from 'next/navigation';
import { Plus, Users, Clock, Calendar, ArrowRight, Filter, Video, MoreHorizontal, Edit, Trash2, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { INITIAL_GROUPS, FullGroupData, FullLessonData, INITIAL_LESSONS } from '@/lib/data/mockData';
import { getStoredGroups, saveGroupToStorage, softDeleteGroup, restoreGroup } from '@/lib/data/groupStorage';
import { getStoredLessons } from '@/lib/data/lessonStorage';
import { CreateGroupModal } from '@/components/groups/CreateGroupModal';
import { EditGroupModal } from '@/components/groups/EditGroupModal';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';

function formatFreeSpots(count: number): string {
  if (count <= 0) return 'Мест нет';
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 19) return `Свободно: ${count} мест`;
  if (mod10 === 1) return `Свободно: ${count} место`;
  if (mod10 >= 2 && mod10 <= 4) return `Свободно: ${count} места`;
  return `Свободно: ${count} мест`;
}

function getNextLessonForGroup(
  groupId: string,
  groupName: string,
  allLessons: FullLessonData[]
): { dateFormatted: string; timeFormatted: string } | null {
  const nowMs = Date.now();

  const parseLessonDateMs = (l: FullLessonData): number => {
    if (!l.date) return 0;
    let isoDate = l.date;
    if (l.date.includes('.')) {
      const parts = l.date.split('.');
      if (parts.length === 3) {
        isoDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
    const time = l.startTime && l.startTime.length >= 4 ? l.startTime : '00:00';
    const parsed = new Date(`${isoDate}T${time.length === 5 ? time + ':00' : time}`).getTime();
    return isNaN(parsed) ? 0 : parsed;
  };

  const groupCandidates = allLessons.filter((l) => {
    if (l.status === 'cancelled' || l.status === 'completed') return false;
    const cleanLGroupName = (l.groupName || '').split(' (')[0].trim();
    const cleanGName = groupName.split(' (')[0].trim();
    const matchesGroup = (l.groupId && l.groupId === groupId) || (cleanLGroupName && cleanLGroupName === cleanGName);
    if (!matchesGroup) return false;
    const lessonMs = parseLessonDateMs(l);
    return lessonMs > nowMs;
  });

  if (groupCandidates.length === 0) return null;

  groupCandidates.sort((a, b) => parseLessonDateMs(a) - parseLessonDateMs(b));
  const next = groupCandidates[0];

  let dateFormatted = next.date;
  if (next.date.includes('-')) {
    const [y, m, d] = next.date.split('-');
    dateFormatted = `${d.padStart(2, '0')}.${m.padStart(2, '0')}.${y}`;
  } else if (next.dateFormatted) {
    dateFormatted = next.dateFormatted;
  }

  const timeFormatted = next.startTime || '18:00';

  return {
    dateFormatted,
    timeFormatted,
  };
}

export default function GroupsPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const toast = useToast();
  const [groups, setGroups] = useState<FullGroupData[]>(() => {
    return typeof window !== 'undefined' ? getStoredGroups() : INITIAL_GROUPS;
  });
  const [allLessons, setAllLessons] = useState<FullLessonData[]>(() => {
    return typeof window !== 'undefined' ? getStoredLessons() : INITIAL_LESSONS;
  });
  const [filterCourse, setFilterCourse] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'deleted'>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<FullGroupData | null>(null);
  const [activeMenuGroupId, setActiveMenuGroupId] = useState<string | null>(null);

  const refreshData = useCallback(() => {
    setGroups(getStoredGroups());
    if (typeof window !== 'undefined') {
      setAllLessons(getStoredLessons());
    }
  }, []);

  useFocusSync(refreshData);

  useEffect(() => {
    refreshData();
    window.addEventListener('crm-groups-changed', refreshData);
    window.addEventListener('crm-students-changed', refreshData);
    window.addEventListener('crm-lessons-changed', refreshData);
    return () => {
      window.removeEventListener('crm-groups-changed', refreshData);
      window.removeEventListener('crm-students-changed', refreshData);
      window.removeEventListener('crm-lessons-changed', refreshData);
    };
  }, [refreshData]);

  // Close 3-dots menu on clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.group-actions-menu-wrapper')) {
        setActiveMenuGroupId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleGroupCreated = (newGroup: FullGroupData) => {
    saveGroupToStorage(newGroup);
    refreshData();
    toast.success(`Группа «${newGroup.name}» успешно создана`);
  };

  const handleGroupSaved = (updatedGroup: FullGroupData) => {
    saveGroupToStorage(updatedGroup);
    refreshData();
    toast.success(`Группа «${updatedGroup.name}» обновлена`);
  };

  const handleDeleteGroup = (groupId: string, groupName: string) => {
    if (confirm(`Вы уверены, что хотите переместить группу «${groupName}» в удаленные? Ее можно восстановить в любой момент.`)) {
      softDeleteGroup(groupId);
      refreshData();
      toast.success(`Группа «${groupName}» перемещена в удаленные`);
    }
  };

  const handleRestoreGroup = (groupId: string, groupName: string) => {
    restoreGroup(groupId);
    refreshData();
    toast.success(`Группа «${groupName}» восстановлена`);
  };

  const activeGroups = groups.filter((g) => !g.isDeleted && !(g as any).is_deleted);
  const deletedGroups = groups.filter((g) => Boolean(g.isDeleted || (g as any).is_deleted));
  const currentGroups = statusFilter === 'deleted' ? deletedGroups : activeGroups;

  const filteredGroups = currentGroups.filter((g) => {
    return filterCourse === 'all' || g.courseName === filterCourse;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t('groups.title', 'Группы школы')}</h1>
          <p className="text-sm text-slate-600">
            {t('groups.subtitle', 'Управление группами, расписанием и расчет свободных мест')} • Всего активных: {activeGroups.length}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200">
            <button
              onClick={() => setStatusFilter('all')}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer',
                statusFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              Все группы ({activeGroups.length})
            </button>
            <button
              onClick={() => setStatusFilter('deleted')}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer',
                statusFilter === 'deleted'
                  ? 'bg-white text-rose-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              Удаленные ({deletedGroups.length})
            </button>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            {t('groups.createGroup', 'Создать группу')}
          </button>
        </div>
      </div>

      {/* Deleted Notice */}
      {statusFilter === 'deleted' && (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-700">
          <div className="flex items-center gap-2">
            <Trash2 className="h-4 w-4 text-slate-500" />
            <span>Раздел «Удаленные группы». Группы не удаляются окончательно и могут быть восстановлены в активный статус.</span>
          </div>
          <button
            onClick={() => setStatusFilter('all')}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Вернуться ко всем
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-xs text-xs">
        <Filter className="h-3.5 w-3.5 text-slate-500" />
        <span className="text-slate-600 font-medium">{t('groups.filterCourse', 'Фильтр по курсу:')}</span>
        <select
          value={filterCourse}
          onChange={(e) => setFilterCourse(e.target.value)}
          className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="all">{t('groups.allCourses', 'Все курсы')}</option>
          <option value="Английский язык">Английский язык</option>
          <option value="Робототехника">Робототехника</option>
          <option value="Математика">Математика</option>
        </select>
      </div>

      {/* Strict Grid of groups with uniform height */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
        {filteredGroups.length === 0 ? (
          <div className="col-span-full py-12 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-2xl bg-white">
            {statusFilter === 'deleted' ? 'В списке удаленных групп ничего нет' : 'Группы не найдены'}
          </div>
        ) : (
          filteredGroups.map((group) => {
            const capacity = group.capacity || (group as any).max_students || 8;
            const enrolledCount = group.students ? group.students.length : 0;
            const freeSpots = Math.max(0, capacity - enrolledCount);
            const occupancyPercent = Math.min(100, Math.round((enrolledCount / capacity) * 100));
            const isFull = freeSpots === 0 || occupancyPercent >= 100;
            const isDel = Boolean(group.isDeleted || (group as any).is_deleted);

            const isArchived = isDel || group.status === 'archived';
            const isActive = group.status === 'active' && !isArchived;

            const statusLabel = isArchived ? 'Архив' : isActive ? 'Активна' : 'Идет набор';
            const statusBadgeClass = isArchived
              ? 'bg-slate-100 text-slate-600 border-slate-200'
              : isActive
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-blue-50 text-blue-700 border-blue-200';

            const nextLessonInfo = getNextLessonForGroup(group.id, group.name, allLessons);

            return (
              <div
                key={group.id}
                onClick={() => {
                  if (!isDel) {
                    router.push(`/groups/${group.id}`);
                  }
                }}
                className={cn(
                  'relative rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between h-full group/card',
                  !isDel && 'cursor-pointer'
                )}
              >
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    {/* Header: Course Category, Group Name, Status Badge & Menu */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 block truncate">
                          {group.courseName}
                        </span>
                        <h3 className="mt-0.5 text-base font-bold text-slate-900 group-hover/card:text-blue-600 transition-colors truncate" title={group.name}>
                          {group.name}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={cn(
                            'rounded-full px-2.5 py-0.5 text-[10px] font-semibold border shrink-0',
                            statusBadgeClass
                          )}
                        >
                          {statusLabel}
                        </span>

                        {/* 3-Dots Menu */}
                        <div className="group-actions-menu-wrapper relative" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setActiveMenuGroupId(activeMenuGroupId === group.id ? null : group.id)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
                            title="Действия"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>

                          {activeMenuGroupId === group.id && (
                            <div className="absolute right-0 top-8 z-30 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                              {!isDel ? (
                                <>
                                  <button
                                    onClick={() => {
                                      setActiveMenuGroupId(null);
                                      setEditingGroup(group);
                                    }}
                                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                                  >
                                    <Edit className="h-3.5 w-3.5 text-blue-600" />
                                    <span>Редактировать группу</span>
                                  </button>
                                  <div className="my-1 border-t border-slate-100" />
                                  <button
                                    onClick={() => {
                                      setActiveMenuGroupId(null);
                                      handleDeleteGroup(group.id, group.name);
                                    }}
                                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                                    <span>Удалить группу</span>
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => {
                                    setActiveMenuGroupId(null);
                                    handleRestoreGroup(group.id, group.name);
                                  }}
                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                                >
                                  <RotateCcw className="h-3.5 w-3.5 text-emerald-600" />
                                  <span>Восстановить группу</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Info Rows */}
                    <div className="mt-3.5 space-y-2 text-xs text-slate-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-slate-500 shrink-0" />
                        <span className="font-medium text-slate-800 truncate">{group.schedule}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-slate-500 shrink-0" />
                        <span className="truncate">
                          {t('groups.teacher', 'Преподаватель')}: <strong className="text-slate-800">{group.teacherName}</strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Video className="h-4 w-4 text-blue-500 shrink-0" />
                        <span className="text-blue-700 font-medium truncate">{group.room || 'Онлайн (Zoom / платформа)'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Capacity Progress Bar */}
                  <div className="mt-4 rounded-xl bg-slate-50 p-3 border border-slate-100">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-medium">
                        {t('groups.capacity', 'Наполняемость')}: <strong className="text-slate-900">{enrolledCount} / {capacity}</strong>
                      </span>
                      <span className={cn(
                        'font-semibold text-[11px]',
                        isFull ? 'text-slate-600' : 'text-emerald-700'
                      )}>
                        {formatFreeSpots(freeSpots)}
                      </span>
                    </div>
                    <div className="mt-2 h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-300',
                          isFull ? 'bg-emerald-600' : 'bg-blue-600'
                        )}
                        style={{ width: `${occupancyPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Footer with Next Lesson Info & Journal Action */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-slate-600 truncate min-w-0 pr-2">
                    <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    {nextLessonInfo ? (
                      <span className="truncate">
                        Ближайший урок: <strong>{nextLessonInfo.dateFormatted}</strong> в <strong>{nextLessonInfo.timeFormatted}</strong>
                      </span>
                    ) : (
                      <span className="text-slate-400 truncate">Нет запланированных уроков</span>
                    )}
                  </div>

                  {isDel ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRestoreGroup(group.id, group.name);
                      }}
                      className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 cursor-pointer shrink-0"
                    >
                      <RotateCcw className="h-3 w-3" /> Восстановить
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-semibold text-blue-600 group-hover/card:text-blue-700 shrink-0">
                      Журнал и группа <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <CreateGroupModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={handleGroupCreated}
      />

      <EditGroupModal
        group={editingGroup}
        isOpen={Boolean(editingGroup)}
        onClose={() => setEditingGroup(null)}
        onSaved={handleGroupSaved}
      />
    </div>
  );
}
