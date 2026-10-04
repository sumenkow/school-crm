'use client';

import React from 'react';
import { AnalyticsFilters, AnalyticsTabKey } from '../types';
import { useDiagnosticsTeachersAndGroups } from '../hooks/useDiagnosticsTeachersAndGroups';
import { TeacherEffectivenessCard } from './TeacherEffectivenessCard';
import { GroupCapacityCard } from './GroupCapacityCard';

export interface DiagnosticsBottomTierSectionProps {
  filters: AnalyticsFilters;
  onNavigateTab?: (tab: AnalyticsTabKey) => void;
}

export function DiagnosticsBottomTierSection({
  filters,
  onNavigateTab,
}: DiagnosticsBottomTierSectionProps) {
  const {
    teachers,
    allTeachersCount,
    teacherFilter,
    setTeacherFilter,
    groups,
    allGroupsCount,
    groupSubjectFilter,
    setGroupSubjectFilter,
  } = useDiagnosticsTeachersAndGroups(filters);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 mb-3">
      {/* 1. Left Column: Teacher Effectiveness (50%) */}
      <div className="lg:col-span-6 flex flex-col">
        <TeacherEffectivenessCard
          teachers={teachers}
          allCount={allTeachersCount}
          filter={teacherFilter}
          onFilterChange={setTeacherFilter}
          onNavigateTab={onNavigateTab}
        />
      </div>

      {/* 2. Right Column: Group Capacity (50%) */}
      <div className="lg:col-span-6 flex flex-col">
        <GroupCapacityCard
          groups={groups}
          allCount={allGroupsCount}
          subjectFilter={groupSubjectFilter}
          onSubjectFilterChange={setGroupSubjectFilter}
          onNavigateTab={onNavigateTab}
        />
      </div>
    </div>
  );
}
