'use client';

import React from 'react';
import Link from 'next/link';
import {
  X,
  Receipt,
  CreditCard,
  User,
  Calendar,
  Layers,
  FileText,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertCircle,
  MessageSquare,
  Phone,
  Download,
  Snowflake,
  RotateCcw,
} from 'lucide-react';
import { EuropeanInvoiceData } from '@/lib/data/invoiceStorage';
import { FullPaymentData, FullSubscriptionData } from '@/lib/data/mockData';
import { triggerWhatsAppContact, triggerTelegramContact } from '@/lib/data/contactWorkflows';

export interface DebtorDetailData {
  familyKey: string;
  parentId?: string;
  parentName: string;
  contactPhone: string;
  studentNames: string[];
  studentId?: string;
  groupName?: string;
  totalEur: number;
  totalRub?: number;
  daysOverdue: number;
  lastPaymentDate?: string;
  responsibleName?: string;
  payments: FullPaymentData[];
}

export type DrawerDetailType =
  | { type: 'invoice'; data: EuropeanInvoiceData }
  | { type: 'payment'; data: FullPaymentData }
  | { type: 'subscription'; data: FullSubscriptionData }
  | { type: 'debtor'; data: DebtorDetailData }
  | null;

interface FinanceDetailDrawerProps {
  detail: DrawerDetailType;
  onClose: () => void;
  onMarkInvoicePaid?: (invoiceId: string) => void;
  onSettleDebtPayment?: (studentId?: string, parentId?: string) => void;
  onFreezeSubscription?: (subId: string) => void;
}

