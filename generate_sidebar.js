const fs = require('fs');

const content = `'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useRole } from '@/context/RoleContext';
import { useLanguage } from '@/context/LanguageContext';
import { createClient } from '@/lib/supabase/client';
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
  Plus,
  ChevronDown,
  User,
  LogOut,
  MoreVertical
} from 'lucide-react';
import { UserProfileModal } from '@/components/profile/UserProfileModal';

interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface NavSection {
  id: string;
  sectionKey?: string;
  section?: string;
  defaultOpen?: boolean;
  items: NavItem[];
}

const getOwnerNav = (): NavSection[] => [
  {
    id: 'main',
    defaultOpen: true,
    items: [
      { key: 'nav.main', label: 'Главная', href: '/dashboard', icon: <LayoutDashboard size={20} /> },
      { key: 'nav.calendar', label: 'Календарь', href: '/calendar', icon: <Calendar size={20} /> },
    ],
  },
  {
    id: 'students',
    sectionKey: 'nav.section.students',
    section: 'Ученики',
    items: [
      { key: 'nav.students', label: 'Ученики', href: '/students', icon: <Users size={20} /> },
      { key: 'nav.parents', label: 'Родители', href: '/parents', icon: <GraduationCap size={20} /> },
      { key: 'nav.groups', label: 'Группы', href: '/groups', icon: <BookOpen size={20} /> },
    ],
  },
  {
    id: 'sales',
    sectionKey: 'nav.section.sales',
    section: 'Продажи',
    items: [
      { key: 'nav.crm', label: 'CRM (Лиды)', href: '/crm', icon: <UserCheck size={20} /> },
      { key: 'nav.tasks', label: 'Задачи', href: '/tasks', icon: <CheckSquare size={20} /> },
    ],
  },
  {
    id: 'finance',
    sectionKey: 'nav.section.finance',
    section: 'Финансы и аналитика',
    items: [
      { key: 'nav.finance', label: 'Оплаты', href: '/finance', icon: <CreditCard size={20} /> },
      { key: 'nav.analytics', label: 'Аналитика', href: '/analytics', icon: <BarChart3 size={20} /> },
    ],
  },
  {
    id: 'admin',
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
    id: 'kb',
    sectionKey: 'nav.section.kb',
    section: 'База знаний',
    items: [
      { key: 'nav.help', label: 'Справка и гид', href: '/help', icon: <HelpCircle size={20} /> },
    ],
  },
];

const getAdminNav = (): NavSection[] => [
  {
    id: 'main',
    defaultOpen: true,
    items: [
      { key: 'nav.myDay', label: 'Мой день', href: '/dashboard', icon: <LayoutDashboard size={20} /> },
      { key: 'nav.calendar', label: 'Календарь', href: '/calendar', icon: <Calendar size={20} /> },
    ],
  },
  {
    id: 'students',
    sectionKey: 'nav.section.students',
    section: 'Ученики',
    items: [
      { key: 'nav.students', label: 'Ученики', href: '/students', icon: <Users size={20} /> },
      { key: 'nav.parents', label: 'Родители', href: '/parents', icon: <GraduationCap size={20} /> },
      { key: 'nav.groups', label: 'Группы', href: '/groups', icon: <BookOpen size={20} /> },
    ],
  },
  {
    id: 'sales',
    sectionKey: 'nav.section.sales',
    section: 'Продажи',
    items: [
      { key: 'nav.crm', label: 'CRM (Лиды)', href: '/crm', icon: <UserCheck size={20} /> },
      { key: 'nav.tasks', label: 'Задачи', href: '/tasks', icon: <CheckSquare size={20} /> },
    ],
  },
  {
    id: 'finance',
    sectionKey: 'nav.section.finance',
    section: 'Финансы',
    items: [
      { key: 'nav.finance', label: 'Оплаты', href: '/finance', icon: <CreditCard size={20} /> },
    ],
  },
  {
    id: 'admin',
    sectionKey: 'nav.section.admin',
    section: 'Администрирование',
    items: [
      { key: 'nav.team', label: 'Команда и преподаватели', href: '/settings/team', icon: <Users2 size={20} /> },
    ],
  },
  {
    id: 'kb',
    sectionKey: 'nav.section.kb',
    section: 'База знаний',
    items: [
      { key: 'nav.help', label: 'Справка и гид', href: '/help', icon: <HelpCircle size={20} /> },
    ],
  },
];

const getTeacherNav = (): NavSection[] => [
  {
    id: 'main',
    defaultOpen: true,
    items: [
      { key: 'nav.main', label: 'Главная', href: '/dashboard', icon: <LayoutDashboard size={20} /> },
      { key: 'nav.myLessons', label: 'Мои занятия', href: '/teacher', icon: <MonitorPlay size={20} /> },
      { key: 'nav.calendar', label: 'Календарь', href: '/calendar', icon: <Calendar size={20} /> },
      { key: 'nav.groups', label: 'Мои группы', href: '/groups', icon: <BookOpen size={20} /> },
      { key: 'nav.attendanceJournal', label: 'Журнал посещаемости', href: '/teacher/attendance', icon: <ClipboardList size={20} /> },
    ],
  },
  {
    id: 'kb',
    sectionKey: 'nav.section.kb',
    section: 'База знаний',
    items: [
      { key: 'nav.help', label: 'Справка и гид', href: '/help', icon: <HelpCircle size={20} /> },
    ],
  },
];

// Accordion Component
const NavAccordionGroup = ({ section, collapsed, pathname, onCloseMobile, t }: any) => {
  const [isOpen, setIsOpen] = useState(section.defaultOpen || false);
  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
    return pathname.startsWith(href);
  };
  const hasActive = section.items.some((i: any) => isActive(i.href));

  useEffect(() => {
    if (hasActive && !collapsed) setIsOpen(true);
  }, [hasActive, collapsed]);

  // When collapsed, we do not show accordion header, just the items directly or icon? 
  // Let's render items. In a true Gemini UI, sections just become icons or a popover.
  // For simplicity, when collapsed, we just render the items without the section header.

  return (
    <div className="mb-2">
      {!collapsed && section.section && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-between w-full px-4 py-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors group cursor-pointer"
        >
          <span className="text-xs font-semibold uppercase tracking-wider">
            {section.sectionKey ? t(section.sectionKey, section.section) : section.section}
          </span>
          {isOpen ? (
            <ChevronDown size={14} className="text-slate-400 group-hover:text-slate-600" />
          ) : (
            <ChevronRight size={14} className="text-slate-400 group-hover:text-slate-600" />
          )}
        </button>
      )}

      {(isOpen || collapsed || !section.section) && (
        <div className="mt-0.5 space-y-0.5">
          {section.items.map((item: any) => {
            const active = isActive(item.href);
            const label = item.key ? t(item.key, item.label) : item.label;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                title={collapsed ? label : undefined}
                className={"flex items-center relative transition-all duration-150 rounded-full cursor-pointer " + 
                  (collapsed ? "justify-center mx-auto" : "gap-3 px-4")
                }
                style={{
                  height: collapsed ? '46px' : '44px',
                  width: collapsed ? '46px' : '100%',
                  backgroundColor: active ? 'var(--md-secondary-container)' : 'transparent',
                  color: active ? 'var(--md-on-secondary-container)' : 'var(--md-on-surface-variant)',
                  fontWeight: active ? 600 : 400,
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
      )}
    </div>
  );
};


interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { role, userName, userEmail } = useRole();
  const { t } = useLanguage();
  const [collapsed, setCollapsed] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) setCollapsed(true);
      else setCollapsed(false);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const navSections = role === 'owner' || role === 'developer' ? getOwnerNav() :
    role === 'admin' ? getAdminNav() :
    getTeacherNav();

  const handleToggleCollapsed = () => setCollapsed(!collapsed);

  const displayName = userName || userEmail || '?';
  const avatarLetter = displayName.charAt(0).toUpperCase();

  const drawerContent = (
    <div className="flex flex-col h-full overflow-hidden transition-all duration-300 relative bg-slate-50 border-r border-slate-200" style={{ width: collapsed ? '76px' : '260px' }}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 flex-shrink-0 h-16">
        {!collapsed && (
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg bg-blue-600 text-white">
              <School size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-[15px] truncate text-slate-800">
                YouEurope CRM
              </p>
            </div>
          </div>
        )}
        <button
          onClick={handleToggleCollapsed}
          className={"flex items-center justify-center rounded-lg hover:bg-slate-200 transition-colors cursor-pointer text-slate-500 shrink-0 " + (collapsed ? "w-full h-10" : "w-8 h-8")}
          title={collapsed ? "Развернуть" : "Свернуть"}
        >
          {collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
        </button>
      </div>

      {/* Primary CTA */}
      <div className="px-3 mb-3 flex-shrink-0">
        <button
          onClick={() => {
            onCloseMobile();
            router.push('/crm?new=1');
          }}
          title={collapsed ? "Новый лид" : undefined}
          className="w-full rounded-full bg-slate-900 text-white hover:bg-slate-800 shadow-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
          style={{ height: '44px', padding: collapsed ? '0' : '0 16px' }}
        >
          <Plus size={20} />
          {!collapsed && <span className="font-medium text-[15px]">Новый лид</span>}
        </button>
      </div>

      {/* Body / Nav List */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-3 pb-4">
        {navSections.map((section) => (
          <NavAccordionGroup 
            key={section.id} 
            section={section} 
            collapsed={collapsed} 
            pathname={pathname} 
            onCloseMobile={onCloseMobile} 
            t={t} 
          />
        ))}
      </div>

      {/* Footer / User Profile */}
      <div className="p-3 border-t border-slate-200 flex-shrink-0 relative" ref={dropdownRef}>
        <button
          onClick={() => setUserDropdownOpen(!userDropdownOpen)}
          className={"w-full flex items-center gap-2 p-2 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer " + (collapsed ? "justify-center" : "")}
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold shrink-0">
            {avatarLetter}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-semibold text-slate-800 truncate">{displayName}</p>
              <p className="text-[11px] text-slate-500 capitalize">{role}</p>
            </div>
          )}
          {!collapsed && <MoreVertical size={16} className="text-slate-400 shrink-0" />}
        </button>

        {/* User Dropdown */}
        {userDropdownOpen && (
          <div 
            className="absolute bottom-full mb-2 left-3 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50 animate-in fade-in zoom-in-95 duration-100"
            style={{ 
               transformOrigin: 'bottom left',
               left: collapsed ? '70px' : '12px'
            }}
          >
            <div className="px-3 py-2 border-b border-slate-100 mb-1">
              <p className="text-sm font-bold text-slate-800 truncate">{displayName}</p>
              <p className="text-xs text-slate-500 truncate">{userEmail}</p>
            </div>
            <button
              onClick={() => {
                setUserDropdownOpen(false);
                setProfileModalOpen(true);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <User size={16} /> Профиль
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer"
            >
              <LogOut size={16} /> Выйти
            </button>
          </div>
        )}
      </div>
      
      {/* User Account Profile Modal */}
      <UserProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <div className="hidden md:block flex-shrink-0 h-full overflow-hidden transition-all duration-300" style={{ width: collapsed ? '76px' : '260px' }}>
        {drawerContent}
      </div>

      {/* Mobile */}
      <div
        className="md:hidden fixed inset-y-0 left-0 z-50 transition-transform duration-300"
        style={{
          transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          boxShadow: mobileOpen ? 'var(--md-elevation-3)' : 'none',
        }}
      >
        {drawerContent}
      </div>
      
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onCloseMobile} />
      )}
    </>
  );
}
`;

fs.writeFileSync('src/components/layout/Sidebar.tsx', content);
console.log('Sidebar updated');
