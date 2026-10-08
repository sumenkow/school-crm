import { getRolePermissions, RoleId } from '@/lib/data/rolePermissions';

export type AppRole = 'developer' | 'owner' | 'admin' | 'teacher';

function checkMatrixPermission(
  role: AppRole,
  permKey: string,
  matrix?: Record<string, Record<string, boolean>>
): boolean | undefined {
  if (role === 'developer' || role === 'owner') return true;
  const m = matrix || (typeof window !== 'undefined' ? getRolePermissions() : undefined);
  if (m && role in m) {
    const roleObj = (m as Record<string, Record<string, boolean>>)[role];
    if (roleObj && permKey in roleObj) {
      return !!roleObj[permKey];
    }
  }
  return undefined;
}

export const permissions = {
  // Дашборды
  canViewOwnerDashboard: (role: AppRole) => ['developer', 'owner'].includes(role),
  canViewAdminDashboard: (role: AppRole) => role === 'admin',
  
  // Стратегические финансы и настройки школы
  canViewSchoolFinances: (role: AppRole, matrix?: Record<string, Record<string, boolean>>) => {
    if (role === 'developer' || role === 'owner') return true;
    const val = checkMatrixPermission(role, 'view_finances', matrix);
    if (val !== undefined) return val;
    return false;
  },
  canManageSchoolSettings: (role: AppRole, matrix?: Record<string, Record<string, boolean>>) => {
    if (role === 'developer' || role === 'owner') return true;
    const val = checkMatrixPermission(role, 'edit_school_profile', matrix);
    if (val !== undefined) return val;
    return false;
  },
  canManageTeamRates: (role: AppRole, matrix?: Record<string, Record<string, boolean>>) => {
    if (role === 'developer' || role === 'owner') return true;
    const val = checkMatrixPermission(role, 'financial_reports', matrix);
    if (val !== undefined) return val;
    return false;
  },
  canExportDatabase: (role: AppRole, matrix?: Record<string, Record<string, boolean>>) => {
    if (role === 'developer' || role === 'owner') return true;
    const val = checkMatrixPermission(role, 'backup_management', matrix);
    if (val !== undefined) return val;
    return false;
  },

  // Операционные финансы учеников
  canViewStudentFinancialAmounts: (role: AppRole, matrix?: Record<string, Record<string, boolean>>) => {
    if (role === 'developer' || role === 'owner') return true;
    const m = matrix || (typeof window !== 'undefined' ? getRolePermissions() : undefined);
    if (m && role in m) {
      const roleObj = (m as Record<string, Record<string, boolean>>)[role];
      if (roleObj) {
        return Boolean(roleObj.view_student_balances || roleObj.view_finances);
      }
    }
    return ['admin'].includes(role);
  },
  canManageStudentPayments: (role: AppRole, matrix?: Record<string, Record<string, boolean>>) => {
    if (role === 'developer' || role === 'owner') return true;
    const m = matrix || (typeof window !== 'undefined' ? getRolePermissions() : undefined);
    if (m && role in m) {
      const roleObj = (m as Record<string, Record<string, boolean>>)[role];
      if (roleObj) {
        return Boolean(roleObj.record_payments || roleObj.issue_invoices);
      }
    }
    return ['admin'].includes(role);
  },

  // Допуск к занятию (виден ВСЕМ, включая учителя)
  canViewPaymentStatus: (role: AppRole, matrix?: Record<string, Record<string, boolean>>) => {
    if (['developer', 'owner', 'admin'].includes(role)) return true;
    const m = matrix || (typeof window !== 'undefined' ? getRolePermissions() : undefined);
    if (m && role in m) {
      const roleObj = (m as Record<string, Record<string, boolean>>)[role];
      if (roleObj && roleObj.view_student_balances !== undefined) {
        return roleObj.view_student_balances !== false;
      }
    }
    return true;
  },

  // Учебный процесс
  canMarkAttendance: (role: AppRole, matrix?: Record<string, Record<string, boolean>>) => {
    if (role === 'developer' || role === 'owner') return true;
    const val = checkMatrixPermission(role, 'mark_attendance', matrix);
    if (val !== undefined) return val;
    return ['admin', 'teacher'].includes(role);
  },
  canCompleteLesson: (role: AppRole, matrix?: Record<string, Record<string, boolean>>) => {
    if (role === 'developer' || role === 'owner') return true;
    const val = checkMatrixPermission(role, 'mark_attendance', matrix);
    if (val !== undefined) return val;
    return ['admin', 'teacher'].includes(role);
  },
  isTeacherOnly: (role: AppRole) => role === 'teacher',

  // Аудит и безопасность (Журнал действий)
  canViewAuditLog: (role: AppRole, matrix?: Record<string, Record<string, boolean>>) => {
    if (role === 'developer' || role === 'owner') return true;
    const val = checkMatrixPermission(role, 'view_audit_log', matrix);
    if (val !== undefined) return val;
    return ['admin'].includes(role);
  },
};

export type PermissionsMap = {
  [K in keyof typeof permissions]: boolean;
};

export function getPermissionsForRole(
  role: AppRole,
  matrix?: Record<string, Record<string, boolean>>
): PermissionsMap {
  return {
    canViewOwnerDashboard: permissions.canViewOwnerDashboard(role),
    canViewAdminDashboard: permissions.canViewAdminDashboard(role),
    canViewSchoolFinances: permissions.canViewSchoolFinances(role, matrix),
    canManageSchoolSettings: permissions.canManageSchoolSettings(role, matrix),
    canManageTeamRates: permissions.canManageTeamRates(role, matrix),
    canExportDatabase: permissions.canExportDatabase(role, matrix),
    canViewStudentFinancialAmounts: permissions.canViewStudentFinancialAmounts(role, matrix),
    canManageStudentPayments: permissions.canManageStudentPayments(role, matrix),
    canViewPaymentStatus: permissions.canViewPaymentStatus(role, matrix),
    canMarkAttendance: permissions.canMarkAttendance(role, matrix),
    canCompleteLesson: permissions.canCompleteLesson(role, matrix),
    isTeacherOnly: permissions.isTeacherOnly(role),
    canViewAuditLog: permissions.canViewAuditLog(role, matrix),
  };
}
