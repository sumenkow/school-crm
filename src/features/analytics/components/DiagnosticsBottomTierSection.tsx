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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-5">
      {/* 1. Left Column: Teacher Effectiveness (50%) */}
      <div className="lg:col-span-6 flex flex-col">
        <TeacherEffectivenessCard
          teachers={teachers}
          allCount={allTeachersCount}
          filter={teacherFilter}
          onFilterChange={setTeacherFilter}
        />
      </div>

      {/* 2. Right Column: Group Capacity (50%) */}
      <div className="lg:col-span-6 flex flex-col">
        <GroupCapacityCard
          groups={groups}
          allCount={allGroupsCount}
          subjectFilter={groupSubjectFilter}
          onSubjectFilterChange={setGroupSubjectFilter}
        />
      </div>
    </div>
  );
}
