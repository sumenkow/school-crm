'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useFocusSync } from '@/hooks/useFocusSync';
import { Trash2 } from 'lucide-react';
import { INITIAL_GROUPS, FullGroupData, FullLessonData, INITIAL_LESSONS } from '@/lib/data/mockData';
import { getStoredGroups, saveGroupToStorage, softDeleteGroup, restoreGroup } from '@/lib/data/groupStorage';
import { getStoredLessons } from '@/lib/data/lessonStorage';
import { CreateGroupModal } from '@/components/groups/CreateGroupModal';
import { EditGroupModal } from '@/components/groups/EditGroupModal';
import { ScheduleLessonModal } from '@/components/calendar/ScheduleLessonModal';
import { GroupFilterBar } from '@/components/groups/GroupFilterBar';
import { GroupCard } from '@/components/groups/GroupCard';
import { GroupTableView } from '@/components/groups/GroupTableView';
import {
  filterAndSortGroups,
  GroupSortOption,
  GroupPresentationItem,
} from '@/features/groups/lib/groupsWorkspaceEngine';
import { useToast } from '@/context/ToastContext';

const STATUSES_OPTIONS = [
  { id: 'active', label: 'Активна' },
  { id: 'recruiting', label: 'Идет набор' },
  { id: 'finished', label: 'Завершена' },
  { id: 'paused', label: 'Пауза' },
  { id: 'archived', label: 'Архив' },
];

export default function GroupsPage() {
  const toast = useToast();

  // 1. Core SSOT Data States
  const [groups, setGroups] = useState<FullGroupData[]>(() => {
    return typeof window !== 'undefined' ? getStoredGroups() : INITIAL_GROUPS;
  });
  const [allLessons, setAllLessons] = useState<FullLessonData[]>(() => {
    return typeof window !== 'undefined' ? getStoredLessons() : INITIAL_LESSONS;
  });

  // 2. View Mode (Card vs Table) with localStorage persistence
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [isClientMounted, setIsClientMounted] = useState(false);

  useEffect(() => {
    setIsClientMounted(true);
    try {
      const saved = localStorage.getItem('crm_groups_view_mode');
      if (saved === 'cards' || saved === 'table') {
        setViewMode(saved);
      }
    } catch {}
  }, []);

  const handleViewModeChange = (mode: 'cards' | 'table') => {
    setViewMode(mode);
    try {
      localStorage.setItem('crm_groups_view_mode', mode);
    } catch {}
  };

  // 3. Filter and Sorting States
  const [currentTab, setCurrentTab] = useState<'all' | 'deleted'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedTeacher, setSelectedTeacher] = useState('all');
  const [sortBy, setSortBy] = useState<GroupSortOption>('schedule');

  // 4. Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<FullGroupData | null>(null);
  const [scheduleModalGroupId, setScheduleModalGroupId] = useState<string | null>(null);

  // 5. Reactive Data Syncing
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

  // 6. Counts and Dropdown Values
  const activeCount = useMemo(() => {
    return groups.filter((g) => !g.isDeleted && !(g as any).is_deleted).length;
  }, [groups]);

  const deletedCount = useMemo(() => {
    return groups.filter((g) => Boolean(g.isDeleted || (g as any).is_deleted)).length;
  }, [groups]);

  const uniqueCourses = useMemo(() => {
    const set = new Set<string>();
    groups.forEach((g) => {
      if (g.courseName) set.add(g.courseName);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ru'));
  }, [groups]);

  const uniqueTeachers = useMemo(() => {
    const set = new Set<string>();
    groups.forEach((g) => {
      if (g.teacherName) set.add(g.teacherName);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ru'));
  }, [groups]);

  // 7. Memoized Filtered and Sorted Presentation Items
  const presentationGroups: GroupPresentationItem[] = useMemo(() => {
    return filterAndSortGroups({
      groups,
      allLessons,
      tab: currentTab,
      searchQuery,
      courseFilter: selectedCourse,
      teacherFilter: selectedTeacher,
      statusFilter: selectedStatus,
      sortBy,
    });
  }, [
    groups,
    allLessons,
    currentTab,
    searchQuery,
    selectedCourse,
    selectedTeacher,
    selectedStatus,
    sortBy,
  ]);

  // 8. Action Handlers
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

  const handleEditGroup = (groupId: string) => {
    const target = groups.find((g) => g.id === groupId) || null;
    setEditingGroup(target);
  };

  const handleAddLesson = (groupId: string) => {
    setScheduleModalGroupId(groupId);
  };

  const handleDeleteGroup = (groupId: string, groupName: string) => {
    if (
      confirm(
        `Вы уверены, что хотите переместить группу «${groupName}» в архив / удаленные? Ее можно восстановить в любой момент.`
      )
    ) {
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

  return (
    <div className="space-y-5 w-full min-w-0">
      {/* 1. Header, Actions & Filter Controls Bar (R1) */}
      <GroupFilterBar
        activeCount={activeCount}
        deletedCount={deletedCount}
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        courses={uniqueCourses}
        selectedCourse={selectedCourse}
        onCourseChange={setSelectedCourse}
        statuses={STATUSES_OPTIONS}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        teachers={uniqueTeachers}
        selectedTeacher={selectedTeacher}
        onTeacherChange={setSelectedTeacher}
        sortBy={sortBy}
        onSortChange={setSortBy}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        onCreateGroup={() => setIsCreateModalOpen(true)}
      />

      {/* 2. Notice when viewing Deleted Tab */}
      {currentTab === 'deleted' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-100/90 border border-slate-200 text-xs text-slate-700 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <Trash2 className="h-4 w-4 text-slate-500 shrink-0" />
            <span>
              Раздел «Удаленные группы». Группы не удаляются окончательно и могут быть восстановлены в активный статус.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setCurrentTab('all')}
            className="self-start sm:self-auto rounded-xl border border-slate-300 bg-white px-3 py-1 font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
          >
            Вернуться ко всем группам
          </button>
        </div>
      )}

      {/* 3. Main Groups Presentation (Card View 3x2 vs Dense Table View) */}
      {viewMode === 'cards' ? (
        <div className="w-full min-w-0">
          {presentationGroups.length === 0 ? (
            <div className="py-14 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-2xl bg-white shadow-xs">
              {currentTab === 'deleted'
                ? 'В списке удаленных групп ничего нет'
                : 'По заданным критериям группы не найдены'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 w-full min-w-0">
              {presentationGroups.map((item) => (
                <GroupCard
                  key={item.id}
                  group={item}
                  onEdit={handleEditGroup}
                  onAddLesson={handleAddLesson}
                  onDelete={handleDeleteGroup}
                  onRestore={handleRestoreGroup}
                  onStatusClick={(status) =>
                    setSelectedStatus((prev) => (prev === status ? 'all' : status))
                  }
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <GroupTableView
          groups={presentationGroups}
          onEdit={handleEditGroup}
          onAddLesson={handleAddLesson}
          onDelete={handleDeleteGroup}
          onRestore={handleRestoreGroup}
          onStatusClick={(status) =>
            setSelectedStatus((prev) => (prev === status ? 'all' : status))
          }
        />
      )}

      {/* 4. Modals */}
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

      {scheduleModalGroupId && (
        <ScheduleLessonModal
          isOpen={Boolean(scheduleModalGroupId)}
          onClose={() => setScheduleModalGroupId(null)}
          defaultGroupId={scheduleModalGroupId}
          onScheduled={() => {
            refreshData();
            setScheduleModalGroupId(null);
            toast.success('Занятие успешно добавлено');
          }}
        />
      )}
    </div>
  );
}
