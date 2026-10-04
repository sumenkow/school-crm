'use client';

import React from 'react';
import { AnalyticsFilters, AnalyticsTabKey } from '../types';
import { useDiagnosticsMidTier } from '../hooks/useDiagnosticsMidTier';
import { FunnelDiagnosticsCard } from './FunnelDiagnosticsCard';
import { RevenueLossesCard } from './RevenueLossesCard';

import { COMPARE_PERIOD_OPTIONS } from '../hooks/useAnalyticsFilters';

export interface DiagnosticsMidTierSectionProps {
  filters: AnalyticsFilters;
  onNavigateTab?: (tab: AnalyticsTabKey) => void;
}

export function DiagnosticsMidTierSection({
  filters,
  onNavigateTab,
}: DiagnosticsMidTierSectionProps) {
  const { funnelData, revenueLosses } = useDiagnosticsMidTier(filters);

  const comparePeriodLabel =
    COMPARE_PERIOD_OPTIONS.find((p) => p.value === filters.comparePeriod)?.label || 'прошлым периодом';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 my-5">
      {/* 1. Left Column: Funnel Diagnostics (50%) */}
      <div className="lg:col-span-6 flex flex-col">
        <FunnelDiagnosticsCard
          stages={funnelData.stages}
          insight={funnelData.insight}
          comparePeriodLabel={comparePeriodLabel}
          onNavigateTab={onNavigateTab}
        />
      </div>

      {/* 2. Right Column: Potential Revenue Losses (50%) */}
      <div className="lg:col-span-6 flex flex-col">
        <RevenueLossesCard
          losses={revenueLosses}
          onNavigateTab={onNavigateTab}
        />
      </div>
    </div>
  );
}
