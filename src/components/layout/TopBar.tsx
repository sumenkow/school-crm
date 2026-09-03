'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useRole } from '@/context/RoleContext';
import { UserRole } from '@/types';
import { Search, Menu, Bell, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TopBarProps {
  onOpenMobile?: () => void;
}

export function TopBar({ onOpenMobile }: TopBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { role, setRole, userName } = useRole();

  const roles: { key: UserRole; label: string; badge: string }[] = [
    { key: 'owner', label: 'Owner', badge: 'Руководитель' },
    { key: 'admin', label: 'Admin', badge: 'Администратор' },
    { key: 'teacher', label: 'Teacher', badge: 'Преподаватель' },
  ];

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    if (newRole === 'teacher') {
      router.push('/teacher');
    } else {
      if (pathname === '/teacher' || pathname === '/teacher/attendance') {
        router.push('/dashboard');
      }
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/90 px-3 md:px-6 backdrop-blur-md">
      <div className="flex items-center gap-2 md:gap-3">
        {/* Mobile menu trigger */}
        <button
          type="button"
          onClick={onOpenMobile}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 active:bg-slate-200 md:hidden touch-manipulation"
          aria-label="Open navigation"
        >
          <Menu className="h-6 w-6" />
        </button>

        {/* Global Search Box (Cmd+K trigger) */}
        <div className="relative hidden sm:block">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            readOnly
            placeholder="Поиск ученика, родителя, группы... (⌘K)"
            className="h-9 w-52 md:w-80 rounded-lg border border-slate-200 bg-slate-50/70 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 transition-colors focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            onClick={() => alert('Глобальный поиск Cmd+K будет подключен в следующих этапах.')}
          />
        </div>
      </div>

      {/* Right actions: Role Switcher & User Profile */}
      <div className="flex items-center gap-1.5 sm:gap-4">
        {/* Role Switcher Pills */}
        <div className="flex items-center rounded-lg bg-slate-100 p-1 text-xs">
          <span className="hidden lg:flex items-center gap-1 px-2 font-medium text-slate-500">
            <Shield className="h-3 w-3" />
            Роль:
          </span>
          {roles.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => handleRoleChange(r.key)}
              className={cn(
                'rounded-md px-2 sm:px-2.5 py-1 text-xs font-semibold transition-all touch-manipulation',
                role === r.key
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 active:bg-slate-200'
              )}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Notification bell */}
        <button
          type="button"
          className="relative rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500" />
        </button>

        {/* User Avatar */}
        <div className="flex items-center gap-2 pl-1 sm:pl-2 border-l border-slate-200">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 shrink-0">
            {userName[0]}
          </div>
          <div className="hidden text-left md:block">
            <p className="text-xs font-medium text-slate-800 leading-none">{userName}</p>
            <p className="mt-1 text-[10px] text-slate-400 capitalize">{role}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
