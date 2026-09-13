'use client';

import React, { useState, useEffect } from 'react';
import { X, CreditCard, DollarSign, Calendar, Check, User, Users, Bell, Send, MessageSquare, ShieldCheck, Lock, Wallet, AlertCircle } from 'lucide-react';
import { FullPaymentData, INITIAL_STUDENTS, TimelineInteraction } from '@/lib/data/mockData';
import { getStoredStudents, saveStudentToStorage, getStudentById, settleStudentOverdueDebts, settleDebtsFromDeposit, settleFamilyDebtsFromFamilyDeposit } from '@/lib/data/studentStorage';
import { savePaymentToStorage, settleOverduePayments, getStoredPayments } from '@/lib/data/paymentStorage';
import { saveInteractionToStorage } from '@/lib/data/timelineStorage';
import { useToast } from '@/context/ToastContext';
import { cn } from '@/lib/utils';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecorded?: (newPayment: FullPaymentData) => void;
  initialStudentId?: string;
  initialParentId?: string;
  allowedStudents?: Array<{ id: string; name: string }>;
  lockStudent?: boolean;
}

export function RecordPaymentModal({
  isOpen,
  onClose,
  onRecorded,
  initialStudentId,
  initialParentId,
  allowedStudents,
  lockStudent,
}: RecordPaymentModalProps) {
  const { success } = useToast();
  const allStudents = typeof window !== 'undefined' ? getStoredStudents() : INITIAL_STUDENTS;

  const defaultId = initialStudentId || allowedStudents?.[0]?.id || allStudents[0]?.id || '1';
  const [studentId, setStudentId] = useState(defaultId);
  const [currency, setCurrency] = useState<'RUB' | 'EUR'>('RUB');
  const [paymentType, setPaymentType] = useState<'subscription' | 'prepayment' | 'one_time'>('subscription');
  const [amount, setAmount] = useState('7600');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [periodLabel, setPeriodLabel] = useState(() => {
    return new Date().toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  });
  const [paymentMethod, setPaymentMethod] = useState<FullPaymentData['paymentMethod']>('card');
  const [status, setStatus] = useState<FullPaymentData['status']>('paid');
  const [comment, setComment] = useState('');
  const [autoRenewSubscription, setAutoRenewSubscription] = useState(true);

  useEffect(() => {
    if (initialStudentId) {
      setStudentId(initialStudentId);
    } else if (allowedStudents && allowedStudents.length > 0) {
      setStudentId(allowedStudents[0].id);
    }
  }, [initialStudentId, allowedStudents, isOpen]);

  // Notifications
  const [notifyOwner, setNotifyOwner] = useState(true);
  const [notifyParent, setNotifyParent] = useState(true);
  const [parentChannel, setParentChannel] = useState<'whatsapp' | 'telegram' | 'sms' | 'email'>('telegram');

  if (!isOpen) return null;

  const selectedStudent = allStudents.find((s) => s.id === studentId) || allStudents[0];
  const parent = (initialParentId && selectedStudent?.parents?.find((p) => p.id === initialParentId)) || selectedStudent?.parents?.[0];
  const parentDisplayName = parent ? `${parent.firstName} ${parent.lastName}` : 'Родитель';
  const currencySymbol = currency === 'EUR' ? '€' : '₽';
  const selectedStudentDeposit = selectedStudent?.finance?.deposit?.balance || 0;

  const allStoredPayments = typeof window !== 'undefined' ? getStoredPayments() : [];
  const overduePaymentsForStudent = allStoredPayments.filter(
    (p) => p.status === 'overdue' && p.studentId === studentId
  );
  const totalOverdueForStudent = overduePaymentsForStudent.reduce(
    (sum, p) => sum + (typeof p.amount === 'number' ? p.amount : 0),
    0
  );

  const otherFamilyDebts = initialParentId
    ? allStoredPayments.filter(
        (p) => p.status === 'overdue' && p.parentId === initialParentId && p.studentId !== studentId
      )
    : [];
  const totalOtherFamilyDebts = otherFamilyDebts.reduce(
    (sum, p) => sum + (typeof p.amount === 'number' ? p.amount : 0),
    0
  );

  const handleCurrencyChange = (newCur: 'RUB' | 'EUR') => {
    setCurrency(newCur);
    if (newCur === 'EUR' && (amount === '7600' || amount === '8400')) {
      setAmount('85');
    } else if (newCur === 'RUB' && (amount === '85' || amount === '100')) {
      setAmount('7600');
    }
  };

  const handlePaymentTypeChange = (type: 'subscription' | 'prepayment' | 'one_time') => {
    setPaymentType(type);
    if (type === 'prepayment') {
      setPeriodLabel('Депозит на баланс курса');
      setAutoRenewSubscription(false);
    } else if (type === 'subscription') {
      setPeriodLabel(new Date().toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }));
      setAutoRenewSubscription(true);
    } else {
      setPeriodLabel('Разовое занятие');
      setAutoRenewSubscription(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAmount = String(amount).replace(',', '.').trim();
    const numAmount = parseFloat(cleanAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      alert('Укажите корректную сумму платежа');
      return;
    }

    const formattedAmount = `${numAmount.toLocaleString('ru-RU')} ${currencySymbol}`;
    const formattedDate = new Date(paymentDate).toLocaleDateString('ru-RU');

    const methodLabels: Record<string, string> = {
      card: 'Банковская карта',
      bank_transfer: 'Перевод по СБП',
      cash: 'Наличные',
      invoice: 'Безналичный расчет (ООО/ИП)',
    };
    const methodLabel = methodLabels[paymentMethod] || 'Банковская карта';

    const freshStudent = getStudentById(selectedStudent.id) || selectedStudent;

    const newPayment: FullPaymentData = {
      id: `pay_${Date.now()}`,
      studentId: freshStudent.id,
      studentName: `${freshStudent.firstName} ${freshStudent.lastName}`,
      parentId: parent?.id,
      parentName: parent ? `${parent.firstName} ${parent.lastName}` : undefined,
      courseName: freshStudent.groups?.[0]?.courseName || 'Английский язык',
      groupName: freshStudent.groups?.[0]?.name || 'Основная группа',
      amount: numAmount,
      amountFormatted: formattedAmount,
      paymentDate: formattedDate,
      periodLabel,
      status,
      paymentMethod,
      currency,
      paymentType,
      recordedBy: 'Администратор',
      comment: comment || (paymentType === 'prepayment' ? 'Предоплата (списание по стоимости курса)' : autoRenewSubscription ? 'Абонемент продлен автоматически' : undefined),
    };

    // 1. Persist to student storage
    const paymentRecordForStudent = {
      id: newPayment.id,
      date: formattedDate,
      period: periodLabel,
      amount: formattedAmount,
      method: methodLabel,
      status: status === 'paid' ? ('paid' as const) : ('expected' as const),
      currency,
      paymentType,
    };

    let interactionContent = `Внесена оплата ${formattedAmount} за период «${periodLabel}» (способ: ${methodLabel}).`;
    let interactionResult = status === 'paid' ? 'Оплата получена' : 'Ожидается оплата';

    if (paymentType === 'prepayment') {
      interactionContent = `Внесена предоплата / депозит ${formattedAmount} на баланс курса «${newPayment.courseName}» (способ: ${methodLabel}). Списание будет производиться по стоимости курса.`;
      interactionResult = status === 'paid' ? 'Предоплата внесена' : 'Ожидается предоплата';
    } else if (paymentType === 'one_time') {
      interactionContent = `Внесена оплата ${formattedAmount} за разовое онлайн-занятие (способ: ${methodLabel}).`;
      interactionResult = status === 'paid' ? 'Разовая оплата' : 'Ожидается оплата';
    }

    const paymentInteraction: TimelineInteraction = {
      id: `int_${Date.now()}`,
      studentId: freshStudent.id,
      studentName: `${freshStudent.firstName} ${freshStudent.lastName}`,
      parentId: parent?.id,
      parentName: parent ? `${parent.firstName} ${parent.lastName}` : undefined,
      occurredAt: 'Только что',
      channel: 'other',
      type: 'status_change',
      author: 'Администратор школы',
      content: interactionContent,
      result: interactionResult,
      targetType: freshStudent.studentType === 'adult_student' ? 'student' : 'parent',
      targetName:
        freshStudent.studentType === 'adult_student'
          ? `${freshStudent.firstName} ${freshStudent.lastName}`
          : parent
          ? `${parent.firstName} ${parent.lastName}`
          : `${freshStudent.firstName} ${freshStudent.lastName}`,
      targetRole: freshStudent.studentType === 'adult_student' ? 'Студент' : 'Родитель',
    };

    saveInteractionToStorage(paymentInteraction);

    const currentPayments = freshStudent.finance?.payments || [];
    let updatedDeposit = freshStudent.finance?.deposit;

    if (paymentType === 'prepayment' && status === 'paid') {
      const currentBalance = freshStudent.finance?.deposit?.balance || 0;
      const newBal = currentBalance + numAmount;
      const lessonPrice = freshStudent.finance?.deposit?.pricePerLesson || (currency === 'EUR' ? 15 : 1050);
      updatedDeposit = {
        balance: newBal,
        balanceFormatted: `${newBal.toLocaleString('ru-RU')} ${currencySymbol}`,
        currency,
        pricePerLesson: lessonPrice,
        pricePerLessonFormatted: `${lessonPrice.toLocaleString('ru-RU')} ${currencySymbol}`,
      };
    }

    const updatedStudent = {
      ...freshStudent,
      finance: {
        ...freshStudent.finance,
        payments: [paymentRecordForStudent, ...currentPayments],
        ...(updatedDeposit ? { deposit: updatedDeposit } : {}),
      },
      interactions: [paymentInteraction, ...(freshStudent.interactions || [])],
    };
    saveStudentToStorage(updatedStudent);
    savePaymentToStorage(newPayment);

    // Auto-settle any overdue debts for this student so overdue debt block updates automatically!
    if (status === 'paid') {
      settleOverduePayments(freshStudent.id, numAmount, parent?.id);
      settleStudentOverdueDebts(freshStudent.id);
      settleDebtsFromDeposit(freshStudent.id);
      if (parent?.id) {
        settleFamilyDebtsFromFamilyDeposit(parent.id);
      }
    }

    // 2. Dispatch events
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('crm-students-changed', { detail: updatedStudent }));
      window.dispatchEvent(new CustomEvent('crm-payments-changed', { detail: newPayment }));
    }

    if (onRecorded) {
      onRecorded(newPayment);
    }

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
            <label className="text-xs font-medium text-slate-700 block mb-1">
              Ученик / Студент *
            </label>
            {lockStudent ? (
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800">
                <Lock className="h-3.5 w-3.5 text-slate-400" />
                <span>{selectedStudent?.firstName} {selectedStudent?.lastName}</span>
                <span className="ml-auto text-[11px] font-normal text-slate-500">
                  {selectedStudent?.studentType === 'adult_student' ? 'Студент 18+' : 'Школьник'}
                </span>
              </div>
            ) : allowedStudents && allowedStudents.length > 0 ? (
              <select
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {allowedStudents.map((s) => {
                  const studentData = allStudents.find((st) => st.id === s.id);
                  const sDeposit = studentData?.finance?.deposit?.balance || 0;
                  const sDebts = (studentData?.finance?.payments || [])
                    .filter((p) => p.status === 'overdue')
                    .reduce((sum, p) => sum + (parseFloat(p.amount.replace(/[^\d.,]/g, '').replace(',', '.')) || 0), 0);
                  const statusSuffix = sDebts > 0
                    ? ` • Долг: -${sDebts.toLocaleString('ru-RU')} ₽`
                    : sDeposit > 0
                    ? ` • Депозит: +${sDeposit.toLocaleString('ru-RU')} ₽`
                    : ' • Баланс: 0 ₽';
                  return (
                    <option key={s.id} value={s.id}>
                      {s.name}{statusSuffix}
                    </option>
                  );
                })}
              </select>
            ) : (
              <select
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {allStudents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.firstName} {s.lastName} (Родитель: {s.parents[0]?.firstName || '—'} {s.parents[0]?.lastName || ''})
                  </option>
                ))}
              </select>
            )}
          </div>

          {totalOverdueForStudent > 0 && (
            <div className="rounded-xl border border-rose-200 bg-rose-50/90 p-3 text-xs space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="font-semibold text-rose-900 flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                  Ученик {selectedStudent?.firstName} имеет задолженность: <strong className="text-rose-700">{totalOverdueForStudent.toLocaleString('ru-RU')} ₽</strong>
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {selectedStudentDeposit > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const res = settleDebtsFromDeposit(selectedStudent.id);
                        if (res.settled) {
                          success(`Списано ${res.settledAmount.toLocaleString('ru-RU')} ₽ с депозита в счет погашения долга!`);
                          onClose();
                        }
                      }}
                      className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 transition-colors shrink-0 cursor-pointer flex items-center gap-1"
                    >
                      <Wallet className="h-3 w-3" />
                      Списать с депозита ({selectedStudentDeposit.toLocaleString('ru-RU')} ₽)
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setAmount(String(totalOverdueForStudent));
                      setPeriodLabel('Погашение задолженности');
                    }}
                    className="rounded-lg bg-rose-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-rose-700 transition-colors shrink-0 cursor-pointer"
                  >
                    Внести оплату ({totalOverdueForStudent.toLocaleString('ru-RU')} ₽)
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-rose-700">
                {selectedStudentDeposit > 0
                  ? `На депозите ученика доступно ${selectedStudentDeposit.toLocaleString('ru-RU')} ₽. Вы можете списать долг с депозита или внести новый платёж.`
                  : 'При внесении оплаты статус просрочки будет автоматически снят с ученика, а общая сумма задолженности школы пересчитается по оставшимся клиентам.'}
              </p>
            </div>
          )}

          {totalOverdueForStudent === 0 && totalOtherFamilyDebts > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900 flex items-center justify-between gap-2 flex-wrap">
              <span className="flex items-center gap-1.5 font-medium">
                <Users className="h-4 w-4 text-amber-600 shrink-0" />
                В этой семье есть задолженность по другому ребенку: <strong className="text-amber-800">{totalOtherFamilyDebts.toLocaleString('ru-RU')} ₽</strong>
              </span>
              <button
                type="button"
                onClick={() => {
                  if (otherFamilyDebts[0]?.studentId) {
                    setStudentId(otherFamilyDebts[0].studentId);
                  }
                }}
                className="text-[11px] font-bold text-amber-800 bg-white border border-amber-300 rounded-lg px-2.5 py-1 hover:bg-amber-100 transition-colors cursor-pointer shrink-0 shadow-2xs"
              >
                Переключить на {otherFamilyDebts[0]?.studentName || 'должника'}
              </button>
            </div>
          )}

          {/* Payment Type Selection */}
          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">
              Назначение платежа
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handlePaymentTypeChange('subscription')}
                className={cn(
                  'rounded-xl border p-2.5 text-left transition-all cursor-pointer',
                  paymentType === 'subscription'
                    ? 'border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-500 shadow-2xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                )}
              >
                <div className="text-[11px] font-bold text-slate-900">Абонемент</div>
                <div className="text-[10px] text-slate-500">За период / месяц</div>
              </button>

              <button
                type="button"
                onClick={() => handlePaymentTypeChange('prepayment')}
                className={cn(
                  'rounded-xl border p-2.5 text-left transition-all cursor-pointer',
                  paymentType === 'prepayment'
                    ? 'border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-500 shadow-2xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                )}
              >
                <div className="text-[11px] font-bold text-slate-900">Предоплата</div>
                <div className="text-[10px] text-slate-500">Списание по курсу</div>
              </button>

              <button
                type="button"
                onClick={() => handlePaymentTypeChange('one_time')}
                className={cn(
                  'rounded-xl border p-2.5 text-left transition-all cursor-pointer',
                  paymentType === 'one_time'
                    ? 'border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-500 shadow-2xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                )}
              >
                <div className="text-[11px] font-bold text-slate-900">Разово</div>
                <div className="text-[10px] text-slate-500">Одно занятие</div>
              </button>
            </div>
            {paymentType === 'prepayment' && (
              <p className="mt-1.5 text-[11px] text-blue-700 bg-blue-50 border border-blue-200/60 rounded-lg p-2 leading-relaxed">
                💡 <strong>Предоплата / Депозит</strong> зачисляется на баланс ученика. Средства списываются по стоимости курса или за каждое онлайн-занятие.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-700">
                  Сумма ({currencySymbol}) *
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleCurrencyChange('RUB')}
                    className={cn(
                      'rounded-md px-2 py-0.5 text-[11px] font-bold transition-colors cursor-pointer',
                      currency === 'RUB'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    )}
                  >
                    ₽ Руб
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCurrencyChange('EUR')}
                    className={cn(
                      'rounded-md px-2 py-0.5 text-[11px] font-bold transition-colors cursor-pointer',
                      currency === 'EUR'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    )}
                  >
                    € Евро
                  </button>
                </div>
              </div>
              <input
                type="number"
                required
                min="0.01"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={currency === 'EUR' ? '85' : '7600'}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">
                {paymentType === 'prepayment' ? 'Назначение депозита' : 'Период обучения'}
              </label>
              <input
                type="text"
                value={periodLabel}
                onChange={(e) => setPeriodLabel(e.target.value)}
                placeholder={paymentType === 'prepayment' ? 'Депозит на баланс курса' : 'Сентябрь 2026'}
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

          {paymentType === 'subscription' && (
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
          )}

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
                      Бот: «Поступил платёж {Number(amount || 0).toLocaleString('ru-RU')} {currencySymbol} ({paymentType === 'prepayment' ? 'Предоплата' : paymentType === 'one_time' ? 'Разовое' : 'Абонемент'}) от {selectedStudent.firstName} {selectedStudent.lastName} ({paymentMethod === 'card' ? 'Карта' : paymentMethod === 'bank_transfer' ? 'СБП' : paymentMethod === 'cash' ? 'Наличные' : 'Счет'})»
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
                      {paymentType === 'prepayment'
                        ? `Чек: «Здравствуйте, ${parent?.firstName || 'уважаемый родитель'}! Предоплата за обучение ${selectedStudent.firstName} на сумму ${Number(amount || 0).toLocaleString('ru-RU')} ${currencySymbol} зачислена на баланс курса. Списание будет производиться по стоимости курса. Спасибо!»`
                        : `Чек: «Здравствуйте, ${parent?.firstName || 'уважаемый родитель'}! Оплата обучения ${selectedStudent.firstName} на сумму ${Number(amount || 0).toLocaleString('ru-RU')} ${currencySymbol} за ${periodLabel} подтверждена. Абонемент активен. Спасибо!»`}
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
