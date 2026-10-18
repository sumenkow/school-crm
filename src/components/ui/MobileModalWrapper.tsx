'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export interface MobileModalWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  headerBg?: string; // e.g., 'bg-[#1565C0] text-white' or 'bg-white text-slate-900'
  children: React.ReactNode;
  footer: React.ReactNode;
}

export const MobileModalWrapper: React.FC<MobileModalWrapperProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  headerBg = 'bg-white text-slate-900',
  children,
  footer,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-modal-title"
      className="fixed inset-0 z-[120] flex flex-col bg-white h-[100dvh] w-full overflow-hidden"
    >
      {/* 1. Safe Fixed Header */}
      <div className={`flex-shrink-0 px-4 py-3 flex items-center justify-between border-b border-slate-100 ${headerBg} pt-[max(12px,env(safe-area-inset-top))]`}>
        <div className="min-w-0 pr-3">
          <h2 id="mobile-modal-title" className="text-base font-bold truncate leading-tight">{title}</h2>
          {subtitle && <p className="text-xs opacity-80 truncate mt-0.5">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 -mr-2 rounded-full opacity-80 hover:opacity-100 active:bg-black/10 transition-colors"
          aria-label="Закрыть"
        >
          <X className="w-5 h-5"/>
        </button>
      </div>

      {/* 2. Scrollable Body Content */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4 space-y-4">
        {children}
      </div>

      {/* 3. Sticky Footer with Safe Area Margin for Chrome iOS */}
      <div className="flex-shrink-0 bg-white border-t border-slate-200 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+28px)] shadow-[0_-6px_16px_rgba(0,0,0,0.06)]">
        {footer}
      </div>
    </div>,
    document.body
  );
};
