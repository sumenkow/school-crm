'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRole } from '@/context/RoleContext';
import { useLanguage } from '@/context/LanguageContext';
import {
  LayoutDashboard,
  Calendar,
  Users,
  UserCheck,
  CheckSquare,
  CreditCard,
  MonitorPlay,
  ClipboardList,
  BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BottomNavItem {
  key: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const { role } = useRole();
  const { t } = useLanguage();

  const getItems = (): BottomNavItem[] => {
    if (role === 'teacher') {
      return [
        { key: 'nav.main', label: 'Главная', href: '/dashboard', icon: LayoutDashboard },
        { key: 'nav.myLessons', label: 'Уроки', href: '/teacher', icon: MonitorPlay },
        { key: 'nav.attendanceJournal', label: 'Журнал', href: '/teacher/attendance', icon: ClipboardList },
        { key: 'nav.calendar', label: 'Календарь', href: '/calendar', icon: Calendar },
        { key: 'nav.groups', label: 'Группы', href: '/groups', icon: BookOpen },
      ];
    }

    if (role === 'admin') {
      return [
        { key: 'nav.main', label: 'Главная', href: '/dashboard', icon: LayoutDashboard },
        { key: 'nav.crm', label: 'CRM', href: '/crm', icon: UserCheck },
        { key: 'nav.students', label: 'Ученики', href: '/students', icon: Users },
        { key: 'nav.calendar', label: 'Календарь', href: '/calendar', icon: Calendar },
        { key: 'nav.tasks', label: 'Задачи', href: '/tasks', icon: CheckSquare },
      ];
    }

    // Owner & Developer
    return [
      { key: 'nav.main', label: 'Главная', href: '/dashboard', icon: LayoutDashboard },
      { key: 'nav.crm', label: 'CRM', href: '/crm', icon: UserCheck },
      { key: 'nav.students', label: 'Ученики', href: '/students', icon: Users },
      { key: 'nav.calendar', label: 'Календарь', href: '/calendar', icon: Calendar },
      { key: 'nav.finance', label: 'Финансы', href: '/finance', icon: CreditCard },
    ];
  };

  const items = getItems();

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard' || pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 flex items-center justify-around border-t backdrop-blur-lg transition-all select-none"
      style={{
        backgroundColor: 'rgba(242, 244, 249, 0.96)',
        borderColor: 'var(--md-outline-variant, #C1C7CE)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        height: 'calc(62px + env(safe-area-inset-bottom, 0px))',
        boxShadow: '0 -3px 12px rgba(0, 0, 0, 0.08)',
      }}
      aria-label="Мобильная навигация"
    >
      {items.map((item) => {
        const active = isActive(item.href);
        const IconComponent = item.icon;
        const localizedLabel = item.key ? t(item.key, item.label) : item.label;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('close-all-modals'));
              }
            }}
            className="flex flex-col items-center justify-center flex-1 h-full py-1 text-center no-underline transition-transform active:scale-95"
            style={{
              color: active ? 'var(--md-on-secondary-container, #101C2B)' : 'var(--md-on-surface-variant, #41484F)',
            }}
          >
            {/* MD3 Active Indicator Pill */}
            <div
              className={cn(
                'flex items-center justify-center w-12 h-7 rounded-full transition-all duration-200',
                active
                  ? 'shadow-xs'
                  : 'bg-transparent'
              )}
              style={{
                backgroundColor: active ? 'var(--md-secondary-container, #D7E3F7)' : 'transparent',
              }}
            >
              <IconComponent
                size={18}
                className={cn(
                  'transition-transform duration-150',
                  active ? 'scale-110 text-blue-700' : 'opacity-70'
                )}
              />
            </div>
            {/* Label */}
            <span
              className={cn(
                'text-[10px] tracking-tight mt-0.5 truncate max-w-[68px]',
                active ? 'font-bold text-blue-900' : 'font-medium text-slate-600'
              )}
            >
              {localizedLabel}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
