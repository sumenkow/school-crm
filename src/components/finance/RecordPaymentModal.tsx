'use client';

import React, { useState } from 'react';
import { X, CreditCard, DollarSign, Calendar, Check, User, Bell, Send, MessageSquare, ShieldCheck } from 'lucide-react';
import { FullPaymentData, INITIAL_STUDENTS } from '@/lib/data/mockData';
import { useToast } from '@/context/ToastContext';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecorded: (newPayment: FullPaymentData) => void;
}

export function RecordPaymentModal({ isOpen, onClose, onRecorded }: RecordPaymentModalProps) {
  const { success } = useToast();
  const [studentId, setStudentId] = useState('1');
  const [amount, setAmount] = useState('7600');
  const [paymentDate, setPaymentDate] = useState('2026-09-03');
  const [periodLabel, setPeriodLabel] = useState('Сентябрь 2026');
  const [paymentMethod, setPaymentMethod] = useState<FullPaymentData['paymentMethod']>('card');
  const [status, setStatus] = useState<FullPaymentData['status']>('paid');
  const [comment, setComment] = useState('');
  const [autoRenewSubscription, setAutoRenewSubscription] = useState(true);

  // Notifications
  const [notifyOwner, setNotifyOwner] = useState(true);
  const [notifyParent, setNotifyParent] = useState(true);
  const [parentChannel, setParentChannel] = useState<'whatsapp' | 'telegram' | 'sms' | 'email'>('telegram');

  if (!isOpen) return null;

  const selectedStudent = INITIAL_STUDENTS.find((s) => s.id === studentId) || INITIAL_STUDENTS[0];
  const parent = selectedStudent.parents[0];
  const parentDisplayName = parent ? `${parent.firstName} ${parent.lastName}` : 'Родитель';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      alert('Укажите корректную сумму платежа');
      return;
    }

    const numAmount = Number(amount);
    const newPayment: FullPaymentData = {
      id: `pay_${Date.now()}`,
      studentId: selectedStudent.id,
      studentName: `${selectedStudent.firstName} ${selectedStudent.lastName}`,
      parentId: parent?.id,
      parentName: parent ? `${parent.firstName} ${parent.lastName}` : undefined,
      courseName: selectedStudent.groups[0]?.courseName || 'Английский язык',
      groupName: selectedStudent.groups[0]?.name || 'Основная группа',
      amount: numAmount,
      amountFormatted: `${numAmount.toLocaleString('ru-RU')} ₽`,
      paymentDate: new Date(paymentDate).toLocaleDateString('ru-RU'),
      periodLabel,
      status,
      paymentMethod,
      recordedBy: 'Вы (Текущий пользователь)',
      comment: comment || (autoRenewSubscription ? 'Абонемент продлен автоматически' : undefined),
    };

    onRecorded(newPayment);

    // Dynamic feedback about dispatched notifications
    const notices: string[] = [];
    if (notifyOwner) notices.push('владельцу (Telegram)');
    if (notifyParent) notices.push(`родителям (${parentDisplayName} через ${parentChannel.toUpperCase()})`);

    const noticeMsg = notices.length > 0 ? ` Уведомления отправлены: ${notices.join(' и ')}.` : '';
    success(`Платёж ${newPayment.amountFormatted} зафиксирован!${noticeMsg}`);

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Внесение оплаты</h2>
              <p className="text-xs text-slate-500">Фиксация фактического поступления денег (1 платёж = 1 запись)</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-700">Ученик *</label>
            <select
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {INITIAL_STUDENTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.firstName} {s.lastName} (Родитель: {s.parents[0]?.firstName} {s.parents[0]?.lastName})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-700">Сумма платежа (₽) *</label>
              <input
                type="number"
                required
                min="1"
                step="100"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="7600"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">Период обучения</label>
              <input
                type="text"
                value={periodLabel}
                onChange={(e) => setPeriodLabel(e.target.value)}
                placeholder="Сентябрь 2026"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-700">Способ оплаты</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as 'card' | 'bank_transfer' | 'cash' | 'invoice')}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none"
              >
                <option value="card">Банковская карта</option>
                <option value="bank_transfer">Перевод по СБП</option>
                <option value="cash">Наличные</option>
                <option value="invoice">Безналичный счет (ООО/ИП)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">Статус платежа</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'paid' | 'expected' | 'overdue')}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none"
              >
                <option value="paid">Оплачено (Деньги поступили)</option>
                <option value="expected">Ожидается (Счет выставлен)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700">Дата платежа</label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none"
            />
          </div>

          <div className="rounded-xl bg-emerald-50/70 p-3 border border-emerald-200/60">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-emerald-900">
              <input
                type="checkbox"
                checked={autoRenewSubscription}
                onChange={(e) => setAutoRenewSubscription(e.target.checked)}
                className="rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span>Автоматически продлить абонемент ученика на {periodLabel}</span>
            </label>
          </div>

          {/* Notifications Section */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3.5 space-y-3">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-bold text-slate-900">Уведомления о поступлении платежа</span>
            </div>

            {/* Notification 1: Owner */}
            <div className="rounded-lg bg-white p-2.5 border border-slate-200/80 shadow-xs">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyOwner}
                  onChange={(e) => setNotifyOwner(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="text-xs">
                  <span className="font-semibold text-slate-800">Отправить статус владельцу школы</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Мгновенное финансовое push/Telegram оповещение о поступлении денег в кассу
                  </p>
                  {notifyOwner && (
                    <div className="mt-1.5 rounded bg-slate-50 px-2 py-1 text-[10px] text-slate-600 font-mono">
                      ✉️ Бот: «💰 Поступил платёж {Number(amount || 0).toLocaleString('ru-RU')} ₽ от {selectedStudent.firstName} {selectedStudent.lastName} ({paymentMethod === 'card' ? 'Карта' : paymentMethod === 'bank_transfer' ? 'СБП' : paymentMethod === 'cash' ? 'Наличные' : 'Счет'})»
                    </div>
                  )}
                </div>
              </label>
            </div>

            {/* Notification 2: Parents */}
            <div className="rounded-lg bg-white p-2.5 border border-slate-200/80 shadow-xs">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyParent}
                  onChange={(e) => setNotifyParent(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <div className="text-xs flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">
                      Отправить квитанцию и статус родителю
                    </span>
                    {notifyParent && (
                      <select
                        value={parentChannel}
                        onChange={(e) => setParentChannel(e.target.value as any)}
                        className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-700 focus:outline-none"
                      >
                        <option value="telegram">Telegram</option>
                        <option value="whatsapp">WhatsApp</option>
                        <option value="sms">SMS</option>
                        <option value="email">Email</option>
                      </select>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Получатель: <strong className="text-slate-700">{parentDisplayName}</strong> ({parent?.phone || 'Телефон не указан'})
                  </p>
                  {notifyParent && (
                    <div className="mt-1.5 rounded bg-emerald-50/70 border border-emerald-100 p-2 text-[10px] text-emerald-900 leading-snug">
                      ✅ Чек: «Здравствуйте, {parent?.firstName || 'уважаемый родитель'}! Оплата обучения {selectedStudent.firstName} на сумму {Number(amount || 0).toLocaleString('ru-RU')} ₽ за {periodLabel} подтверждена. Абонемент активен. Спасибо!»
                    </div>
                  )}
                </div>
              </label>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700">Комментарий к чеку / платежу</label>
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Номер транзакции, чек или примечание..."
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition-colors"
            >
              <Check className="h-4 w-4" />
              Зафиксировать платёж
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
