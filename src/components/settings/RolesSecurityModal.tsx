'use client';

import React, { useState } from 'react';
import { X, Shield, Users, Lock, Check, KeyRound, Eye, Database, AlertCircle } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { cn } from '@/lib/utils';

export interface RolePermissions {
  admin: {
    viewFinancialReports: boolean;
    acceptPayments: boolean;
    exportDatabase: boolean;
    deleteRecords: boolean;
  };
  teacher: {
    viewParentContacts: boolean;
    addStudentNotes: boolean;
    viewStudentBalances: boolean;
    viewOtherTeachersSchedule: boolean;
  };
  security: {
    require2FAForAdmin: boolean;
    auditLogEnabled: boolean;
    sessionTimeoutDays: number;
    rlsEnforced: boolean;
  };
}

interface RolesSecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  permissions: RolePermissions;
  onSave: (permissions: RolePermissions) => void;
}

export function RolesSecurityModal({ isOpen, onClose, permissions, onSave }: RolesSecurityModalProps) {
  const { success } = useToast();
  const [data, setData] = useState<RolePermissions>(permissions);
  const [activeTab, setActiveTab] = useState<'roles' | 'security'>('roles');

  if (!isOpen) return null;

  const toggleAdmin = (key: keyof RolePermissions['admin']) => {
    setData((prev) => ({
      ...prev,
      admin: { ...prev.admin, [key]: !prev.admin[key] },
    }));
  };

  const toggleTeacher = (key: keyof RolePermissions['teacher']) => {
    setData((prev) => ({
      ...prev,
      teacher: { ...prev.teacher, [key]: !prev.teacher[key] },
    }));
  };

  const toggleSecurity = (key: keyof RolePermissions['security']) => {
    setData((prev) => ({
      ...prev,
      security: { ...prev.security, [key]: !prev.security[key] },
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(data);
    success('Политика ролей и безопасности успешно сохранена');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Роли, доступы и безопасность</h2>
              <p className="text-xs text-slate-500">Row Level Security (RLS), разграничение прав и защита данных</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 mt-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('roles')}
            className={cn(
              'px-4 py-2 border-b-2 transition-all flex items-center gap-1.5',
              activeTab === 'roles'
                ? 'border-purple-600 text-purple-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            )}
          >
            <Users className="h-3.5 w-3.5" />
            Права ролей (Admin / Teacher / Owner)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={cn(
              'px-4 py-2 border-b-2 transition-all flex items-center gap-1.5',
              activeTab === 'security'
                ? 'border-purple-600 text-purple-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            )}
          >
            <Lock className="h-3.5 w-3.5" />
            Безопасность БД и аутентификация
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          {activeTab === 'roles' ? (
            <div className="space-y-4 max-h-[52vh] overflow-y-auto pr-1">
              {/* Role 1: Владелец */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-amber-900 text-sm">👑 Владелец школы (Owner)</span>
                    <span className="rounded bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2 py-0.5">
                      Superuser
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-amber-800">
                  Полный неограниченный доступ ко всем отчетам, выручке, удалению сущностей, настройкам интеграций и управлению персоналом.
                </p>
              </div>

              {/* Role 2: Администратор */}
              <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">🛡️ Администратор (Admin)</h3>
                    <p className="text-[11px] text-slate-500">Управление расписанием, учениками, звонками и заявками</p>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                    <div>
                      <div className="font-semibold text-slate-800">Просмотр финансовой аналитики и выручки</div>
                      <div className="text-[10px] text-slate-400">Доступ к разделу «Аналитика» и сводным доходам школы</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={data.admin.viewFinancialReports}
                      onChange={() => toggleAdmin('viewFinancialReports')}
                      className="h-4 w-4 rounded text-purple-600 focus:ring-purple-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                    <div>
                      <div className="font-semibold text-slate-800">Прием и проведение платежей</div>
                      <div className="text-[10px] text-slate-400">Возможность регистрировать новые оплаты за абонементы</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={data.admin.acceptPayments}
                      onChange={() => toggleAdmin('acceptPayments')}
                      className="h-4 w-4 rounded text-purple-600 focus:ring-purple-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                    <div>
                      <div className="font-semibold text-slate-800">Экспорт базы в Excel / Google Таблицы</div>
                      <div className="text-[10px] text-slate-400">Выгрузка базы телефонов и учеников на компьютер</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={data.admin.exportDatabase}
                      onChange={() => toggleAdmin('exportDatabase')}
                      className="h-4 w-4 rounded text-purple-600 focus:ring-purple-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                    <div>
                      <div className="font-semibold text-slate-800">Безвозвратное удаление записей</div>
                      <div className="text-[10px] text-slate-400">Удаление учеников, родителей и финансовых транзакций</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={data.admin.deleteRecords}
                      onChange={() => toggleAdmin('deleteRecords')}
                      className="h-4 w-4 rounded text-purple-600 focus:ring-purple-500"
                    />
                  </label>
                </div>
              </div>

              {/* Role 3: Преподаватель */}
              <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">🎓 Преподаватель (Teacher)</h3>
                    <p className="text-[11px] text-slate-500">Доступ к электронному журналу и карточкам своих групп</p>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                    <div>
                      <div className="font-semibold text-slate-800">Просмотр контактов родителей</div>
                      <div className="text-[10px] text-slate-400">Отображение телефонов и WhatsApp родителей своих учеников</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={data.teacher.viewParentContacts}
                      onChange={() => toggleTeacher('viewParentContacts')}
                      className="h-4 w-4 rounded text-purple-600 focus:ring-purple-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                    <div>
                      <div className="font-semibold text-slate-800">Добавление заметок и обратной связи по уроку</div>
                      <div className="text-[10px] text-slate-400">Публикация комментариев к уроку и успеваемости в карточку</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={data.teacher.addStudentNotes}
                      onChange={() => toggleTeacher('addStudentNotes')}
                      className="h-4 w-4 rounded text-purple-600 focus:ring-purple-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                    <div>
                      <div className="font-semibold text-slate-800">Просмотр баланса и истории оплат учеников</div>
                      <div className="text-[10px] text-slate-400">Доступ к финансовому статусу абонемента в карточке ребенка</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={data.teacher.viewStudentBalances}
                      onChange={() => toggleTeacher('viewStudentBalances')}
                      className="h-4 w-4 rounded text-purple-600 focus:ring-purple-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                    <div>
                      <div className="font-semibold text-slate-800">Просмотр расписания других преподавателей</div>
                      <div className="text-[10px] text-slate-400">Доступ к общему школьному календарю вместо только личного</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={data.teacher.viewOtherTeachersSchedule}
                      onChange={() => toggleTeacher('viewOtherTeachersSchedule')}
                      className="h-4 w-4 rounded text-purple-600 focus:ring-purple-500"
                    />
                  </label>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 max-h-[52vh] overflow-y-auto pr-1">
              {/* PostgreSQL RLS status */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-emerald-700" />
                    <span className="font-bold text-emerald-950">PostgreSQL Row Level Security (RLS)</span>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-[11px] font-bold">
                    <Check className="h-3 w-3" />
                    Активен
                  </span>
                </div>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  Политики безопасности на уровне строк базы данных активированы. Учителя видят исключительно данные своих групп и студентов, а финансовые транзакции изолированы.
                </p>
              </div>

              {/* Security parameters */}
              <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-3">
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5 text-purple-600" />
                  Параметры безопасности и логирования
                </h3>

                <div className="space-y-2 pt-1">
                  <label className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                    <div>
                      <div className="font-semibold text-slate-800">Двухфакторная аутентификация (2FA)</div>
                      <div className="text-[10px] text-slate-400">Обязательный SMS / Telegram-код при входе администратора</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={data.security.require2FAForAdmin}
                      onChange={() => toggleSecurity('require2FAForAdmin')}
                      className="h-4 w-4 rounded text-purple-600 focus:ring-purple-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                    <div>
                      <div className="font-semibold text-slate-800">Аудит действий сотрудников (Audit Log)</div>
                      <div className="text-[10px] text-slate-400">Запись всех изменений карточек, удалений и выгрузок в системный лог</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={data.security.auditLogEnabled}
                      onChange={() => toggleSecurity('auditLogEnabled')}
                      className="h-4 w-4 rounded text-purple-600 focus:ring-purple-500"
                    />
                  </label>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <div>
                      <div className="font-semibold text-slate-800">Время жизни сессии (дней)</div>
                      <div className="text-[10px] text-slate-400">Автоматический выход из системы при неактивности</div>
                    </div>
                    <input
                      type="number"
                      min={1}
                      max={90}
                      value={data.security.sessionTimeoutDays}
                      onChange={(e) =>
                        setData((prev) => ({
                          ...prev,
                          security: { ...prev.security, sessionTimeoutDays: parseInt(e.target.value) || 30 },
                        }))
                      }
                      className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-xs text-center font-bold focus:border-purple-500 focus:outline-hidden bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-purple-700 transition-colors"
            >
              <Check className="h-3.5 w-3.5" />
              Сохранить политику доступа
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
