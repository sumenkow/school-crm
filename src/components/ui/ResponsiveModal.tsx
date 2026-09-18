'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

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
  headerBg = 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white',
  children,
  footer,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col md:items-center md:justify-center md:p-4 bg-slate-900/40 md:backdrop-blur-sm overflow-hidden">
      {/* КАРКАС:
          - Мобильный: w-full h-full bg-white flex flex-col overflow-hidden
          - Десктоп: max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl border border-slate-100
      */}
      <div className="w-full h-full md:h-auto md:max-h-[90vh] md:max-w-2xl bg-white md:rounded-2xl md:shadow-2xl md:border md:border-slate-100 flex flex-col overflow-hidden animate-in fade-in-50 md:zoom-in-95 duration-200">
        
        {/* ШАПКА: компактный градиент */}
        <div className={`flex-shrink-0 px-4 md:px-6 py-3.5 ${headerBg} flex items-center justify-between pt-[max(12px,env(safe-area-inset-top))] md:pt-3.5`}>
          <div className="min-w-0 pr-3">
            <h2 className="text-base md:text-lg font-bold truncate leading-tight">{title}</h2>
            {subtitle && <p className="text-xs text-blue-100 truncate mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 active:bg-white/20 transition-colors cursor-pointer"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" />
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
