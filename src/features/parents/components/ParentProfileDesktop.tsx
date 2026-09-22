'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  Phone,
  Plus,
  CheckSquare,
  Edit,
  UserPlus,
  Trash2,
  MoreHorizontal,
  Mail,
  Send,
  AlertTriangle,
  Clock,
  Wallet,
  CheckCircle2,
  Check,
  Calendar,
  Users,
  ChevronDown,
  Copy
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { INITIAL_GROUPS, INITIAL_TEACHERS } from '@/lib/data/mockData';
import { getStoredGroups } from '@/lib/data/groupStorage';
import { useToast } from '@/context/ToastContext';

const WhatsAppIcon = ({ className = 'w-3.5 h-3.5' }: { className?: string }) => (
  <svg className={cn('fill-current', className)} viewBox="0 0 24 24">
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
  </svg>
);

const TelegramIcon = ({ className = 'w-3.5 h-3.5' }: { className?: string }) => (
  <svg className={cn('fill-current', className)} viewBox="0 0 24 24">
    <path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.121l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.536-.196 1.006.128.833.942z" />
  </svg>
);

export interface ParentProfileDesktopProps {
  parent: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    telegram?: string;
    whatsapp?: string;
    email?: string;
    relationshipType?: string;
    preferredChannel?: string;
    notifyWhatsapp?: boolean;
    notifyTelegram?: boolean;
    notifyEmail?: boolean;
    notes?: string;
    children: Array<{
      id: string;
      name: string;
      age?: string;
      group?: string;
      course?: string;
      teacher?: string;
      groups?: Array<any>;
      status?: string;
      attendance?: string;
      studentType?: string;
    }>;
  };
  familySummary: {
    formattedDeposit: string;
    formattedDebt: string;
    formattedNet: string;
    breakdownSummary: string;
    deposit: number;
    debt: number;
  };
  upcomingPaymentAlert: any | null;
  role: string;
  onOpenPaymentModal: () => void;
  onOpenCreateTaskModal: () => void;
  onOpenEditParentModal: () => void;
  onOpenLinkChildModal: () => void;
  onDeleteParent: () => void;
  onSelectTab: (tabKey: string) => void;
  onSendReminder: (channel: 'whatsapp' | 'telegram') => void;
}