export function FinanceDetailDrawer({
  detail,
  onClose,
  onMarkInvoicePaid,
  onSettleDebtPayment,
  onFreezeSubscription,
}: FinanceDetailDrawerProps) {
  if (!detail) return null;

  return (
    <div className="w-80 sm:w-96 shrink-0 bg-white rounded-2xl border border-slate-200/90 shadow-lg p-5 flex flex-col justify-between max-h-[85vh] overflow-y-auto animate-in slide-in-from-right duration-150">
      {/* Drawer Header with Close button */}
      <div>
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="min-w-0">
            {detail.type === 'invoice' && (
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Счёт №{detail.data.invoiceNumber}
                </span>
                <div className="text-2xl font-black text-slate-900 mt-0.5">
                  {detail.data.totalAmountEUR.toFixed(2)} €
                </div>
              </div>
            )}

            {detail.type === 'payment' && (
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Платёж #{detail.data.id.replace(/\D/g, '') || '125'}
                </span>
                <div className="text-2xl font-black text-slate-900 mt-0.5">
                  {detail.data.amountFormatted || `${detail.data.amount} €`}
                </div>
              </div>
            )}

            {detail.type === 'subscription' && (
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Абонемент #{detail.data.id.replace(/\D/g, '') || '87'}
                </span>
                <div className="text-xl font-bold text-slate-900 mt-0.5">
                  {detail.data.studentName}
                </div>
              </div>
            )}

            {detail.type === 'debtor' && (
              <div>
                <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block">
                  Задолженность
                </span>
                <div className="text-2xl font-black text-rose-700 mt-0.5">
                  {Math.round(detail.data.totalEur).toLocaleString('ru-RU')} €
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Status Badges */}
            {detail.type === 'invoice' && (
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                  detail.data.status === 'paid'
                    ? 'bg-emerald-100 text-emerald-800'
                    : detail.data.status === 'overdue'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {detail.data.status === 'paid'
                  ? 'Оплачен'
                  : detail.data.status === 'overdue'
                  ? 'Просрочен'
                  : 'Ожидает оплаты'}
              </span>
            )}

            {detail.type === 'payment' && (
              <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800">
                Оплачено
              </span>
            )}

            {detail.type === 'subscription' && (
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                  detail.data.status === 'active'
                    ? 'bg-emerald-100 text-emerald-800'
                    : detail.data.status === 'frozen'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {detail.data.status === 'active'
                  ? 'Активен'
                  : detail.data.status === 'frozen'
                  ? 'Заморожен'
                  : 'Завершён'}
              </span>
            )}

            {detail.type === 'debtor' && (
              <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-800">
                Просрочка: {detail.data.daysOverdue} дней
              </span>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              title="Закрыть панель"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Drawer Body Attributes */}
        <div className="py-4 space-y-3.5 text-xs text-slate-700">
          {/* Invoice View */}
          {detail.type === 'invoice' && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" /> Ученик
                </span>
                <Link
                  href={`/students/${detail.data.studentId}`}
                  className="font-bold text-blue-600 hover:underline"
                >
                  {detail.data.studentName}
                </Link>
              </div>

              {detail.data.parentName && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Родитель</span>
                  <span className="font-medium text-slate-800">{detail.data.parentName}</span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5" /> За что
                </span>
                <span className="font-medium text-slate-800">
                  {detail.data.courseName} • {detail.data.periodLabel}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" /> Выставлен
                </span>
                <span className="font-semibold text-slate-800">{detail.data.issueDate}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Срок оплаты</span>
                <span className="font-bold text-rose-700">{detail.data.dueDate}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Вариабельный символ (VS)</span>
                <span className="font-mono font-bold text-slate-800">
                  {detail.data.variableSymbol || detail.data.invoiceNumber}
                </span>
              </div>
            </>
          )}

          {/* Payment View */}
          {detail.type === 'payment' && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" /> Ученик
                </span>
                <Link
                  href={`/students/${detail.data.studentId}`}
                  className="font-bold text-blue-600 hover:underline"
                >
                  {detail.data.studentName}
                </Link>
              </div>

              {detail.data.parentName && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Родитель</span>
                  <span className="font-medium text-slate-800">{detail.data.parentName}</span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" /> Дата оплаты
                </span>
                <span className="font-semibold text-slate-800">{detail.data.paymentDate}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5" /> За что
                </span>
                <span className="font-medium text-slate-800">
                  {detail.data.courseName} • {detail.data.periodLabel}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Группа</span>
                <span className="font-medium text-slate-800">{detail.data.groupName || 'Основная'}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5" /> Способ оплаты
                </span>
                <span className="font-medium text-slate-800">
                  {detail.data.paymentMethod === 'card'
                    ? 'Банковская карта'
                    : detail.data.paymentMethod === 'bank_transfer'
                    ? 'Перевод (SEPA)'
                    : detail.data.paymentMethod === 'cash'
                    ? 'Наличные'
                    : 'Счёт'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Чек / файл</span>
                <Link
                  href={`/invoices/${detail.data.id}`}
                  target="_blank"
                  className="inline-flex items-center gap-1 text-blue-600 font-semibold cursor-pointer hover:underline"
                >
                  <FileText className="h-3.5 w-3.5" /> Чек #{detail.data.id.slice(0, 6)}.pdf
                  <ExternalLink className="h-3 w-3 text-blue-400" />
                </Link>
              </div>
            </>
          )}

          {/* Subscription View */}
          {detail.type === 'subscription' && (
            <>
              <div className="bg-blue-50/50 rounded-xl p-3 border border-blue-100 space-y-2">
                <div className="flex items-center justify-between font-bold text-slate-900">
                  <span>{detail.data.lessonsAttended} / {detail.data.lessonsTotal} занятий</span>
                  <span className="text-blue-700">Осталось: {Math.max(0, detail.data.lessonsTotal - detail.data.lessonsAttended)}</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (detail.data.lessonsAttended / (detail.data.lessonsTotal || 1)) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Действует до</span>
                <span className="font-semibold text-slate-800">{detail.data.endDate}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Стоимость</span>
                <span className="font-bold text-slate-900">{detail.data.priceFormatted || `${detail.data.price} €`}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Курс / Группа</span>
                <span className="font-medium text-slate-800">{detail.data.courseName} • {detail.data.groupName}</span>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  История использования
                </span>
                <div className="space-y-1.5 text-[11px] text-slate-600">
                  <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50">
                    <span>02.10 • Урок по расписанию</span>
                    <span className="text-emerald-700 font-bold">Проведён</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50">
                    <span>28.09 • Урок по расписанию</span>
                    <span className="text-emerald-700 font-bold">Проведён</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Debtor View */}
          {detail.type === 'debtor' && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Родитель</span>
                <span className="font-bold text-slate-900">{detail.data.parentName}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Телефон</span>
                <span className="font-semibold text-slate-800">{detail.data.contactPhone}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Дети / Ученики</span>
                <span className="font-bold text-blue-600">{detail.data.studentNames.join(', ')}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Количество долгов</span>
                <span className="font-bold text-rose-700">{detail.data.payments.length}</span>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  Связанные неоплаченные счета
                </span>
                <div className="space-y-1.5">
                  {detail.data.payments.map((p) => (
                    <div
                      key={p.id}
                      className="p-2 rounded-xl bg-rose-50/60 border border-rose-100 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-800">{p.studentName}</div>
                        <div className="text-[10px] text-slate-500">{p.periodLabel}</div>
                      </div>
                      <span className="font-bold text-rose-700">{p.amountFormatted || `${p.amount} €`}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Drawer Action Buttons */}
      <div className="pt-4 border-t border-slate-100 space-y-2">
        {detail.type === 'invoice' && (
          <>
            <Link
              href={`/invoices/${detail.data.id}`}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-blue-700 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Открыть счёт (Faktúra)</span>
            </Link>

            {detail.data.status !== 'paid' && onMarkInvoicePaid && (
              <button
                type="button"
                onClick={() => {
                  onMarkInvoicePaid(detail.data.id);
                  onClose();
                }}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-emerald-700 transition-colors cursor-pointer"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Внести оплату</span>
              </button>
            )}

            <Link
              href={`/students/${detail.data.studentId}`}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <span>Открыть карточку ученика</span>
            </Link>
          </>
        )}

        {detail.type === 'payment' && (
          <>
            <Link
              href={`/students/${detail.data.studentId}`}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-blue-700 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Открыть карточку ученика</span>
            </Link>
          </>
        )}

        {detail.type === 'subscription' && (
          <>
            {onFreezeSubscription && (
              <button
                type="button"
                onClick={() => onFreezeSubscription(detail.data.id)}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <Snowflake className="h-3.5 w-3.5 text-blue-500" />
                <span>{detail.data.status === 'frozen' ? 'Разморозить' : 'Заморозить абонемент'}</span>
              </button>
            )}

            <Link
              href={`/students/${detail.data.studentId}`}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-blue-700 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Открыть карточку ученика</span>
            </Link>
          </>
        )}

        {detail.type === 'debtor' && (
          <>
            <button
              type="button"
              onClick={() =>
                triggerWhatsAppContact({
                  phone: detail.data.contactPhone,
                  parentId: detail.data.parentId,
                  clientName: detail.data.parentName,
                  targetRole: 'Родитель',
                  template: `Здравствуйте, ${detail.data.parentName}! Напоминаем об оплате обучения (${detail.data.studentNames.join(', ')}) на сумму ${Math.round(detail.data.totalEur)} €.`,
                })
              }
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-emerald-700 transition-colors cursor-pointer"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Написать в WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={() =>
                triggerTelegramContact({
                  phone: detail.data.contactPhone,
                  parentId: detail.data.parentId,
                  clientName: detail.data.parentName,
                  targetRole: 'Родитель',
                })
              }
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-500 px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-blue-600 transition-colors cursor-pointer"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Написать в Telegram</span>
            </button>

            {onSettleDebtPayment && (
              <button
                type="button"
                onClick={() => {
                  onSettleDebtPayment(detail.data.studentId || detail.data.payments[0]?.studentId, detail.data.parentId);
                  onClose();
                }}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <CreditCard className="h-3.5 w-3.5 text-emerald-600" />
                <span>Внести оплату</span>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
