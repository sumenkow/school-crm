'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  Plus,
  Shield,
  Crown,
  GraduationCap,
  Eye,
  Info,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { RoleSummaryCards } from './RoleSummaryCards';
import { PermissionsMatrixTable } from './PermissionsMatrixTable';
import { RoleDrawer } from './RoleDrawer';
import { RoleId } from '@/lib/data/rolePermissions';
import { useToast } from '@/context/ToastContext';
import type { TeamMemberData } from './EmployeeDrawer';

interface RolesCockpitViewProps {
  showBreadcrumbs?: boolean;
  members?: TeamMemberData[];
}

export function RolesCockpitView({
  showBreadcrumbs = true,
  members = [],
}: RolesCockpitViewProps) {
  const toast = useToast();
  const [selectedRoleForDrawer, setSelectedRoleForDrawer] = useState<RoleId | null>(null);

  // Compute dynamic counts per role from actual loaded members
  const roleCounts: Record<RoleId, number> = {
    owner: members.filter((m) => m.role === 'owner').length || 1,
    admin: members.filter((m) => m.role === 'admin').length || 1,
    teacher: members.filter((m) => m.role === 'teacher').length || 2,
    viewer: members.filter((m) => (m.role as string) === 'viewer').length || 0,
  };

  const handleCreateRole = () => {
    toast.info('Создание пользовательских ролей доступно в расширенной лицензии');
  };

  return (
    <div className="space-y-6">
      {/* Optional Breadcrumbs & Header */}
      {showBreadcrumbs && (
        <div className="space-y-2">
          <nav className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Link
              href="/settings"
              className="hover:text-indigo-600 transition-colors flex items-center gap-1"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Настройки школы
            </Link>
            <span className="text-slate-300">/</span>
            <Link
              href="/settings/team"
              className="hover:text-indigo-600 transition-colors"
            >
              Команда и доступ
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-semibold">Роли и права</span>
          </nav>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Роли и права
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Управление ролями и доступом сотрудников к разделам системы
              </p>
            </div>

            <button
              type="button"
              onClick={handleCreateRole}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 transition-all shadow-xs"
            >
              <Plus className="h-4 w-4" />
              Добавить роль
            </button>
          </div>
        </div>
      )}

      {!showBreadcrumbs && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Управление ролями и матрицей разрешений
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Настройка ролевого доступа к модулям базы данных и CRM
            </p>
          </div>

          <button
            type="button"
            onClick={handleCreateRole}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 transition-all shadow-xs self-start sm:self-auto"
          >
            <Plus className="h-3.5 w-3.5" />
            Добавить роль
          </button>
        </div>
      )}

      {/* Top 4 Role Summary Cards */}
      <RoleSummaryCards
        roleCounts={roleCounts}
        onSelectRole={(roleId) => setSelectedRoleForDrawer(roleId)}
      />

      {/* Permissions Matrix Table */}
      <PermissionsMatrixTable
        onOpenRoleDrawer={(roleId) => setSelectedRoleForDrawer(roleId)}
      />

      {/* Right-Side Role Drawer */}
      <RoleDrawer
        isOpen={!!selectedRoleForDrawer}
        onClose={() => setSelectedRoleForDrawer(null)}
        roleId={selectedRoleForDrawer}
        members={members}
      />
    </div>
  );
}
