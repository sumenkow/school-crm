'use client';

import React from 'react';
import { AnalyticsFilters, AnalyticsTabKey } from '../types';
import { DiagnosticsAttentionSection } from './DiagnosticsAttentionSection';

export interface DiagnosticsCockpitProps {
  filters: AnalyticsFilters;
  onNavigateTab?: (tab: AnalyticsTabKey) => void;
}

export function DiagnosticsCockpit({
  filters,
  onNavigateTab,
}: DiagnosticsCockpitProps) {
  return (
    <div className="space-y-6">
      {/* 1. Main Diagnostic Block: «Что требует внимания» */}
      <DiagnosticsAttentionSection
        filters={filters}
        onNavigateTab={onNavigateTab}
      />
    </div>
  );
}
