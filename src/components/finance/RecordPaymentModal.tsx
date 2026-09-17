'use client';

import React, { useState, useEffect } from 'react';
import { X, CreditCard, DollarSign, Calendar, Check, User, Users, Bell, Send, MessageSquare, ShieldCheck, Lock, Wallet, AlertCircle, Info } from 'lucide-react';
import { FullPaymentData, INITIAL_STUDENTS, TimelineInteraction } from '@/lib/data/mockData';
import { getStoredStudents, saveStudentToStorage, getStudentById, settleStudentOverdueDebts, settleDebtsFromDeposit, settleFamilyDebtsFromFamilyDeposit } from '@/lib/data/studentStorage';
import { savePaymentToStorage, settleOverduePayments, getStoredPayments } from '@/lib/data/paymentStorage';
import { saveInteractionToStorage } from '@/lib/data/timelineStorage';
import { getEurRubRate, convertEurToRub, convertRubToEur } from '@/lib/data/currencyHelper';
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
  const rate = getEurRubRate();
  const allStudents = typeof window !== 'undefined' ? getStoredStudents() : INITIAL_STUDENTS;

  const defaultId = initialStudentId || allowedStudents?.[0]?.id || allStudents[0]?.id || '1';
  const [studentId, setStudentId] = useState(defaultId);
  const [currency, setCurrency] = useState<'RUB' | 'EUR'>('EUR');
  const [amount, setAmount] = useState('85');
  const [amountEur, setAmountEur] = useState('85');
  const [amountRub, setAmountRub] = useState(() => String(Math.round(85 * rate)));
  const [showOwnerTemplate, setShowOwnerTemplate] = useState(false);
  const [showParentTemplate, setShowParentTemplate] = useState(false);
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [periodLabel, setPeriodLabel] = useState(() => {
    return new Date().toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  });
  const [paymentMethod, setPaymentMethod] = useState<FullPaymentData['paymentMethod']>('card');
  const [status, setStatus] = useState<FullPaymentData['status']>('paid');
  const [comment, setComment] = useState('');
  const [paymentType, setPaymentType] = useState<'subscription' | 'prepayment' | 'one_time'>('subscription');
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
    if (newCur === 'EUR') {
      const curEur = parseFloat(amountEur) || Math.round(((parseFloat(amountRub) || 7600) / rate) * 100) / 100;
      setAmount(String(curEur));
    } else {
      const curRub = parseFloat(amountRub) || Math.round((parseFloat(amountEur) || 85) * rate);
      setAmount(String(curRub));
    }
  };

  const handleRubInput = (val: string) => {
    setAmountRub(val);
    const num = parseFloat(val.replace(',', '.')) || 0;
    if (num > 0) {
      const calculatedEur = Math.round((num / rate) * 100) / 100;
      setAmountEur(String(calculatedEur));
      setAmount(currency === 'EUR' ? String(calculatedEur) : val);
    } else {
      setAmountEur('');
      setAmount('');
    }
  };

  const handleEurInput = (val: string) => {
    setAmountEur(val);
    const num = parseFloat(val.replace(',', '.')) || 0;
    if (num > 0) {
      const calculatedRub = Math.round(num * rate);
      setAmountRub(String(calculatedRub));
      setAmount(currency === 'EUR' ? val : String(calculatedRub));
    } else {
      setAmountRub('');
      setAmount('');
    }
  };

  const setPresetAmount = (rub: number, eur: number) => {
    setAmountRub(String(rub));
    setAmountEur(String(eur));
    setAmount(currency === 'EUR' ? String(eur) : String(rub));
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
    const effectiveAmountStr = amount || (currency === 'EUR' ? amountEur : amountRub);
    const cleanAmount = String(effectiveAmountStr).replace(',', '.').trim();
    const numAmount = parseFloat(cleanAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      alert('Укажите корректную сумму платежа');
      return;
    }

    const formattedAmount =
      currency === 'EUR'
        ? `${numAmount.toLocaleString('ru-RU')} € (≈ ${(numAmount * rate).toLocaleString('ru-RU')} ₽)`
        : `${numAmount.toLocaleString('ru-RU')} ₽ (≈ ${Math.round((numAmount / rate) * 100) / 100} €)`;
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

    const nowP = new Date();
    const padP = (n: number) => String(n).padStart(2, '0');
    const dateStrP = `${padP(nowP.getDate())}.${padP(nowP.getMonth() + 1)}.${nowP.getFullYear()}`;
    const timeStrP = `${padP(nowP.getHours())}:${padP(nowP.getMinutes())}`;

    const paymentInteraction: TimelineInteraction = {
      id: `int_${Date.now()}`,
      studentId: freshStudent.id,
      studentName: `${freshStudent.firstName} ${freshStudent.lastName}`,
      parentId: parent?.id,
      parentName: parent ? `${parent.firstName} ${parent.lastName}` : undefined,
      occurredAt: `${dateStrP}, ${timeStrP}`,
      createdAt: nowP.toISOString(),
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

    let updatedActiveSubscription = freshStudent.finance?.activeSubscription;
    if (autoRenewSubscription && status === 'paid' && paymentType === 'subscription') {
      const pDate = new Date(paymentDate);
      const nextMonthYear = pDate.getMonth() === 11 ? pDate.getFullYear() + 1 : pDate.getFullYear();
      const nextMonth = (pDate.getMonth() + 1) % 12;
      const lastDayOfNextMonth = new Date(nextMonthYear, nextMonth + 1, 0).getDate();
      const nextRenewalDate = `${padP(lastDayOfNextMonth)}.${padP(nextMonth + 1)}.${nextMonthYear}`;

      updatedActiveSubscription = {
        id: updatedActiveSubscription?.id || `sub_${Date.now()}`,
        name: updatedActiveSubscription?.name || 'Ежемесячный абонемент',
        period: updatedActiveSubscription?.period || '1 месяц',
        price: updatedActiveSubscription?.price || String(numAmount),
        status: 'active' as const,
        lessonsAttended: updatedActiveSubscription?.lessonsAttended || '0/8',
        renewalDate: nextRenewalDate,
        priceFormatted: formattedAmount,
        lessonsTotal: updatedActiveSubscription?.lessonsTotal || 8,
        lessonsRemaining: updatedActiveSubscription?.lessonsTotal || 8,
      };
    }

    const updatedStudent = {
      ...freshStudent,
      finance: {
        ...freshStudent.finance,
        payments: [paymentRecordForStudent, ...currentPayments],
        ...(updatedDeposit ? { deposit: updatedDeposit } : {}),
        ...(updatedActiveSubscription ? { activeSubscription: updatedActiveSubscription } : {}),
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

          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                  <span>Сумма в рублях (₽)</span>
                  <span className="text-[10px] font-normal text-slate-400">1 € = {rate} ₽</span>
                </label>
                <div className="relative mt-1">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={amountRub}
                    onChange={(e) => handleRubInput(e.target.value)}
                    placeholder={String(Math.round(85 * rate))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 pr-8 text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">₽</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                  <span>Сумма в евро (€)</span>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">Базовая</span>
                </label>
                <div className="relative mt-1">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={amountEur}
                    onChange={(e) => handleEurInput(e.target.value)}
                    placeholder="85"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 pr-8 text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">€</span>
                </div>
              </div>
            </div>

            {/* Quick amount presets (ТЗ 3.3) */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[
                { label: '1 занятие', eur: 20, rub: Math.round(20 * rate) },
                { label: 'Абонемент 4 зан.', eur: 75, rub: Math.round(75 * rate) },
                { label: 'Абонемент 8 зан.', eur: 140, rub: Math.round(140 * rate) },
                { label: 'Депозит', eur: 85, rub: Math.round(85 * rate) },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setPresetAmount(preset.rub, preset.eur)}
                  className="rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 border border-slate-200/60 px-2 py-1 text-[11px] font-semibold text-slate-700 transition-colors cursor-pointer"
                >
                  {preset.label} — {preset.eur} € / {preset.rub.toLocaleString('ru-RU')} ₽
                </button>
              ))}
            </div>

            <div className="mt-3">
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

          {/* Notifications Section (ТЗ 3.3: Compact view with collapsible templates) */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Bell className="h-3.5 w-3.5 text-blue-600" />
                <span className="text-xs font-bold text-slate-900">Уведомления и квитанции</span>
              </div>
              <span className="text-[10px] text-slate-500 font-medium">Компактный вид</span>
            </div>

            {/* Notification 1: Owner */}
            <div className="rounded-lg bg-white p-2 border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={notifyOwner}
                    onChange={(e) => setNotifyOwner(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-semibold text-slate-800">Оповестить владельца школы</span>
                </label>
                {notifyOwner && (
                  <button
                    type="button"
                    onClick={() => setShowOwnerTemplate(!showOwnerTemplate)}
                    className="text-[10px] text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
                  >
                    {showOwnerTemplate ? 'Скрыть текст' : 'Шаблон (i)'}
                  </button>
                )}
              </div>
              {notifyOwner && showOwnerTemplate && (
                <div className="mt-1.5 rounded bg-slate-50 px-2 py-1 text-[10px] text-slate-600 font-mono">
                  Бот: «Поступил платёж {Number(amountEur || 0).toLocaleString('ru-RU')} € / {Number(amountRub || 0).toLocaleString('ru-RU')} ₽ ({paymentType === 'prepayment' ? 'Предоплата' : paymentType === 'one_time' ? 'Разовое' : 'Абонемент'}) от {selectedStudent.firstName} {selectedStudent.lastName} ({paymentMethod === 'card' ? 'Карта' : paymentMethod === 'bank_transfer' ? 'СБП' : paymentMethod === 'cash' ? 'Наличные' : 'Счет'})»
                </div>
              )}
            </div>

            {/* Notification 2: Parents */}
            <div className="rounded-lg bg-white p-2 border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={notifyParent}
                    onChange={(e) => setNotifyParent(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="font-semibold text-slate-800">Отправить чек родителю</span>
                </label>
                {notifyParent && (
                  <div className="flex items-center gap-2">
                    <select
                      value={parentChannel}
                      onChange={(e) => setParentChannel(e.target.value as any)}
                      className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 focus:outline-none"
                    >
                      <option value="telegram">Telegram</option>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="sms">SMS</option>
                      <option value="email">Email</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowParentTemplate(!showParentTemplate)}
                      className="text-[10px] text-emerald-700 hover:text-emerald-900 font-medium cursor-pointer"
                    >
                      {showParentTemplate ? 'Скрыть чек' : 'Шаблон (i)'}
                    </button>
                  </div>
                )}
              </div>
              {notifyParent && (
                <div className="text-[10px] text-slate-500 mt-1">
                  Получатель: <strong className="text-slate-700">{parentDisplayName}</strong> ({parent?.phone || 'Телефон не указан'})
                </div>
              )}
              {notifyParent && showParentTemplate && (
                <div className="mt-1.5 rounded bg-emerald-50/70 border border-emerald-100 p-2 text-[10px] text-emerald-900 leading-snug">
                  {paymentType === 'prepayment'
                    ? `Чек: «Здравствуйте, ${parent?.firstName || 'уважаемый родитель'}! Предоплата за обучение ${selectedStudent.firstName} на сумму ${Number(amountEur || 0).toLocaleString('ru-RU')} € (${Number(amountRub || 0).toLocaleString('ru-RU')} ₽) зачислена на баланс курса. Списание будет производиться по стоимости курса. Спасибо!»`
                    : `Чек: «Здравствуйте, ${parent?.firstName || 'уважаемый родитель'}! Оплата обучения ${selectedStudent.firstName} на сумму ${Number(amountEur || 0).toLocaleString('ru-RU')} € (${Number(amountRub || 0).toLocaleString('ru-RU')} ₽) за ${periodLabel} подтверждена. Абонемент активен. Спасибо!»`}
                </div>
              )}
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
