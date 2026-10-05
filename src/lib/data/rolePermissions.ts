'use client';

export type RoleId = 'owner' | 'admin' | 'teacher' | 'viewer';

export interface PermissionItem {
  id: string;
  name: string;
  description: string;
  domain: string;
}

export interface PermissionModule {
  id: string;
  title: string;
  description: string;
  items: PermissionItem[];
}

export interface RoleDefinition {
  id: RoleId;
  label: string;
  englishLabel: string;
  description: string;
  isSystem: boolean;
  color: string;
  bgColor: string;
  borderColor: string;
  iconName: string;
}

export const ROLE_DEFINITIONS: Record<RoleId, RoleDefinition> = {
  owner: {
    id: 'owner',
    label: 'Владелец (Owner)',
    englishLabel: 'Owner',
    description: 'Главный системный аккаунт с полным доступом ко всем модулям школы. Защищен от удаления и деактивации.',
    isSystem: true,
    color: '#7C3AED',
    bgColor: '#F5F3FF',
    borderColor: '#DDD6FE',
    iconName: 'Crown',
  },
  admin: {
    id: 'admin',
    label: 'Администратор',
    englishLabel: 'Administrator',
    description: 'Операционное управление: работа с лидами, учениками, расписанием, преподавателями и фиксация оплат.',
    isSystem: false,
    color: '#2563EB',
    bgColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    iconName: 'Shield',
  },
  teacher: {
    id: 'teacher',
    label: 'Преподаватель',
    englishLabel: 'Teacher',
    description: 'Доступ к своим учебным группам, журналу посещаемости, отметкам, темам занятий и контактам родителей.',
    isSystem: false,
    color: '#059669',
    bgColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    iconName: 'GraduationCap',
  },
  viewer: {
    id: 'viewer',
    label: 'Просмотр',
    englishLabel: 'Viewer',
    description: 'Гостевой или аудиторский режим: только чтение данных без возможности внесения изменений.',
    isSystem: false,
    color: '#64748B',
    bgColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    iconName: 'Eye',
  },
};

export const PERMISSION_MODULES: PermissionModule[] = [
  {
    id: 'students',
    title: 'Ученики и обучение',
    description: 'Управление базой учащихся, родителями, посещаемостью и учебным процессом',
    items: [
      { id: 'view_students', name: 'Просмотр базы учеников', description: 'Доступ к общему реестру учащихся', domain: 'students' },
      { id: 'edit_students', name: 'Создание и редактирование учеников', description: 'Добавление учеников и редактирование профилей', domain: 'students' },
      { id: 'mark_attendance', name: 'Отметка посещаемости и журнал', description: 'Фиксация присутствия и пропусков на занятиях', domain: 'students' },
      { id: 'view_parent_contacts', name: 'Доступ к контактам родителей', description: 'Просмотр телефонов и email законных представителей', domain: 'students' },
      { id: 'view_student_balances', name: 'Просмотр балансов и абонементов', description: 'Информация об остатках уроков и пакетах занятий', domain: 'students' },
      { id: 'student_notes', name: 'Заметки к урокам и ученикам', description: 'Добавление комментариев преподавателя и методиста', domain: 'students' },
    ],
  },
  {
    id: 'sales',
    title: 'Продажи',
    description: 'CRM-воронка лидов, обработка заявок и запись на пробные занятия',
    items: [
      { id: 'view_leads', name: 'Просмотр воронки лидов', description: 'Доступ к канбан-доске и списку потенциальных клиентов', domain: 'sales' },
      { id: 'manage_leads', name: 'Создание и редактирование лидов', description: 'Заведение новых заявок и внесение данных клиента', domain: 'sales' },
      { id: 'change_lead_stage', name: 'Смена этапов воронки', description: 'Перемещение лида по стадиям сделки', domain: 'sales' },
      { id: 'trial_booking', name: 'Запись на пробные занятия', description: 'Назначение даты и формата пробного урока', domain: 'sales' },
      { id: 'delete_leads', name: 'Удаление лидов', description: 'Архивирование и удаление нецелевых обращений', domain: 'sales' },
    ],
  },
  {
    id: 'finance',
    title: 'Финансы',
    description: 'Финансовые отчеты, P&L, фиксация платежей и счета Faktura',
    items: [
      { id: 'view_finance_reports', name: 'Просмотр финансовой аналитики и P&L', description: 'Аналитика выручки, задолженностей и возвратов', domain: 'finance' },
      { id: 'accept_payments', name: 'Фиксация платежей и транзакций', description: 'Проведение поступлений от родителей и учеников', domain: 'finance' },
      { id: 'issue_invoices', name: 'Выставление счетов Faktura', description: 'Генерация европейских счетов в формате EUR', domain: 'finance' },
      { id: 'export_finance', name: 'Экспорт финансовых отчетов', description: 'Выгрузка реестра транзакций в Excel и PDF', domain: 'finance' },
      { id: 'manage_tariffs', name: 'Управление тарифами и скидками', description: 'Изменение цен на абонементы и индивидуальные уроки', domain: 'finance' },
    ],
  },
  {
    id: 'settings',
    title: 'Настройки',
    description: 'Параметры организации, курсы, интеграции и резервное копирование',
    items: [
      { id: 'edit_school_profile', name: 'Профиль школы и реквизиты EUR/SEPA', description: 'Управление контактами, банком и валютой', domain: 'settings' },
      { id: 'manage_courses', name: 'Редактирование направлений и курсов', description: 'Настройка каталога учебных направлений и тарифов', domain: 'settings' },
      { id: 'telegram_integration', name: 'Управление Telegram-ботом', description: 'Настройка токена, webhook и оповещений', domain: 'settings' },
      { id: 'backup_management', name: 'Резервное копирование и экспорт базы', description: 'Создание копий БД и выгрузка архива', domain: 'settings' },
      { id: 'excel_import', name: 'Импорт данных из Excel', description: 'Мастер пакетной миграции учеников и родителей', domain: 'settings' },
    ],
  },
  {
    id: 'administration',
    title: 'Администрирование',
    description: 'Управление доступом, учетными записями, ролями и безопасностью',
    items: [
      { id: 'manage_staff', name: 'Управление сотрудниками', description: 'Создание аккаунтов, блокировка и сброс паролей', domain: 'administration' },
      { id: 'edit_roles', name: 'Редактирование прав доступа ролей', description: 'Настройка матрицы разрешений для системы', domain: 'administration' },
      { id: 'view_audit_log', name: 'Журнал аудита и сессий', description: 'Просмотр истории авторизаций и критических действий', domain: 'administration' },
      { id: 'security_policies', name: 'Управление политиками 2FA и безопасности', description: 'Настройка двухфакторной аутентификации и сессий', domain: 'administration' },
    ],
  },
];

