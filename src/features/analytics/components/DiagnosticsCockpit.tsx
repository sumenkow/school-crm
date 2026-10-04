'use client';

import React from 'react';
import { AnalyticsFilters, AnalyticsTabKey } from '../types';
import { DiagnosticsAttentionSection } from './DiagnosticsAttentionSection';
import { DiagnosticsMidTierSection } from './DiagnosticsMidTierSection';
import { DiagnosticsRetentionSection } from './DiagnosticsRetentionSection';
import { DiagnosticsBottomTierSection } from './DiagnosticsBottomTierSection';

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

      {/* 3. Tier 3 50/50: «Удержание учеников (Retention)» & «Ученики в зоне риска» */}
      <DiagnosticsRetentionSection
        filters={filters}
        onNavigateTab={onNavigateTab}
      />

      {/* 4. Bottom-Tier 50/50: «Эффективность преподавателей» & «Загрузка групп» */}
      <DiagnosticsBottomTierSection
        filters={filters}
        onNavigateTab={onNavigateTab}
      />
    </div>
  );
}
