'use client';

import React, { useState, useEffect } from 'react';
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
  School,
  Database,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
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
      { label: 'Команда и преподаватели', href: '/settings/team', icon: <Users2 size={20} /> },
      { label: 'Импорт Excel', href: '/settings/import', icon: <FileSpreadsheet size={20} /> },
      { label: 'Бэкап базы', href: '/settings/backup', icon: <Database size={20} /> },
      { label: 'Настройки', href: '/settings', icon: <Settings size={20} /> },
    ],
  },
  {
    section: 'База знаний',
    items: [
      { label: 'Справка и гид', href: '/help', icon: <HelpCircle size={20} /> },
    ],
  },
];

const adminNav: NavSection[] = [
  {
    items: [
      { label: 'Мой день', href: '/dashboard', icon: <LayoutDashboard size={20} /> },
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
  {
    section: 'Администрирование',
    items: [
      { label: 'Команда и преподаватели', href: '/settings/team', icon: <Users2 size={20} /> },
    ],
  },
  {
    section: 'База знаний',
    items: [
      { label: 'Справка и гид', href: '/help', icon: <HelpCircle size={20} /> },
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
  {
    section: 'База знаний',
    items: [
      { label: 'Справка и гид', href: '/help', icon: <HelpCircle size={20} /> },
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
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('crm_sidebar_collapsed');
      if (saved === 'true') {
        setCollapsed(true);
      }
    } catch {}
  }, []);

  const handleToggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('crm_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

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
      className="flex flex-col h-full overflow-y-auto overflow-x-hidden transition-all duration-200"
      style={{
        width: collapsed ? '76px' : '256px',
        backgroundColor: 'var(--md-surface-container-low)',
        paddingTop: '8px',
        paddingBottom: '16px',
      }}
    >
      {/* Drawer Header */}
      <div style={{ padding: collapsed ? '12px 8px' : '16px 16px 12px' }}>
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <div
              className="flex items-center justify-center flex-shrink-0"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: 'var(--md-primary-container)',
                color: 'var(--md-on-primary-container)',
              }}
              title="YouEurope School CRM"
            >
              <School size={20} />
            </div>
            <button
              onClick={handleToggleCollapsed}
              className="hidden md:flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              style={{
                width: '32px',
                height: '32px',
                border: '1px solid var(--md-outline-variant)',
                backgroundColor: 'var(--md-surface)',
                color: 'var(--md-primary)',
              }}
              title="Развернуть панель навигации"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
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
            <div className="min-w-0 flex-1">
              <p className="md-title-small font-bold truncate" style={{ color: 'var(--md-on-surface)', fontSize: '15px', lineHeight: '18px' }}>
                YouEurope School CRM
              </p>
              <p className="md-label-small truncate" style={{ color: 'var(--md-on-surface-variant)' }}>
                Управление школой
              </p>
            </div>
            {/* Collapse toggle button for desktop */}
            <button
              onClick={handleToggleCollapsed}
              className="hidden md:flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer shrink-0"
              style={{
                width: '32px',
                height: '32px',
                border: 'none',
                backgroundColor: 'transparent',
                color: 'var(--md-on-surface-variant)',
              }}
              title="Свернуть панель (увеличить рабочую область)"
            >
              <ChevronLeft size={18} />
            </button>
            {/* Mobile close button */}
            <button
              onClick={onCloseMobile}
              className="md:hidden ml-auto flex items-center justify-center"
              style={{
                width: '36px',
                height: '36px',
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
        )}
      </div>

      {/* Navigation Sections */}
      <nav style={{ flex: 1, padding: collapsed ? '0 8px' : '0 12px' }}>
        {navSections.map((section, sIdx) => (
          <div key={sIdx}>
            {/* Divider between sections */}
            {sIdx > 0 && (
              <div
                style={{
                  height: '1px',
                  backgroundColor: 'var(--md-outline-variant)',
                  margin: collapsed ? '8px auto' : '8px 4px',
                  width: collapsed ? '36px' : 'auto',
                }}
              />
            )}

            {/* Section label */}
            {section.section && !collapsed && (
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
                  title={collapsed ? item.label : undefined}
                  className={`flex items-center ${collapsed ? 'justify-center mx-auto' : 'gap-3'} relative transition-all duration-150`}
                  style={{
                    height: collapsed ? '46px' : '52px',
                    width: collapsed ? '46px' : '100%',
                    padding: collapsed ? '0' : '0 16px',
                    borderRadius: '9999px',
                    marginBottom: '3px',
                    backgroundColor: active ? 'var(--md-secondary-container)' : 'transparent',
                    color: active ? 'var(--md-on-secondary-container)' : 'var(--md-on-surface-variant)',
                    fontWeight: active ? 700 : 400,
                    fontSize: '14px',
                    textDecoration: 'none',
                  }}
                >
                  <span style={{ flexShrink: 0, opacity: active ? 1 : 0.75 }}>
                    {item.icon}
                  </span>
                  {!collapsed && (
                    <span className="md-label-large truncate">{item.label}</span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom Collapse/Expand Footer Button (Desktop) */}
      <div className="hidden md:block pt-3 border-t border-slate-200/60" style={{ paddingLeft: collapsed ? '8px' : '12px', paddingRight: collapsed ? '8px' : '12px' }}>
        <button
          onClick={handleToggleCollapsed}
          className={`flex items-center ${collapsed ? 'justify-center mx-auto w-10 h-10' : 'justify-between w-full px-3.5 py-2'} rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer text-xs font-semibold`}
          style={{
            border: '1px solid var(--md-outline-variant)',
            color: 'var(--md-on-surface-variant)',
            backgroundColor: 'transparent',
          }}
          title={collapsed ? 'Развернуть панель' : 'Свернуть панель'}
        >
          {!collapsed && <span>Свернуть панель</span>}
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop: permanent collapsible drawer */}
      <div
        className="hidden md:block flex-shrink-0 transition-all duration-200"
        style={{ width: collapsed ? '76px' : '256px' }}
      >
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
