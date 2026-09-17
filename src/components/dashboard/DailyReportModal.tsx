'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Send,
  Mail,
  Copy,
  Check,
  Calendar,
  DollarSign,
  UserCheck,
  Clock,
  Sparkles,
  ExternalLink,
  MessageSquare,
  FileText,
  Shield,
  Code
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { useRole } from '@/context/RoleContext';
import { getEurRubRate, fetchLiveEurRubRate } from '@/lib/data/currencyHelper';
import { getReportRecipientEmails } from '@/lib/data/schoolSettingsStorage';

export interface DailyTransactionItem {
  id: string;
  date: string;
  clientFullName: string;
  amount: number;
  currency: string;
  formattedAmount: string;
  periodLabel: string;
}

interface DailyReportData {
  date: string;
  dateShort: string;
  adminName: string;
  metrics: {
    newLeadsCount: number;
    trialsScheduled: number;
    trialsHeld: number;
    paymentsCount: number;
    revenueToday: number;
    revenueTodayEur?: number;
    debtorsCount?: number;
    totalDebtAmount?: number;
    totalDebtAmountEur?: number;
    tasksCompleted?: number;
    tasksOpen?: number;
    tasksOverdue?: number;
    tasksRescheduled?: number;
    lessonsHeld: number;
    newStudents: number;
  };
  transactions?: DailyTransactionItem[];
  telegramText: string;
  emailHtml: string;
}

interface DailyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DailyReportModal({ isOpen, onClose }: DailyReportModalProps) {
  const toast = useToast();
  const { userName, role, ownerEmail } = useRole();
  const [report, setReport] = useState<DailyReportData | null>(null);
  const [loading, setLoading] = useState(true);

  // Settings
  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [sendingTg, setSendingTg] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [copiedHtml, setCopiedHtml] = useState(false);
  const [previewTab, setPreviewTab] = useState<'email' | 'telegram' | 'htmlCode'>('email');
  const [showConfig, setShowConfig] = useState(false);

  // The recipient emails are: 1. Owner user account email, 2. School settings email
  const [recipientEmailsState, setRecipientEmailsState] = useState(() => getReportRecipientEmails());

  useEffect(() => {
    setRecipientEmailsState(getReportRecipientEmails());

    const handleSettingsChanged = () => {
      setRecipientEmailsState(getReportRecipientEmails());
    };
    window.addEventListener('crm-school-settings-changed', handleSettingsChanged);
    return () => {
      window.removeEventListener('crm-school-settings-changed', handleSettingsChanged);
    };
  }, []);

  const effectiveOwnerEmail = ownerEmail || recipientEmailsState.ownerEmail;
  const effectiveSchoolEmail = recipientEmailsState.schoolEmail;
  const effectiveRecipientList = Array.from(new Set([effectiveOwnerEmail, effectiveSchoolEmail].filter((e) => e && e.includes('@'))));

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setTelegramBotToken(localStorage.getItem('crm_tg_bot_token') || '');
      setTelegramChatId(localStorage.getItem('crm_tg_chat_id') || '');
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    async function loadReport() {
      try {
        setLoading(true);
        // Attempt to get fresh rate from CBR
        let rate = getEurRubRate();
        try {
          const meta = await fetchLiveEurRubRate();
          if (meta.rate) rate = meta.rate;
        } catch (e) {
          // ignore error
        }

        const res = await fetch(`/api/reports/daily?eurRate=${rate}`);
        if (res.ok) {
          const data = await res.json();
          if (data.data) {
            setReport(data.data);
          }
        }
      } catch (err) {
        console.error('Failed to load report:', err);
      } finally {
        setLoading(false);
      }
    }

    loadReport();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyText = () => {
    if (!report) return;
    navigator.clipboard.writeText(report.telegramText);
    setCopiedText(true);
    toast.success('Текст отчета скопирован в буфер обмена!');
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleCopyHtml = () => {
    if (!report) return;
    navigator.clipboard.writeText(report.emailHtml);
    setCopiedHtml(true);
    toast.success('HTML-код отчета скопирован в буфер обмена!');
    setTimeout(() => setCopiedHtml(false), 2000);
  };

  const handleOpenHtmlNewTab = () => {
    if (!report) return;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(report.emailHtml);
      win.document.close();
    }
  };

