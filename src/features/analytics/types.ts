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

// ============================================================================
// SALES & CONVERSION ANALYTICS TYPES
// ============================================================================

export type LeadChannelKey = 'website' | 'instagram' | 'referral' | 'telegram' | 'offline';

export interface SalesKpiCardData {
  id: string;
  label: string;
  value: string;
  previousValue: string;
  change: string;
  isPositive: boolean;
  isNeutral?: boolean;
  iconType: 'leads' | 'trials' | 'trials_held' | 'paid' | 'conversion' | 'revenue';
}

export interface SalesFunnelStage {
  id: 'new' | 'contacted' | 'trial_scheduled' | 'trial_held' | 'thinking' | 'paid';
  label: string;
  countCurrent: number;
  countPrevious: number;
  conversionRate: string;
  conversionRateNum: number;
  changeText: string;
  changeType: 'positive' | 'negative' | 'neutral';
  barPercentageCurrent: number;
  barPercentagePrevious: number;
}

export interface SalesFunnelAnomaly {
  hasAnomaly: boolean;
  stageFrom: string;
  stageTo: string;
  dropPp: number;
  alertText: string;
  subText: string;
}

export interface SalesChannelMetric {
  id: LeadChannelKey;
  label: string;
  colorDot: string;
  leadsCount: number;
  trialsCount: number;
  paidCount: number;
  conversionRate: string;
  conversionType: 'positive' | 'negative' | 'neutral';
  shareRate: string;
}

export interface SalesDynamicsPoint {
  label: string;
  leadsCount: number;
  trialsCount: number;
  paidCount: number;
}

export interface SalesSpeedMetrics {
  avgFirstContactTime: string;
  avgFirstContactDelta: string;
  avgFirstContactPositive: boolean;

  leadsOver24hCount: number;
  leadsOver24hDelta: string;

  leadsNoContactCount: number;
  leadsNoContactDelta: string;
}

export interface SalesLossReasonItem {
  id: string;
  label: string;
  color: string;
  count: number;
  sharePercentage: number;
  potentialRevenueRub: number;
  potentialRevenueFormatted: string;
}

export interface SalesManagerMetric {
  id: string;
  name: string;
  initials: string;
  badgeBg: string;
  badgeText: string;
  leadsCount: number;
  trialsCount: number;
  paidCount: number;
  conversionRate: string;
  conversionType: 'positive' | 'warning' | 'negative';
  avgContactTime: string;
  revenueRub: number;
  revenueFormatted: string;
}

export interface SalesDetailedLeadRow {
  id: string;
  date: string;
  leadName: string;
  contact: string;
  channel: string;
  channelKey: LeadChannelKey;
  stageLabel: string;
  stageDotColor: string;
  managerName: string;
  lossReasonText: string;
  offerAmountText: string;
  statusBadge: {
    label: 'Успешный' | 'Неуспешный' | 'В работе';
    variant: 'success' | 'danger' | 'info';
  };
}

export interface SalesTabData {
  isLoading: boolean;
  isEmpty: boolean;
  kpis: SalesKpiCardData[];
  funnelStages: SalesFunnelStage[];
  funnelAnomaly: SalesFunnelAnomaly;
  channels: SalesChannelMetric[];
  dynamics: {
    byMonth: SalesDynamicsPoint[];
    byWeek: SalesDynamicsPoint[];
  };
  speedMetrics: SalesSpeedMetrics;
  lossReasons: {
    items: SalesLossReasonItem[];
    totalLostCount: number;
    totalLostRevenueFormatted: string;
    isInsufficientData: boolean;
  };
  managers: {
    items: SalesManagerMetric[];
    belowAverageAlert: string | null;
  };
  detailedLeads: SalesDetailedLeadRow[];
}

// ============================================================================
// FINANCE & PROFITABILITY TAB TYPES
// ============================================================================

export interface FinanceKpiCardData {
  id: string;
  label: string;
  value: string;
  change: string;
  isPositive: boolean;
  previousValue: string;
  iconType: 'revenue' | 'paid' | 'debt' | 'avg_check' | 'ltv' | 'overdue';
}

