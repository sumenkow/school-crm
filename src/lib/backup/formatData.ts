/**
 * Utilities to transform raw database tables into clean, human-readable records
 * suitable for Excel (.xlsx) and Google Sheets.
 */

export interface FormattedBackupData {
  tables: Record<string, Array<Record<string, string | number>>>;
  schoolName: string;
  timestamp: string;
  totalRecords: number;
}

export function formatDatabaseRecords(rawData: {
  profiles?: any[];
  teachers?: any[];
  students?: any[];
  parents?: any[];
  courses?: any[];
  groups?: any[];
  payments?: any[];
  lessons?: any[];
}): FormattedBackupData {
  const tables: Record<string, Array<Record<string, string | number>>> = {};
  let totalRecords = 0;

  // 1. Сотрудники
  if (rawData.profiles && rawData.profiles.length > 0) {
    tables['Сотрудники'] = rawData.profiles.map((p) => {
      const roleLabel =
        p.role === 'owner' ? 'Владелец' :
        p.role === 'admin' ? 'Администратор' :
        'Преподаватель';

      const statusLabel = p.is_active === false ? 'Заблокирован' : 'Активен';

      return {
        'ID': p.id,
        'ФИО': p.full_name || '—',
        'Email (Логин)': p.email || '—',
        'Телефон': p.phone || '—',
        'Роль': roleLabel,
        'Статус аккаунта': statusLabel,
        'Дата регистрации': p.created_at ? new Date(p.created_at).toLocaleDateString('ru-RU') : '—',
      };
    });
    totalRecords += tables['Сотрудники'].length;
  }

  // 2. Ученики
  if (rawData.students && rawData.students.length > 0) {
    tables['Ученики'] = rawData.students.map((s) => {
      const fullName = `${s.first_name || ''} ${s.last_name || ''}`.trim() || '—';
      const statusLabel =
        s.status === 'active' ? 'Обучается' :
        s.status === 'trial' ? 'Пробное' :
        s.status === 'paused' ? 'Заморозка' :
        s.status === 'lead' ? 'Лид' :
        s.status === 'archived' ? 'В архиве' : s.status || '—';

      return {
        'ID': s.id,
        'ФИО Ученика': fullName,
        'Телефон': s.phone || '—',
        'Email': s.email || '—',
        'Telegram': s.telegram || '—',
        'Статус': statusLabel,
        'Дата рождения': s.birth_date || '—',
        'Заметки': s.notes || '—',
        'Дата создания': s.created_at ? new Date(s.created_at).toLocaleDateString('ru-RU') : '—',
      };
    });
    totalRecords += tables['Ученики'].length;
  }

  // 3. Родители
  if (rawData.parents && rawData.parents.length > 0) {
    tables['Родители'] = rawData.parents.map((p) => {
      const fullName = `${p.first_name || ''} ${p.last_name || ''}`.trim() || '—';
      return {
        'ID': p.id,
        'ФИО Родителя': fullName,
        'Телефон': p.phone || '—',
        'Email': p.email || '—',
        'Telegram': p.telegram || '—',
        'Дата создания': p.created_at ? new Date(p.created_at).toLocaleDateString('ru-RU') : '—',
      };
    });
    totalRecords += tables['Родители'].length;
  }

  // 4. Курсы
  if (rawData.courses && rawData.courses.length > 0) {
    tables['Курсы'] = rawData.courses.map((c) => ({
      'ID': c.id,
      'Название курса': c.name || '—',
      'Направление / Предмет': c.subject || '—',
      'Описание': c.description || '—',
      'Статус': c.is_active === false ? 'Неактивен' : 'Активен',
    }));
    totalRecords += tables['Курсы'].length;
  }

  // 5. Группы
  if (rawData.groups && rawData.groups.length > 0) {
    tables['Группы'] = rawData.groups.map((g) => ({
      'ID': g.id,
      'Название группы': g.name || '—',
      'Курс': g.courses?.name || g.course_id || '—',
      'Преподаватель': g.teachers ? `${g.teachers.first_name} ${g.teachers.last_name}` : '—',
      'Лимит мест': g.capacity || 0,
      'Статус': g.status || 'recruiting',
      'Дата старта': g.start_date || '—',
    }));
    totalRecords += tables['Группы'].length;
  }

  // 6. Оплаты
  if (rawData.payments && rawData.payments.length > 0) {
    tables['Оплаты'] = rawData.payments.map((pay) => ({
      'ID': pay.id,
      'Сумма (руб)': pay.amount || 0,
      'Способ оплаты': pay.payment_method || '—',
      'Статус': pay.status === 'succeeded' ? 'Оплачено' : pay.status || '—',
      'Дата платежа': pay.paid_at ? new Date(pay.paid_at).toLocaleDateString('ru-RU') : '—',
    }));
    totalRecords += tables['Оплаты'].length;
  }

  return {
    tables,
    schoolName: 'School CRM',
    timestamp: new Date().toISOString(),
    totalRecords,
  };
}
