'use client';

import React from 'react';
import { X, HelpCircle, AlertCircle, CheckCircle2 } from 'lucide-react';

export interface RevenueLossesInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RevenueLossesInfoModal({
  isOpen,
  onClose,
}: RevenueLossesInfoModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <HelpCircle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Методология расчёта потерь
              </h3>
              <p className="text-xs text-slate-400">
                Формулы оценки упущенной выручки CRM
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 text-xs text-slate-600">
          <div className="p-3 bg-rose-50/60 border border-rose-100 rounded-xl space-y-1">
            <h4 className="font-bold text-rose-950 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              1. Незакрытые лиды после пробного
            </h4>
            <p className="text-[11px] text-rose-800 leading-relaxed">
              Сумма предложений (офферов) по заявкам, которые посетили пробный урок, но не дошли до оплаты абонемента в течение отчётного периода.
            </p>
          </div>

          <div className="p-3 bg-amber-50/60 border border-amber-100 rounded-xl space-y-1">
            <h4 className="font-bold text-amber-950 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              2. Недозаполненные группы
            </h4>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Свободные места в активных группах ниже плановой вместимости (8 чел.), умноженные на стоимость ежемесячного абонемента группы.
            </p>
          </div>

          <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl space-y-1">
            <h4 className="font-bold text-blue-950 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              3. Просроченные платежи
            </h4>
            <p className="text-[11px] text-blue-800 leading-relaxed">
              Фактическая сумма счетов учеников со статусом «Просрочен» за текущий расчётный месяц.
            </p>
          </div>

          <div className="p-3 bg-purple-50/60 border border-purple-100 rounded-xl space-y-1">
            <h4 className="font-bold text-purple-950 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-purple-500" />
              4. Ушедшие ученики / пауза
            </h4>
            <p className="text-[11px] text-purple-800 leading-relaxed">
              Упущенная регулярная месячная выручка от учеников в статусе «Пауза» или «Отток», прекративших посещение.
            </p>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
          >
            Понятно
          </button>
        </div>
      </div>
    </div>
  );
}
