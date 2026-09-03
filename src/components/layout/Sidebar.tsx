'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRole } from '@/context/RoleContext';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Calendar,
  Users,
  UserCheck,
  GraduationCap,
  Briefcase,
  Contact2,
  CheckSquare,
  CreditCard,
  BarChart3,
  Settings,
  BookOpen,
  Sparkles,
  FileSpreadsheet,
  X
} from 'lucide-react';

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const { role } = useRole();

  const allNavItems = [
    {
      title: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      roles: ['owner', 'admin'],
    },
    {
      title: 'Календарь',
      href: '/calendar',
      icon: Calendar,
      roles: ['owner', 'admin'],
    },
    {
      title: 'Ученики',
      href: '/students',
      icon: Users,
      roles: ['owner', 'admin'],
    },
    {
      title: 'Родители',
      href: '/parents',
      icon: Contact2,
      roles: ['owner', 'admin'],
    },
    {
      title: 'Группы',
      href: '/groups',
      icon: GraduationCap,
      roles: ['owner', 'admin'],
    },
    {
      title: 'Преподаватели',
      href: '/teachers',
      icon: Briefcase,
      roles: ['owner', 'admin'],
    },
    {
      title: 'CRM (Лиды)',
      href: '/crm',
      icon: UserCheck,
      roles: ['owner', 'admin'],
    },
    {
      title: 'Задачи',
      href: '/tasks',
      icon: CheckSquare,
      roles: ['owner', 'admin'],
    },
    {
      title: 'Оплаты',
      href: '/finance',
      icon: CreditCard,
      roles: ['owner', 'admin'],
    },
    {
      title: 'Аналитика',
      href: '/analytics',
      icon: BarChart3,
      roles: ['owner'],
    },
    {
      title: 'Импорт Excel',
      href: '/settings/import',
      icon: FileSpreadsheet,
      roles: ['owner', 'admin'],
    },
    {
      title: 'Настройки',
      href: '/settings',
      icon: Settings,
      roles: ['owner'],
    },
  ];

  // Teacher navigation items (minimal, focused)
  const teacherNavItems = [
    {
      title: 'Мои занятия',
      href: '/teacher',
      icon: Calendar,
      roles: ['teacher'],
    },
    {
      title: 'Мои группы',
      href: '/groups',
      icon: GraduationCap,
      roles: ['teacher'],
    },
    {
      title: 'Журнал посещаемости',
      href: '/teacher/attendance',
      icon: CheckSquare,
      roles: ['teacher'],
    },
  ];

  const visibleItems = role === 'teacher' ? teacherNavItems : allNavItems.filter((item) => item.roles.includes(role));

  const roleLabel = {
    owner: 'Руководитель',
    admin: 'Администратор',
    teacher: 'Преподаватель',
  }[role];

  const roleColor = {
    owner: 'bg-purple-50 text-purple-700 border-purple-200',
    admin: 'bg-blue-50 text-blue-700 border-blue-200',
    teacher: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  }[role];

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 md:static md:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-100 px-5">
          <Link href={role === 'teacher' ? '/teacher' : '/dashboard'} className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-sm">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <span className="font-semibold tracking-tight text-slate-900">School App</span>
              <span className="ml-1 text-[10px] font-medium text-blue-600 uppercase tracking-wider">CRM</span>
            </div>
          </Link>
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 md:hidden"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Current Role Badge */}
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Текущий режим:</span>
            <span className={cn('rounded-full px-2.5 py-0.5 font-semibold text-[11px] border', roleColor)}>
              {roleLabel}
            </span>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && item.href !== '/teacher' && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                )}
              >
                <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-blue-600' : 'text-slate-400')} />
                <span>{item.title}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer info */}
        <div className="border-t border-slate-100 p-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span>One Source of Truth</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">v0.1.0 • Foundation MVP</p>
        </div>
      </aside>
    </>
  );
}
