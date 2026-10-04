'use client';

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
  MoreVertical,
  Search,
  Bell
} from 'lucide-react';
import { UserProfileModal } from '@/components/profile/UserProfileModal';
import { CommandPalette } from '@/components/common/CommandPalette';
import { CountryFlag } from '@/components/common/CountryFlag';
import { LANGUAGE_LABELS, SupportedLanguage } from '@/context/LanguageContext';
import { NotificationCenter } from '@/components/layout/NotificationCenter';
import { getSchoolSettings } from '@/lib/data/schoolSettingsStorage';
import { cn } from '@/lib/utils';

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

const NavAccordionGroup = ({ section, collapsed, pathname, onCloseMobile, t }: any) => {
  const [isOpen, setIsOpen] = useState(section.defaultOpen || false);
  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
    return pathname === href || (href !== '/' && pathname.startsWith(href + '/'));
  };
  const hasActive = section.items.some((i: any) => isActive(i.href));

  useEffect(() => {
    if (hasActive && !collapsed) setIsOpen(true);
  }, [hasActive, collapsed]);

  return (
    <div className="mb-2">
      {!collapsed && section.section && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-between w-full px-4 py-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100/50 rounded-xl transition-colors group cursor-pointer"
        >
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 group-hover:text-slate-600">
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
                  height: collapsed ? '44px' : '40px',
                  width: collapsed ? '44px' : '100%',
                  backgroundColor: active ? 'var(--md-secondary-container, #e2e8f0)' : 'transparent',
                  color: active ? 'var(--md-on-secondary-container, #0f172a)' : 'var(--md-on-surface-variant, #64748b)',
                  fontWeight: active ? 600 : 400,
                  fontSize: '14px',
                  textDecoration: 'none',
                }}
              >
                <span style={{ flexShrink: 0, opacity: active ? 1 : 0.75 }}>
                  {item.icon}
                </span>
                {!collapsed && (
                  <span className="truncate">{label}</span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};


interface SidebarPanelProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  pathname: string;
  onCloseMobile: () => void;
  onOpenProfile: () => void;
  onOpenPalette: () => void;
  role: string;
  userName: string | null;
  userEmail: string | null;
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: string, fallback?: string) => string;
  handleLogout: () => void;
  navSections: NavSection[];
}

