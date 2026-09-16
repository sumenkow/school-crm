'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Send,
  Copy,
  Check,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Users,
  TrendingUp,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { useRole } from '@/context/RoleContext';
import { sendTelegramNotification } from '@/lib/telegram/botNotifier';

interface ExecutiveReportData {
  date: string;
  dateShort: string;
  ownerName: string;
  metrics: {
    totalTasks: number;
    completedTasks: number;
    openTasks: number;
    overdueTasks: number;
    completionRate: number;
    debtorsCount?: number;
    totalDebtAmount?: number;
  };
  managers: Array<{
    name: string;
    role: string;
    total: number;
    completed: number;
    overdue: number;
    onTimeRate: number;
  }>;
  telegramText: string;
}

interface ExecutiveTaskReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExecutiveTaskReportModal({ isOpen, onClose }: ExecutiveTaskReportModalProps) {
  const toast = useToast();
  const { role, userName } = useRole();
  const [report, setReport] = useState<ExecutiveReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedText, setCopiedText] = useState(false);
  const [sendingTg, setSendingTg] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    async function loadReport() {
      try {
        setLoading(true);
        const res = await fetch('/api/reports/executive');
        if (res.ok) {
          const data = await res.json();
          if (data.data) {
            setReport(data.data);
          }
        } else if (res.status === 403) {
          toast.error('Доступ запрещен: отчет доступен только руководителю.');
          onClose();
        }
      } catch (err) {
        console.error('Failed to load executive report:', err);
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
    toast.success('Текст аудита скопирован в буфер обмена!');
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleSendTelegram = async () => {
    if (!report) return;
    setSendingTg(true);
    try {
      const res = await sendTelegramNotification({
        recipient: 'owner',
        title: 'Закрытый аудит руководителя',
        message: report.telegramText,
      });

      if (res.success) {
        toast.success('Отчет успешно отправлен руководителю в Telegram!');
      } else {
        toast.error(res.error || 'Ошибка отправки в Telegram. Проверьте настройки бота.');
      }
    } catch (e) {
      toast.error('Ошибка отправки в Telegram');
    } finally {
      setSendingTg(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl border border-purple-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-purple-100 bg-gradient-to-r from-purple-50 via-indigo-50/40 to-white p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-600 text-white shadow-md shadow-purple-500/20">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900">Закрытый аудит руководителя</h2>
                <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-[10px] font-bold text-purple-800 border border-purple-200">
                  Только Owner / Dev
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Контроль исполнительской дисциплины, SLA задач и рисков школы
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-white hover:text-slate-600 transition-colors shadow-2xs"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-400 gap-3">
            <RefreshCw className="h-8 w-8 animate-spin text-purple-600" />
            <p className="text-xs font-medium">Формирование управленческого аудита...</p>
          </div>
        ) : report ? (
          <div className="p-6 space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
                <span className="text-slate-500 text-[11px] font-medium">Всего поручений:</span>
                <p className="text-2xl font-black text-slate-900 mt-0.5">{report.metrics.totalTasks}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">В текущем периоде</p>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3.5">
                <span className="text-slate-500 text-[11px] font-medium">Выполнено:</span>
                <p className="text-2xl font-black text-emerald-700 mt-0.5">{report.metrics.completedTasks}</p>
                <p className="text-[10px] text-emerald-600 mt-0.5 font-bold">{report.metrics.completionRate}% успеха</p>
              </div>

              <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-3.5">
                <span className="text-slate-500 text-[11px] font-medium">В работе:</span>
                <p className="text-2xl font-black text-blue-700 mt-0.5">{report.metrics.openTasks}</p>
                <p className="text-[10px] text-blue-600 mt-0.5 font-medium">Открытые задачи</p>
              </div>

              <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-3.5">
                <span className="text-slate-500 text-[11px] font-medium">Просрочено (SLA):</span>
                <p className="text-2xl font-black text-rose-700 mt-0.5">{report.metrics.overdueTasks}</p>
                <p className="text-[10px] text-rose-600 mt-0.5 font-bold">
                  {report.metrics.overdueTasks > 0 ? 'Требует вмешательства' : 'Просрочек нет ✓'}
                </p>
              </div>
            </div>

            {/* Debtors Risk Callout */}
            {typeof report.metrics.debtorsCount === 'number' && report.metrics.debtorsCount > 0 && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-3.5 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-600 text-white font-bold">
                    !
                  </div>
                  <div>
                    <p className="font-bold text-rose-950">Дебиторская задолженность учеников</p>
                    <p className="text-[11px] text-rose-800">
                      Обнаружены ученики с отрицательным балансом, требующие выставления счетов
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-black text-sm text-rose-700 block">
                    -{(report.metrics.totalDebtAmount || 0).toLocaleString('ru-RU')} ₽
                  </span>
                  <span className="text-[10px] text-rose-600 font-bold">{report.metrics.debtorsCount} чел.</span>
                </div>
              </div>
            )}

            {/* Team velocity table */}
            <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-purple-600" />
                  Исполнительская дисциплина команды
                </h4>
                <span className="text-[11px] text-slate-400">Рейтинг своевременности</span>
              </div>
              <div className="divide-y divide-slate-100 text-xs">
                {report.managers.map((m) => (
                  <div key={m.name} className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors">
                    <div>
                      <p className="font-bold text-slate-900">{m.name}</p>
                      <p className="text-[11px] text-slate-400">{m.role}</p>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <span className="text-slate-700 font-bold">{m.completed} / {m.total}</span>
                        <p className="text-[10px] text-slate-400">закрыто</p>
                      </div>
                      <div className="w-20">
                        <span className="font-bold text-emerald-700">{m.onTimeRate}%</span>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full mt-1 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full"
                            style={{ width: `${m.onTimeRate}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Preview Telegram message */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Текст управленческой сводки (для Telegram руководителя):
              </label>
              <pre className="rounded-2xl bg-slate-900 p-4 font-mono text-[11px] text-emerald-400 whitespace-pre-wrap leading-relaxed shadow-inner">
                {report.telegramText}
              </pre>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleCopyText}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
              >
                {copiedText ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                {copiedText ? 'Скопировано!' : 'Скопировать текст'}
              </button>
              <button
                type="button"
                onClick={handleSendTelegram}
                disabled={sendingTg}
                className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-purple-500/20 hover:bg-purple-700 transition-all disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {sendingTg ? 'Отправка...' : 'Отправить в Telegram руководителю'}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
