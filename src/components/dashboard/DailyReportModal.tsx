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
  FileText
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { useRole } from '@/context/RoleContext';

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
    lessonsHeld: number;
    newStudents: number;
  };
  telegramText: string;
  emailHtml: string;
}

interface DailyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DailyReportModal({ isOpen, onClose }: DailyReportModalProps) {
  const toast = useToast();
  const { userName } = useRole();
  const [report, setReport] = useState<DailyReportData | null>(null);
  const [loading, setLoading] = useState(true);

  // Settings
  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [sendingTg, setSendingTg] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setTelegramBotToken(localStorage.getItem('crm_tg_bot_token') || '');
      setTelegramChatId(localStorage.getItem('crm_tg_chat_id') || '');
      setRecipientEmail(localStorage.getItem('crm_report_email') || 'owner@school.ru');
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    async function loadReport() {
      try {
        setLoading(true);
        const res = await fetch('/api/reports/daily');
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

    if (!recipientEmail.trim()) {
      setShowConfig(true);
      toast.error('Укажите Email для отправки отчета');
      return;
    }

    try {
      setSendingEmail(true);
      localStorage.setItem('crm_report_email', recipientEmail.trim());

      const res = await fetch('/api/reports/daily/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: 'email',
          recipientEmail: recipientEmail.trim(),
          messageText: report.telegramText,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Ошибка отправки на почту');
      } else {
        toast.success(`Отчет отправлен на ${recipientEmail}!`);
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
        className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
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
                  <span className="text-[10px] uppercase font-bold text-slate-400">Выручка за день</span>
                  <p className="text-lg font-bold text-emerald-700 mt-0.5">
                    {report.metrics.revenueToday.toLocaleString('ru-RU')} ₽
                  </p>
                </div>
              </div>

              {/* Message preview */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-700">Текст отчета для отправки (Telegram / Email):</span>
                  <button
                    onClick={handleCopyText}
                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold"
                  >
                    {copiedText ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    {copiedText ? 'Скопировано!' : 'Скопировать текст'}
                  </button>
                </div>
                <div className="rounded-xl bg-slate-900 text-slate-100 p-4 font-mono text-xs whitespace-pre-wrap leading-relaxed shadow-inner">
                  {report.telegramText}
                </div>
              </div>

              {/* Settings Accordion (Bot token & Chat ID) */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setShowConfig(!showConfig)}
                >
                  <span className="font-bold text-slate-800 flex items-center gap-2">
                    <MessageSquare size={16} className="text-blue-600" />
                    Настройки получателей (Telegram и Email)
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

                    <div>
                      <label className="block font-medium text-slate-600 mb-1">Email руководителя:</label>
                      <input
                        type="email"
                        placeholder="owner@school.ru"
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
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
              onClick={handleSendEmail}
              disabled={sendingEmail}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
            >
              <Mail size={15} />
              {sendingEmail ? 'Отправка...' : 'Отправить на Email'}
            </button>

            <button
              onClick={handleSendTelegram}
              disabled={sendingTg}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-colors shadow-xs"
            >
              <Send size={15} />
              {sendingTg ? 'Отправка...' : 'Отправить в Telegram'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
