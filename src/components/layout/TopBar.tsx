'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Menu, Search, LogOut, ChevronDown, User } from 'lucide-react';
import { useRole } from '@/context/RoleContext';
import { createClient } from '@/lib/supabase/client';
import type { UserRole } from '@/types';
import { CommandPalette } from '@/components/common/CommandPalette';

interface TopBarProps {
  onOpenMobile: () => void;
}

const roleConfig: Record<UserRole, { label: string }> = {
  owner: { label: 'Владелец' },
  admin: { label: 'Админ' },
  teacher: { label: 'Учитель' },
};

export function TopBar({ onOpenMobile }: TopBarProps) {
  const { role, userName, userEmail } = useRole();
  const [scrolled, setScrolled] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
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
      className="sticky top-0 z-20 flex items-center"
      style={{
        height: '64px',
        backgroundColor: 'var(--md-surface-container)',
        boxShadow: scrolled ? 'var(--md-elevation-2)' : 'none',
        transition: 'box-shadow 0.2s',
        padding: '0 16px',
        gap: '8px',
      }}
    >
      {/* Mobile menu button */}
      <button
        onClick={onOpenMobile}
        className="md:hidden flex items-center justify-center"
        style={{
          width: '40px', height: '40px', borderRadius: '50%',
          border: 'none', background: 'transparent',
          color: 'var(--md-on-surface)', cursor: 'pointer',
        }}
        aria-label="Открыть меню"
      >
        <Menu size={24} />
      </button>

      {/* Search bar / Command Palette trigger */}
      <div
        className="flex items-center gap-2 transition-colors hover:bg-black/5"
        style={{
          flex: '1 1 0', maxWidth: '360px', height: '40px',
          backgroundColor: 'var(--md-surface-container-highest)',
          borderRadius: '9999px', padding: '0 16px', cursor: 'pointer',
        }}
        onClick={() => setPaletteOpen(true)}
      >
        <Search size={18} style={{ color: 'var(--md-on-surface-variant)', flexShrink: 0 }} />
        <span className="md-body-medium flex-1 truncate" style={{ color: 'var(--md-on-surface-variant)', userSelect: 'none' }}>
          Быстрый поиск...
        </span>
        <span
          className="hidden sm:inline-flex items-center text-[11px] font-mono font-medium rounded-md px-1.5 py-0.5"
          style={{
            backgroundColor: 'var(--md-surface)',
            color: 'var(--md-on-surface-variant)',
            border: '1px solid var(--md-outline-variant)'
          }}
        >
          ⌘K
        </span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* User avatar + dropdown */}
      <div ref={menuRef} style={{ position: 'relative' }}>
        <button
          onClick={() => setUserMenuOpen(!userMenuOpen)}
          style={{
            height: '40px', borderRadius: '9999px',
            border: '1px solid var(--md-outline-variant)',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '0 12px 0 4px',
          }}
          aria-label="Меню пользователя"
        >
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%',
            backgroundColor: 'var(--md-primary)', color: 'var(--md-on-primary)',
            fontWeight: 700, fontSize: '14px',
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
                role === 'owner' ? 'var(--md-tertiary-container, #EEDCFF)' :
                role === 'admin' ? 'var(--md-secondary-container)' :
                'var(--md-primary-container)',
              color:
                role === 'owner' ? 'var(--md-on-tertiary-container, #28123C)' :
                role === 'admin' ? 'var(--md-on-secondary-container)' :
                'var(--md-on-primary-container)',
              fontWeight: 600,
              fontSize: '11px',
              lineHeight: '16px',
            }}
          >
            {roleConfig[role].label}
          </span>
          <ChevronDown size={16} style={{ color: 'var(--md-on-surface-variant)', flexShrink: 0 }} />
        </button>

        {/* Dropdown menu */}
        {userMenuOpen && (
          <div
            style={{
              position: 'absolute', right: 0, top: '48px',
              backgroundColor: 'var(--md-surface-container-lowest)',
              borderRadius: '12px',
              boxShadow: 'var(--md-elevation-3)',
              minWidth: '200px',
              padding: '8px',
              zIndex: 100,
            }}
          >
            {/* User info */}
            <div style={{
              padding: '12px',
              borderBottom: '1px solid var(--md-outline-variant)',
              marginBottom: '4px',
            }}>
              <p className="md-label-large" style={{ color: 'var(--md-on-surface)' }}>{displayName}</p>
              <p className="md-body-small" style={{ color: 'var(--md-on-surface-variant)' }}>{userEmail}</p>
              <span
                className="md-label-small"
                style={{
                  display: 'inline-block', marginTop: '4px',
                  padding: '2px 8px', borderRadius: '9999px',
                  backgroundColor: 'var(--md-secondary-container)',
                  color: 'var(--md-on-secondary-container)',
                }}
              >
                {roleConfig[role].label}
              </span>
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
              onClick={() => setUserMenuOpen(false)}
            >
              <User size={18} style={{ color: 'var(--md-on-surface-variant)' }} />
              Профиль
            </button>

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
            >
              <LogOut size={18} />
              Выйти
            </button>
          </div>
        )}
      </div>

      {/* Global Command Palette */}
      <CommandPalette isOpen={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </header>
  );
}