export interface FinanceMonthlyAccrualPoint {
  month: string;
  accruedEur: number;
  accruedFormatted: string;
  paidEur: number;
  paidFormatted: string;
  debtEur: number;
  debtFormatted: string;
  trendFormatted: string;
  isPositiveTrend: boolean;
}

export interface FinanceDirectionMetric {
  id: string;
  name: string;
  badgeBg: string;
  badgeText: string;
  studentsCount: number;
  revenueEur: number;
  revenueFormatted: string;
  avgCheckEur: number;
  avgCheckFormatted: string;
  debtEur: number;
  debtFormatted: string;
}

export interface FinanceRevenueDynamicsPoint {
  month: string;
  currentEur: number;
  previousEur: number;
}

export interface FinanceRevenueStructureItem {
  id: string;
  name: string;
  color: string;
  sharePercent: number;
  revenueEur: number;
}

export interface FinanceLossCategoryItem {
  id: string;
  title: string;
  count: number;
  amountEur: number;
  amountFormatted: string;
  sharePercent: number;
  color: string;
}

export interface FinanceDebtorStudentRow {
  id: string;
  studentId: string;
  studentName: string;
  groupName: string;
  debtEur: number;
  debtFormatted: string;
  overdueDate: string;
  daysOverdue: number;
  riskLevel: 'Высокий' | 'Средний';
}

export interface FinanceStudentRiskRow {
  id: string;
  studentId: string;
  studentName: string;
  groupName: string;
  lessonsRemaining: number;
  lessonsRemainingColor: 'red' | 'orange' | 'green';
  endDate: string;
  statusText: 'Пакет заканчивается' | 'Низкий баланс' | 'Нет продления' | 'Ожидает оплаты' | 'Просрочен платеж';
  riskLevel: 'Высокий' | 'Средний';
}

export interface FinanceGroupRiskRow {
  id: string;
  groupId: string;
  groupName: string;
  totalStudents: number;
  debtStudentsCount: number;
  debtSharePercent: number;
  debtAmountEur: number;
  debtAmountFormatted: string;
}

export interface FinanceTabData {
  isLoading: boolean;
  isEmpty: boolean;
  kpis: FinanceKpiCardData[];
  monthlyAccruals: FinanceMonthlyAccrualPoint[];
  directions: FinanceDirectionMetric[];
  dynamics: FinanceRevenueDynamicsPoint[];
  structure: {
    items: FinanceRevenueStructureItem[];
    totalRevenueFormatted: string;
  };
  lossAnalysis: {
    items: FinanceLossCategoryItem[];
    potentialLossFormatted: string;
    potentialLossDelta: string;
    potentialLossShareText: string;
  };
  debtsSummary: {
    totalDebtFormatted: string;
    totalDebtDelta: string;
    overdueDebtFormatted: string;
    overdueDebtDelta: string;
    debtorsCount: number;
    debtorsCountDelta: string;
    debtorsList: FinanceDebtorStudentRow[];
  };
  riskTabs: {
    students: FinanceStudentRiskRow[];
    groups: FinanceGroupRiskRow[];
  };
}

// ============================================================================
// GROUPS TAB TYPES
// ============================================================================

export interface GroupsKpiCardData {
  id: string;
  label: string;
  value: string;
  change: string;
  isPositive: boolean;
  previousValue: string;
  iconType: 'active_groups' | 'active_students' | 'avg_size' | 'underfilled' | 'operational_issues';
}

export interface GroupSizeDistributionItem {
  id: string;
  label: string;
  count: number;
  sharePercent: number;
}

export interface GroupDirectionItem {
  id: string;
  name: string;
  badgeLetter: string;
  badgeBg: string;
  badgeText: string;
  barColor: string;
  count: number;
  sharePercent: number;
}

export interface GroupDynamicsPoint {
  month: string;
  activeGroups: number;
  avgSize: number;
}

export interface GroupStabilityItem {
  id: 'stable' | 'attention' | 'unstable';
  label: string;
  count: number;
  sharePercent: number;
  description: string;
  color: string;
}

