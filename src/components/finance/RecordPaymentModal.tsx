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

const ALL_MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

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

  // Date & Training Period
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);

  const now = new Date();
  const currentMonthName = ALL_MONTHS[now.getMonth()];
  const currentYearStr = String(now.getFullYear());
  const nextMonthIdx = (now.getMonth() + 1) % 12;
  const nextYearNum = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
  const nextMonthName = ALL_MONTHS[nextMonthIdx];
  const nextYearStr = String(nextYearNum);

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthName);
  const [selectedYear, setSelectedYear] = useState<string>(currentYearStr);
  const [periodLabel, setPeriodLabel] = useState('');

  const [paymentMethod, setPaymentMethod] = useState<FullPaymentData['paymentMethod']>('card');
  const [status, setStatus] = useState<FullPaymentData['status']>('paid');
  const [comment, setComment] = useState('');
  const [paymentType, setPaymentType] = useState<'subscription' | 'prepayment' | 'one_time'>('subscription');
  const [autoRenewSubscription, setAutoRenewSubscription] = useState(true);

  // Group / Course selection
  const selectedStudent = allStudents.find((s) => s.id === studentId) || allStudents[0];
  const studentGroups = selectedStudent?.groups || [];
  const [selectedGroupId, setSelectedGroupId] = useState<string>(() => studentGroups[0]?.id || '');

  useEffect(() => {
    if (initialStudentId) {
      setStudentId(initialStudentId);
    } else if (allowedStudents && allowedStudents.length > 0) {
      setStudentId(allowedStudents[0].id);
    }
  }, [initialStudentId, allowedStudents, isOpen]);

  useEffect(() => {
    if (studentGroups.length > 0) {
      if (!studentGroups.some((g) => g.id === selectedGroupId)) {
        setSelectedGroupId(studentGroups[0].id);
      }
    } else {
      setSelectedGroupId('');
    }
  }, [selectedStudent, selectedGroupId, studentGroups]);

  // Sync Period Label dynamically based on paymentType & selected Month/Year
  useEffect(() => {
    if (paymentType === 'prepayment') {
      setPeriodLabel('Депозит на баланс курса');
    } else if (paymentType === 'one_time') {
      setPeriodLabel('Разовое занятие');
    } else {
      setPeriodLabel(`${selectedMonth} ${selectedYear}`);
    }
  }, [paymentType, selectedMonth, selectedYear]);

  // Notifications
  const [notifyOwner, setNotifyOwner] = useState(true);
  const [notifyParent, setNotifyParent] = useState(true);
  const [parentChannel, setParentChannel] = useState<'whatsapp' | 'telegram' | 'sms' | 'email'>('telegram');

  if (!isOpen) return null;

  const parent = (initialParentId && selectedStudent?.parents?.find((p) => p.id === initialParentId)) || selectedStudent?.parents?.[0];
  const parentDisplayName = parent ? `${parent.firstName} ${parent.lastName}` : 'Родитель';
  const selectedStudentDeposit = selectedStudent?.finance?.deposit?.balance || 0;
  const personalRate = selectedStudent?.finance?.deposit?.pricePerLesson || 15;

  const targetGroup = studentGroups.find((g) => g.id === selectedGroupId) || studentGroups[0];
  const targetCourseName = targetGroup?.courseName || targetGroup?.name || 'Английский язык';
  const targetGroupName = targetGroup?.name || 'Основная группа';

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

  const setPresetAmount = (eur: number) => {
    const rub = Math.round(eur * rate);
    setAmountEur(String(eur));
    setAmountRub(String(rub));
    setAmount(currency === 'EUR' ? String(eur) : String(rub));
  };

  const handlePaymentTypeChange = (type: 'subscription' | 'prepayment' | 'one_time') => {
    setPaymentType(type);
    if (type === 'prepayment') {
      setAutoRenewSubscription(false);
      setPresetAmount(100);
    } else if (type === 'subscription') {
      setAutoRenewSubscription(true);
      setPresetAmount(140);
    } else {
      setAutoRenewSubscription(false);
      setPresetAmount(personalRate);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveAmountStr = amount || (currency === 'EUR' ? amountEur : amountRub);
    const cleanAmount = String(effectiveAmountStr).replace(',', '.').trim();
    const numAmountRaw = parseFloat(cleanAmount);
    if (isNaN(numAmountRaw) || numAmountRaw <= 0) {
      alert('Укажите корректную сумму платежа');
      return;
    }

    const numAmountEUR =
      currency === 'EUR'
        ? numAmountRaw > 10000 ? 120 : numAmountRaw
        : Math.round((numAmountRaw / rate) * 100) / 100;

    const numAmountRUB =
      currency === 'RUB'
        ? numAmountRaw
        : Math.round(numAmountEUR * rate);

    const formattedAmount = `${numAmountEUR.toLocaleString('ru-RU')} € (≈ ${numAmountRUB.toLocaleString('ru-RU')} ₽)`;
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
      courseName: targetCourseName,
      groupName: targetGroupName,
      amount: numAmountEUR,
      amountFormatted: formattedAmount,
      paymentDate: formattedDate,
      periodLabel,
      status,
      paymentMethod,
      currency: 'EUR',
      paymentType,
      recordedBy: 'Администратор',
      comment: comment || (paymentType === 'prepayment' ? 'Предоплата (списание по стоимости курса)' : autoRenewSubscription ? `Абонемент «${targetCourseName}» продлен` : undefined),
    };

    // 1. Persist to student storage
    const paymentRecordForStudent = {
      id: newPayment.id,
      date: formattedDate,
      period: periodLabel,
      amount: formattedAmount,
      method: methodLabel,
      status: status === 'paid' ? ('paid' as const) : ('expected' as const),
      currency: 'EUR',
      paymentType,
    };

    let interactionContent = `Внесена оплата ${formattedAmount} за период «${periodLabel}» (курс: ${targetCourseName}, способ: ${methodLabel}).`;
    let interactionResult = status === 'paid' ? 'Оплата получена' : 'Ожидается оплата';

    if (paymentType === 'prepayment') {
      interactionContent = `Внесена предоплата / депозит ${formattedAmount} на баланс курса «${targetCourseName}» (способ: ${methodLabel}).`;
      interactionResult = status === 'paid' ? 'Предоплата внесена' : 'Ожидается предоплата';
    } else if (paymentType === 'one_time') {
      interactionContent = `Внесена оплата ${formattedAmount} за разовое занятие по курсу «${targetCourseName}» (способ: ${methodLabel}).`;
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
      const newBal = Math.round((currentBalance + numAmountEUR) * 100) / 100;
      const lessonPrice = freshStudent.finance?.deposit?.pricePerLesson || 15;
      updatedDeposit = {
        balance: newBal,
        balanceFormatted: `${newBal.toLocaleString('ru-RU')} €`,
        currency: 'EUR',
        pricePerLesson: lessonPrice,
        pricePerLessonFormatted: `${lessonPrice.toLocaleString('ru-RU')} €`,
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
        name: `${targetCourseName} (${targetGroupName})`,
        period: periodLabel,
        price: String(numAmountEUR),
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

    if (status === 'paid') {
      settleOverduePayments(freshStudent.id, numAmountEUR, parent?.id);
      settleStudentOverdueDebts(freshStudent.id);
      settleDebtsFromDeposit(freshStudent.id);
      if (parent?.id) {
        settleFamilyDebtsFromFamilyDeposit(parent.id);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('crm-students-changed', { detail: updatedStudent }));
      window.dispatchEvent(new CustomEvent('crm-payments-changed', { detail: newPayment }));
    }

    if (onRecorded) {
      onRecorded(newPayment);
    }

    const notices: string[] = [];
    if (notifyOwner) notices.push('владельцу (Telegram)');
    if (notifyParent) notices.push(`родителям (${parentDisplayName} через ${parentChannel.toUpperCase()})`);

    const noticeMsg = notices.length > 0 ? ` Уведомления отправлены: ${notices.join(' и ')}.` : '';
    success(`Платёж ${newPayment.amountFormatted} зафиксирован!${noticeMsg}`);

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-xs">
      <div className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-xl flex flex-col">
        {/* COMPACT HEADER (No subtitle, clean paddings) */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CreditCard className="h-4 w-4" />
            </div>
            <h2 className="text-sm font-bold text-slate-900">Внесение оплаты</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 px-5 space-y-3 text-xs flex-1">
          {/* STUDENT & COURSE SELECTION */}
          <div className="space-y-2">
            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-0.5">
                Ученик / Студент *
              </label>
              {lockStudent ? (
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-800">
                  <Lock className="h-3.5 w-3.5 text-slate-400" />
                  <span>{selectedStudent?.firstName} {selectedStudent?.lastName}</span>
                  <span className="ml-auto text-[10px] font-normal text-slate-500">
                    {selectedStudent?.studentType === 'adult_student' ? 'Студент' : 'Школьник'}
                  </span>
                </div>
              ) : allowedStudents && allowedStudents.length > 0 ? (
                <select
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {allowedStudents.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              ) : (
                <select
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {allStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.firstName} {s.lastName} (Родитель: {s.parents[0]?.firstName || '—'})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Course / Group picker for multi-enrollment */}
            {studentGroups.length > 1 ? (
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-0.5">
                  Курс / Группа *
                </label>
                <select
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {studentGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.courseName || g.name} ({g.name}) — {g.teacherName || 'Преподаватель'}
                    </option>
                  ))}
                </select>
              </div>
            ) : studentGroups.length === 1 ? (
              <div className="flex items-center justify-between text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1.5">
                <span className="text-slate-400 text-[11px]">Курс:</span>
                <span className="font-bold text-slate-800">{targetCourseName}</span>
                <span className="text-[10px] text-slate-400 font-mono">({targetGroupName})</span>
              </div>
            ) : null}
          </div>

          {/* OVERDUE ALERTS (Compact) */}
          {totalOverdueForStudent > 0 && (
            <div className="rounded-xl border border-rose-200 bg-rose-50/90 p-2.5 text-xs space-y-1.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="font-semibold text-rose-900 flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                  Долг ученика: <strong className="text-rose-700">{totalOverdueForStudent.toLocaleString('ru-RU')} ₽</strong>
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {selectedStudentDeposit > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const res = settleDebtsFromDeposit(selectedStudent.id);
                        if (res.settled) {
                          success(`Списано ${res.settledAmount.toLocaleString('ru-RU')} ₽ с депозита!`);
                          onClose();
                        }
                      }}
                      className="rounded-lg bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-emerald-700 transition-colors shrink-0 cursor-pointer"
                    >
                      Списать с депозита
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setAmount(String(totalOverdueForStudent));
                      setPeriodLabel('Погашение задолженности');
                    }}
                    className="rounded-lg bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-rose-700 transition-colors shrink-0 cursor-pointer"
                  >
                    Внести долг
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* PAYMENT TYPE SELECTION */}
          <div>
            <label className="text-[11px] font-semibold text-slate-700 block mb-1">
              Назначение платежа
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => handlePaymentTypeChange('subscription')}
                className={cn(
                  'rounded-xl border p-2 text-left transition-all cursor-pointer',
                  paymentType === 'subscription'
                    ? 'border-emerald-500 bg-emerald-50/70 ring-1 ring-emerald-500 shadow-2xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                )}
              >
                <div className="text-[11px] font-bold text-slate-900">Абонемент</div>
                <div className="text-[9px] text-slate-500">За месяц</div>
              </button>

              <button
                type="button"
                onClick={() => handlePaymentTypeChange('prepayment')}
                className={cn(
                  'rounded-xl border p-2 text-left transition-all cursor-pointer',
                  paymentType === 'prepayment'
                    ? 'border-emerald-500 bg-emerald-50/70 ring-1 ring-emerald-500 shadow-2xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                )}
              >
                <div className="text-[11px] font-bold text-slate-900">Предоплата</div>
                <div className="text-[9px] text-slate-500">На депозит</div>
              </button>

              <button
                type="button"
                onClick={() => handlePaymentTypeChange('one_time')}
                className={cn(
                  'rounded-xl border p-2 text-left transition-all cursor-pointer',
                  paymentType === 'one_time'
                    ? 'border-emerald-500 bg-emerald-50/70 ring-1 ring-emerald-500 shadow-2xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                )}
              >
                <div className="text-[11px] font-bold text-slate-900">Разово</div>
                <div className="text-[9px] text-slate-500">1 занятие</div>
              </button>
            </div>
          </div>

          {/* CURRENCY INPUTS & DYNAMIC PRESETS */}
          <div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-slate-700 flex items-center justify-between">
                  <span>Сумма (₽)</span>
                  <span className="text-[9px] font-normal text-slate-400">1 € = {rate} ₽</span>
                </label>
                <div className="relative mt-0.5">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={amountRub}
                    onChange={(e) => handleRubInput(e.target.value)}
                    placeholder={String(Math.round(85 * rate))}
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 pr-7 text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <span className="absolute right-2.5 top-1.5 text-xs font-bold text-slate-400">₽</span>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 flex items-center justify-between">
                  <span>Сумма (€)</span>
                  <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded">База</span>
                </label>
                <div className="relative mt-0.5">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={amountEur}
                    onChange={(e) => handleEurInput(e.target.value)}
                    placeholder="85"
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 pr-7 text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <span className="absolute right-2.5 top-1.5 text-xs font-bold text-slate-400">€</span>
                </div>
              </div>
            </div>

            {/* DYNAMIC SMART PRESETS */}
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {paymentType === 'subscription' && (
                <>
                  <button
                    type="button"
                    onClick={() => setPresetAmount(75)}
                    className="rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 border border-slate-200/60 px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition-colors cursor-pointer"
                  >
                    4 занятия — 75 € (≈ {Math.round(75 * rate).toLocaleString('ru-RU')} ₽)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPresetAmount(140)}
                    className="rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 border border-slate-200/60 px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition-colors cursor-pointer"
                  >
                    8 занятий — 140 € (≈ {Math.round(140 * rate).toLocaleString('ru-RU')} ₽)
                  </button>
                </>
              )}
              {paymentType === 'one_time' && (
                <button
                  type="button"
                  onClick={() => setPresetAmount(personalRate)}
                  className="rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 border border-slate-200/60 px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition-colors cursor-pointer"
                >
                  1 занятие (персональная ставка) — {personalRate} € (≈ {Math.round(personalRate * rate).toLocaleString('ru-RU')} ₽)
                </button>
              )}
              {paymentType === 'prepayment' && (
                <>
                  {[50, 100, 150].map((eur) => (
                    <button
                      key={eur}
                      type="button"
                      onClick={() => setPresetAmount(eur)}
                      className="rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 border border-slate-200/60 px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition-colors cursor-pointer"
                    >
                      +{eur} € (≈ {Math.round(eur * rate).toLocaleString('ru-RU')} ₽)
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* TRAINING PERIOD SELECTION (ONLY FOR SUBSCRIPTION) */}
          {paymentType === 'subscription' && (
            <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-800">
                  Период обучения (Абонемент)
                </label>
                <span className="text-[9px] text-emerald-700 font-semibold">Выбор в 1 клик</span>
              </div>

              {/* 1-Click Quick Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMonth(currentMonthName);
                    setSelectedYear(currentYearStr);
                  }}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer border',
                    selectedMonth === currentMonthName && selectedYear === currentYearStr
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-50 hover:text-emerald-800'
                  )}
                >
                  Текущий: {currentMonthName} {currentYearStr}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMonth(nextMonthName);
                    setSelectedYear(nextYearStr);
                  }}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer border',
                    selectedMonth === nextMonthName && selectedYear === nextYearStr
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-50 hover:text-emerald-800'
                  )}
                >
                  Следующий: {nextMonthName} {nextYearStr}
                </button>
              </div>

              {/* Month and Year Dropdowns */}
              <div className="grid grid-cols-2 gap-2 pt-0.5">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {ALL_MONTHS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {[2025, 2026, 2027, 2028].map((y) => (
                    <option key={y} value={String(y)}>{y} г.</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* PAYMENT METHOD & STATUS */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Способ оплаты</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as 'card' | 'bank_transfer' | 'cash' | 'invoice')}
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none"
              >
                <option value="card">Банковская карта</option>
                <option value="bank_transfer">Перевод по СБП</option>
                <option value="cash">Наличные</option>
                <option value="invoice">Безналичный счет (ООО/ИП)</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Статус платежа</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'paid' | 'expected' | 'overdue')}
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none"
              >
                <option value="paid">Оплачено (Деньги поступили)</option>
                <option value="expected">Ожидается (Счет выставлен)</option>
              </select>
            </div>
          </div>

          {/* PAYMENT DATE & COMMENT (SLIM ROW) */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Дата платежа</label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Комментарий</label>
              <input
                type="text"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="№ квитанции, примечание..."
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {paymentType === 'subscription' && (
            <div className="rounded-lg bg-emerald-50/70 p-2 border border-emerald-200/60">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-emerald-900">
                <input
                  type="checkbox"
                  checked={autoRenewSubscription}
                  onChange={(e) => setAutoRenewSubscription(e.target.checked)}
                  className="rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>Автоматически продлить абонемент «{targetCourseName}»</span>
              </label>
            </div>
          )}

          {/* COMPACT NOTIFICATIONS BAR */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-2 px-3 flex items-center justify-between gap-2 text-xs flex-wrap">
            <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={notifyOwner}
                onChange={(e) => setNotifyOwner(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Оповестить владельца</span>
            </label>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={notifyParent}
                  onChange={(e) => setNotifyParent(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>Чек родителю</span>
              </label>
              {notifyParent && (
                <select
                  value={parentChannel}
                  onChange={(e) => setParentChannel(e.target.value as any)}
                  className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-bold text-slate-800 focus:outline-none"
                >
                  <option value="telegram">Telegram</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="sms">SMS</option>
                  <option value="email">Email</option>
                </select>
              )}
            </div>
          </div>

          {/* FOOTER ACTIONS */}
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition-colors cursor-pointer"
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
