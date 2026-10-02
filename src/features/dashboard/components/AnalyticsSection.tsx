'use client';

import React, { useState } from 'react';
import { FullPaymentData, FullLeadData, FullGroupData } from '@/lib/data/mockData';
import { AnalyticsPeriod } from '../lib/analyticsHelpers';
import { AnalyticsPeriodSelector } from './AnalyticsPeriodSelector';
import { RevenueChartWidget } from './RevenueChartWidget';
import { LeadsChartWidget } from './LeadsChartWidget';
import { GroupOccupancyWidget } from './GroupOccupancyWidget';
import { WidgetErrorBoundary } from './WidgetErrorBoundary';
import { BarChart3 } from 'lucide-react';

export interface AnalyticsSectionProps {
  payments: FullPaymentData[];
  leads: FullLeadData[];
  groups: FullGroupData[];
  isLoading?: boolean;
  onRetry?: () => void;
}

export function AnalyticsSection({
  payments,
  leads,
  groups,
  isLoading = false,
  onRetry,
}: AnalyticsSectionProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<AnalyticsPeriod>('6m');

  return (
    <div className="space-y-4">
      {/* Section Header with Shared Period Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Сквозная аналитика школы</h2>
            <p className="text-xs text-slate-500">
              Показатели выручки, динамика заявок и укомплектованность групп
            </p>
          </div>
        </div>

        {/* Shared Period Controller */}
        <AnalyticsPeriodSelector
          period={selectedPeriod}
          onChange={setSelectedPeriod}
        />
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Revenue Chart */}
        <WidgetErrorBoundary widgetName="Динамика выручки" onRetry={onRetry}>
          <RevenueChartWidget
            payments={payments}
            period={selectedPeriod}
            isLoading={isLoading}
          />
        </WidgetErrorBoundary>

        {/* Leads Chart */}
        <WidgetErrorBoundary widgetName="Динамика лидов" onRetry={onRetry}>
          <LeadsChartWidget
            leads={leads}
            period={selectedPeriod}
            isLoading={isLoading}
          />
        </WidgetErrorBoundary>
      </div>

      {/* Group Occupancy */}
      <WidgetErrorBoundary widgetName="Заполняемость групп" onRetry={onRetry}>
        <GroupOccupancyWidget
          groups={groups}
          isLoading={isLoading}
        />
      </WidgetErrorBoundary>
    </div>
  );
}