export const DEFAULT_ROLE_PERMISSIONS: Record<RoleId, Record<string, boolean>> = {
  owner: {
    // Owner has ALL permissions true
    view_students: true,
    edit_students: true,
    mark_attendance: true,
    view_parent_contacts: true,
    view_student_balances: true,
    student_notes: true,
    view_leads: true,
    manage_leads: true,
    change_lead_stage: true,
    trial_booking: true,
    delete_leads: true,
    view_finance_reports: true,
    accept_payments: true,
    issue_invoices: true,
    export_finance: true,
    manage_tariffs: true,
    edit_school_profile: true,
    manage_courses: true,
    telegram_integration: true,
    backup_management: true,
    excel_import: true,
    manage_staff: true,
    edit_roles: true,
    view_audit_log: true,
    security_policies: true,
  },
  admin: {
    view_students: true,
    edit_students: true,
    mark_attendance: true,
    view_parent_contacts: true,
    view_student_balances: true,
    student_notes: true,
    view_leads: true,
    manage_leads: true,
    change_lead_stage: true,
    trial_booking: true,
    delete_leads: true,
    view_finance_reports: true,
    accept_payments: true,
    issue_invoices: true,
    export_finance: false,
    manage_tariffs: false,
    edit_school_profile: false,
    manage_courses: true,
    telegram_integration: false,
    backup_management: true,
    excel_import: true,
    manage_staff: true,
    edit_roles: false,
    view_audit_log: true,
    security_policies: false,
  },
  teacher: {
    view_students: true,
    edit_students: false,
    mark_attendance: true,
    view_parent_contacts: true,
    view_student_balances: false,
    student_notes: true,
    view_leads: false,
    manage_leads: false,
    change_lead_stage: false,
    trial_booking: false,
    delete_leads: false,
    view_finance_reports: false,
    accept_payments: false,
    issue_invoices: false,
    export_finance: false,
    manage_tariffs: false,
    edit_school_profile: false,
    manage_courses: false,
    telegram_integration: false,
    backup_management: false,
    excel_import: false,
    manage_staff: false,
    edit_roles: false,
    view_audit_log: false,
    security_policies: false,
  },
  viewer: {
    view_students: true,
    edit_students: false,
    mark_attendance: false,
    view_parent_contacts: false,
    view_student_balances: false,
    student_notes: false,
    view_leads: true,
    manage_leads: false,
    change_lead_stage: false,
    trial_booking: false,
    delete_leads: false,
    view_finance_reports: true,
    accept_payments: false,
    issue_invoices: false,
    export_finance: false,
    manage_tariffs: false,
    edit_school_profile: false,
    manage_courses: false,
    telegram_integration: false,
    backup_management: false,
    excel_import: false,
    manage_staff: false,
    edit_roles: false,
    view_audit_log: false,
    security_policies: false,
  },
};

const STORAGE_KEY = 'crm_role_permissions_v1';

export function getRolePermissions(): Record<RoleId, Record<string, boolean>> {
  if (typeof window === 'undefined') return DEFAULT_ROLE_PERMISSIONS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_ROLE_PERMISSIONS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_ROLE_PERMISSIONS,
      ...parsed,
      owner: { ...DEFAULT_ROLE_PERMISSIONS.owner },
    };
  } catch {
    return DEFAULT_ROLE_PERMISSIONS;
  }
}

export function saveRolePermissions(permissions: Record<RoleId, Record<string, boolean>>): void {
  if (typeof window === 'undefined') return;
  try {
    const sanitized = {
      ...permissions,
      owner: { ...DEFAULT_ROLE_PERMISSIONS.owner },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
    window.dispatchEvent(new CustomEvent('crm-permissions-changed', { detail: sanitized }));
  } catch (err) {
    console.error('Failed to save role permissions:', err);
  }
}

export function calculateModulePermissions(
  permissions: Record<string, boolean>,
  items: PermissionItem[]
): { granted: number; total: number; formatted: string } {
  const total = items.length;
  const granted = items.filter((item) => !!permissions[item.id]).length;
  return {
    granted,
    total,
    formatted: `${granted} из ${total}`,
  };
}

export function canDeleteRole(roleId: string): boolean {
  return roleId !== 'owner';
}
