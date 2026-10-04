'use client';

import React from 'react';
import { AnalyticsFilters, AnalyticsTabKey } from '../types';
import { DiagnosticsCockpit } from './DiagnosticsCockpit';

export interface DiagnosticsPlaceholderProps {
  filters: AnalyticsFilters;
  onNavigateTab?: (tab: AnalyticsTabKey) => void;
}

export function DiagnosticsPlaceholder({ filters, onNavigateTab }: DiagnosticsPlaceholderProps) {
  return <DiagnosticsCockpit filters={filters} onNavigateTab={onNavigateTab} />;
}
