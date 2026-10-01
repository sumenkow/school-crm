'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Copy,
  Check,
  Send,
  ExternalLink,
  Bot,
  QrCode,
  Sparkles,
  UserCheck,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { generateTelegramDeeplink } from '@/lib/telegram/telegramClient';

interface TelegramConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'student' | 'lead' | 'parent';
  targetId: string;
  targetName: string;
  currentTelegram?: string;
  onSaveManualTelegram?: (telegramHandle: string) => void;
}

export function TelegramConnectModal({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetName,
  currentTelegram,
  onSaveManualTelegram,
}: TelegramConnectModalProps) {
  const { success, error } = useToast();
  const [botUsername, setBotUsername] = useState<string>('');
  const [botName, setBotName] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [manualHandle, setManualHandle] = useState('');
  const [isLoadingBot, setIsLoadingBot] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setManualHandle(currentTelegram || '');
    setCopied(false);

    // Try fetching live bot info from server
    setIsLoadingBot(true);
    fetch('/api/telegram/setup')
      .then((res) => res.json())
      .then((data) => {
        if (data.configured && data.bot?.username) {
          setBotUsername(data.bot.username);
          setBotName(data.bot.first_name || 'Школьный Бот');
        } else {
          // Fallback to localStorage or default
          const storedBot = localStorage.getItem('crm_tg_bot_username') || 'SchoolCrmBot';
          setBotUsername(storedBot);
          setBotName('Школьный Telegram-бот');
        }
      })
      .catch(() => {
        const storedBot = localStorage.getItem('crm_tg_bot_username') || 'SchoolCrmBot';
        setBotUsername(storedBot);
        setBotName('Школьный Telegram-бот');
      })
      .finally(() => setIsLoadingBot(false));
  }, [isOpen, currentTelegram]);

  if (!isOpen) return null;

  const typeCode = targetType === 'student' ? 'st' : targetType === 'lead' ? 'lead' : 'par';
  const deeplink = generateTelegramDeeplink(botUsername || 'SchoolCrmBot', typeCode, targetId);

  const handleCopyLink = () => {
    if (!deeplink) return;
    navigator.clipboard.writeText(deeplink).then(() => {
      setCopied(true);
      success('Ссылка для подключения скопирована в буфер обмена!');
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleSaveManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualHandle.trim()) {
      error('Укажите @username или номер телефона');
      return;
    }
    const formatted = manualHandle.trim().startsWith('@') ? manualHandle.trim() : `@${manualHandle.trim()}`;
    onSaveManualTelegram?.(formatted);
    success(`Telegram ${formatted} сохранен в карточке!`);
    onClose();
  };

  const roleLabel = targetType === 'student' ? 'ученика' : targetType === 'lead' ? 'лида' : 'родителя';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#229ED9] text-white shadow-xs">
              <Bot size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Подключение к Telegram-боту</h2>
              <p className="text-xs text-slate-500">
                Двусторонняя синхронизация для {roleLabel}: <span className="font-semibold text-slate-700">{targetName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* Method 1: Deeplink generator */}
          <div className="rounded-2xl border border-blue-200/80 bg-blue-50/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                <Sparkles size={14} className="text-blue-600" />
                Персональная ссылка привязки (Deep Link):
              </span>
              {botUsername && (
                <span className="text-[10px] font-mono text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-md font-semibold">
                  @{botUsername}
                </span>
              )}
            </div>

            <p className="text-slate-600 text-[11px] leading-relaxed">
              Отправьте клиенту эту ссылку. При переходе в Telegram бот автоматически распознает клиента и привяжет диалог к CRM.
            </p>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={deeplink}
                className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none select-all"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors shrink-0 cursor-pointer"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Скопировано!' : 'Копировать'}
              </button>
            </div>

            <div className="pt-1 flex items-center justify-end">
              <a
                href={deeplink}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-bold text-blue-700 hover:text-blue-900 hover:underline inline-flex items-center gap-1"
              >
                Открыть диалог в Telegram <ExternalLink size={12} />
              </a>
            </div>
          </div>

          {/* How it works */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2 text-[11px] text-slate-600">
            <p className="font-bold text-slate-800">Как это работает:</p>
            <ol className="list-decimal list-inside space-y-1 pl-0.5 text-slate-600">
              <li>Клиент открывает персональную ссылку в Telegram.</li>
              <li>Нажимает кнопку <strong className="text-slate-800">«Запустить» (Start)</strong> в боте.</li>
              <li>Бот связывает аккаунт с карточкой в CRM и отправляет приветствие.</li>
              <li>Все дальнейшие сообщения клиента сразу появляются в ленте карточки.</li>
            </ol>
          </div>

          {/* Method 2: Manual Username Entry */}
          <form onSubmit={handleSaveManual} className="space-y-2.5 pt-2 border-t border-slate-100">
            <label className="font-bold text-slate-700 text-xs block">
              Или укажите логин Telegram вручную (@username):
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="@username клиента"
                value={manualHandle}
                onChange={(e) => setManualHandle(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
              />
              <button
                type="submit"
                className="rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 transition-colors shrink-0 cursor-pointer"
              >
                Сохранить
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            {currentTelegram ? `Текущий контакт: ${currentTelegram}` : 'Telegram пока не привязан'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
