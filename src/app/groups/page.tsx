'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Users, Clock, Calendar, GraduationCap, ArrowRight, Filter, Video, MoreHorizontal, Edit, Trash2, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { INITIAL_GROUPS, FullGroupData } from '@/lib/data/mockData';
import { getStoredGroups, saveGroupToStorage, softDeleteGroup, restoreGroup } from '@/lib/data/groupStorage';
import { CreateGroupModal } from '@/components/groups/CreateGroupModal';
import { EditGroupModal } from '@/components/groups/EditGroupModal';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';

export default function GroupsPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const toast = useToast();
  const [groups, setGroups] = useState<FullGroupData[]>(() => {
    return typeof window !== 'undefined' ? getStoredGroups() : INITIAL_GROUPS;
  });
  const [filterCourse, setFilterCourse] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'deleted'>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<FullGroupData | null>(null);
  const [activeMenuGroupId, setActiveMenuGroupId] = useState<string | null>(null);

  const refreshGroups = () => {
    setGroups(getStoredGroups());
  };

  useEffect(() => {
    refreshGroups();
    const sync = () => refreshGroups();
    window.addEventListener('crm-groups-changed', sync);
    window.addEventListener('crm-students-changed', sync);
    window.addEventListener('focus', sync);
    return () => {
      window.removeEventListener('crm-groups-changed', sync);
      window.removeEventListener('crm-students-changed', sync);
      window.removeEventListener('focus', sync);
    };
  }, []);

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
    refreshGroups();
    toast.success(`Группа «${newGroup.name}» успешно создана`);
  };

  const handleGroupSaved = (updatedGroup: FullGroupData) => {
    saveGroupToStorage(updatedGroup);
    refreshGroups();
    toast.success(`Группа «${updatedGroup.name}» обновлена`);
  };

  const handleDeleteGroup = (groupId: string, groupName: string) => {
    if (confirm(`Вы уверены, что хотите переместить группу «${groupName}» в удаленные? Ее можно восстановить в любой момент.`)) {
      softDeleteGroup(groupId);
      refreshGroups();
      toast.success(`Группа «${groupName}» перемещена в удаленные`);
    }
  };

  const handleRestoreGroup = (groupId: string, groupName: string) => {
    restoreGroup(groupId);
    refreshGroups();
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

      {/* Grid of groups */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredGroups.length === 0 ? (
          <div className="col-span-full py-12 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-2xl bg-white">
            {statusFilter === 'deleted' ? 'В списке удаленных групп ничего нет' : 'Группы не найдены'}
          </div>
        ) : (
          filteredGroups.map((group) => {
            const enrolledCount = group.students.length;
            const freeSpots = group.capacity - enrolledCount;
            const occupancyPercent = Math.min(100, Math.round((enrolledCount / group.capacity) * 100));
            const isDel = Boolean(group.isDeleted || (group as any).is_deleted);

            return (
              <div
                key={group.id}
                onClick={() => {
                  if (!isDel) {
                    router.push(`/groups/${group.id}`);
                  }
                }}
                className={cn(
                  'relative rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between',
                  !isDel && 'cursor-pointer'
                )}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                        {group.courseName}
                      </span>
                      <h3 className="mt-0.5 text-base font-bold text-slate-900 hover:text-blue-600 transition-colors">
                        {group.name}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-0.5 text-[10px] font-semibold border',
                          isDel
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : group.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        )}
                      >
                        {isDel ? 'Удалена' : group.status === 'active' ? t('status.active', 'Идут занятия') : t('status.trial', 'Набор')}
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

                  <div className="mt-4 space-y-2 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-500" />
                      <span className="font-medium text-slate-800">{group.schedule}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-slate-500" />
                      <span>{t('groups.teacher', 'Преподаватель')}: <strong className="text-slate-800">{group.teacherName}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4 text-blue-500" />
                      <span className="text-blue-700 font-medium">{t('groups.onlineClass', 'Онлайн (Zoom / платформа)')}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                      <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {t('groups.paymentStatus', 'Оплата занятий')}: {t('status.paid', 'Оплачено')}
                      </span>
                    </div>
                  </div>

                  {/* Capacity Progress Bar */}
                  <div className="mt-5 rounded-xl bg-slate-50 p-3 border border-slate-100">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-medium">
                        {t('groups.capacity', 'Наполняемость')}: <strong className="text-slate-900">{enrolledCount} / {group.capacity}</strong>
                      </span>
                      <span className={cn(
                        'font-bold text-[11px]',
                        freeSpots === 0 ? 'text-rose-600' : freeSpots <= 2 ? 'text-amber-600' : 'text-emerald-600'
                      )}>
                        {freeSpots === 0 ? t('groups.full', 'Группа заполнена') : `${t('groups.freeSpots', 'Свободно')}: ${freeSpots} ${t('groups.spots', 'мест')}`}
                      </span>
                    </div>
                    <div className="mt-2 h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-300',
                          freeSpots === 0 ? 'bg-rose-500' : occupancyPercent >= 75 ? 'bg-emerald-500' : 'bg-blue-500'
                        )}
                        style={{ width: `${occupancyPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">{t('status.scheduled', 'Старт')}: {group.startDate}</span>
                  {isDel ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRestoreGroup(group.id, group.name);
                      }}
                      className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 cursor-pointer"
                    >
                      <RotateCcw className="h-3 w-3" /> Восстановить
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-700">
                      {t('action.openProfile', 'Открыть карточку группы')} <ArrowRight className="h-3.5 w-3.5" />
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
