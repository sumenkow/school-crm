'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRole } from '@/context/RoleContext';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Users2,
  GraduationCap,
  BookOpen,
  UserCheck,
  CheckSquare,
  CreditCard,
  BarChart3,
  FileSpreadsheet,
  Settings,
  MonitorPlay,
  ClipboardList,
  X,
  School
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface NavSection {
  section?: string;
  items: NavItem[];
}

const ownerNav: NavSection[] = [
  {
    items: [
      { label: 'Главная', href: '/dashboard', icon: <LayoutDashboard size={20} /> },
      { label: 'Календарь', href: '/calendar', icon: <Calendar size={20} /> },
    ],
  },
  {
    section: 'Ученики',
    items: [
      { label: 'Ученики', href: '/students', icon: <Users size={20} /> },
      { label: 'Родители', href: '/parents', icon: <GraduationCap size={20} /> },
      { label: 'Группы', href: '/groups', icon: <BookOpen size={20} /> },
    ],
  },
  {
    section: 'Сотрудники',
    items: [
      { label: 'Преподаватели', href: '/teachers', icon: <UserCheck size={20} /> },
    ],
  },
  {
    section: 'Продажи',
    items: [
      { label: 'CRM (Лиды)', href: '/crm', icon: <UserCheck size={20} /> },
      { label: 'Задачи', href: '/tasks', icon: <CheckSquare size={20} /> },
    ],
  },
  {
    section: 'Финансы и аналитика',
    items: [
      { label: 'Оплаты', href: '/finance', icon: <CreditCard size={20} /> },
      { label: 'Аналитика', href: '/analytics', icon: <BarChart3 size={20} /> },
    ],
  },
  {
    section: 'Администрирование',
    items: [
      { label: 'Команда', href: '/settings/team', icon: <Users2 size={20} /> },
      { label: 'Импорт Excel', href: '/settings/import', icon: <FileSpreadsheet size={20} /> },
      { label: 'Настройки', href: '/settings', icon: <Settings size={20} /> },
    ],
  },
];

const adminNav: NavSection[] = [
  {
    items: [
      { label: 'Главная', href: '/dashboard', icon: <LayoutDashboard size={20} /> },
      { label: 'Календарь', href: '/calendar', icon: <Calendar size={20} /> },
    ],
  },
  {
    section: 'Ученики',
    items: [
      { label: 'Ученики', href: '/students', icon: <Users size={20} /> },
      { label: 'Родители', href: '/parents', icon: <GraduationCap size={20} /> },
      { label: 'Группы', href: '/groups', icon: <BookOpen size={20} /> },
    ],
  },
  {
    section: 'Сотрудники',
    items: [
      { label: 'Преподаватели', href: '/teachers', icon: <UserCheck size={20} /> },
    ],
  },
  {
    section: 'Продажи',
    items: [
      { label: 'CRM (Лиды)', href: '/crm', icon: <UserCheck size={20} /> },
      { label: 'Задачи', href: '/tasks', icon: <CheckSquare size={20} /> },
    ],
  },
  {
    section: 'Финансы',
    items: [
      { label: 'Оплаты', href: '/finance', icon: <CreditCard size={20} /> },
    ],
  },
];

const teacherNav: NavSection[] = [
  {
    items: [
      { label: 'Главная', href: '/dashboard', icon: <LayoutDashboard size={20} /> },
      { label: 'Мои занятия', href: '/teacher', icon: <MonitorPlay size={20} /> },
      { label: 'Календарь', href: '/calendar', icon: <Calendar size={20} /> },
      { label: 'Мои группы', href: '/groups', icon: <BookOpen size={20} /> },
      { label: 'Журнал посещаемости', href: '/teacher/attendance', icon: <ClipboardList size={20} /> },
    ],
  },
];

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const { role } = useRole();

  const navSections =
    role === 'owner' ? ownerNav :
    role === 'admin' ? adminNav :
    teacherNav;

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard' || pathname === '/';
    return pathname.startsWith(href);
  };

  const drawerContent = (
    <div
      className="flex flex-col h-full overflow-y-auto"
      style={{
        width: '256px',
        backgroundColor: 'var(--md-surface-container-low)',
        paddingTop: '8px',
        paddingBottom: '16px',
      }}
    >
      {/* Drawer Header */}
      <div style={{ padding: '16px 16px 12px' }}>
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center flex-shrink-0"
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: 'var(--md-primary-container)',
              color: 'var(--md-on-primary-container)',
            }}
          >
            <School size={20} />
          </div>
          <div>
            <p className="md-title-small" style={{ color: 'var(--md-on-surface)' }}>School App</p>
            <p className="md-label-small" style={{ color: 'var(--md-on-surface-variant)' }}>Управление школой</p>
          </div>
          {/* Mobile close button */}
          <button
            onClick={onCloseMobile}
            className="md:hidden ml-auto flex items-center justify-center"
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              color: 'var(--md-on-surface-variant)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Navigation Sections */}
      <nav style={{ flex: 1, padding: '0 12px' }}>
        {navSections.map((section, sIdx) => (
          <div key={sIdx}>
            {/* Divider between sections */}
            {sIdx > 0 && (
              <div
                style={{
                  height: '1px',
                  backgroundColor: 'var(--md-outline-variant)',
                  margin: '8px 4px',
                }}
              />
            )}

            {/* Section label */}
            {section.section && (
              <p
                className="md-label-medium"
                style={{
                  color: 'var(--md-on-surface-variant)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.8px',
                  padding: '12px 16px 4px',
                }}
              >
                {section.section}
              </p>
            )}

            {/* Nav items */}
            {section.items.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onCloseMobile}
                  className="flex items-center gap-3 relative"
                  style={{
                    height: '56px',
                    padding: '0 16px',
                    borderRadius: '9999px',
                    marginBottom: '2px',
                    backgroundColor: active ? 'var(--md-secondary-container)' : 'transparent',
                    color: active ? 'var(--md-on-secondary-container)' : 'var(--md-on-surface-variant)',
                    fontWeight: active ? 700 : 400,
                    fontSize: '14px',
                    textDecoration: 'none',
                    transition: 'background-color 0.15s',
                  }}
                >
                  <span style={{ flexShrink: 0, opacity: active ? 1 : 0.7 }}>
                    {item.icon}
                  </span>
                  <span className="md-label-large truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </div>
  );

  return (
    <>
      {/* Desktop: permanent drawer */}
      <div className="hidden md:block flex-shrink-0" style={{ width: '256px' }}>
        {drawerContent}
      </div>

      {/* Mobile: sliding modal drawer */}
      <div
        className="md:hidden fixed inset-y-0 left-0 z-40 transition-transform duration-300"
        style={{
          transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          boxShadow: mobileOpen ? 'var(--md-elevation-3)' : 'none',
        }}
      >
        {drawerContent}
      </div>
    </>
  );
}
