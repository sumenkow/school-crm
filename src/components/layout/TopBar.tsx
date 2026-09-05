'use client';

import React, { useEffect, useState } from 'react';
import { Menu, Search, Bell } from 'lucide-react';
import { useRole } from '@/context/RoleContext';
import type { UserRole } from '@/types';

interface TopBarProps {
  onOpenMobile: () => void;
}

const roleConfig: Record<UserRole, { label: string; color: string }> = {
  owner: { label: 'Владелец', color: 'var(--md-tertiary-container, #EEDCFF)' },
  admin: { label: 'Админ', color: 'var(--md-secondary-container)' },
  teacher: { label: 'Учитель', color: 'var(--md-primary-container)' },
};

export function TopBar({ onOpenMobile }: TopBarProps) {
  const { role, setRole, userName } = useRole();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          border: 'none',
          background: 'transparent',
          color: 'var(--md-on-surface)',
          cursor: 'pointer',
        }}
        aria-label="Открыть меню"
      >
        <Menu size={24} />
      </button>

      {/* Search bar */}
      <div
        className="flex items-center gap-2 flex-1"
        style={{
          maxWidth: '360px',
          height: '40px',
          backgroundColor: 'var(--md-surface-container-highest)',
          borderRadius: '9999px',
          padding: '0 16px',
          cursor: 'pointer',
        }}
        onClick={() => alert('Глобальный поиск Cmd+K будет подключен в следующих этапах.')}
      >
        <Search size={18} style={{ color: 'var(--md-on-surface-variant)', flexShrink: 0 }} />
        <span className="md-body-medium" style={{ color: 'var(--md-on-surface-variant)', userSelect: 'none' }}>
          Поиск...
        </span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* MD3 Segmented Button — Role Switcher */}
      <div
        className="hidden sm:flex items-center"
        style={{
          border: '1px solid var(--md-outline)',
          borderRadius: '9999px',
          overflow: 'hidden',
          height: '40px',
        }}
        role="group"
        aria-label="Переключение роли"
      >
        {(['owner', 'admin', 'teacher'] as UserRole[]).map((r, idx) => (
          <button
            key={r}
            onClick={() => setRole(r)}
            style={{
              padding: '0 16px',
              height: '100%',
              border: 'none',
              borderLeft: idx > 0 ? '1px solid var(--md-outline)' : 'none',
              backgroundColor: role === r ? 'var(--md-secondary-container)' : 'transparent',
              color: role === r ? 'var(--md-on-secondary-container)' : 'var(--md-on-surface-variant)',
              fontWeight: role === r ? 700 : 400,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'background-color 0.15s, color 0.15s',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
            }}
          >
            {role === r && (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
            {roleConfig[r].label}
          </button>
        ))}
      </div>

      {/* Notification bell */}
      <button
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          border: 'none',
          background: 'transparent',
          color: 'var(--md-on-surface-variant)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
        aria-label="Уведомления"
      >
        <Bell size={22} />
        {/* Notification badge */}
        <span
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: 'var(--md-error)',
          }}
        />
      </button>

      {/* User avatar */}
      <button
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          border: 'none',
          backgroundColor: 'var(--md-primary)',
          color: 'var(--md-on-primary)',
          fontWeight: 700,
          fontSize: '16px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
        title={userName}
        aria-label={`Пользователь: ${userName}`}
      >
        {userName.charAt(0)}
      </button>
    </header>
  );
}
