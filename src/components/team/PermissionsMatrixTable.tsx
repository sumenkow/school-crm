'use client';

import React, { useState } from 'react';
import {
  Check,
  X,
  Lock,
  ChevronDown,
  ChevronRight,
  Shield,
  Crown,
  GraduationCap,
  Eye,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  PERMISSION_MODULES,
  ROLE_DEFINITIONS,
  RoleId,
  getRolePermissions,
  saveRolePermissions,
  calculateModulePermissions
} from '@/lib/data/rolePermissions';
import { useToast } from '@/context/ToastContext';

interface PermissionsMatrixTableProps {
  onOpenRoleDrawer?: (roleId: RoleId) => void;
}

export function PermissionsMatrixTable({ onOpenRoleDrawer }: PermissionsMatrixTableProps) {
  const toast = useToast();
  const [permissions, setPermissions] = useState<Record<RoleId, Record<string, boolean>>>(() =>
    getRolePermissions()
  );
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({
    students: true,
    sales: true,
    finance: true,
    settings: true,
    administration: true,
  });

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) => ({
      ...prev,
      [moduleId]: !prev[moduleId],
    }));
  };

  const handleTogglePermission = (roleId: RoleId, permissionId: string) => {
    if (roleId === 'owner') {
      toast.info('Права Владельца школы защищены и не могут быть ограничены');
      return;
    }

    const currentVal = !!permissions[roleId]?.[permissionId];
    const updated = {
      ...permissions,
      [roleId]: {
        ...permissions[roleId],
        [permissionId]: !currentVal,
      },
    };

    setPermissions(updated);
    saveRolePermissions(updated);
    toast.success('Права доступа обновлены');
  };

  const roleColumns: RoleId[] = ['owner', 'admin', 'teacher', 'viewer'];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
      {/* Table Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
        <div>
          <h3 className="text-base font-bold text-slate-900">Матрица прав доступа</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Детализированные разрешения для ролей по 5 ключевым разделам системы
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200/80 shadow-2xs">
          <Info className="h-3.5 w-3.5 text-indigo-600" />
          <span>Клик по чекбоксу мгновенно переключает права роли</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold">
              <th className="py-3 px-4 sm:px-6 w-2/5">Функция / Раздел системы</th>
              {roleColumns.map((roleId) => {
                const def = ROLE_DEFINITIONS[roleId];
                return (
                  <th
                    key={roleId}
                    className="py-3 px-4 text-center cursor-pointer hover:bg-slate-100/70 transition-colors"
                    onClick={() => onOpenRoleDrawer?.(roleId)}
                    title={`Открыть параметры роли ${def.label}`}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span className="font-bold text-slate-900 flex items-center gap-1">
                        {def.label}
                        {def.isSystem && <Lock className="h-3 w-3 text-purple-600" />}
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        {def.isSystem ? 'Суперпользователь' : 'Настраиваемая'}
                      </span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {PERMISSION_MODULES.map((module) => {
              const isExpanded = !!expandedModules[module.id];

              return (
                <React.Fragment key={module.id}>
                  {/* Module Group Header Row */}
                  <tr
                    onClick={() => toggleModule(module.id)}
                    className="bg-slate-50/40 hover:bg-slate-100/50 cursor-pointer select-none transition-colors border-t border-slate-200"
                  >
                    <td colSpan={5} className="py-2.5 px-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-slate-400" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-slate-400" />
                          )}
                          <span className="font-bold text-slate-900 text-xs">
                            {module.title}
                          </span>
                          <span className="text-[11px] text-slate-400 font-normal">
                            ({module.items.length} прав)
                          </span>
                        </div>

                        {/* Progress badges for roles in header */}
                        <div className="flex items-center gap-6 text-[10px] font-medium text-slate-500 mr-4">
                          {roleColumns.map((roleId) => {
                            const { formatted } = calculateModulePermissions(
                              permissions[roleId] || {},
                              module.items
                            );
                            return (
                              <span
                                key={roleId}
                                className={cn(
                                  'px-2 py-0.5 rounded text-[10px]',
                                  roleId === 'owner'
                                    ? 'bg-purple-50 text-purple-700'
                                    : 'bg-slate-100 text-slate-600'
                                )}
                              >
                                {formatted}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </td>
                  </tr>

                  {/* Module Permission Items */}
                  {isExpanded &&
                    module.items.map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/70 transition-colors group"
                      >
                        <td className="py-3 px-4 sm:px-6 pl-8 sm:pl-10">
                          <div>
                            <span className="font-medium text-slate-900 block">
                              {item.name}
                            </span>
                            <span className="text-[11px] text-slate-400 block mt-0.5">
                              {item.description}
                            </span>
                          </div>
                        </td>

                        {roleColumns.map((roleId) => {
                          const isGranted = !!permissions[roleId]?.[item.id];
                          const isOwner = roleId === 'owner';

                          return (
                            <td key={roleId} className="py-3 px-4 text-center">
                              {isOwner ? (
                                <div className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-purple-50 text-purple-700 border border-purple-200">
                                  <Check className="h-4 w-4 stroke-[2.5]" />
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleTogglePermission(roleId, item.id)}
                                  className={cn(
                                    'inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-lg border transition-all cursor-pointer',
                                    isGranted
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                      : 'bg-slate-50 text-slate-300 border-slate-200 hover:border-slate-300 hover:text-slate-400'
                                  )}
                                  aria-label={`${item.name} для ${ROLE_DEFINITIONS[roleId].label}`}
                                >
                                  {isGranted ? (
                                    <Check className="h-4 w-4 stroke-[2.5]" />
                                  ) : (
                                    <X className="h-4 w-4" />
                                  )}
                                </button>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
