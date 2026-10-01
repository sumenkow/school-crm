'use client';

import React, { useState } from 'react';
import {
  Send,
  Bot,
  Sparkles,
  Check,
  AlertCircle,
  Link as LinkIcon,
  ExternalLink,
  MessageSquare,
  Clock
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { useRole } from '@/context/RoleContext';
import { saveInteractionToStorage, TimelineInteraction } from '@/lib/data/timelineStorage';
import { cn } from '@/lib/utils';

interface TelegramChatBoxProps {
  recipientType: 'student' | 'lead' | 'parent';
  recipientId: string;
  recipientName: string;
  telegramHandle?: string;
  telegramChatId?: string;
  onOpenConnectModal?: () => void;
  onMessageSent?: (interaction: TimelineInteraction) => void;
}

const TEMPLATES = [
  {
    label: '💳 Напоминание об оплате',
    text: 'Здравствуйте! Напоминаем о приближении срока оплаты абонемента за следующий учебный период. Пожалуйста, проверьте баланс в личном кабинете или свяжитесь с нами.',
  },
  {
    label: '🔗 Ссылка на урок',
    text: 'Здравствуйте! Напоминаем о предстоящем занятии. Ссылка на подключение к уроку готова. Ждем вас на занятии!',
  },
  {
    label: '📚 Домашнее задание',
    text: 'Здравствуйте! Преподаватель добавил домашнее задание к следующему уроку. Пожалуйста, выполните его до начала занятия.',
  },
  {
    label: '⏰ Пропуск занятия',
    text: 'Здравствуйте! Подскажите, пожалуйста, по какой причине ученик пропустил сегодняшнее занятие? Сообщите, нужна ли помощь с материалами урока.',
  },
];

export function TelegramChatBox({
  recipientType,
  recipientId,
  recipientName,
  telegramHandle,
  telegramChatId,
  onOpenConnectModal,
  onMessageSent,
}: TelegramChatBoxProps) {
  const { success, error } = useToast();
  const { userName } = useRole();
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);

  const hasTelegram = Boolean(telegramHandle || telegramChatId);
  const cleanHandle = (telegramHandle || '').replace(/^@/, '');

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!messageText.trim()) return;

    if (!hasTelegram) {
      error('Telegram не подключен. Сначала отправьте клиенту ссылку на подключение бота.');
      onOpenConnectModal?.();
      return;
    }

    setIsSending(true);

    try {
      const now = new Date();
      const dateStr = now.toLocaleDateString('ru-RU');
      const timeStr = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

      const res = await fetch('/api/telegram/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientType,
          recipientId,
          recipientName,
          chatId: telegramChatId || telegramHandle,
          message: messageText.trim(),
          authorName: userName || 'Администратор школы',
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Ошибка отправки через Telegram API');
      }

      // Optimistically save interaction to CRM Timeline storage
      const newInteraction: TimelineInteraction = {
        id: `int_tg_${Date.now()}`,
        studentId: recipientType === 'student' ? recipientId : undefined,
        leadId: recipientType === 'lead' ? recipientId : undefined,
        parentId: recipientType === 'parent' ? recipientId : undefined,
        studentName: recipientType === 'student' ? recipientName : undefined,
        parentName: recipientType === 'parent' ? recipientName : undefined,
        targetType: recipientType,
        targetName: recipientName,
        occurredAt: `${dateStr}, ${timeStr}`,
        createdAt: now.toISOString(),
        channel: 'telegram',
        type: 'follow_up',
        author: userName || 'Администратор школы',
        content: `✈️ Сообщение в Telegram: «${messageText.trim()}»`,
        result: 'Отправлено в Telegram-чат',
      };

      saveInteractionToStorage(newInteraction);
      onMessageSent?.(newInteraction);

      setMessageText('');
      success('Сообщение успешно отправлено в Telegram клиента!');
    } catch (err: any) {
      error(err.message || 'Не удалось отправить сообщение');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
      {/* Header & Status */}
      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#229ED9]/10 text-[#229ED9]">
            <Bot size={16} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Чат через школьного Telegram-бота</h4>
            <p className="text-[11px] text-slate-500">
              Сообщения отправляются от имени бота и автоматически сохраняются в историю CRM
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasTelegram ? (
            <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-2.5 py-1 rounded-full text-[11px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Подключен: {telegramHandle || `ID: ${telegramChatId}`}</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenConnectModal}
              className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-3 py-1 rounded-full text-[11px] font-semibold transition-colors cursor-pointer"
            >
              <LinkIcon size={12} />
              Подключить Telegram
            </button>
          )}

          {hasTelegram && cleanHandle && (
            <a
              href={`https://t.me/${cleanHandle}`}
              target="_blank"
              rel="noreferrer"
              className="p-1 rounded-lg text-slate-400 hover:text-[#229ED9] hover:bg-slate-100 transition-colors"
              title="Открыть диалог в Telegram"
            >
              <ExternalLink size={14} />
            </a>
          )}
        </div>
      </div>

      {/* If Not Connected Banner */}
      {!hasTelegram && (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-center space-y-2">
          <p className="text-xs text-slate-600 font-medium">
            Клиент ещё не привязал свой Telegram к школьному боту.
          </p>
          <p className="text-[11px] text-slate-400 max-w-md mx-auto">
            Сгенерируйте персональную ссылку в один клик. Клиенту останется только нажать «Запустить» в Telegram.
          </p>
          <button
            type="button"
            onClick={onOpenConnectModal}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
          >
            <Bot size={14} />
            Получить ссылку для подключения
          </button>
        </div>
      )}

      {/* Quick Templates Bar */}
      {hasTelegram && (
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Быстрые шаблоны сообщений:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {TEMPLATES.map((tpl, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setMessageText(tpl.text)}
                className="text-[11px] rounded-lg border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 px-2.5 py-1 text-slate-700 transition-colors cursor-pointer"
              >
                {tpl.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Message Form */}
      {hasTelegram && (
        <form onSubmit={handleSendMessage} className="space-y-3">
          <textarea
            rows={3}
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder={`Напишите сообщение для ${recipientName} в Telegram...`}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#229ED9]/20 focus:border-[#229ED9]"
          />

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              Поддерживается форматирование Markdown (*жирный*, _курсив_)
            </span>

            <button
              type="submit"
              disabled={isSending || !messageText.trim()}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer',
                isSending || !messageText.trim()
                  ? 'bg-slate-300 cursor-not-allowed text-slate-500'
                  : 'bg-[#229ED9] hover:bg-[#1c8ec4]'
              )}
            >
              <Send size={14} className={cn(isSending && 'animate-spin')} />
              {isSending ? 'Отправка...' : 'Отправить в Telegram'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
