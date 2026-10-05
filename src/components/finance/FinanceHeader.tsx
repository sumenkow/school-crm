'use client';

import React from 'react';
import { Plus, Receipt } from 'lucide-react';

interface FinanceHeaderProps {
  canManage: boolean;
  onOpenInvoiceModal: () => void;
  onOpenPaymentModal: () => void;
  onOpenSubscriptionModal: () => void;
}

export function FinanceHeader({
  canManage,
  onOpenInvoiceModal,
  onOpenPaymentModal,
  onOpenSubscriptionModal,
}: FinanceHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Оплаты и финансы
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Учет платежей, счетов, абонементов и контроль задолженностей
        </p>
      </div>

      {canManage && (
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={onOpenInvoiceModal}
            className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-white px-3.5 py-2 text-xs font-bold text-blue-700 shadow-2xs hover:bg-blue-50 transition-all cursor-pointer"
          >
            <Receipt className="h-4 w-4 text-blue-600" />
            <span>Выставить счёт</span>
          </button>

          <button
            type="button"
            onClick={onOpenPaymentModal}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-emerald-700 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Внести платёж</span>
          </button>

          <button
            type="button"
            onClick={onOpenSubscriptionModal}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-blue-700 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Новый абонемент</span>
          </button>
        </div>
      )}
    </div>
  );
}
