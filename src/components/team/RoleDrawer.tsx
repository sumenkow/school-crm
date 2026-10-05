'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  Check,
  ChevronDown,
  ChevronRight,
  Crown,
  Shield,
  GraduationCap,
  Eye,
  Users,
  AlertTriangle,
  Trash2,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  PERMISSION_MODULES,
  ROLE_DEFINITIONS,
  RoleId,
  getRolePermissions,
  saveRolePermissions,
  calculateModulePermissions,
  canDeleteRole
} from '@/lib/data/rolePermissions';
import { useToast } from '@/context/ToastContext';
import type { TeamMemberData } from './EmployeeDrawer';

interface RoleDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  roleId: RoleId | null;
  members?: TeamMemberData[];
}

export function RoleDrawer({ isOpen, onClose, roleId, members = [] }: RoleDrawerProps) {
  const toast = useToast();
  const [rolePermissions, setRolePermissions] = useState<Record<string, boolean>>({});
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({
    students: true,
    sales: true,
    finance: true,
    settings: true,
    administration: true,
  });

  useEffect(() => {
    if (roleId) {
      const allPerms = getRolePermissions();
      setRolePermissions(allPerms[roleId] || {});
    }
  }, [roleId, isOpen]);

  if (!isOpen || !roleId) return null;

  const roleDef = ROLE_DEFINITIONS[roleId];
  const isOwner = roleId === 'owner';

  const roleIcons = {
    owner: Crown,
    admin: Shield,
    teacher: GraduationCap,
    viewer: Eye,
  };
  const Icon = roleIcons[roleId];

  const assignedMembers = members.filter((m) => m.role === roleId);

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) => ({
      ...prev,
      [moduleId]: !prev[moduleId],
    }));
  };

  const handleTogglePermission = (permissionId: string) => {
    if (isOwner) {
      toast.info('Права Владельца школы системно защищены');
      return;
    }

    setRolePermissions((prev) => {
      const updated = {
        ...prev,
        [permissionId]: !prev[permissionId],
      };
      // Auto-save
      const allPerms = getRolePermissions();
      allPerms[roleId] = updated;
      saveRolePermissions(allPerms);
      return updated;
    });
    toast.success('Права роли сохранены');
  };

  const handleSaveAll = () => {
    if (!isOwner) {
      const allPerms = getRolePermissions();
      allPerms[roleId] = rolePermissions;
      saveRolePermissions(allPerms);
      toast.success('Все права роли успешно сохранены');
    }
    onClose();
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return (name[0] || 'U').toUpperCase();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div
        className="w-full max-w-xl h-full bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-200/80 bg-slate-50/50">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl shadow-xs"
                style={{ backgroundColor: roleDef.bgColor, color: roleDef.color }}
              >
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900 leading-tight">
                    {roleDef.label}
                  </h2>
                  {roleDef.isSystem && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                      <Lock className="h-2.5 w-2.5" />
                      Системная роль
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-snug">
                  {roleDef.description}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              aria-label="Закрыть"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* System Protected Notice for Owner */}
          {isOwner && (
            <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs flex gap-3">
              <Lock className="h-4 w-4 text-purple-700 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold block">Системная роль защищена</span>
                <p className="text-purple-800 leading-relaxed">
                  Системная роль Владельца не может быть удалена, отключена или ограничена в правах доступа.
                  Учетные записи владельцев обладают полным неотзываемым контролем над CRM.
                </p>
              </div>
            </div>
          )}

          {/* Granular Permissions Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Права доступа по разделам
              </h3>
              <span className="text-[11px] text-slate-500">
                5 бизнес-модулей
              </span>
            </div>

            <div className="space-y-3">
              {PERMISSION_MODULES.map((module) => {
                const isExpanded = !!expandedModules[module.id];
                const { granted, total, formatted } = calculateModulePermissions(
                  rolePermissions,
                  module.items
                );

                return (
                  <div
                    key={module.id}
                    className="border border-slate-200/90 rounded-xl overflow-hidden bg-white shadow-2xs"
                  >
                    {/* Module Accordion Header */}
                    <button
                      type="button"
                      onClick={() => toggleModule(module.id)}
                      className="w-full flex items-center justify-between p-3.5 bg-slate-50/70 hover:bg-slate-100/60 transition-colors text-left"
                    >
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-slate-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-slate-400" />
                        )}
                        <span className="text-xs font-bold text-slate-900">
                          {module.title}
                        </span>
                      </div>

                      {/* X из Y badge */}
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded text-[11px] font-semibold border',
                          granted === total
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : granted > 0
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        )}
                      >
                        {formatted}
                      </span>
                    </button>

                    {/* Module Permission Items */}
                    {isExpanded && (
                      <div className="p-3 divide-y divide-slate-100 text-xs">
                        {module.items.map((item) => {
                          const isGranted = isOwner ? true : !!rolePermissions[item.id];

                          return (
                            <label
                              key={item.id}
                              className={cn(
                                'flex items-start justify-between gap-3 py-2.5 first:pt-1 last:pb-1 cursor-pointer select-none',
                                isOwner && 'cursor-default opacity-85'
                              )}
                            >
                              <div className="pr-2">
                                <span className="font-medium text-slate-800 block">
                                  {item.name}
                                </span>
                                <span className="text-[11px] text-slate-400 block mt-0.5">
                                  {item.description}
                                </span>
                              </div>

                              <input
                                type="checkbox"
                                disabled={isOwner}
                                checked={isGranted}
                                onChange={() => handleTogglePermission(item.id)}
                                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 mt-1 cursor-pointer disabled:cursor-default"
                              />
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Assigned Staff Members List */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Сотрудники с этой ролью
              </h3>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                {assignedMembers.length} чел.
              </span>
            </div>

            {assignedMembers.length === 0 ? (
              <div className="p-5 rounded-xl border border-dashed border-slate-200 text-center bg-slate-50/50">
                <Users className="h-6 w-6 text-slate-400 mx-auto mb-1.5" />
                <span className="text-xs font-medium text-slate-600 block">
                  Нет назначенных сотрудников
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Вы можете назначить эту роль при создании или редактировании сотрудника.
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                {assignedMembers.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-200/80 bg-white hover:border-slate-300 transition-colors shadow-2xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 font-bold text-xs">
                        {getInitials(m.full_name)}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">
                          {m.full_name}
                        </span>
                        <span className="text-[11px] text-slate-400 block">
                          {m.email}
                        </span>
                      </div>
                    </div>

                    <span
                      className={cn(
                        'text-[10px] font-medium px-2 py-0.5 rounded-full border',
                        m.is_active
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      )}
                    >
                      {m.is_active ? 'Активен' : 'Неактивен'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3">
          <div>
            {!canDeleteRole(roleId) ? (
              <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                <Lock className="h-3 w-3" />
                Удаление заблокировано
              </span>
            ) : (
              <button
                type="button"
                onClick={() => toast.info('Пользовательская роль сохранена')}
                className="text-xs text-rose-600 hover:text-rose-700 font-medium"
              >
                Удалить роль
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors"
            >
              Закрыть
            </button>
            {!isOwner && (
              <button
                type="button"
                onClick={handleSaveAll}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs"
              >
                Сохранить права
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