export interface GroupFlowsSummary {
  newStudentsCount: number;
  newStudentsDelta: string;
  churnStudentsCount: number;
  churnStudentsDelta: string;
  transferredCount: number;
  transferredDelta: string;
  netChangeCount: number;
  netChangeDelta: string;
  topChangedGroups: Array<{
    id: string;
    groupId: string;
    groupName: string;
    prevCount: number;
    currentCount: number;
    change: number;
    changeFormatted: string;
  }>;
}

export interface GroupAttendanceDirectionItem {
  id: string;
  name: string;
  badgeLetter: string;
  badgeBg: string;
  badgeText: string;
  ratePercent: number;
  barColor: string;
}

export interface GroupAttentionRow {
  id: string;
  groupId: string;
  groupName: string;
  directionName: string;
  teacherName: string;
  signalText: string;
  valueText: string;
  priority: 'Высокий' | 'Средний';
  badgeType: 'red' | 'amber';
}

export interface GroupExpiringStudentRow {
  id: string;
  studentId: string;
  studentName: string;
  groupName: string;
  endDate: string;
  statusText: string;
}

export interface GroupsTabData {
  isLoading: boolean;
  isEmpty: boolean;
  kpis: GroupsKpiCardData[];
  sizeDistribution: GroupSizeDistributionItem[];
  directions: GroupDirectionItem[];
  dynamics: GroupDynamicsPoint[];
  stability: {
    totalGroups: number;
    items: GroupStabilityItem[];
  };
  flows: GroupFlowsSummary;
  attendanceDirections: GroupAttendanceDirectionItem[];
  attentionGroups: GroupAttentionRow[];
  expiringStudents: GroupExpiringStudentRow[];
}

// ============================================================================
// TEACHERS ANALYTICS TYPES (Per docs/reference_teachers.png)
// ============================================================================

export interface TeachersKpiCardData {
  id: string;
  label: string;
  value: string;
  change: string;
  isPositive: boolean;
  previousValue: string;
  unitText?: string;
  iconType: 'active_teachers' | 'conducted_lessons' | 'avg_workload' | 'schedule_completion' | 'deviations';
}

export interface TeacherWorkloadItem {
  id: string;
  name: string;
  initials: string;
  avatarUrl?: string;
  lessonsCount: number;
  hoursCount: number;
  groupsCount: number;
  studentsCount: number;
  sharePercent: number;
}

export interface TeacherWorkloadDistributionItem {
  id: 'high' | 'normal' | 'low';
  label: string;
  description: string;
  count: number;
  sharePercent: number;
  color: string;
}

export interface TeacherDynamicsPoint {
  month: string;
  conductedLessons: number;
  activeTeachers: number;
  avgWorkload: number;
}

export interface TeacherStabilityItem {
  id: 'completed' | 'rescheduled' | 'cancelled';
  label: string;
  count: number;
  sharePercent: number;
  color: string;
}

export interface TeacherStaffChangeTile {
  id: 'new' | 'left' | 'load_changed' | 'net_change';
  label: string;
  value: string;
  subtext: string;
  type: 'positive' | 'negative' | 'neutral';
}

export interface TeacherAttendanceItem {
  id: string;
  name: string;
  initials: string;
  avatarUrl?: string;
  attendanceRate: number;
  groupsCount: number;
}

export interface TeacherAttentionRow {
  id: string;
  teacherId: string;
  teacherName: string;
  initials: string;
  signalText: string;
  signalType: 'high_load' | 'reschedules' | 'low_load' | 'low_attendance';
  valueText: string;
  groupsCount: number;
  priority: 'Высокий' | 'Средний';
  badgeType: 'red' | 'amber';
}

export interface TeacherGroupRelationRow {
  id: string;
  teacherId: string;
  teacherName: string;
  initials: string;
  direction: string;
  groupsCount: number;
  studentsCount: number;
  lessonsCount: number;
  status: string;
}

