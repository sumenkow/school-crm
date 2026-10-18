'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ResponsiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  headerBg?: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}

export const ResponsiveModal: React.FC<ResponsiveModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  headerBg = 'bg-[#1565C0] text-white',
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

    // Focus the first focusable element inside modal after open
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
        ).filter((el) => el.offsetParent !== null); // only visible elements

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
      className="fixed inset-0 z-[100] flex flex-col md:items-center md:justify-center md:p-4 bg-slate-900/40 md:backdrop-blur-sm overflow-hidden"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* КАРКАС:
          - Мобильный: w-full h-full bg-white flex flex-col overflow-hidden
          - Десктоп: max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl border border-slate-100
      */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="responsive-modal-title"
        className="w-full h-full md:h-auto md:max-h-[90vh] md:max-w-2xl bg-white md:rounded-2xl md:shadow-2xl md:border md:border-slate-100 flex flex-col overflow-hidden animate-in fade-in-50 md:zoom-in-95 duration-200"
      >
        
        {/* ШАПКА: компактный заголовок */}
        <div className={`flex-shrink-0 px-4 md:px-6 py-3.5 ${headerBg} flex items-center justify-between pt-[max(12px,env(safe-area-inset-top))] md:pt-3.5`}>
          <div className="min-w-0 pr-3">
            <h2 id="responsive-modal-title" className="text-base md:text-lg font-bold truncate leading-tight">{title}</h2>
            {subtitle && (
              <p
                className={cn(
                  'text-xs truncate mt-0.5 font-medium',
                  headerBg.includes('text-slate') || headerBg.includes('bg-white')
                    ? 'text-slate-500'
                    : 'text-blue-100'
                )}
              >
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Закрыть (Esc)"
            className={cn(
              'p-1.5 rounded-xl transition-all cursor-pointer flex-shrink-0 flex items-center justify-center',
              headerBg.includes('text-slate') || headerBg.includes('bg-white')
                ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-100 active:bg-slate-200 border border-slate-200/80 shadow-2xs'
                : 'text-white/80 hover:text-white hover:bg-white/15 active:bg-white/25'
            )}
            aria-label="Закрыть"
          >
            <X className="w-5 h-5 stroke-[2]" />
          </button>
        </div>

        {/* ТЕЛО МОДАЛКИ: скроллируемый контент */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 md:px-6 py-4 md:py-5 space-y-4 text-slate-800">
          {children}
        </div>

        {/* ПОДВАЛ:
            - Мобильный: sticky footer с pb-[calc(env(safe-area-inset-bottom)+28px)]
            - Десктоп: компактный ряд кнопок справа (justify-end)
        */}
        <div className="flex-shrink-0 bg-slate-50 border-t border-slate-200 px-4 md:px-6 py-3 md:py-3.5 pb-[calc(env(safe-area-inset-bottom)+28px)] md:pb-3.5">
          {footer}
        </div>
      </div>
    </div>,
    document.body
  );
};
