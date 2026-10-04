'use client';

import React from 'react';
import { AnalyticsFilters, AnalyticsTabKey } from '../types';
import { DiagnosticsAttentionSection } from './DiagnosticsAttentionSection';
import { DiagnosticsMidTierSection } from './DiagnosticsMidTierSection';

export interface DiagnosticsCockpitProps {
  filters: AnalyticsFilters;
  onNavigateTab?: (tab: AnalyticsTabKey) => void;
}

export function DiagnosticsCockpit({
  filters,
  onNavigateTab,
}: DiagnosticsCockpitProps) {
  return (
    <div className="space-y-5">
      {/* 1. Main Diagnostic Block: «Что требует внимания» */}
      <DiagnosticsAttentionSection
        filters={filters}
        onNavigateTab={onNavigateTab}
      />

      {/* 2. Mid-Tier 50/50: «Диагностика воронки продаж» & «Потери потенциальной выручки» */}
      <DiagnosticsMidTierSection
        filters={filters}
        onNavigateTab={onNavigateTab}
      />
    </div>
  );
}
