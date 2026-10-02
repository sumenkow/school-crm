'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Search, LogOut, ChevronDown, User, Calendar, Globe } from 'lucide-react';
import { useRole } from '@/context/RoleContext';
import { useLanguage, LANGUAGE_LABELS, SupportedLanguage } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { createClient } from '@/lib/supabase/client';
import type { UserRole } from '@/types';
import { NotificationCenter } from '@/components/layout/NotificationCenter';
import { CommandPalette } from '@/components/common/CommandPalette';
import { UserProfileModal } from '@/components/profile/UserProfileModal';
import { CountryFlag } from '@/components/common/CountryFlag';

interface TopBarProps {
  onOpenMobile: () => void;
}

export function TopBar({ onOpenMobile }: TopBarProps) {
  const { role, userName, userEmail, setRole, isDevAccount, accountRole, isOwnerAccount } = useRole();
  const { language, setLanguage, t } = useLanguage();
  const toast = useToast();
  const [scrolled, setScrolled] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState<string>('');
  const menuRef = useRef<HTMLDivElement>(null);
  const langMenuRef = useRef<HTMLDivElement>(null);

  // Format today's date localized
  useEffect(() => {
    const updateDate = () => {
      const now = new Date();
      const locale = language === 'ru' ? 'ru-RU' : language === 'de' ? 'de-DE' : 'en-US';
      const formatted = now.toLocaleDateString(locale, {
        weekday: 'short',
        day: 'numeric',
        month: 'long',
      });
      const capitalized = formatted.charAt(0).toUpperCase() + formatted.slice(1);
      setCurrentDate(capitalized);
    };
    updateDate();
    const timer = setInterval(updateDate, 60000);
    return () => clearInterval(timer);
  }, [language]);

  // Global Cmd+K / Ctrl+K listener
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menus on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setLangMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const displayName = userName || userEmail || '?';
  const avatarLetter = displayName.charAt(0).toUpperCase();

  return (
    <header
      className="hidden md:flex sticky top-0 z-20 items-center h-12 px-4 gap-2.5 transition-all duration-200 border-b border-slate-200/80 bg-white"
    >
      {/* Search button with Cmd+K */}
      <button
        type="button"
        onClick={() => setPaletteOpen(true)}
        className="p-1.5 px-2.5 rounded-lg hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-700 transition-colors flex items-center gap-2 cursor-pointer text-xs font-medium"
        title="Быстрый поиск (Cmd+K)"
      >
        <Search size={14} className="text-slate-400" />
        <span className="text-slate-400 font-normal">Поиск...</span>
        <kbd className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1 py-0.5 rounded border border-slate-200 leading-none">⌘K</kbd>
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Compact Language Picker (Flag + Arrow) */}
      <div ref={langMenuRef} className="relative shrink-0">
        <button
          type="button"
          onClick={() => setLangMenuOpen(!langMenuOpen)}
          className="px-2 py-1 rounded-lg border border-slate-200 text-xs flex items-center gap-1.5 hover:bg-slate-50 transition-colors cursor-pointer"
          title={t('topbar.language', 'Язык интерфейса')}
        >
          <CountryFlag country={language} size={15} />
          <span className="text-[11px] font-bold uppercase text-slate-700">{LANGUAGE_LABELS[language].short}</span>
          <ChevronDown size={12} className="text-slate-400" />
        </button>

        {langMenuOpen && (
          <div
            className="absolute right-0 top-9 rounded-xl shadow-lg border border-slate-200 bg-white p-1 z-50 min-w-[130px] flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100"
          >
            {(['ru', 'en', 'de'] as SupportedLanguage[]).map((langKey) => {
              const isSelected = language === langKey;
              const meta = LANGUAGE_LABELS[langKey];
              return (
                <button
                  key={langKey}
                  onClick={() => {
                    setLanguage(langKey);
                    setLangMenuOpen(false);
                    toast.success(`${meta.nativeName}`);
                  }}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all text-left cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50 text-blue-700 font-bold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <CountryFlag country={langKey} size={15} />
                  <span>{meta.nativeName}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Notification Bell */}
      <NotificationCenter />

      {/* User avatar + dropdown */}
      <div ref={menuRef} className="relative shrink-0">
        <button
          type="button"
          onClick={() => setUserMenuOpen(!userMenuOpen)}
          className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center cursor-pointer shadow-xs transition-transform active:scale-95"
          aria-label={t('topbar.profile', 'Профиль пользователя')}
          title={displayName}
        >
          {avatarLetter}
        </button>

        {/* Dropdown menu */}
        {userMenuOpen && (
          <div
            className="absolute right-0 top-10 rounded-2xl shadow-xl border border-slate-200 bg-white min-w-[240px] p-2 z-50 animate-in fade-in zoom-in-95 duration-100"
          >
            {/* User info */}
            <div
              onClick={() => {
                setUserMenuOpen(false);
                setProfileModalOpen(true);
              }}
              className="cursor-pointer hover:bg-black/5 rounded-xl transition-colors"
              title="Нажмите, чтобы открыть карточку профиля"
              style={{
                padding: '12px',
                borderBottom: '1px solid var(--md-outline-variant)',
                marginBottom: '6px',
              }}
            >
              <p className="md-label-large font-bold" style={{ color: 'var(--md-on-surface)' }}>{displayName}</p>
              <p className="md-body-small" style={{ color: 'var(--md-on-surface-variant)' }}>{userEmail}</p>
              <div className="flex items-center gap-1.5 mt-2">
                <span
                  className="md-label-small"
                  style={{
                    display: 'inline-block',
                    padding: '2px 8px', borderRadius: '9999px',
                    backgroundColor:
                      (role === 'owner' || role === 'developer') ? 'var(--md-tertiary-container, #EEDCFF)' :
                      role === 'admin' ? 'var(--md-secondary-container)' :
                      'var(--md-primary-container)',
                    color:
                      (role === 'owner' || role === 'developer') ? 'var(--md-on-tertiary-container, #28123C)' :
                      role === 'admin' ? 'var(--md-on-secondary-container)' :
                      'var(--md-on-primary-container)',
                    fontWeight: 600,
                  }}
                >
                  {t(`role.${role}`, role)}
                </span>
              </div>
            </div>

            {/* Profile link */}
            <button
              style={{
                width: '100%', padding: '10px 12px',
                display: 'flex', alignItems: 'center', gap: '10px',
                background: 'none', border: 'none', cursor: 'pointer',
                borderRadius: '8px', color: 'var(--md-on-surface)',
                fontSize: '14px', textAlign: 'left',
              }}
              className="hover:bg-black/5 transition-colors cursor-pointer"
              onClick={() => {
                setUserMenuOpen(false);
                setProfileModalOpen(true);
              }}
            >
              <User size={18} style={{ color: 'var(--md-on-surface-variant)' }} />
              {t('topbar.profile', 'Карточка профиля')}
            </button>

            {/* Developer/Owner Role Switcher */}
            {(isDevAccount || isOwnerAccount) && (
              <div style={{ padding: '8px 12px', borderTop: '1px solid var(--md-outline-variant)', borderBottom: '1px solid var(--md-outline-variant)', margin: '4px 0' }}>
                <p className="md-label-small mb-2 text-gray-500">View as:</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setRole(accountRole === 'developer' ? 'developer' : 'owner')}
                    className={`flex-1 py-1 px-2 rounded text-xs font-medium transition-colors ${role === 'developer' || role === 'owner' ? 'bg-purple-100 text-purple-700' : 'hover:bg-black/5 text-gray-600'}`}
                  >
                    {accountRole === 'developer' ? 'Dev' : 'Owner'}
                  </button>
                  <button
                    onClick={() => setRole('admin')}
                    className={`flex-1 py-1 px-2 rounded text-xs font-medium transition-colors ${role === 'admin' ? 'bg-blue-100 text-blue-700' : 'hover:bg-black/5 text-gray-600'}`}
                  >
                    Admin
                  </button>
                  <button
                    onClick={() => setRole('teacher')}
                    className={`flex-1 py-1 px-2 rounded text-xs font-medium transition-colors ${role === 'teacher' ? 'bg-green-100 text-green-700' : 'hover:bg-black/5 text-gray-600'}`}
                  >
                    Teacher
                  </button>
                </div>
              </div>
            )}

            {/* Logout */}
            <button
              onClick={handleLogout}
              style={{
                width: '100%', padding: '10px 12px',
                display: 'flex', alignItems: 'center', gap: '10px',
                background: 'none', border: 'none', cursor: 'pointer',
                borderRadius: '8px', color: 'var(--md-error)',
                fontSize: '14px', textAlign: 'left',
              }}
              className="cursor-pointer"
            >
              <LogOut size={18} />
              {t('topbar.logout', 'Выйти')}
            </button>
          </div>
        )}
      </div>

      {/* Global Command Palette */}
      <CommandPalette isOpen={paletteOpen} onClose={() => setPaletteOpen(false)} />

      {/* User Account Profile Modal */}
      <UserProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />
    </header>
  );
}
