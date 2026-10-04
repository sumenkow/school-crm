'use client';

import { useState, useCallback } from 'react';
import { AnalyticsFilters, AnalyticsPeriodOption } from '../types';

export const PERIOD_OPTIONS: AnalyticsPeriodOption[] = [
  { value: '2026-09', label: 'Сентябрь 2026' },
  { value: '2026-08', label: 'Август 2026' },
  { value: '2026-07', label: 'Июль 2026' },
  { value: '2026-06', label: 'Июнь 2026' },
  { value: '2026-05', label: 'Май 2026' },
  { value: '2026-04', label: 'Апрель 2026' },
  { value: '2026-03', label: 'Март 2026' },
  { value: '2026-02', label: 'Февраль 2026' },
  { value: '2026-01', label: 'Январь 2026' },
  { value: '2026-10', label: 'Октябрь 2026' },
  { value: '2026-11', label: 'Ноябрь 2026' },
  { value: '2026-12', label: 'Декабрь 2026' },
];

export const COMPARE_PERIOD_OPTIONS: AnalyticsPeriodOption[] = [
  { value: 'none', label: 'Без сравнения' },
  { value: '2026-08', label: 'Август 2026' },
  { value: '2026-07', label: 'Июль 2026' },
  { value: '2026-06', label: 'Июнь 2026' },
  { value: '2026-05', label: 'Май 2026' },
  { value: '2026-04', label: 'Апрель 2026' },
  { value: '2026-03', label: 'Март 2026' },
  { value: '2026-02', label: 'Февраль 2026' },
  { value: '2026-01', label: 'Январь 2026' },
  { value: '2025-09', label: 'Сентябрь 2025' },
];

export const DEFAULT_ANALYTICS_FILTERS: AnalyticsFilters = {
  period: '2026-09',
  comparePeriod: '2026-08',
  subjectId: 'all',
  groupId: 'all',
  teacherId: 'all',
};

export function useAnalyticsFilters(initialValues?: Partial<AnalyticsFilters>) {
  const [filters, setFiltersState] = useState<AnalyticsFilters>({
    ...DEFAULT_ANALYTICS_FILTERS,
    ...initialValues,
  });

  const setFilter = useCallback(
    <K extends keyof AnalyticsFilters>(key: K, value: AnalyticsFilters[K]) => {
      setFiltersState((prev) => ({
        ...prev,
        [key]: value,
      }));
    },
    []
  );

  const setFilters = useCallback((partial: Partial<AnalyticsFilters>) => {
    setFiltersState((prev) => ({
      ...prev,
      ...partial,
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState(DEFAULT_ANALYTICS_FILTERS);
  }, []);

  return {
    filters,
    setFilter,
    setFilters,
    resetFilters,
  };
}