export interface TeachersTabData {
  isLoading: boolean;
  isEmpty: boolean;
  kpis: TeachersKpiCardData[];
  workloadList: TeacherWorkloadItem[];
  distribution: {
    totalTeachers: number;
    items: TeacherWorkloadDistributionItem[];
  };
  dynamics: TeacherDynamicsPoint[];
  stability: {
    completionRate: string;
    totalLessons: number;
    items: TeacherStabilityItem[];
  };
  staffChanges: TeacherStaffChangeTile[];
  attendanceList: TeacherAttendanceItem[];
  attentionTeachers: TeacherAttentionRow[];
  teacherGroupRelations: TeacherGroupRelationRow[];
}

// ============================================================================
// DETAILED REPORTS ANALYTICS TYPES (Per docs/reference_reports.png)
// ============================================================================

export type DetailedReportsSubTabKey =
  | 'admin_efficiency'
  | 'tasks_sla'
  | 'communications'
  | 'payments'
  | 'renewals'
  | 'operations_log';

export interface AdminHeroKpiData {
  integralKpi: {
    score: number;
    maxScore: number;
    change: string;
    subtext: string;
  };
  taskCompletion: {
    percent: number;
    change: string;
    completed: number;
    total: number;
  };
  collectedPayments: {
    amountEur: number;
    amountFormatted: string;
    change: string;
    paidCount: number;
    totalInvoices: number;
    conversionPercent: number;
  };
  contactSla: {
    minutes: number;
    change: string;
    targetMinutes: number;
    csat: number;
  };
}

export interface AdminEfficiencySummaryRow {
  id: string;
  name: string;
  initials: string;
  avatarUrl?: string;
  kpiScore: number;
  tasksRatePercent: number;
  slaMinutes: number;
  paymentsPercent: number;
  renewalsPercent: number;
}

export interface TaskStatusDistributionItem {
  id: string;
  label: string;
  count: number;
  sharePercent: number;
  color: string;
}

export interface ReactionSpeedDistributionItem {
  id: string;
  label: string;
  sharePercent: number;
}

export interface PaymentStatusDistributionItem {
  id: string;
  label: string;
  count: number;
  sharePercent: number;
  color: string;
}

export interface RenewalStatusDistributionItem {
  id: string;
  label: string;
  count: number;
  sharePercent: number;
  color: string;
}

export interface AdminTaskDistributionRow {
  id: string;
  adminName: string;
  initials: string;
  avatarUrl?: string;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  overduePercent: number;
  avgHours: number;
}

export interface RecentCommunicationRow {
  id: string;
  date: string;
  clientName: string;
  phone?: string;
  channel: 'WhatsApp' | 'Telegram' | 'Телефон' | 'Сайт';
  subject: string;
  reactionTime: string;
  reactionMinutes?: number;
  isOverdueSla: boolean;
  responsibleName: string;
  status: 'Обработано' | 'Просрочено';
  outcome?: string;
}

export interface OperationLogRow {
  id: string;
  timestamp: string;
  admin: string;
  initials: string;
  category: 'Оплаты' | 'Обращения' | 'Задачи' | 'Продления' | 'История';
  action: string;
  target: string;
  status: 'Успешно' | 'Задержка' | 'В работе';
}

export interface PaymentAttentionRow {
  id: string;
  invoiceDate: string;
  studentName: string;
  amountEur: number;
  amountFormatted: string;
  deadline: string;
  statusText: string;
  isOverdue: boolean;
  responsibleName: string;
}

export interface DetailedReportsData {
  isLoading: boolean;
  heroKpis: AdminHeroKpiData;
  adminSummaryTable: AdminEfficiencySummaryRow[];
  taskStatusDonut: {
    total: number;
    items: TaskStatusDistributionItem[];
  };
  reactionSpeedBars: ReactionSpeedDistributionItem[];
  paymentStatusDonut: {
    total: number;
    items: PaymentStatusDistributionItem[];
  };
  renewalStatusDonut: {
    total: number;
    items: RenewalStatusDistributionItem[];
  };
  dynamicsTimeline: Array<{
    month: string;
    kpi: number;
    tasks: number;
    payments: number;
    renewals: number;
  }>;
  adminTasksList: AdminTaskDistributionRow[];
  recentCommunications: RecentCommunicationRow[];
  attentionPayments: PaymentAttentionRow[];
  operationsLogs?: OperationLogRow[];
}
