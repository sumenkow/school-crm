'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send,
  Bot,
  Check,
  AlertCircle,
  Link as LinkIcon,
  ExternalLink,
  Settings,
  RefreshCw,
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { useRole } from '@/context/RoleContext';
import { saveInteractionToStorage, TimelineInteraction } from '@/lib/data/timelineStorage';
import { TelegramSettingsModal } from '@/components/settings/TelegramSettingsModal';
import { OfferLessonModal } from '@/components/telegram/OfferLessonModal';
import { cn } from '@/lib/utils';

interface ChatMessage {
  id: string;
  text: string;
  direction: 'incoming' | 'outgoing';
  occurredAt: string;
  result?: string;
}

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
    label: '💳 Оплата',
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
    label: '⏰ Пропуск',
    text: 'Здравствуйте! Подскажите, пожалуйста, по какой причине ученик пропустил сегодняшнее занятие? Сообщите, нужна ли помощь с материалами урока.',
  },
];

function formatChatTime(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function formatChatDate(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '';
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Сегодня';
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Вчера';
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  } catch {
    return '';
  }
}

export function TelegramChatBox({
  recipientType,
  recipientId,
  recipientName,
  telegramHandle,
  telegramChatId,
  onOpenConnectModal,
  onMessageSent,
}: TelegramChatBoxProps) {
  const { success, error: showError } = useToast();
  const { userName } = useRole();
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [hasBotToken, setHasBotToken] = useState<boolean>(true);
  const [botActivationWarning, setBotActivationWarning] = useState<string | null>(null);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const lastMessageCountRef = useRef(0);

  const checkToken = () => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('crm_tg_bot_token');
      setHasBotToken(Boolean(token && token.trim().length > 10));
    }
  };

  useEffect(() => {
    checkToken();
  }, []);

  const hasTelegram = Boolean(telegramHandle || telegramChatId);
  const cleanHandle = (telegramHandle || '').replace(/^@/, '');

  // Scroll to bottom of chat
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' });
  }, []);

  // Fetch messages from API
  const fetchMessages = useCallback(async (showLoading = false) => {
    if (!recipientId || !hasTelegram) return;
    if (showLoading) setIsLoadingMessages(true);

    try {
      const res = await fetch(
        `/api/telegram/messages?type=${recipientType}&id=${encodeURIComponent(recipientId)}`
      );
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && Array.isArray(data.messages)) {
        setMessages(data.messages);

        // Auto-scroll and sync to timeline when new messages arrive
        if (data.messages.length > lastMessageCountRef.current) {
          lastMessageCountRef.current = data.messages.length;
          setTimeout(() => scrollToBottom(), 100);

          // Synchronize incoming messages with global timeline storage
          try {
            data.messages.forEach((msg: any) => {
              if (msg.direction === 'incoming') {
                const dateObj = new Date(msg.occurredAt || Date.now());
                const dateStr = !isNaN(dateObj.getTime()) ? dateObj.toLocaleDateString('ru-RU') : '01.10.2026';
                const timeStr = !isNaN(dateObj.getTime()) ? dateObj.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '12:00';

                const incomingInt: TimelineInteraction = {
                  id: msg.id,
                  studentId: recipientType === 'student' ? recipientId : undefined,
                  leadId: recipientType === 'lead' ? recipientId : undefined,
                  parentId: recipientType === 'parent' ? recipientId : undefined,
                  studentName: recipientType === 'student' ? recipientName : undefined,
                  parentName: recipientType === 'parent' ? recipientName : undefined,
                  targetType: recipientType,
                  targetName: recipientName,
                  occurredAt: `${dateStr}, ${timeStr}`,
                  createdAt: msg.occurredAt || new Date().toISOString(),
                  channel: 'telegram',
                  type: 'follow_up',
                  author: recipientName || 'Клиент Telegram',
                  content: `💬 Входящее в Telegram: «${msg.text}»`,
                  result: msg.result || 'Ответ клиента в Telegram',
                };
                saveInteractionToStorage(incomingInt, { skipCloudSync: true });
              }
            });
          } catch {}
        }
      }
    } catch {
      // Silent fail for polling
    } finally {
      setIsLoadingMessages(false);
    }
  }, [recipientId, recipientType, hasTelegram, scrollToBottom]);

  // Initial load
  useEffect(() => {
    fetchMessages(true);
  }, [fetchMessages]);

  // Poll every 3 seconds for real-time updates
  useEffect(() => {
    if (!hasTelegram) return;
    const interval = setInterval(() => fetchMessages(false), 3000);
    return () => clearInterval(interval);
  }, [fetchMessages, hasTelegram]);

  // Unified send message handler
  const sendCustomMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const savedBotToken = typeof window !== 'undefined'
      ? (localStorage.getItem('crm_tg_bot_token') || '').trim()
      : '';

    if (!hasTelegram) {
      showError('Telegram не подключен. Сначала отправьте клиенту ссылку на подключение бота.');
      onOpenConnectModal?.();
      return;
    }

    if (!savedBotToken) {
      showError('Telegram Bot Token не настроен. Открываю настройки Telegram...');
      setIsSettingsModalOpen(true);
      return;
    }

    setIsSending(true);
    setBotActivationWarning(null);

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
          message: trimmed,
          authorName: userName || 'Администратор школы',
          customBotToken: savedBotToken || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.error && data.error.includes('Bot Token не настроен')) {
          setIsSettingsModalOpen(true);
        }
        if (data.error && (data.error.includes('требуется числовой Chat ID') || data.error.includes('chat not found'))) {
          setBotActivationWarning(data.error);
        }
        throw new Error(data.error || 'Ошибка отправки через Telegram API');
      }

      // Save interaction to timeline
      const newInteraction: TimelineInteraction = {
        id: data.interactionId || `int_tg_${Date.now()}`,
        studentId: recipientType === 'student' ? recipientId : undefined,
        leadId: recipientType === 'lead' ? recipientId : undefined,
        parentId: recipientType === 'parent' ? recipientId : undefined,
        studentName: recipientType === 'student' ? recipientName : undefined,
        parentName: recipientType === 'parent' ? recipientName : undefined,
        targetType: recipientType,
        targetName: recipientName,
        occurredAt: `${dateStr}, ${timeStr}`,
        createdAt: data.sentAt || now.toISOString(),
        channel: 'telegram',
        type: 'follow_up',
        author: userName || 'Администратор школы',
        content: `✈️ Сообщение в Telegram: «${trimmed}»`,
        result: 'Отправлено в Telegram-чат',
      };

      saveInteractionToStorage(newInteraction, { skipCloudSync: true });
      onMessageSent?.(newInteraction);

      // Optimistically add to chat
      setMessages((prev) => [
        ...prev,
        {
          id: newInteraction.id,
          text: trimmed,
          direction: 'outgoing' as const,
          occurredAt: now.toISOString(),
        },
      ]);
      lastMessageCountRef.current += 1;
      setTimeout(() => scrollToBottom(), 50);

      setMessageText('');
      setBotActivationWarning(null);
      success('Сообщение отправлено!');
    } catch (err: any) {
      showError(err.message || 'Не удалось отправить сообщение');
    } finally {
      setIsSending(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await sendCustomMessage(messageText);
  };

  const handleOpenDirectTelegram = () => {
    if (!cleanHandle) return;
    const url = `https://t.me/${cleanHandle}?text=${encodeURIComponent(messageText.trim())}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCopyInviteLink = () => {
    const storedBot = (typeof window !== 'undefined' ? localStorage.getItem('crm_tg_bot_username') : '') || 'youeuropeservicebot';
    const typeCode = recipientType === 'student' ? 'st' : recipientType === 'lead' ? 'lead' : 'par';
    const link = `https://t.me/${storedBot.replace('@', '')}?start=${typeCode}_${recipientId}`;
    navigator.clipboard.writeText(link);
    success('Ссылка на запуск бота скопирована!');
  };

  // Group messages by date for separator display
  const groupedMessages: { date: string; items: ChatMessage[] }[] = [];
  let currentDate = '';
  for (const msg of messages) {
    const msgDate = formatChatDate(msg.occurredAt);
    if (msgDate !== currentDate) {
      currentDate = msgDate;
      groupedMessages.push({ date: msgDate, items: [] });
    }
    groupedMessages[groupedMessages.length - 1]?.items.push(msg);
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-xs flex flex-col" style={{ minHeight: '420px' }}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 px-5 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#229ED9]/10 text-[#229ED9]">
            <Bot size={16} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Telegram-чат с {recipientName}</h4>
            <p className="text-[10px] text-slate-400">
              {hasTelegram ? (telegramHandle || `Chat ID: ${telegramChatId}`) : 'Не подключен'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasTelegram ? (
            <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-2 py-0.5 rounded-full text-[10px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Онлайн
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenConnectModal}
              className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors cursor-pointer"
            >
              <LinkIcon size={12} />
              Подключить
            </button>
          )}
          {hasTelegram && cleanHandle && (
            <button
              type="button"
              onClick={handleOpenDirectTelegram}
              className="p-1.5 rounded-lg text-slate-400 hover:text-[#229ED9] hover:bg-blue-50 transition-colors cursor-pointer"
              title="Открыть в приложении Telegram"
            >
              <ExternalLink size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Bot Token Warning */}
      {!hasBotToken && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle size={14} className="text-amber-600 shrink-0" />
            <span>Бот не настроен.</span>
          </div>
          <button
            type="button"
            onClick={() => setIsSettingsModalOpen(true)}
            className="font-bold text-blue-700 hover:underline cursor-pointer text-xs"
          >
            <Settings size={12} className="inline mr-1" />
            Настроить
          </button>
        </div>
      )}

      {/* Bot Activation Warning */}
      {botActivationWarning && (
        <div className="px-4 py-3 bg-sky-50 border-b border-sky-200 text-xs text-sky-900 space-y-2">
          <div className="flex items-start gap-2">
            <AlertCircle size={14} className="text-sky-600 shrink-0 mt-0.5" />
            <span>Клиент должен нажать <strong>Start</strong> в боте, чтобы получать сообщения.</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={handleCopyInviteLink}
              className="inline-flex items-center gap-1 bg-white text-slate-700 border border-slate-200 px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer hover:bg-slate-50">
              <LinkIcon size={11} /> Скопировать ссылку на бота
            </button>
            <button type="button" onClick={onOpenConnectModal}
              className="text-sky-700 hover:underline text-[11px] font-semibold cursor-pointer">
              Указать числовой Chat ID
            </button>
          </div>
        </div>
      )}

      {/* Not connected state */}
      {!hasTelegram && (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto">
              <Bot size={24} className="text-slate-400" />
            </div>
            <p className="text-xs text-slate-500 font-medium">Telegram не подключен</p>
            <p className="text-[11px] text-slate-400 max-w-xs">
              Отправьте клиенту ссылку на бота. После активации вы сможете общаться прямо из CRM.
            </p>
            <button
              type="button"
              onClick={onOpenConnectModal}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
            >
              <Bot size={14} />
              Подключить Telegram
            </button>
          </div>
        </div>
      )}

      {/* Chat Messages Area */}
      {hasTelegram && (
        <>
          <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto px-4 py-3 space-y-1 bg-slate-50/50"
            style={{ maxHeight: '320px', minHeight: '180px' }}
          >
            {isLoadingMessages && messages.length === 0 && (
              <div className="flex items-center justify-center py-8">
                <RefreshCw size={16} className="animate-spin text-slate-400 mr-2" />
                <span className="text-xs text-slate-400">Загрузка сообщений...</span>
              </div>
            )}

            {!isLoadingMessages && messages.length === 0 && (
              <div className="flex items-center justify-center py-8">
                <div className="text-center space-y-1">
                  <p className="text-xs text-slate-400">Нет сообщений</p>
                  <p className="text-[10px] text-slate-300">Напишите первое сообщение клиенту</p>
                </div>
              </div>
            )}

            {groupedMessages.map((group) => (
              <React.Fragment key={group.date}>
                {/* Date separator */}
                <div className="flex items-center justify-center py-2">
                  <span className="bg-white/80 text-[10px] text-slate-400 font-medium px-3 py-0.5 rounded-full border border-slate-100 shadow-xs">
                    {group.date}
                  </span>
                </div>

                {group.items.map((msg) => {
                  const isOut = msg.direction === 'outgoing';

                  return (
                    <div
                      key={msg.id}
                      className={cn('flex mb-1', isOut ? 'justify-end' : 'justify-start')}
                    >
                      <div
                        className={cn(
                          'max-w-[75%] rounded-2xl px-3.5 py-2 shadow-xs text-xs leading-relaxed',
                          isOut
                            ? 'bg-[#229ED9] text-white rounded-br-md'
                            : 'bg-white text-slate-800 border border-slate-200 rounded-bl-md'
                        )}
                      >
                        {/* Sender label */}
                        <p className={cn(
                          'text-[10px] font-bold mb-0.5',
                          isOut ? 'text-white/70' : 'text-slate-400'
                        )}>
                          {isOut ? (userName || 'Администратор') : recipientName}
                        </p>

                        {/* Message text */}
                        <p className="whitespace-pre-wrap break-words">{msg.text}</p>

                        {/* Time + check */}
                        <div className={cn(
                          'flex items-center gap-1 mt-1',
                          isOut ? 'justify-end' : 'justify-start'
                        )}>
                          <span className={cn(
                            'text-[9px]',
                            isOut ? 'text-white/50' : 'text-slate-300'
                          )}>
                            {formatChatTime(msg.occurredAt)}
                          </span>
                          {isOut && <Check size={10} className="text-white/50" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </React.Fragment>
            ))}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Templates */}
          <div className="px-4 py-2 border-t border-slate-100 bg-white">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsOfferModalOpen(true)}
                className="text-[10px] font-bold rounded-lg border border-blue-200 bg-blue-50/90 hover:bg-blue-100 text-blue-700 px-2.5 py-0.5 transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                title="Предложить занятие со свободными местами"
              >
                <span>📅</span> Предложить занятие
              </button>
              <div className="h-3 w-px bg-slate-200 mx-0.5" />
              {TEMPLATES.map((tpl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setMessageText(tpl.text)}
                  className="text-[10px] rounded-lg border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 px-2 py-0.5 text-slate-600 transition-colors cursor-pointer"
                >
                  {tpl.label}
                </button>
              ))}
            </div>
          </div>

          {/* Message Input */}
          <form onSubmit={handleSendMessage} className="px-4 pb-4 pt-2">
            <div className="flex items-end gap-2">
              <textarea
                rows={1}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={`Сообщение для ${recipientName}...`}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#229ED9]/20 focus:border-[#229ED9] resize-none"
                style={{ minHeight: '38px', maxHeight: '100px' }}
              />
              <button
                type="submit"
                disabled={isSending || !messageText.trim()}
                className={cn(
                  'flex items-center justify-center w-9 h-9 rounded-xl transition-colors cursor-pointer shrink-0',
                  isSending || !messageText.trim()
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-[#229ED9] text-white hover:bg-[#1c8ec4] shadow-xs'
                )}
              >
                <Send size={16} className={cn(isSending && 'animate-spin')} />
              </button>
            </div>
            <p className="text-[9px] text-slate-300 mt-1 px-1">
              Enter — отправить · Shift+Enter — новая строка
            </p>
          </form>
        </>
      )}

      {/* Settings Modal */}
      <TelegramSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => {
          setIsSettingsModalOpen(false);
          checkToken();
        }}
      />

      {/* Offer Lesson Modal (Screen 12) */}
      <OfferLessonModal
        isOpen={isOfferModalOpen}
        onClose={() => setIsOfferModalOpen(false)}
        recipientName={recipientName}
        onSendOffer={(text) => sendCustomMessage(text)}
      />
    </div>
  );
}