function SidebarPanel({
  collapsed,
  onToggleCollapsed,
  pathname,
  onCloseMobile,
  onOpenProfile,
  onOpenPalette,
  userName,
  userEmail,
  language,
  setLanguage,
  t,
  handleLogout,
  navSections,
}: SidebarPanelProps) {
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const langMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
      if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
        setLangMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [schoolName, setSchoolName] = useState(() => getSchoolSettings().name || 'You Europe');

  useEffect(() => {
    const handleSettingsChanged = (e: any) => {
      if (e?.detail?.name) {
        setSchoolName(e.detail.name);
      } else {
        setSchoolName(getSchoolSettings().name || 'You Europe');
      }
    };
    window.addEventListener('crm-school-settings-changed', handleSettingsChanged);
    return () => window.removeEventListener('crm-school-settings-changed', handleSettingsChanged);
  }, []);

  const displayName = userName || userEmail || '?';
  const avatarLetter = displayName.charAt(0).toUpperCase();

  return (
    <div
      className="flex flex-col h-full transition-all duration-300 relative bg-slate-50 border-r border-slate-200 select-none"
      style={{ width: collapsed ? '76px' : '260px' }}
    >
      {/* 1. Header (Logo & Collapse) */}
      <div className="flex items-center justify-between p-3.5 flex-shrink-0 h-14 border-b border-slate-100">
        {!collapsed && (
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg bg-slate-900 text-white shadow-2xs">
              <School size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-sm truncate text-slate-800" title={schoolName}>
                {schoolName}
              </p>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={onToggleCollapsed}
          className={cn(
            "flex items-center justify-center rounded-lg hover:bg-slate-200 transition-colors cursor-pointer text-slate-500 shrink-0",
            collapsed ? "w-full h-8" : "w-7 h-7"
          )}
          title={collapsed ? "Развернуть" : "Свернуть"}
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      {/* 2. Compact Search Input directly under logo */}
      {!collapsed ? (
        <div className="px-3 py-2 flex-shrink-0">
          <button
            type="button"
            onClick={onOpenPalette}
            className="w-full flex items-center justify-between px-3 py-2 text-xs text-slate-400 bg-white hover:bg-slate-100 border border-slate-200/80 rounded-xl transition-colors cursor-pointer shadow-2xs"
          >
            <span className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span>Поиск...</span>
            </span>
            <kbd className="text-[10px] bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded text-slate-400 font-mono">⌘K</kbd>
          </button>
        </div>
      ) : (
        <div className="px-2 py-2 flex justify-center flex-shrink-0">
          <button
            type="button"
            onClick={onOpenPalette}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white hover:bg-slate-100 border border-slate-200/80 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer shadow-2xs"
            title="Поиск (⌘K)"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3. Middle Body / Navigation List */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-3 py-1 space-y-0.5 min-h-0">
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

      {/* 4. Footer (Pinned to bottom: Avatar (Left) -> Notifications (Center) -> Language (Right)) */}
      {!collapsed ? (
        <div className="mt-auto border-t border-slate-200/80 p-3 flex items-center justify-between flex-shrink-0 bg-slate-50 relative z-50">
          {/* 4.1 User Avatar (Left) */}
          <div ref={userMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setUserDropdownOpen((prev) => !prev)}
              className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-blue-200 transition-all shadow-xs"
              title={displayName}
              aria-label="Профиль пользователя"
            >
              {avatarLetter}
            </button>

            {userDropdownOpen && (
              <div className="absolute left-0 bottom-full mb-2 rounded-2xl shadow-2xl border border-slate-200 bg-white min-w-[220px] p-2 z-[110] animate-in fade-in zoom-in-95 duration-100">
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setUserDropdownOpen(false);
                    onOpenProfile();
                  }}
                  className="cursor-pointer hover:bg-slate-50 rounded-xl p-2.5 transition-colors border-b border-slate-100 mb-1"
                >
                  <p className="text-xs font-bold text-slate-900 truncate">{displayName}</p>
                  <p className="text-[10px] text-slate-400 truncate">{userEmail}</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setUserDropdownOpen(false);
                    onOpenProfile();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
                >
                  <User size={14} className="text-slate-400" />
                  <span>Профиль</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setUserDropdownOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer font-medium transition-colors"
                >
                  <LogOut size={14} className="text-rose-500" />
                  <span>Выйти</span>
                </button>
              </div>
            )}
          </div>

          {/* 4.2 Notifications Center (Center) */}
          <NotificationCenter panelPosition="sidebar" />

          {/* 4.3 Language selector (Right) */}
          <div ref={langMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setLangMenuOpen((prev) => !prev)}
              className="text-xs font-medium text-slate-600 hover:bg-slate-200/70 px-2 py-1.5 rounded-lg border border-slate-200 flex items-center gap-1 cursor-pointer transition-colors bg-white shadow-2xs"
              title="Сменить язык"
              aria-label="Сменить язык"
            >
              <CountryFlag country={language} className="text-sm" />
              <span className="text-[10px] text-slate-400">▾</span>
            </button>

            {langMenuOpen && (
              <div className="absolute right-0 bottom-full mb-2 w-36 rounded-xl border border-slate-200 bg-white p-1 shadow-2xl z-[110] animate-in fade-in zoom-in-95 duration-100">
                {(['ru', 'en', 'de'] as SupportedLanguage[]).map((code) => {
                  const meta = LANGUAGE_LABELS[code];
                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLanguage(code);
                        setLangMenuOpen(false);
                      }}
                      className={cn(
                        'w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg text-left transition-colors cursor-pointer',
                        language === code ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                      )}
                    >
                      <CountryFlag country={code} className="text-sm" />
                      <span>{meta?.nativeName || code.toUpperCase()}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-auto border-t border-slate-200/80 p-2 flex flex-col items-center gap-2 flex-shrink-0 bg-slate-50 relative z-50">
          {/* 1. User Avatar */}
          <div ref={userMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setUserDropdownOpen((prev) => !prev)}
              className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-blue-200 transition-all shadow-xs"
              title={displayName}
              aria-label="Профиль пользователя"
            >
              {avatarLetter}
            </button>

            {userDropdownOpen && (
              <div className="absolute left-full bottom-0 ml-2 rounded-2xl shadow-2xl border border-slate-200 bg-white min-w-[220px] p-2 z-[110] animate-in fade-in zoom-in-95 duration-100">
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setUserDropdownOpen(false);
                    onOpenProfile();
                  }}
                  className="cursor-pointer hover:bg-slate-50 rounded-xl p-2.5 transition-colors border-b border-slate-100 mb-1"
                >
                  <p className="text-xs font-bold text-slate-900 truncate">{displayName}</p>
                  <p className="text-[10px] text-slate-400 truncate">{userEmail}</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setUserDropdownOpen(false);
                    onOpenProfile();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
                >
                  <User size={14} className="text-slate-400" />
                  <span>Профиль</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setUserDropdownOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer font-medium transition-colors"
                >
                  <LogOut size={14} className="text-rose-500" />
                  <span>Выйти</span>
                </button>
              </div>
            )}
          </div>

          {/* 2. Notifications Center */}
          <NotificationCenter panelPosition="sidebar" />

          {/* 3. Language selector */}
          <div ref={langMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setLangMenuOpen((prev) => !prev)}
              className="text-xs font-medium text-slate-600 hover:bg-slate-200/70 p-1.5 rounded-lg border border-slate-200 flex items-center justify-center cursor-pointer transition-colors bg-white shadow-2xs"
              title="Сменить язык"
              aria-label="Сменить язык"
            >
              <CountryFlag country={language} className="text-sm" />
            </button>

            {langMenuOpen && (
              <div className="absolute left-full bottom-0 ml-2 w-36 rounded-xl border border-slate-200 bg-white p-1 shadow-2xl z-[110] animate-in fade-in zoom-in-95 duration-100">
                {(['ru', 'en', 'de'] as SupportedLanguage[]).map((code) => {
                  const meta = LANGUAGE_LABELS[code];
                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLanguage(code);
                        setLangMenuOpen(false);
                      }}
                      className={cn(
                        'w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg text-left transition-colors cursor-pointer',
                        language === code ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                      )}
                    >
                      <CountryFlag country={code} className="text-sm" />
                      <span>{meta?.nativeName || code.toUpperCase()}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const { role, userName, userEmail } = useRole();
  const { language, setLanguage, t } = useLanguage();
  const [collapsed, setCollapsed] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) setCollapsed(true);
      else setCollapsed(false);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Hotkey listener for ⌘K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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

  return (
    <>
      {/* Desktop */}
      <div className="hidden md:block flex-shrink-0 h-full transition-all duration-300 relative z-40" style={{ width: collapsed ? '76px' : '260px' }}>
        <SidebarPanel
          collapsed={collapsed}
          onToggleCollapsed={handleToggleCollapsed}
          pathname={pathname}
          onCloseMobile={onCloseMobile}
          onOpenProfile={() => setProfileModalOpen(true)}
          onOpenPalette={() => setPaletteOpen(true)}
          role={role}
          userName={userName}
          userEmail={userEmail}
          language={language}
          setLanguage={setLanguage}
          t={t}
          handleLogout={handleLogout}
          navSections={navSections}
        />
      </div>

      {/* Mobile */}
      <div
        className="md:hidden fixed inset-y-0 left-0 z-50 transition-transform duration-300"
        style={{
          transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          boxShadow: mobileOpen ? 'var(--md-elevation-3)' : 'none',
        }}
      >
        <SidebarPanel
          collapsed={false}
          onToggleCollapsed={handleToggleCollapsed}
          pathname={pathname}
          onCloseMobile={onCloseMobile}
          onOpenProfile={() => setProfileModalOpen(true)}
          onOpenPalette={() => setPaletteOpen(true)}
          role={role}
          userName={userName}
          userEmail={userEmail}
          language={language}
          setLanguage={setLanguage}
          t={t}
          handleLogout={handleLogout}
          navSections={navSections}
        />
      </div>
      
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onCloseMobile} />
      )}

      {/* Global Modals (rendered ONCE at top-level) */}
      <UserProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />
      <CommandPalette
        isOpen={paletteOpen}
        onClose={() => setPaletteOpen(false)}
      />
    </>
  );
}