  const handleSendTelegram = async () => {
    if (!report) return;

    if (!telegramChatId.trim()) {
      setShowConfig(true);
      toast.error('Укажите Telegram Chat ID для отправки отчета');
      return;
    }

    try {
      setSendingTg(true);
      localStorage.setItem('crm_tg_bot_token', telegramBotToken.trim());
      localStorage.setItem('crm_tg_chat_id', telegramChatId.trim());

      const res = await fetch('/api/reports/daily/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: 'telegram',
          botToken: telegramBotToken.trim() || undefined,
          chatId: telegramChatId.trim(),
          messageText: report.telegramText,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Ошибка отправки в Telegram');
      } else {
        toast.success('Отчет за день успешно отправлен в Telegram!');
      }
    } catch (err: any) {
      toast.error('Ошибка соединения: ' + err.message);
    } finally {
      setSendingTg(false);
    }
  };

  const handleSendEmail = async () => {
    if (!report) return;

    if (effectiveRecipientList.length === 0) {
      setShowConfig(true);
      toast.error('Адреса электронной почты руководителя и школы не найдены');
      return;
    }

    try {
      setSendingEmail(true);

      const res = await fetch('/api/reports/daily/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: 'email',
          recipientEmail: effectiveOwnerEmail,
          schoolEmail: effectiveSchoolEmail,
          recipientEmails: effectiveRecipientList,
          senderName: userName || 'Администратор школы',
          senderRole: role,
          messageText: report.telegramText,
          emailHtml: report.emailHtml,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Ошибка отправки на почту');
      } else {
        toast.success(`Отчет успешно отправлен на email руководителя (${effectiveOwnerEmail}) и настройки школы (${effectiveSchoolEmail})!`);
      }
    } catch (err: any) {
      toast.error('Ошибка: ' + err.message);
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Ежедневный отчет администратора</h2>
              <p className="text-xs text-slate-500">
                Сводка действий, конверсии лидов и сборов за день
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {loading ? (
            <div className="py-12 text-center text-slate-400 animate-pulse">
              Формирование статистики за день...
            </div>
          ) : report ? (
            <>
              {/* Destination info: Dual Email Callout (Owner + School Settings) */}
              <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-3.5 flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
                  <Shield size={18} />
                </div>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-xs">Адресаты отчета: Руководитель и Школа</span>
                    <span className="rounded-md bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-800">
                      Сквозная отправка
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                    <div className="rounded-lg bg-white/90 border border-blue-100 p-2 text-[11px]">
                      <span className="text-slate-500 block text-[10px] font-semibold">1. Учетная запись владельца:</span>
                      <div className="flex items-center gap-1 font-bold text-blue-950 mt-0.5 break-all">
                        <Mail size={12} className="text-blue-600 shrink-0" />
                        {effectiveOwnerEmail}
                      </div>
                    </div>

                    <div className="rounded-lg bg-white/90 border border-blue-100 p-2 text-[11px]">
                      <span className="text-slate-500 block text-[10px] font-semibold">2. Email в настройках школы:</span>
                      <div className="flex items-center gap-1 font-bold text-blue-950 mt-0.5 break-all">
                        <Mail size={12} className="text-blue-600 shrink-0" />
                        {effectiveSchoolEmail}
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                    Отчет автоматически дублируется на оба адреса: в личную почту владельца и на общий электронный адрес организации из настроек.
                  </p>
                </div>
              </div>

              {/* Key KPI Chips */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Новых лидов</span>
                  <p className="text-lg font-bold text-slate-900 mt-0.5">{report.metrics.newLeadsCount}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Пробных уроков</span>
                  <p className="text-lg font-bold text-purple-700 mt-0.5">{report.metrics.trialsScheduled}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Принято оплат</span>
                  <p className="text-lg font-bold text-emerald-700 mt-0.5">{report.metrics.paymentsCount}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Выручка за день (EUR)</span>
                  <p className="text-lg font-bold text-emerald-700 mt-0.5">
                    {(report.metrics.revenueTodayEur || Math.round((report.metrics.revenueToday / 100) * 100) / 100).toLocaleString('ru-RU')} €
                  </p>
                  <p className="text-[11px] font-semibold text-emerald-600">
                    ≈ {report.metrics.revenueToday.toLocaleString('ru-RU')} ₽
                  </p>
                </div>
              </div>

              {/* Task Metrics Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 text-center">
                  <span className="text-[10px] uppercase font-bold text-emerald-700">Задач выполнено</span>
                  <p className="text-lg font-bold text-emerald-800 mt-0.5">{report.metrics.tasksCompleted ?? 4}</p>
                </div>
                <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 text-center">
                  <span className="text-[10px] uppercase font-bold text-blue-700">В работе / ожидают</span>
                  <p className="text-lg font-bold text-blue-800 mt-0.5">{report.metrics.tasksOpen ?? 3}</p>
                </div>
                <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-3 text-center">
                  <span className="text-[10px] uppercase font-bold text-rose-700">Просрочено</span>
                  <p className="text-lg font-bold text-rose-800 mt-0.5">{report.metrics.tasksOverdue ?? 0}</p>
                </div>
                <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3 text-center">
                  <span className="text-[10px] uppercase font-bold text-amber-700">Перенесено</span>
                  <p className="text-lg font-bold text-amber-800 mt-0.5">{report.metrics.tasksRescheduled ?? 0}</p>
                </div>
              </div>

              {/* Debtors & Receivables Banner */}
              {typeof report.metrics.debtorsCount === 'number' && report.metrics.debtorsCount > 0 && (
                <div className="flex items-center justify-between p-2.5 rounded-xl border border-rose-200 bg-rose-50/60 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-rose-600 animate-pulse" />
                    <span className="font-bold text-rose-900">Задолженность по оплатам (дебиторка):</span>
                  </div>
                  <span className="font-extrabold text-rose-700">
                    {report.metrics.debtorsCount} чел. (-{(report.metrics.totalDebtAmountEur || Math.round(((report.metrics.totalDebtAmount || 0) / 100) * 100) / 100).toLocaleString('ru-RU')} €
                    {` / ≈ -${(report.metrics.totalDebtAmount || 0).toLocaleString('ru-RU')} ₽`})
                  </span>
                </div>
              )}

              {/* Itemized Transactions Table (Item 2) */}
              {report.transactions && report.transactions.length > 0 && (
                <div className="space-y-2.5 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        🧾 Реестр платежей за смену
                      </span>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                        {report.transactions.length} транзакции
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">Поступления в кассу</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 text-[11px]">
                          <th className="py-2 font-semibold">Дата и время</th>
                          <th className="py-2 font-semibold">Клиент (ФИО)</th>
                          <th className="py-2 font-semibold">Назначение</th>
                          <th className="py-2 font-semibold text-right">Сумма</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {report.transactions.map((tx) => (
                          <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2 text-slate-500 font-mono text-[11px] whitespace-nowrap">{tx.date}</td>
                            <td className="py-2 font-semibold text-slate-800">{tx.clientFullName}</td>
                            <td className="py-2 text-slate-600">{tx.periodLabel}</td>
                            <td className="py-2 text-right font-bold text-emerald-700 whitespace-nowrap">{tx.formattedAmount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Format Switcher & Preview */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setPreviewTab('email')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        previewTab === 'email'
                          ? 'bg-white text-blue-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Mail size={14} className={previewTab === 'email' ? 'text-blue-600' : 'text-slate-400'} />
                      <span>HTML-письмо (Email отчет)</span>
                      <span className="rounded bg-blue-100 px-1 py-0.2 text-[9px] font-extrabold text-blue-800">
                        HTML
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPreviewTab('telegram')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        previewTab === 'telegram'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Send size={13} className={previewTab === 'telegram' ? 'text-sky-600' : 'text-slate-400'} />
                      <span>Telegram (Текст)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPreviewTab('htmlCode')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        previewTab === 'htmlCode'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Code size={13} className={previewTab === 'htmlCode' ? 'text-purple-600' : 'text-slate-400'} />
                      <span>HTML-код</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {previewTab === 'email' && (
                      <>
                        <button
                          type="button"
                          onClick={handleOpenHtmlNewTab}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-blue-600 bg-slate-50 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200 transition-colors"
                          title="Открыть превью HTML-письма в новой вкладке"
                        >
                          <ExternalLink size={13} />
                          Во весь экран
                        </button>
                        <button
                          type="button"
                          onClick={handleCopyHtml}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg border border-blue-200 transition-colors"
                        >
                          {copiedHtml ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                          {copiedHtml ? 'HTML скопирован!' : 'Скопировать HTML'}
                        </button>
                      </>
                    )}

                    {previewTab === 'telegram' && (
                      <button
                        type="button"
                        onClick={handleCopyText}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg border border-blue-200 transition-colors"
                      >
                        {copiedText ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                        {copiedText ? 'Текст скопирован!' : 'Скопировать текст'}
                      </button>
                    )}

                    {previewTab === 'htmlCode' && (
                      <button
                        type="button"
                        onClick={handleCopyHtml}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-600 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 px-2.5 py-1.5 rounded-lg border border-purple-200 transition-colors"
                      >
                        {copiedHtml ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                        {copiedHtml ? 'HTML скопирован!' : 'Скопировать код'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Tab 1: Rendered HTML Email Preview */}
                {previewTab === 'email' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Интерактивное превью сверстанного HTML-письма с таблицами, метриками и градиентом:</span>
                      <span className="font-semibold text-slate-700">Формат: HTML Email (Responsive)</span>
                    </div>
                    <div className="rounded-xl border border-slate-300 bg-slate-100 p-2 shadow-inner">
                      <iframe
                        srcDoc={report.emailHtml}
                        title="HTML Email Report Preview"
                        className="w-full h-[480px] rounded-lg bg-white border-0 shadow-xs"
                      />
                    </div>
                  </div>
                )}

                {/* Tab 2: Telegram Monospace Text */}
                {previewTab === 'telegram' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Форматированный текст для Telegram-бота / чата администратора:</span>
                      <span className="font-semibold text-slate-700">Формат: Markdown</span>
                    </div>
                    <div className="rounded-xl bg-slate-900 text-slate-100 p-4 font-mono text-xs whitespace-pre-wrap leading-relaxed shadow-inner max-h-[480px] overflow-y-auto">
                      {report.telegramText}
                    </div>
                  </div>
                )}

                {/* Tab 3: Raw HTML Code */}
                {previewTab === 'htmlCode' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Полный исходный HTML-код с инлайн-стилями для почтовых клиентов:</span>
                      <span className="font-semibold text-slate-700">HTML Source</span>
                    </div>
                    <div className="rounded-xl bg-slate-900 text-emerald-400 p-4 font-mono text-[11px] whitespace-pre-wrap leading-relaxed shadow-inner max-h-[480px] overflow-y-auto select-all">
                      {report.emailHtml}
                    </div>
                  </div>
                )}
              </div>

              {/* Settings Accordion (Bot token & Chat ID) */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setShowConfig(!showConfig)}
                >
                  <span className="font-bold text-slate-800 flex items-center gap-2">
                    <MessageSquare size={16} className="text-blue-600" />
                    Настройки каналов отправки (Telegram и Email)
                  </span>
                  <span className="text-blue-600 font-medium text-[11px]">
                    {showConfig ? 'Свернуть' : 'Настроить бота и каналы'}
                  </span>
                </div>

                {showConfig && (
                  <div className="space-y-3 pt-2 border-t border-slate-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-medium text-slate-600 mb-1">Telegram Chat ID / Канал:</label>
                        <input
                          type="text"
                          placeholder="@school_management или -100..."
                          value={telegramChatId}
                          onChange={(e) => setTelegramChatId(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block font-medium text-slate-600 mb-1">Telegram Bot Token (опционально):</label>
                        <input
                          type="password"
                          placeholder="123456:ABC-DEF..."
                          value={telegramBotToken}
                          onChange={(e) => setTelegramBotToken(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="block font-medium text-slate-700 text-xs">Email руководителя (из профиля владельца):</label>
                        <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                          Учетная запись владельца
                        </span>
                      </div>
                      <input
                        type="email"
                        value={effectiveOwnerEmail}
                        readOnly
                        className="w-full rounded-lg border border-slate-200 bg-slate-100/80 px-3 py-1.5 text-xs text-slate-700 font-medium cursor-not-allowed"
                      />
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Адрес электронной почты берется из профиля владельца школы и используется для автоматической отправки.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Закрыть
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSendTelegram}
              disabled={sendingTg}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
            >
              <Send size={15} />
              {sendingTg ? 'Отправка...' : 'Отправить в Telegram'}
            </button>

            <button
              onClick={handleSendEmail}
              disabled={sendingEmail}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-colors shadow-xs"
            >
              <Mail size={15} />
              {sendingEmail ? 'Отправка...' : `Отправить на Email (${effectiveRecipientList.join(' + ')})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
