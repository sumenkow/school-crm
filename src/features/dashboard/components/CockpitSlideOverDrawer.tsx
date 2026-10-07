'use client';

import React from 'react';
import Link from 'next/link';
import {
  X,
  ExternalLink,
  Phone,
  MessageSquare,
  Send,
  AlertTriangle,
  Clock,
  Calendar,
  CreditCard,
  User,
  CheckCircle2,
  CalendarClock,
  BookOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CockpitActionItem, sanitizePhoneForWhatsApp, sanitizeTelegramUsername } from '../lib/cockpitPriorityEngine';
import { saveInteractionToStorage } from '@/lib/data/timelineStorage';

interface CockpitSlideOverDrawerProps {
  item: CockpitActionItem | null;
  onClose: () => void;
  onComplete: (id: string) => void;
  onPostpone?: (id: string, dateIso: string) => void;
  onRecordPayment?: (item: CockpitActionItem) => void;
  onViewLesson?: (lessonId: string) => void;
}

export const CockpitSlideOverDrawer: React.FC<CockpitSlideOverDrawerProps> = ({
  item,
  onClose,
  onComplete,
  onPostpone,
  onRecordPayment,
  onViewLesson,
}) => {
  if (!item) return null;

  const rawPhone = item.parentPhone || item.leadPhone;
  const cleanPhone = sanitizePhoneForWhatsApp(rawPhone);
  const telegramHandle = sanitizeTelegramUsername(item.leadTelegram);

  const getWaText = () => {
    if (item.debtAmount) {
      return encodeURIComponent(
        `Здравствуйте! Напоминаем о необходимости оплаты занятий в Smart Academy на сумму ${item.debtFormatted || item.debtAmount + ' €'}. Будем признательны за оплату до начала урока.`
      );
    }
    return encodeURIComponent(`Здравствуйте! Пишем вам из языковой школы Smart Academy.`);
  };

  const priorityColorMap: Record<string, { bg: string; text: string; border: string }> = {
    P0: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
    P1: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    P2: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    P3: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
  };

  const priorityBadge = priorityColorMap[item.priority] || priorityColorMap.P2;

  const handleLogCommunication = (channel: 'whatsapp' | 'telegram' | 'phone') => {
    try {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const dateStr = `${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()}`;
      const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
      const formattedDateTime = `${dateStr}, ${timeStr}`;

      const channelTitles: Record<string, string> = {
        whatsapp: 'WhatsApp',
        telegram: 'Telegram',
        phone: 'Телефонный звонок',
      };

      const interactionItem = {
        id: `int_comm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        studentId: item.studentId,
        studentName: item.studentName,
        parentId: item.parentId,
        parentName: item.parentName,
        occurredAt: formattedDateTime,
        createdAt: now.toISOString(),
        channel: (channel === 'phone' ? 'phone' : (channel === 'whatsapp' ? 'whatsapp' : 'telegram')) as any,
        type: (channel === 'phone' ? 'call' : 'message') as any,
        author: 'Администратор',
        content: `${channelTitles[channel] || channel}: обращение по вопросу «${item.title}»`,
        result: 'Контакт инициирован из Кокпита',
        targetType: (item.parentId ? 'parent' : (item.leadId ? 'lead' : 'student')) as any,
        targetName: item.parentName || item.studentName || item.leadName || 'Клиент',
        targetRole: item.parentId ? 'Родитель' : 'Клиент',
      };

      if (item.leadId) {
        (interactionItem as any).leadId = item.leadId;
        (interactionItem as any).leadName = item.leadName;
      }

      saveInteractionToStorage(interactionItem as any);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('crm-timeline-interactions-changed', { detail: interactionItem }));
      }
    } catch (e) {
      console.warn('Could not log communication interaction:', e);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over Container: 440px matching reference */}
      <aside
        className="fixed inset-y-0 right-0 z-50 w-full max-w-[440px] bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200"
        aria-label="Детали задачи"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={cn(
                'px-2 py-0.5 text-xs font-semibold rounded-full border',
                priorityBadge.bg,
                priorityBadge.text,
                priorityBadge.border
              )}
            >
              {item.priority === 'P0' ? 'Критично · P0' : item.priority === 'P1' ? 'Срочно · P1' : item.priority === 'P2' ? 'Сегодня · P2' : 'Можно перенести · P3'}
            </span>
            <span className="text-xs font-medium text-slate-500 truncate">{item.category}</span>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors"
            title="Закрыть (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Main Title & Subtitle */}
          <div>
            <h2 className="text-base font-bold text-slate-900 leading-snug">{item.title}</h2>
            {item.subtitle && <p className="text-sm text-slate-600 mt-1">{item.subtitle}</p>}
          </div>

          {/* Admission Warning Callout (P0 Debt) */}
          {item.badgeText && (
            <div
              className={cn(
                'flex items-start gap-2.5 p-3 rounded-lg border text-sm',
                item.priority === 'P0'
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              )}
            >
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
              <div>
                <span className="font-semibold">{item.badgeText}</span>
                {item.urgencyLabel && (
                  <p className="text-xs mt-0.5 opacity-90">Временной порог: {item.urgencyLabel}</p>
                )}
              </div>
            </div>
          )}

          {/* Client Card Section */}
          {(item.studentName || item.leadName || item.parentName) && (
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Клиент / Контакт</span>
                <div className="flex items-center gap-2">
                  {item.studentId && (
                    <Link
                      href={`/students/${item.studentId}`}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1"
                    >
                      Открыть ученика <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}
                  {item.leadId && (
                    <Link
                      href={`/crm/leads/${item.leadId}`}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1"
                    >
                      Открыть лид <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
                  {(item.studentName || item.leadName || item.parentName || 'К')[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-slate-800 truncate">
                    {item.studentName || item.leadName}
                  </div>
                  {item.parentName && item.parentName !== item.studentName && (
                    <div className="text-xs text-slate-500 truncate">Родитель: {item.parentName}</div>
                  )}
                  {rawPhone && <div className="text-xs text-slate-600 font-mono mt-0.5">{rawPhone}</div>}
                </div>
              </div>
            </div>
          )}

          {/* Financial / Debt Box */}
          {item.debtAmount !== undefined && (
            <div className="p-3.5 bg-rose-50/50 rounded-xl border border-rose-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-rose-800 uppercase tracking-wider">Задолженность</span>
                {item.invoiceNumber && (
                  <span className="text-xs font-mono font-medium text-slate-500">{item.invoiceNumber}</span>
                )}
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-rose-600">{item.debtFormatted || `${item.debtAmount} €`}</span>
                {onRecordPayment && (
                  <button
                    onClick={() => onRecordPayment(item)}
                    className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-medium px-2.5 py-1.5 rounded-lg transition-colors shadow-xs"
                  >
                    Принять оплату
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Lesson Schedule Box */}
          {(item.lessonTitle || item.lessonTime) && (
            <div className="p-3.5 bg-blue-50/40 rounded-xl border border-blue-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-blue-800 uppercase tracking-wider">Занятие сегодня</span>
                {item.lessonId && onViewLesson && (
                  <button
                    onClick={() => onViewLesson(item.lessonId!)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1"
                  >
                    Просмотр <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div className="space-y-1 text-xs text-slate-700">
                <div className="font-semibold text-sm text-slate-900">{item.lessonTitle}</div>
                <div className="flex items-center gap-1.5 text-slate-600">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  <span>{item.lessonTime || 'Сегодня'}</span>
                </div>
                {item.groupName && <div>Группа: <span className="font-medium text-slate-800">{item.groupName}</span></div>}
                {item.teacherName && <div>Преподаватель: <span className="font-medium text-slate-800">{item.teacherName}</span></div>}
              </div>
            </div>
          )}

          {/* Description & Notes */}
          {item.notes && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Заметки и комментарий</label>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                {item.notes}
              </div>
            </div>
          )}

          {/* Postpone 1-click options if P3 */}
          {item.canPostpone && item.postponeDates && onPostpone && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Перенос срока</label>
              <div className="flex items-center gap-2">
                {item.postponeDates.map((p) => (
                  <button
                    key={p.dateIso}
                    onClick={() => onPostpone(item.sourceId, p.dateIso)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-xs font-medium text-slate-700 rounded-lg border border-slate-200 transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
          {/* Quick Communication Links */}
          <div className="flex items-center gap-1.5">
            {cleanPhone && (
              <a
                href={`https://wa.me/${cleanPhone}?text=${getWaText()}`}
                target="_blank"
                rel="noreferrer"
                onClick={() => handleLogCommunication('whatsapp')}
                className="inline-flex items-center gap-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
                title="Написать в WhatsApp"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                WhatsApp
              </a>
            )}

            {telegramHandle && (
              <a
                href={`https://t.me/${telegramHandle}`}
                target="_blank"
                rel="noreferrer"
                onClick={() => handleLogCommunication('telegram')}
                className="inline-flex items-center gap-1 px-3 py-2 bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
                title="Написать в Telegram"
              >
                <Send className="w-3.5 h-3.5" />
                Telegram
              </a>
            )}

            {rawPhone && (
              <a
                href={`tel:${cleanPhone}`}
                onClick={() => handleLogCommunication('phone')}
                className="inline-flex items-center gap-1 p-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                title="Позвонить"
              >
                <Phone className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          {/* Action Resolution Button */}
          {item.canComplete && (
            <button
              onClick={() => onComplete(item.sourceId)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs"
            >
              <CheckCircle2 className="w-4 h-4" />
              Выполнено
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
