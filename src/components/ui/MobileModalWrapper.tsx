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
  const modalRef = React.useRef<HTMLDivElement>(null);
  const previousActiveElement = React.useRef<HTMLElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    previousActiveElement.current = document.activeElement as HTMLElement;

    const timer = setTimeout(() => {
      if (!modalRef.current) return;
      const focusables = modalRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length > 0) {
        focusables[0].focus();
      }
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusables = Array.from(
          modalRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => el.offsetParent !== null);

        if (focusables.length === 0) return;

        const firstElement = focusables[0];
        const lastElement = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      if (previousActiveElement.current && typeof previousActiveElement.current.focus === 'function') {
        previousActiveElement.current.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      ref={modalRef}
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
