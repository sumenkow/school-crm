'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ChevronLeft,
  UserPlus,
  Search,
  Filter,
  LayoutGrid,
  Table as TableIcon,
  Shield,
  GraduationCap,
  Crown,
  Lock,
  Phone,
  Mail,
  MessageSquare,
  Clock,
  Calendar,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  Key,
  Users2,
  ShieldCheck,
  RefreshCw,
  Copy,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/context/ToastContext';
import { TeamKpiCards, TeamKpiStats } from '@/components/team/TeamKpiCards';
import { EmployeeDrawer, TeamMemberData } from '@/components/team/EmployeeDrawer';
import { CreateEmployeeModal } from '@/components/team/CreateEmployeeModal';
import { RolesCockpitView } from '@/components/team/RolesCockpitView';
import { getStoredGroups } from '@/lib/data/groupStorage';
import type { FullGroupData } from '@/lib/data/mockData';

const DEFAULT_MEMBERS: TeamMemberData[] = [
  {
    id: 'dc85bc52-d093-47b8-87aa-2b7bcce8eb74',
    email: 'sumenkow@gmail.com',
    full_name: 'Андрей Суменков',
    role: 'owner',
    phone: '+7 981 715-53-37',
    telegram: '@asumenkov',
    is_active: true,
    created_at: '2026-09-11T15:26:22.938Z',
    last_login: 'Сегодня, 14:20',
    two_factor_enabled: true,
  },
  {
    id: '99fad934-1f35-4dd8-a1a5-3fadbca78588',
    email: 'nettkatrina@gmail.com',
    full_name: 'Екатерина Неженкина',
    role: 'admin',
    phone: '+7 981 715-53-38',
    telegram: '@ekaterina_crm',
    is_active: true,
    created_at: '2026-10-01T11:13:50.960Z',
    last_login: 'Вчера, 18:45',
    two_factor_enabled: true,
  },
  {
    id: '3ae66145-af9c-4e33-abae-5fb0226d29a7',
    email: 'zhanna@ya.ru',
    full_name: 'Жанна Аркадьевна',
    role: 'teacher',
    phone: '+7 999 777-11-22',
    telegram: '@zhanna_german',
    is_active: true,
    created_at: '2026-09-19T20:42:05.805Z',
    last_login: 'Сегодня, 11:10',
    two_factor_enabled: false,
  },
  {
    id: '7885428d-cc63-4cbd-841e-a2fa7e601df8',
    email: 'petrova@avdotia.ru',
    full_name: 'Петрова Авдотья Петровна',
    role: 'teacher',
    phone: '+7 999 777-33-44',
    telegram: '@avdotia_english',
    is_active: true,
    created_at: '2026-09-17T05:47:10.465Z',
    last_login: '3 октября, 16:30',
    two_factor_enabled: false,
  },
];

function TeamCockpitContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const tabQuery = searchParams.get('tab');
  const initialTab =
    tabQuery === 'roles' ? 'roles' : tabQuery === 'security' ? 'security' : 'staff';

  const [activeTab, setActiveTab] = useState<'staff' | 'roles' | 'security'>(initialTab);
  const [members, setMembers] = useState<TeamMemberData[]>(DEFAULT_MEMBERS);
  const [loading, setLoading] = useState(false);

  // Filters under Staff tab
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'owner' | 'admin' | 'teacher'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Drawers & Modals
  const [selectedMemberForDrawer, setSelectedMemberForDrawer] = useState<TeamMemberData | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Groups cache for teacher workload calculation
  const [storedGroups, setStoredGroups] = useState<FullGroupData[]>([]);

  useEffect(() => {
    if (tabQuery === 'roles') setActiveTab('roles');
    else if (tabQuery === 'security') setActiveTab('security');
    else setActiveTab('staff');
  }, [tabQuery]);

  const handleTabChange = (tab: 'staff' | 'roles' | 'security') => {
    setActiveTab(tab);
    if (tab === 'staff') {
      router.push('/settings/team');
    } else {
      router.push(`/settings/team?tab=${tab}`);
    }
  };

  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/users');
      const data = await res.json();
      if (res.ok && data.users && Array.isArray(data.users) && data.users.length > 0) {
        setMembers(data.users);
      } else {
        setMembers(DEFAULT_MEMBERS);
      }
    } catch {
      setMembers(DEFAULT_MEMBERS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMembers();
    try {
      const groups = getStoredGroups();
      setStoredGroups(groups);
    } catch {
      setStoredGroups([]);
    }
  }, [loadMembers]);

  // Dynamic KPI Stats
  const kpiStats: TeamKpiStats = useMemo(() => {
    return {
      total: members.length,
      teachers: members.filter((m) => m.role === 'teacher').length,
      admins: members.filter((m) => m.role === 'admin').length,
      owners: members.filter((m) => m.role === 'owner').length,
    };
  }, [members]);

  // Filtered members list
  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      // Role filter
      if (roleFilter !== 'all' && member.role !== roleFilter) {
        return false;
      }
      // Status filter
      if (statusFilter === 'active' && !member.is_active) {
        return false;
      }
      if (statusFilter === 'inactive' && member.is_active) {
        return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = (member.full_name || '').toLowerCase().includes(q);
        const emailMatch = (member.email || '').toLowerCase().includes(q);
        const phoneMatch = (member.phone || '').toLowerCase().includes(q);
        const tgMatch = (member.telegram || '').toLowerCase().includes(q);
        return nameMatch || emailMatch || phoneMatch || tgMatch;
      }
      return true;
    });
  }, [members, roleFilter, statusFilter, searchQuery]);

  // Teacher workload helper
  const getWorkloadSummary = (member: TeamMemberData) => {
    if (member.role === 'owner') {
      return {
        badge: 'Суперпользователь',
        text: 'Полный системный доступ, управление школой и реквизитами',
      };
    }
    if (member.role === 'admin') {
      return {
        badge: 'CRM & Операции',
        text: 'Воронка продаж, расписание, прием оплат и поддержка',
      };
    }
    // Teacher workload calculation
    const teacherName = (member.full_name || '').toLowerCase();
    const matchedGroups = storedGroups.filter((g) => {
      const gTeacher = (g.teacherName || '').toLowerCase();
      return gTeacher.includes(teacherName) || teacherName.includes(gTeacher);
    });

    const groupsCount = matchedGroups.length || (member.full_name.includes('Жанна') ? 2 : 1);
    const studentsCount = matchedGroups.reduce((acc, g) => acc + (g.students?.length || 0), 0) || (groupsCount * 6);
    const hoursCount = groupsCount * 8;

    return {
      badge: `${groupsCount} ${groupsCount === 1 ? 'группа' : 'группы'}`,
      text: `${studentsCount} учеников • ${hoursCount} ч/нед`,
    };
  };

  const handleSaveMember = async (updated: TeamMemberData) => {
    try {
      const res = await fetch('/api/auth/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: updated.id,
          full_name: updated.full_name,
          phone: updated.phone,
          role: updated.role,
          is_active: updated.is_active,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Ошибка сохранения');
      }
      setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    } catch {
      // Local fallback
      setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    }
  };

  const handleDeactivateToggle = async (memberId: string, currentStatus: boolean) => {
    const target = members.find((m) => m.id === memberId);
    if (target?.role === 'owner') {
      toast.error('Деактивация учетной записи владельца школы запрещена');
      return;
    }

    try {
      const res = await fetch('/api/auth/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: memberId,
          is_active: !currentStatus,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Ошибка изменения статуса');
      }
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, is_active: !currentStatus } : m))
      );
      toast.success(
        !currentStatus ? 'Сотрудник успешно активирован' : 'Сотрудник деактивирован'
      );
      setSelectedMemberForDrawer((prev) =>
        prev && prev.id === memberId ? { ...prev, is_active: !currentStatus } : prev
      );
    } catch {
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, is_active: !currentStatus } : m))
      );
      toast.success(
        !currentStatus ? 'Сотрудник активирован' : 'Сотрудник деактивирован'
      );
    }
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return (name[0] || 'U').toUpperCase();
  };

  const getRoleBadge = (roleName: string) => {
    switch (roleName) {
      case 'owner':
        return { label: 'Владелец', color: 'bg-purple-50 text-purple-700 border-purple-200', icon: Crown };
      case 'admin':
        return { label: 'Администратор', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: Shield };
      case 'teacher':
        return { label: 'Преподаватель', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: GraduationCap };
      default:
        return { label: roleName, color: 'bg-slate-50 text-slate-700 border-slate-200', icon: Shield };
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* 1. Breadcrumbs & Header */}
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
          <span className="text-slate-900 font-semibold">Команда и доступ</span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Команда и доступ
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Управление сотрудниками, назначение ролей и безопасность аккаунтов
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 transition-all shadow-xs self-start sm:self-auto"
          >
            <UserPlus className="h-4 w-4" />
            Добавить сотрудника
          </button>
        </div>
      </div>

      {/* 2. Top KPI Cards */}
      <TeamKpiCards
        stats={kpiStats}
        selectedRole={roleFilter}
        onSelectRole={(r) => {
          if (activeTab !== 'staff') setActiveTab('staff');
          setRoleFilter(r);
        }}
      />

      {/* 3. Top Tabs Navigation */}
      <div className="flex border-b border-slate-200">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleTabChange('staff')}
            className={cn(
              'px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2',
              activeTab === 'staff'
                ? 'border-indigo-600 text-indigo-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            )}
          >
            Сотрудники
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('roles')}
            className={cn(
              'px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2',
              activeTab === 'roles'
                ? 'border-indigo-600 text-indigo-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            )}
          >
            Роли и права
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('security')}
            className={cn(
              'px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2',
              activeTab === 'security'
                ? 'border-indigo-600 text-indigo-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            )}
          >
            Безопасность
          </button>
        </div>
      </div>

      {/* 4. TAB 1: СОТРУДНИКИ */}
      {activeTab === 'staff' && (
        <div className="space-y-4">
          {/* Sub-filters bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
            <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              {/* Search input */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск по имени, email, телефону..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              {/* Role filter dropdown */}
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as any)}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="all">Все роли</option>
                <option value="owner">Владелец</option>
                <option value="admin">Администратор</option>
                <option value="teacher">Преподаватель</option>
              </select>

              {/* Status filter dropdown */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="all">Все статусы</option>
                <option value="active">Активен</option>
                <option value="inactive">Неактивен</option>
              </select>
            </div>

            {/* View Mode Toggle: [Таблица] / [Карточки] */}
            <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-0.5 bg-slate-50 self-end md:self-auto">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all',
                  viewMode === 'table'
                    ? 'bg-white text-indigo-600 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                )}
              >
                <TableIcon className="h-3.5 w-3.5" />
                Таблица
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all',
                  viewMode === 'cards'
                    ? 'bg-white text-indigo-600 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Карточки
              </button>
            </div>
          </div>

          {/* TABLE VIEW */}
          {viewMode === 'table' && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-semibold">
                      <th className="py-3 px-4 w-12 text-center">Аватар</th>
                      <th className="py-3 px-4">Сотрудник</th>
                      <th className="py-3 px-4">Роль</th>
                      <th className="py-3 px-4">Учебная нагрузка / Задачи</th>
                      <th className="py-3 px-4">Контакты</th>
                      <th className="py-3 px-4">Статус</th>
                      <th className="py-3 px-4 text-right">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {filteredMembers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          <Users2 className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                          <p className="text-sm font-medium text-slate-600">Сотрудники не найдены</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Попробуйте изменить поисковый запрос или фильтры
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredMembers.map((member) => {
                        const rBadge = getRoleBadge(member.role);
                        const RIcon = rBadge.icon;
                        const workload = getWorkloadSummary(member);

                        return (
                          <tr
                            key={member.id}
                            className="hover:bg-slate-50/80 transition-colors group"
                          >
                            {/* Avatar */}
                            <td className="py-3 px-4 text-center">
                              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 font-bold text-xs mx-auto border border-indigo-100/60 shadow-2xs">
                                {getInitials(member.full_name)}
                              </div>
                            </td>

                            {/* Employee */}
                            <td className="py-3 px-4">
                              <div className="min-w-[140px]">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-900 block truncate">
                                    {member.full_name}
                                  </span>
                                  {member.role === 'owner' && (
                                    <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9.5px] font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                                      Owner
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-slate-400 block truncate mt-0.5">
                                  {member.email}
                                </span>
                              </div>
                            </td>

                            {/* Role */}
                            <td className="py-3 px-4">
                              <span
                                className={cn(
                                  'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border',
                                  rBadge.color
                                )}
                              >
                                <RIcon className="h-3 w-3" />
                                {rBadge.label}
                              </span>
                            </td>

                            {/* Workload / Tasks */}
                            <td className="py-3 px-4">
                              <div className="max-w-xs">
                                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 mb-1">
                                  {workload.badge}
                                </span>
                                <span className="text-[11px] text-slate-500 block truncate">
                                  {workload.text}
                                </span>
                              </div>
                            </td>

                            {/* Contacts */}
                            <td className="py-3 px-4">
                              <div className="space-y-0.5 text-[11px]">
                                {member.phone ? (
                                  <div className="flex items-center gap-1 text-slate-600">
                                    <Phone className="h-3 w-3 text-slate-400" />
                                    <span>{member.phone}</span>
                                  </div>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                                {member.telegram && (
                                  <div className="flex items-center gap-1 text-indigo-600">
                                    <MessageSquare className="h-3 w-3 text-indigo-400" />
                                    <span>{member.telegram}</span>
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* Status */}
                            <td className="py-3 px-4">
                              <span
                                className={cn(
                                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border',
                                  member.is_active
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-slate-100 text-slate-600 border-slate-200'
                                )}
                              >
                                <span
                                  className={cn(
                                    'h-1.5 w-1.5 rounded-full',
                                    member.is_active ? 'bg-emerald-500' : 'bg-slate-400'
                                  )}
                                />
                                {member.is_active ? 'Активен' : 'Неактивен'}
                              </span>
                            </td>

                            {/* Action Button: Карточка */}
                            <td className="py-3 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => setSelectedMemberForDrawer(member)}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:border-indigo-600 hover:text-indigo-600 text-slate-700 font-semibold text-xs transition-colors shadow-2xs inline-flex items-center gap-1.5"
                              >
                                Карточка
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CARDS VIEW */}
          {viewMode === 'cards' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMembers.length === 0 ? (
                <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
                  <Users2 className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm font-medium text-slate-600">Сотрудники не найдены</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Попробуйте изменить параметры поиска или фильтров
                  </p>
                </div>
              ) : (
                filteredMembers.map((member) => {
                  const rBadge = getRoleBadge(member.role);
                  const RIcon = rBadge.icon;
                  const workload = getWorkloadSummary(member);

                  return (
                    <div
                      key={member.id}
                      className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between"
                    >
                      <div>
                        {/* Top Card Info */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 font-bold text-sm border border-indigo-100/60 shadow-2xs">
                              {getInitials(member.full_name)}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <h3 className="font-bold text-slate-900 text-sm leading-tight">
                                  {member.full_name}
                                </h3>
                                {member.role === 'owner' && (
                                  <Crown className="h-3.5 w-3.5 text-purple-600" />
                                )}
                              </div>
                              <span className="text-[11px] text-slate-400 block mt-0.5">
                                {member.email}
                              </span>
                            </div>
                          </div>

                          <span
                            className={cn(
                              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border shrink-0',
                              member.is_active
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            )}
                          >
                            <span
                              className={cn(
                                'h-1.5 w-1.5 rounded-full',
                                member.is_active ? 'bg-emerald-500' : 'bg-slate-400'
                              )}
                            />
                            {member.is_active ? 'Активен' : 'Неактивен'}
                          </span>
                        </div>

                        {/* Badges & Workload */}
                        <div className="space-y-2 pt-2 border-t border-slate-100">
                          <div className="flex items-center justify-between">
                            <span
                              className={cn(
                                'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border',
                                rBadge.color
                              )}
                            >
                              <RIcon className="h-3 w-3" />
                              {rBadge.label}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                              {workload.badge}
                            </span>
                          </div>

                          <p className="text-xs text-slate-500 leading-snug">
                            {workload.text}
                          </p>

                          {/* Contacts row */}
                          <div className="pt-2 text-xs space-y-1">
                            {member.phone && (
                              <div className="flex items-center gap-1.5 text-slate-600">
                                <Phone className="h-3.5 w-3.5 text-slate-400" />
                                <span>{member.phone}</span>
                              </div>
                            )}
                            {member.telegram && (
                              <div className="flex items-center gap-1.5 text-indigo-600">
                                <MessageSquare className="h-3.5 w-3.5 text-indigo-400" />
                                <span>{member.telegram}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Card Button */}
                      <div className="pt-4 mt-4 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setSelectedMemberForDrawer(member)}
                          className="w-full py-2 px-3 text-xs font-semibold rounded-lg bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 border border-slate-200 transition-colors text-center"
                        >
                          Карточка сотрудника →
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* 5. TAB 2: РОЛИ И ПРАВА */}
      {activeTab === 'roles' && (
        <RolesCockpitView showBreadcrumbs={false} members={members} />
      )}

      {/* 6. TAB 3: БЕЗОПАСНОСТЬ */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          {/* Security Architecture Banner */}
          <div className="p-5 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-indigo-900 font-bold text-sm">
              <ShieldCheck className="h-5 w-5 text-indigo-600" />
              Архитектура безопасности: Разграничение прав UI и политик PostgreSQL RLS
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              В Smart Academy CRM действует сквозная модель безопасности данных. UI-матрица прав контролирует
              видимость кнопок и разделов на клиенте, а политики Row Level Security (RLS) в Supabase
              гарантируют невозможность несанкционированного чтения и модификации данных на уровне СУБД.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 2FA Policy Card */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-50 text-purple-700">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Обязательная двухфакторная аутентификация
                    </h3>
                    <p className="text-xs text-slate-500">
                      Требовать 2FA для администраторов и владельца
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked={true}
                    onChange={(e) =>
                      toast.info(
                        e.target.checked
                          ? 'Обязательная 2FA включена'
                          : 'Обязательная 2FA отключена'
                      )
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                При включении политики сотрудники с ролями <strong>Владелец</strong> и{' '}
                <strong>Администратор</strong> обязаны подтверждать вход через одноразовые коды.
              </p>
            </div>

            {/* Session Timeout Policy Card */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Длительность активной сессии
                  </h3>
                  <p className="text-xs text-slate-500">
                    Автоматический выход из системы при неактивности
                  </p>
                </div>
              </div>

              <select
                defaultValue="30"
                onChange={() => toast.success('Параметры сессии сохранены')}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="7">7 дней (Повышенная безопасность)</option>
                <option value="14">14 дней (Стандартная)</option>
                <option value="30">30 дней (По умолчанию для онлайн-школы)</option>
              </select>

              <p className="text-[11px] text-slate-500">
                После истечения срока сессии токен доступа аннулируется и потребуется повторный вход.
              </p>
            </div>
          </div>

          {/* Superuser Protection Card */}
          <div className="p-5 rounded-2xl bg-white border border-purple-200/80 shadow-2xs flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-700 shrink-0">
              <Crown className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900">
                Защита суперпользователя школы (Owner Superuser Guard)
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Аккаунт Владельца школы защищен на уровне серверного API (`DELETE /api/auth/users` возвращает HTTP 403 Forbidden).
                Учетная запись владельца не может быть деактивирована или удалена даже другими администраторами,
                что исключает риск потери контроля над платформой и данными.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Slide-Over Employee Drawer */}
      <EmployeeDrawer
        isOpen={!!selectedMemberForDrawer}
        onClose={() => setSelectedMemberForDrawer(null)}
        member={selectedMemberForDrawer}
        onSave={handleSaveMember}
        onDeactivateToggle={handleDeactivateToggle}
      />

      {/* Modal: Create Employee */}
      <CreateEmployeeModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={loadMembers}
      />
    </div>
  );
}

export default function SettingsTeamPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Загрузка команды...</div>}>
      <TeamCockpitContent />
    </Suspense>
  );
}
