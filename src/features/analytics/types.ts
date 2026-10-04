export interface AnalyticsFilters {
  period: string; // e.g. '2026-09'
  comparePeriod: string; // e.g. '2026-08' | 'none'
  subjectId: string; // 'all' | courseId
  groupId: string; // 'all' | groupId
  teacherId: string; // 'all' | teacherId
}

export type AnalyticsTabKey =
  | 'diagnostics'
  | 'sales'
  | 'retention'
  | 'finance'
  | 'groups'
  | 'teachers'
  | 'reports';

export interface AnalyticsPeriodOption {
  value: string;
  label: string;
}
