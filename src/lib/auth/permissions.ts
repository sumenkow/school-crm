export type AppRole = 'developer' | 'owner' | 'admin' | 'teacher';

export const permissions = {
  // Дашборды
  canViewOwnerDashboard: (role: AppRole) => ['developer', 'owner'].includes(role),
  canViewAdminDashboard: (role: AppRole) => role === 'admin',
  
  // Стратегические финансы и настройки школы
  canViewSchoolFinances: (role: AppRole) => ['developer', 'owner'].includes(role), // выручка школы, P&L, задолженность школы
  canManageSchoolSettings: (role: AppRole) => ['developer', 'owner'].includes(role), // IBAN, юрлицо, банковские счета
  canManageTeamRates: (role: AppRole) => ['developer', 'owner'].includes(role), // зарплатные ставки учителей
  canExportDatabase: (role: AppRole) => ['developer', 'owner'].includes(role),

  // Операционные финансы учеников
  canViewStudentFinancialAmounts: (role: AppRole) => ['developer', 'owner', 'admin'].includes(role), // видит суммы: 108 €, ставки, вкладку «Финансы»
  canManageStudentPayments: (role: AppRole) => ['developer', 'owner', 'admin'].includes(role), // кнопки «Внести оплату», «Выставить счет»

  // Допуск к занятию (виден ВСЕМ, включая учителя)
  canViewPaymentStatus: (role: AppRole) => ['developer', 'owner', 'admin', 'teacher'].includes(role), // бейджи «Оплачено», «Не оплачено», «Пробное»

  // Учебный процесс
  canMarkAttendance: (role: AppRole) => ['developer', 'owner', 'admin', 'teacher'].includes(role),
  canCompleteLesson: (role: AppRole) => ['developer', 'owner', 'admin', 'teacher'].includes(role),
  isTeacherOnly: (role: AppRole) => role === 'teacher',

  // Аудит и безопасность (Журнал действий)
  canViewAuditLog: (role: AppRole) => ['developer', 'owner', 'admin'].includes(role),
};

export type PermissionsMap = {
  [K in keyof typeof permissions]: boolean;
};

export function getPermissionsForRole(role: AppRole): PermissionsMap {
  return {
    canViewOwnerDashboard: permissions.canViewOwnerDashboard(role),
    canViewAdminDashboard: permissions.canViewAdminDashboard(role),
    canViewSchoolFinances: permissions.canViewSchoolFinances(role),
    canManageSchoolSettings: permissions.canManageSchoolSettings(role),
    canManageTeamRates: permissions.canManageTeamRates(role),
    canExportDatabase: permissions.canExportDatabase(role),
    canViewStudentFinancialAmounts: permissions.canViewStudentFinancialAmounts(role),
    canManageStudentPayments: permissions.canManageStudentPayments(role),
    canViewPaymentStatus: permissions.canViewPaymentStatus(role),
    canMarkAttendance: permissions.canMarkAttendance(role),
    canCompleteLesson: permissions.canCompleteLesson(role),
    isTeacherOnly: permissions.isTeacherOnly(role),
    canViewAuditLog: permissions.canViewAuditLog(role),
  };
}
