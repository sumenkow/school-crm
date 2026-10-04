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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-5">
      {/* 1. Left Column: Cohort Retention (50%) */}
      <div className="lg:col-span-6 flex flex-col">
        <CohortRetentionCard
          cohorts={cohorts}
          anomalyText={cohortAnomaly.text}
          onNavigateTab={onNavigateTab}
        />
      </div>

      {/* 2. Right Column: Students at Risk (50%) */}
      <div className="lg:col-span-6 flex flex-col">
        <StudentsAtRiskCard
          students={studentsAtRisk}
          totalCount={totalRisksCount}
          reasonFilter={reasonFilter}
          onReasonFilterChange={setReasonFilter}
        />
      </div>
    </div>
  );
}
