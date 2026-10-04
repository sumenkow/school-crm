'use client';

import React from 'react';
import { AnalyticsFilters, AnalyticsTabKey } from '../types';
import { useDiagnosticsRetentionAndRisks } from '../hooks/useDiagnosticsRetentionAndRisks';
import { CohortRetentionCard } from './CohortRetentionCard';
import { StudentsAtRiskCard } from './StudentsAtRiskCard';

export interface DiagnosticsRetentionSectionProps {
  filters: AnalyticsFilters;
  onNavigateTab?: (tab: AnalyticsTabKey) => void;
}

export function DiagnosticsRetentionSection({
  filters,
  onNavigateTab,
}: DiagnosticsRetentionSectionProps) {
  const {
    cohorts,
    cohortAnomaly,
    studentsAtRisk,
    totalRisksCount,
    reasonFilter,
    setReasonFilter,
  } = useDiagnosticsRetentionAndRisks(filters);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-1.5 h-[188px] shrink-0">
      {/* 1. Left Column: Cohort Retention (60%) */}
      <div className="lg:col-span-7 flex flex-col h-full min-h-0 min-w-0">
        <CohortRetentionCard
          cohorts={cohorts}
          anomalyText={cohortAnomaly.text}
          onNavigateTab={onNavigateTab}
        />
      </div>

      {/* 2. Right Column: Students at Risk (40%) */}
      <div className="lg:col-span-5 flex flex-col h-full min-h-0 min-w-0">
        <StudentsAtRiskCard
          students={studentsAtRisk}
          totalCount={totalRisksCount}
          reasonFilter={reasonFilter}
          onReasonFilterChange={setReasonFilter}
          onNavigateTab={onNavigateTab}
        />
      </div>
    </div>
  );
}
