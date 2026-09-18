'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRole } from '@/context/RoleContext';
import { useLanguage } from '@/context/LanguageContext';
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
  key: string;
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface NavSection {
  sectionKey?: string;
  section?: string;
  items: NavItem[];
}

const getOwnerNav = (): NavSection[] => [
  {
    items: [
      { key: 'nav.main', label: 'Главная', href: '/dashboard', icon: <LayoutDashboard size={20} /> },
      { key: 'nav.calendar', label: 'Календарь', href: '/calendar', icon: <Calendar size={20} /> },
    ],
  },
  {
    sectionKey: 'nav.section.students',
    section: 'Ученики',
    items: [
      { key: 'nav.students', label: 'Ученики', href: '/students', icon: <Users size={20} /> },
      { key: 'nav.parents', label: 'Родители', href: '/parents', icon: <GraduationCap size={20} /> },
      { key: 'nav.groups', label: 'Группы', href: '/groups', icon: <BookOpen size={20} /> },
    ],
  },
  {
    sectionKey: 'nav.section.sales',
    section: 'Продажи',
    items: [
      { key: 'nav.crm', label: 'CRM (Лиды)', href: '/crm', icon: <UserCheck size={20} /> },
      { key: 'nav.tasks', label: 'Задачи', href: '/tasks', icon: <CheckSquare size={20} /> },
    ],
  },
  {
    sectionKey: 'nav.section.finance',
    section: 'Финансы и аналитика',
    items: [
      { key: 'nav.finance', label: 'Оплаты', href: '/finance', icon: <CreditCard size={20} /> },
      { key: 'nav.analytics', label: 'Аналитика', href: '/analytics', icon: <BarChart3 size={20} /> },
    ],
  },
  {
    sectionKey: 'nav.section.admin',
    section: 'Администрирование',
    items: [
      { key: 'nav.team', label: 'Команда и преподаватели', href: '/settings/team', icon: <Users2 size={20} /> },
      { key: 'nav.import', label: 'Импорт Excel', href: '/settings/import', icon: <FileSpreadsheet size={20} /> },
      { key: 'nav.backup', label: 'Бэкап базы', href: '/settings/backup', icon: <Database size={20} /> },
      { key: 'nav.settings', label: 'Настройки', href: '/settings', icon: <Settings size={20} /> },
    ],
  },
  {
    sectionKey: 'nav.section.kb',
    section: 'База знаний',
    items: [
      { key: 'nav.help', label: 'Справка и гид', href: '/help', icon: <HelpCircle size={20} /> },
    ],
  },
];

const getAdminNav = (): NavSection[] => [
  {
    items: [
      { key: 'nav.myDay', label: 'Мой день', href: '/dashboard', icon: <LayoutDashboard size={20} /> },
      { key: 'nav.calendar', label: 'Календарь', href: '/calendar', icon: <Calendar size={20} /> },
    ],
  },
  {
    sectionKey: 'nav.section.students',
    section: 'Ученики',
    items: [
      { key: 'nav.students', label: 'Ученики', href: '/students', icon: <Users size={20} /> },
      { key: 'nav.parents', label: 'Родители', href: '/parents', icon: <GraduationCap size={20} /> },
      { key: 'nav.groups', label: 'Группы', href: '/groups', icon: <BookOpen size={20} /> },
    ],
  },
  {
    sectionKey: 'nav.section.sales',
    section: 'Продажи',
    items: [
      { key: 'nav.crm', label: 'CRM (Лиды)', href: '/crm', icon: <UserCheck size={20} /> },
      { key: 'nav.tasks', label: 'Задачи', href: '/tasks', icon: <CheckSquare size={20} /> },
    ],
  },
  {
    sectionKey: 'nav.section.finance',
    section: 'Финансы',
    items: [
      { key: 'nav.finance', label: 'Оплаты', href: '/finance', icon: <CreditCard size={20} /> },
    ],
  },
  {
    sectionKey: 'nav.section.admin',
    section: 'Администрирование',
    items: [
      { key: 'nav.team', label: 'Команда и преподаватели', href: '/settings/team', icon: <Users2 size={20} /> },
    ],
  },
  {
    sectionKey: 'nav.section.kb',
    section: 'База знаний',
    items: [
      { key: 'nav.help', label: 'Справка и гид', href: '/help', icon: <HelpCircle size={20} /> },
    ],
  },
];

const getTeacherNav = (): NavSection[] => [
  {
    items: [
      { key: 'nav.main', label: 'Главная', href: '/dashboard', icon: <LayoutDashboard size={20} /> },
      { key: 'nav.myLessons', label: 'Мои занятия', href: '/teacher', icon: <MonitorPlay size={20} /> },
      { key: 'nav.calendar', label: 'Календарь', href: '/calendar', icon: <Calendar size={20} /> },
      { key: 'nav.groups', label: 'Мои группы', href: '/groups', icon: <BookOpen size={20} /> },
      { key: 'nav.attendanceJournal', label: 'Журнал посещаемости', href: '/teacher/attendance', icon: <ClipboardList size={20} /> },
    ],
  },
  {
    sectionKey: 'nav.section.kb',
    section: 'База знаний',
    items: [
      { key: 'nav.help', label: 'Справка и гид', href: '/help', icon: <HelpCircle size={20} /> },
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
  const { t } = useLanguage();
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
    (role === 'owner' || role === 'developer') ? getOwnerNav() :
    role === 'admin' ? getAdminNav() :
    getTeacherNav();

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
              title={t('app.title', 'YouEurope School CRM')}
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
              title={t('nav.expand', 'Развернуть панель')}
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
                {t('app.title', 'YouEurope School CRM')}
              </p>
              <p className="md-label-small truncate" style={{ color: 'var(--md-on-surface-variant)' }}>
                {t('app.subtitle', 'Управление школой')}
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
              title={t('nav.collapse', 'Свернуть панель')}
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
                {section.sectionKey ? t(section.sectionKey, section.section) : section.section}
              </p>
            )}

            {/* Nav items */}
            {section.items.map((item) => {
              const active = isActive(item.href);
              const label = item.key ? t(item.key, item.label) : item.label;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onCloseMobile}
                  title={collapsed ? label : undefined}
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
                    <span className="md-label-large truncate">{label}</span>
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
          title={collapsed ? t('nav.expand', 'Развернуть панель') : t('nav.collapse', 'Свернуть панель')}
        >
          {!collapsed && <span>{t('nav.collapse', 'Свернуть панель')}</span>}
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop: permanent collapsible drawer */}
      <div
        className="hidden md:block flex-shrink-0 h-full overflow-y-auto transition-all duration-200"
        style={{ width: collapsed ? '76px' : '256px' }}
      >
        {drawerContent}
      </div>

      {/* Mobile: sliding modal drawer */}
      <div
        className="md:hidden fixed inset-y-0 left-0 z-50 transition-transform duration-300"
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