export function ParentProfileDesktop({
  parent,
  familySummary,
  upcomingPaymentAlert,
  role,
  onOpenPaymentModal,
  onOpenCreateTaskModal,
  onOpenEditParentModal,
  onOpenLinkChildModal,
  onDeleteParent,
  onSelectTab,
  onSendReminder,
}: ParentProfileDesktopProps) {
  const [isMoreDropdownOpen, setIsMoreDropdownOpen] = useState(false);
  const [isReminderDropdownOpen, setIsReminderDropdownOpen] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedReminder, setCopiedReminder] = useState(false);
  const { success } = useToast();
  const moreRef = useRef<HTMLDivElement>(null);
  const reminderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) {
        setIsMoreDropdownOpen(false);
      }
      if (reminderRef.current && !reminderRef.current.contains(event.target as Node)) {
        setIsReminderDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopyEmail = (emailStr: string) => {
    if (!emailStr) return;
    navigator.clipboard.writeText(emailStr);
    setCopiedEmail(true);
    success('Email скопирован в буфер обмена');
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleOpenGmail = (emailStr: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!emailStr) return;
    window.open(
      `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(emailStr)}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const phoneClean = (parent.phone || '').replace(/\D/g, '');
  const telegramClean = (parent.telegram || '').replace('@', '');
  const whatsappClean = (parent.whatsapp ? parent.whatsapp.replace(/\D/g, '') : phoneClean);

  // Build reminder text template for all send channels
  const buildReminderText = () => {
    const parentName = parent.firstName;
    const childName = upcomingPaymentAlert?.studentName || parent.children[0]?.name || 'вашего ребёнка';
    const courseName = parent.children[0]?.course || parent.children[0]?.group || 'курса';
    const amount = upcomingPaymentAlert?.amountFormatted || familySummary.formattedDebt || 'уточнить сумму';
    const dueDate = upcomingPaymentAlert?.dueDate || upcomingPaymentAlert?.dueDateStr || '28.09.2026';
    const paymentUrl = 'https://youeuropecrmtest.vercel.app';
    return { parentName, childName, courseName, amount, dueDate, paymentUrl };
  };

  const handleSendWhatsApp = () => {
    const { parentName, childName, courseName, amount, dueDate, paymentUrl } = buildReminderText();
    const text = `Здравствуйте, ${parentName}! Напоминаем о плановом сроке оплаты обучения (${courseName}) для ${childName} на сумму ${amount} до ${dueDate}. Ссылка для оплаты: ${paymentUrl}`;
    window.open(`https://wa.me/${whatsappClean}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
    setIsReminderDropdownOpen(false);
  };

  const handleSendTelegram = () => {
    const { parentName, childName, courseName, amount, dueDate, paymentUrl } = buildReminderText();
    const text = `Здравствуйте, ${parentName}! Напоминаем о плановом сроке оплаты обучения (${courseName}) для ${childName} на сумму ${amount} до ${dueDate}. Ссылка для оплаты: ${paymentUrl}`;
    if (telegramClean) {
      window.open(`https://t.me/${telegramClean}`, '_blank', 'noopener,noreferrer');
    } else {
      window.open(`https://wa.me/${whatsappClean}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
    }
    setIsReminderDropdownOpen(false);
  };

  const handleSendEmail = () => {
    const { parentName, childName, courseName, amount, dueDate, paymentUrl } = buildReminderText();
    const parentEmail = parent.email || '';
    if (!parentEmail) {
      success('Email родителя не указан в профиле');
      setIsReminderDropdownOpen(false);
      return;
    }
    const subject = encodeURIComponent(`Счет на оплату обучения: ${courseName} (${childName})`);
    const body = encodeURIComponent(
      `Здравствуйте, ${parentName}!\n\n` +
      `Направляем информацию о плановом сроке оплаты обучения по курсу "${courseName}" для ${childName}.\n` +
      `Сумма к оплате: ${amount} до ${dueDate}.\n\n` +
      `Ссылка для быстрой онлайн-оплаты: ${paymentUrl}\n\n` +
      `С уважением,\nКоманда школы YouEurope`
    );
    window.open(
      `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(parentEmail)}&su=${subject}&body=${body}`,
      '_blank',
      'noopener,noreferrer'
    );
    setIsReminderDropdownOpen(false);
  };

  const handleCopyReminderText = () => {
    const { parentName, childName, courseName, amount, dueDate, paymentUrl } = buildReminderText();
    const text = `Здравствуйте, ${parentName}! Напоминаем о плановом сроке оплаты обучения (${courseName}) для ${childName} на сумму ${amount} до ${dueDate}. Ссылка для оплаты: ${paymentUrl}`;
    navigator.clipboard.writeText(text);
    setCopiedReminder(true);
    success('Текст счёта скопирован');
    setTimeout(() => setCopiedReminder(false), 2000);
    setIsReminderDropdownOpen(false);
  };

  const isWhatsAppActive = parent.notifyWhatsapp !== false;
  const isTelegramActive = parent.notifyTelegram !== false;
  const isEmailActive = parent.notifyEmail !== false;

  const initials = `${parent.firstName?.[0] || 'Р'}${parent.lastName?.[0] || ''}`.toUpperCase();

  // Average family attendance calculation
  const attendanceValues = parent.children.map((c) => {
    const raw = c.attendance || '100%';
    return parseInt(raw.replace(/\D/g, ''), 10) || 100;
  });
  const avgAttendance = attendanceValues.length > 0
    ? Math.round(attendanceValues.reduce((a, b) => a + b, 0) / attendanceValues.length)
    : 100;

  const storedGroups = typeof window !== 'undefined' ? getStoredGroups() : INITIAL_GROUPS;

  return (
    <div className="hidden md:block w-full space-y-4">
      {/* LEVEL 1: Identification & Action Bar Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between gap-6">
          {/* Left: Parent Identity */}
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xl flex items-center justify-center shadow-sm border border-blue-400/20 shrink-0">
              {initials}
            </div>

            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900 truncate">
                  {parent.firstName} {parent.lastName}
                </h1>
                <span className="rounded-full px-2.5 py-0.5 font-semibold text-[11px] border bg-emerald-50 text-emerald-700 border-emerald-200">
                  Активен
                </span>
                <span className="rounded-full px-2.5 py-0.5 font-semibold text-[11px] border bg-slate-100 text-slate-700 border-slate-200">
                  {parent.relationshipType || 'Представитель'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                {parent.phone && (
                  <div className="flex items-center gap-1.5 min-w-0">
                    <a
                      href={phoneClean ? `tel:${phoneClean}` : '#'}
                      className="inline-flex items-center gap-1 text-slate-700 hover:text-blue-600 hover:underline font-mono text-[11px] font-semibold"
                    >
                      <Phone className="h-3 w-3 text-slate-400" />
                      {parent.phone}
                    </a>
                    <div className="flex items-center gap-1 shrink-0">
                      {/* WhatsApp Icon */}
                      {isWhatsAppActive ? (
                        <a
                          href={phoneClean ? `https://wa.me/${whatsappClean}` : '#'}
                          target="_blank"
                          rel="noreferrer"
                          className="w-5 h-5 rounded bg-[#25D366]/10 hover:bg-[#25D366] text-[#25D366] hover:text-white flex items-center justify-center transition-all border border-[#25D366]/20 cursor-pointer"
                          title={`WhatsApp: уведомления включены${parent.preferredChannel === 'WhatsApp' ? ' (основной канал)' : ''}`}
                        >
                          <WhatsAppIcon className="w-3 h-3" />
                        </a>
                      ) : (
                        <span
                          className="w-5 h-5 rounded bg-slate-100 text-slate-400 border border-slate-200 opacity-60 flex items-center justify-center transition-all cursor-not-allowed"
                          title="WhatsApp: канал отключен родителем"
                        >
                          <WhatsAppIcon className="w-3 h-3" />
                        </span>
                      )}

                      {/* Telegram Icon */}
                      {isTelegramActive ? (
                        <a
                          href={telegramClean ? `https://t.me/${telegramClean}` : (phoneClean ? `https://wa.me/${whatsappClean}` : '#')}
                          target="_blank"
                          rel="noreferrer"
                          className="w-5 h-5 rounded bg-[#229ED9]/10 hover:bg-[#229ED9] text-[#229ED9] hover:text-white flex items-center justify-center transition-all border border-[#229ED9]/20 cursor-pointer"
                          title={`Telegram: уведомления включены${parent.preferredChannel === 'Telegram' ? ' (основной канал)' : ''}`}
                        >
                          <TelegramIcon className="w-3 h-3" />
                        </a>
                      ) : (
                        <span
                          className="w-5 h-5 rounded bg-slate-100 text-slate-400 border border-slate-200 opacity-60 flex items-center justify-center transition-all cursor-not-allowed"
                          title="Telegram: канал отключен родителем"
                        >
                          <TelegramIcon className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {parent.email && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopyEmail(parent.email!)}
                      className="inline-flex items-center gap-1 text-slate-600 hover:text-blue-600 hover:underline transition-colors cursor-pointer text-[11px] font-medium"
                      title="Нажмите, чтобы скопировать email"
                    >
                      {copiedEmail ? (
                        <Check className="h-3 w-3 text-emerald-600" />
                      ) : (
                        <Mail className="h-3 w-3 text-slate-400" />
                      )}
                      <span>{parent.email}</span>
                    </button>
                    {isEmailActive ? (
                      <button
                        type="button"
                        onClick={(e) => handleOpenGmail(parent.email!, e)}
                        className="w-5 h-5 rounded bg-rose-50 hover:bg-rose-500 text-rose-600 hover:text-white flex items-center justify-center transition-colors border border-rose-200 cursor-pointer"
                        title={`Email: уведомления включены${parent.preferredChannel === 'Email' ? ' (основной канал)' : ''}`}
                      >
                        <Mail className="w-3 h-3" />
                      </button>
                    ) : (
                      <span
                        className="w-5 h-5 rounded bg-slate-100 text-slate-400 border border-slate-200 opacity-60 flex items-center justify-center transition-all cursor-not-allowed"
                        title="Email: канал отключен родителем"
                      >
                        <Mail className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Action Hierarchy Bar */}
          <div className="flex items-center gap-2 shrink-0">
            {role !== 'teacher' && (
              <button
                type="button"
                onClick={onOpenPaymentModal}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                Внести оплату
              </button>
            )}

            <button
              type="button"
              onClick={onOpenCreateTaskModal}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <CheckSquare className="h-3.5 w-3.5 text-slate-500" />
              Задача
            </button>

            {/* Unified reminder dropdown */}
            <div className="relative shrink-0" ref={reminderRef}>
              <button
                type="button"
                onClick={() => setIsReminderDropdownOpen(!isReminderDropdownOpen)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <Send className="h-3.5 w-3.5 text-blue-600" />
                Напомнить об оплате
                <ChevronDown className={cn('w-3.5 h-3.5 transition-transform duration-150', isReminderDropdownOpen && 'rotate-180')} />
              </button>

              {isReminderDropdownOpen && (
                <div className="absolute right-0 mt-2 z-50 w-56 rounded-xl bg-white p-1.5 shadow-xl border border-slate-200 text-xs animate-in fade-in duration-100">
                  <button
                    type="button"
                    onClick={handleSendWhatsApp}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-700 hover:bg-[#25D366]/10 transition-colors font-medium cursor-pointer"
                  >
                    <WhatsAppIcon className="w-3.5 h-3.5 text-[#25D366]" />
                    <span>В WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSendTelegram}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-700 hover:bg-[#229ED9]/10 transition-colors font-medium cursor-pointer"
                  >
                    <TelegramIcon className="w-3.5 h-3.5 text-[#229ED9]" />
                    <span>В Telegram</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSendEmail}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-700 hover:bg-rose-50 transition-colors font-medium cursor-pointer"
                  >
                    <Mail className="w-3.5 h-3.5 text-rose-500" />
                    <span className="flex-1 text-left">На Email (Gmail)</span>
                    {!parent.email && (
                      <span className="text-[10px] text-slate-400 italic">нет email</span>
                    )}
                  </button>

                  <div className="my-1 border-t border-slate-100" />

                  <button
                    type="button"
                    onClick={handleCopyReminderText}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors font-medium cursor-pointer"
                  >
                    {copiedReminder ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                    )}
                    <span>{copiedReminder ? 'Скопировано!' : 'Скопировать текст и ссылку'}</span>
                  </button>
                </div>
              )}
            </div>

            <div className="relative" ref={moreRef}>
              <button
                type="button"
                onClick={() => setIsMoreDropdownOpen(!isMoreDropdownOpen)}
                className="inline-flex items-center justify-center h-9 w-9 rounded-xl border border-slate-200 bg-white text-slate-600 shadow-xs hover:bg-slate-50 transition-colors cursor-pointer"
                title="Дополнительные действия"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>

              {isMoreDropdownOpen && (
                <div className="absolute right-0 mt-2 z-50 w-52 rounded-xl bg-white p-1.5 shadow-xl border border-slate-200 text-xs animate-in fade-in duration-100">
                  <button
                    type="button"
                    onClick={() => { setIsMoreDropdownOpen(false); onOpenLinkChildModal(); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors font-medium cursor-pointer"
                  >
                    <UserPlus className="h-3.5 w-3.5 text-blue-600" />
                    <span>Привязать ребенка</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setIsMoreDropdownOpen(false); onOpenEditParentModal(); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors font-medium cursor-pointer"
                  >
                    <Edit className="h-3.5 w-3.5 text-blue-600" />
                    <span>Редактировать</span>
                  </button>

                  {role !== 'teacher' && (
                    <>
                      <div className="my-1 border-t border-slate-100" />
                      <button
                        type="button"
                        onClick={() => { setIsMoreDropdownOpen(false); onDeleteParent(); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors font-medium cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                        <span>Удалить</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SMART PAYMENT REMINDER BANNER — unified send dropdown */}
      {upcomingPaymentAlert && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
              <Clock className="h-4 w-4" />
            </div>
            <div className="min-w-0 text-xs">
              <span className="font-bold text-blue-900 block truncate">
                ⏰ Плановый срок оплаты: {upcomingPaymentAlert.period || upcomingPaymentAlert.statusLabel || 'Оплата обучения'} • Сумма: {upcomingPaymentAlert.amountFormatted} до {upcomingPaymentAlert.dueDate || upcomingPaymentAlert.dueDateStr || '28.09.2026'}.
              </span>
              <span className="text-slate-600 text-[11px] truncate block">
                Отправьте родителям напоминание об оплате в один клик.
              </span>
            </div>
          </div>

          {/* Banner reminder action button */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={handleCopyReminderText}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              {copiedReminder ? (
                <Check className="w-3.5 h-3.5 text-white" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-white" />
              )}
              <span>{copiedReminder ? 'Скопировано!' : 'Скопировать напоминание'}</span>
            </button>
          </div>
        </div>
      )}

      {/* LEVEL 2: 4-Column KPI Widget */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs grid grid-cols-4 gap-4 divide-x divide-slate-100">
        {/* Column 1: ДЕТИ */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              ДЕТИ ({parent.children.length})
            </span>
            <button
              type="button"
              onClick={onOpenLinkChildModal}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              Добавить ребенка
            </button>
          </div>
          {parent.children.length > 0 ? (
            <div className="space-y-1.5 pt-0.5">
              {parent.children.map((c) => (
                <div key={c.id} className="min-w-0">
                  <Link
                    href={`/students/${c.id}`}
                    className="text-xs font-bold text-slate-900 hover:text-blue-600 hover:underline block truncate"
                  >
                    {c.name}
                  </Link>
                  <span className="text-[11px] text-slate-400 block truncate">
                    {c.studentType || 'Школьник'} • {c.age || '14 лет'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="pt-1">
              <span className="text-xs text-slate-400 font-medium block">— Нет детей</span>
              <button
                type="button"
                onClick={onOpenLinkChildModal}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-blue-200 bg-blue-50/50 px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Добавить ребенка
              </button>
            </div>
          )}
        </div>

        {/* Column 2: КУРСЫ */}
        <div className="pl-4 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            {parent.children.some((c) => (c.groups?.length || 0) > 1) || parent.children.length > 1 ? 'КУРСЫ И ГРУППЫ' : 'КУРС И ГРУППА'}
          </span>
          {parent.children.length > 0 ? (
            <div className="space-y-2">
              {parent.children.map((c) => {
                const childGroups = (c.groups && c.groups.length > 0)
                  ? c.groups
                  : [{ id: '1', name: c.group || 'English B1 Teens', teacherName: c.teacher || 'Мария Иванова' }];

                return (
                  <div key={c.id} className="space-y-1.5">
                    {childGroups.map((grp: any, gIdx: number) => {
                      const rawName = grp.name || grp.courseName || 'English B1 Teens';
                      const groupName = rawName.split(' (')[0];
                      const groupObj = storedGroups.find((g) => g.id === grp.id || g.name === grp.name || g.name === groupName) || { id: grp.id || '1', name: groupName };
                      const teacherName = grp.teacherName || c.teacher || 'Мария Иванова';
                      const targetTeacher = INITIAL_TEACHERS.find((t) => t.name === teacherName || t.id === grp.teacherId) || INITIAL_TEACHERS[0];

                      return (
                        <div key={grp.id || gIdx} className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <Link
                              href={`/groups/${groupObj.id}`}
                              className="text-xs font-bold text-slate-900 hover:text-blue-600 hover:underline block truncate"
                            >
                              {groupName}
                            </Link>
                            {parent.children.length > 1 && (
                              <span className="text-[10px] text-slate-400 shrink-0 font-normal">
                                ({c.name.split(' ')[0]})
                              </span>
                            )}
                          </div>
                          <Link
                            href={`/teachers/${targetTeacher.id}`}
                            className="text-[11px] text-slate-500 hover:text-blue-600 hover:underline block truncate"
                          >
                            Преподаватель: {teacherName}
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ) : (
            <span className="text-xs text-slate-400 font-medium block mt-1">— Без группы</span>
          )}
        </div>

        {/* Column 3: СР. ПОСЕЩАЕМОСТЬ */}
        <div
          onClick={() => onSelectTab('children')}
          className="pl-4 space-y-1 cursor-pointer hover:bg-slate-50/60 p-1 -m-1 rounded-xl transition-colors group"
          title="Перейти к списку детей и расписанию"
        >
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block group-hover:text-blue-600">
            СР. ПОСЕЩАЕМОСТЬ
          </span>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'text-sm font-extrabold',
                avgAttendance >= 90
                  ? 'text-emerald-600'
                  : avgAttendance >= 70
                  ? 'text-amber-600'
                  : 'text-rose-600'
              )}
            >
              {avgAttendance}%
            </span>
            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  avgAttendance >= 90
                    ? 'bg-emerald-500'
                    : avgAttendance >= 70
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                )}
                style={{ width: `${Math.min(avgAttendance, 100)}%` }}
              />
            </div>
          </div>
          <span className="text-[10px] text-slate-400 block">Посещено уроков по семье</span>
        </div>

        {/* Column 4: БАЛАНС СЕМЬИ — badge shows ✓ Оплачено without nested parens */}
        <div
          onClick={() => role !== 'teacher' && onSelectTab('finance')}
          className={cn(
            "pl-4 space-y-1 p-1 -m-1 rounded-xl transition-colors group",
            role !== 'teacher' ? "cursor-pointer hover:bg-slate-50/60" : "cursor-default"
          )}
          title={role !== 'teacher' ? "Перейти к финансам" : "Доступ к финансам ограничен"}
        >
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block group-hover:text-blue-600">
            БАЛАНС СЕМЬИ
          </span>
          {role === 'teacher' ? (
            <>
              <span className="bg-slate-100 text-slate-600 border border-slate-200 text-xs font-semibold px-2 py-0.5 rounded-lg inline-block">
                Обучение активно
              </span>
              <div className="text-[11px] text-slate-400 italic block">
                Финансы скрыты
              </div>
            </>
          ) : (
            <>
              {familySummary.debt > 0 ? (
                <span className="bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold px-2 py-0.5 rounded-lg inline-block">
                  ⚠ Долг: {familySummary.formattedDebt}
                </span>
              ) : (
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold px-2 py-0.5 rounded-lg inline-block">
                  ✓ Оплачено
                </span>
              )}
              <div className="text-[11px] text-slate-500 font-medium truncate">
                Депозит: {familySummary.formattedDeposit || '0 € (0 ₽)'}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
