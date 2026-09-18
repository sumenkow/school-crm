'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Search, LogOut, ChevronDown, User, Calendar, Globe } from 'lucide-react';
import { useRole } from '@/context/RoleContext';
import { useLanguage, LANGUAGE_LABELS, SupportedLanguage } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { createClient } from '@/lib/supabase/client';
import type { UserRole } from '@/types';
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
      className="hidden md:flex sticky top-0 z-20 items-center h-14 sm:h-16 px-2.5 sm:px-4 gap-1.5 sm:gap-2.5 transition-all duration-200"
      style={{
        backgroundColor: 'var(--md-surface-container)',
        boxShadow: scrolled ? 'var(--md-elevation-2)' : 'none',
      }}
    >


      {/* Desktop & Tablet Search Bar */}
      <div
        className="flex-1 max-w-sm hidden sm:flex items-center cursor-text transition-all"
        onClick={() => setPaletteOpen(true)}
      >
        <div className="relative w-full">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <div className="w-full h-9 rounded-full bg-slate-100 flex items-center pl-9 pr-3 hover:bg-slate-200/70 transition-colors border border-transparent">
            <span className="text-[13px] text-slate-500 font-medium">{t('topbar.searchPlaceholder', 'Быстрый поиск... (Cmd+K)')}</span>
          </div>
        </div>
      </div>
      {/* Spacer */}
      <div className="flex-1" />

      {/* Multi-Language Switcher (Desktop: segmented 3-button, Mobile: compact dropdown) */}
      <div className="relative shrink-0">
        {/* Desktop segmented bar */}
        <div
          className="hidden sm:flex items-center rounded-full p-1 border shadow-2xs"
          style={{
            backgroundColor: 'var(--md-surface-container-highest, #E6E8EE)',
            borderColor: 'var(--md-outline-variant, #C1C7CE)',
          }}
          title={t('topbar.language', 'Язык интерфейса')}
        >
          {(['ru', 'en', 'de'] as SupportedLanguage[]).map((langKey) => {
            const isSelected = language === langKey;
            const meta = LANGUAGE_LABELS[langKey];
            return (
              <button
                key={langKey}
                onClick={() => {
                  if (language !== langKey) {
                    setLanguage(langKey);
                    toast.success(`${meta.flag} ${meta.nativeName}`);
                  }
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-white shadow-xs scale-105 border border-slate-200/90 font-extrabold text-blue-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-black/5'
                }`}
                style={{
                  color: isSelected ? 'var(--md-primary)' : 'var(--md-on-surface-variant)',
                  backgroundColor: isSelected ? 'var(--md-surface, #FFFFFF)' : 'transparent',
                }}
                title={meta.label}
              >
                <CountryFlag country={langKey} size={15} />
                <span className="text-[11px] font-extrabold tracking-tight">{meta.short}</span>
              </button>
            );
          })}
        </div>

        {/* Mobile compact language picker */}
        <div ref={langMenuRef} className="sm:hidden relative">
          <button
            type="button"
            onClick={() => setLangMenuOpen(!langMenuOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border shadow-2xs active:scale-95 transition-all text-xs font-bold"
            style={{
              backgroundColor: 'var(--md-surface-container-highest, #E6E8EE)',
              borderColor: 'var(--md-outline-variant, #C1C7CE)',
              color: 'var(--md-on-surface)',
            }}
            aria-label={t('topbar.language', 'Язык')}
          >
            <CountryFlag country={language} size={15} />
            <span className="text-[11px] font-extrabold uppercase">{LANGUAGE_LABELS[language].short}</span>
            <ChevronDown size={13} style={{ color: 'var(--md-on-surface-variant)' }} />
          </button>

          {langMenuOpen && (
            <div
              className="absolute right-0 top-10 rounded-2xl shadow-xl border p-1.5 z-50 min-w-[130px] flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-150"
              style={{
                backgroundColor: 'var(--md-surface-container-lowest, #FFFFFF)',
                borderColor: 'var(--md-outline-variant, #C1C7CE)',
              }}
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
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left ${
                      isSelected
                        ? 'bg-blue-50 text-blue-700 font-extrabold'
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
      </div>

      {/* Today's highlighted date (Desktop only) */}
      {currentDate && (
        <div
          className="hidden md:inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all select-none shrink-0"
          style={{
            backgroundColor: 'var(--md-secondary-container, #D7E3F7)',
            color: 'var(--md-on-secondary-container, #101C2B)',
            border: '1px solid rgba(21, 101, 192, 0.22)',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          }}
          title={t('nav.calendar', 'Календарь')}
        >
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <Calendar size={13} style={{ color: 'var(--md-primary, #1565C0)' }} />
          <span className="tracking-tight text-xs">{currentDate}</span>
        </div>
      )}

      {/* User avatar + dropdown */}
      <div ref={menuRef} style={{ position: 'relative' }}>
        <button
          onClick={() => setUserMenuOpen(!userMenuOpen)}
          className="touch-target-44 sm:h-10 rounded-full border transition-all active:scale-95 flex items-center gap-1.5 sm:gap-2 px-1 sm:px-3"
          style={{
            borderColor: 'var(--md-outline-variant)',
            backgroundColor: 'transparent',
            cursor: 'pointer',
          }}
          aria-label={t('topbar.profile', 'Профиль пользователя')}
        >
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%',
            backgroundColor: 'var(--md-primary)', color: 'var(--md-on-primary)',
            fontWeight: 700, fontSize: '13px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            {avatarLetter}
          </div>
          <span
            className="md-label-large hidden sm:block"
            style={{ color: 'var(--md-on-surface)', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {displayName.split(' ')[0]}
          </span>
          <span
            className="hidden sm:inline-flex items-center md-label-small"
            style={{
              padding: '2px 8px',
              borderRadius: '9999px',
              backgroundColor:
                (role === 'owner' || role === 'developer') ? 'var(--md-tertiary-container, #EEDCFF)' :
                role === 'admin' ? 'var(--md-secondary-container)' :
                'var(--md-primary-container)',
              color:
                (role === 'owner' || role === 'developer') ? 'var(--md-on-tertiary-container, #28123C)' :
                role === 'admin' ? 'var(--md-on-secondary-container)' :
                'var(--md-on-primary-container)',
              fontWeight: 600,
              fontSize: '11px',
              lineHeight: '16px',
            }}
          >
            {t(`role.${role}`, role)}
          </span>
          <ChevronDown size={14} style={{ color: 'var(--md-on-surface-variant)', flexShrink: 0 }} />
        </button>

        {/* Dropdown menu */}
        {userMenuOpen && (
          <div
            style={{
              position: 'absolute', right: 0, top: '48px',
              backgroundColor: 'var(--md-surface-container-lowest)',
              borderRadius: '16px',
              boxShadow: 'var(--md-elevation-3)',
              minWidth: '240px',
              padding: '8px',
              zIndex: 100,
            }}
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
