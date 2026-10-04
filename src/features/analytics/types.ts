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

export type DiagnosticSeverity = 'critical' | 'warning' | 'info' | 'notice' | 'healthy';

export type DiagnosticFilterMode = 'all' | 'critical' | 'mine';

export type DiagnosticIssueId =
  | 'trial_conversion'
  | 'churn_risk'
  | 'underfilled_groups'
  | 'stale_leads'
  | 'teacher_attendance';

export interface DiagnosticAffectedItem {
  id: string;
  title: string;
  subtitle?: string;
  value?: string;
  link?: string;
}

export interface DiagnosticIssue {
  id: DiagnosticIssueId;
  severity: DiagnosticSeverity;
  title: string;
  statsText: string;
  deltaBadge: string;
  deltaType: 'negative' | 'positive' | 'neutral';
  scaleText: string;
  isHealthy: boolean;
  drillDownUrl: string;
  drillDownTab?: AnalyticsTabKey;
  drillDownActionLabel: string;
  affectedCount: number;
  isMine: boolean;
  affectedItems: DiagnosticAffectedItem[];
}

export interface DiagnosticRules {
  minTrialConversionRate: number; // default: 50%
  maxChurnAttendanceRate: number; // default: 75%
  minGroupOccupancyRate: number; // default: 70%
  maxLeadContactHours: number; // default: 24h
  minTeacherAttendanceRate: number; // default: 80%
}

export const DEFAULT_DIAGNOSTIC_RULES: DiagnosticRules = {
  minTrialConversionRate: 50,
  maxChurnAttendanceRate: 75,
  minGroupOccupancyRate: 70,
  maxLeadContactHours: 24,
  minTeacherAttendanceRate: 80,
};

