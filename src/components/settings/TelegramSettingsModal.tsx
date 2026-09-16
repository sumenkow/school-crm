'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Send,
  Check,
  Bot,
  Shield,
  UserCheck,
  HelpCircle,
  Sparkles,
  ExternalLink,
  Bell,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { sendTelegramNotification } from '@/lib/telegram/botNotifier';

interface TelegramSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TelegramSettingsModal({ isOpen, onClose }: TelegramSettingsModalProps) {
  const toast = useToast();

  const [botToken, setBotToken] = useState('');
  const [adminChatId, setAdminChatId] = useState('');
  const [ownerChatId, setOwnerChatId] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [testSending, setTestSending] = useState(false);
  const [testStatus, setTestStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && isOpen) {
      setBotToken(localStorage.getItem('crm_tg_bot_token') || '');
      setAdminChatId(localStorage.getItem('crm_tg_admin_chat_id') || localStorage.getItem('crm_tg_chat_id') || '');
      setOwnerChatId(localStorage.getItem('crm_tg_owner_chat_id') || '');
      setNotificationsEnabled(localStorage.getItem('crm_tg_notifications_enabled') !== 'false');
      setTestStatus(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    localStorage.setItem('crm_tg_bot_token', botToken.trim());
    localStorage.setItem('crm_tg_admin_chat_id', adminChatId.trim());
    localStorage.setItem('crm_tg_owner_chat_id', ownerChatId.trim());
    localStorage.setItem('crm_tg_chat_id', adminChatId.trim() || ownerChatId.trim());
    localStorage.setItem('crm_tg_notifications_enabled', notificationsEnabled ? 'true' : 'false');

    toast.success('Настройки Telegram-бота успешно сохранены!');
    onClose();
  };

  const handleSendTest = async (target: 'admin' | 'owner') => {
    const targetChatId = target === 'admin' ? adminChatId.trim() : ownerChatId.trim();
    if (!targetChatId && !botToken.trim()) {
      toast.error(`Укажите Chat ID для ${target === 'admin' ? 'администратора' : 'руководителя'}`);
      return;
    }

    setTestSending(true);
    setTestStatus(null);

    try {
      // Temporarily persist so backend or client picks it up
      localStorage.setItem('crm_tg_bot_token', botToken.trim());
      localStorage.setItem('crm_tg_admin_chat_id', adminChatId.trim());
      localStorage.setItem('crm_tg_owner_chat_id', ownerChatId.trim());

      const res = await sendTelegramNotification({
        recipient: target,
        customChatId: targetChatId || undefined,
        botToken: botToken.trim() || undefined,
        title: 'Тестовое уведомление CRM',
        message: `🤖 *ТЕСТОВОЕ УВЕДОМЛЕНИЕ CRM*\n\n✅ Интеграция с Telegram настроена успешно!\n🎯 Получатель: *${target === 'admin' ? 'Администратор' : 'Руководитель школы'}*\n⏱ Время отправки: ${new Date().toLocaleTimeString('ru-RU')}`,
      });

      if (res.success) {
        setTestStatus({
          type: 'success',
          message: `Тестовое сообщение успешно отправлено ${target === 'admin' ? 'администратору' : 'руководителю'}!`,
        });
        toast.success(`Успешно отправлено в Telegram (${target === 'admin' ? 'Администратор' : 'Руководитель'})!`);
      } else {
        setTestStatus({
          type: 'error',
          message: res.error || 'Ошибка отправки в Telegram. Проверьте Bot Token и Chat ID.',
        });
        toast.error(res.error || 'Ошибка отправки в Telegram');
      }
    } catch (err: any) {
      setTestStatus({
        type: 'error',
        message: err.message || 'Сетевая ошибка при обращении к Telegram API',
      });
      toast.error('Ошибка: ' + err.message);
    } finally {
      setTestSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
              <Bot size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Интеграция с Telegram-ботом</h2>
              <p className="text-xs text-slate-500">
                Мгновенные уведомления о задачах, лидах, сменах и закрытый аудит
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* Active Notifications Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                <Bell size={16} />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-xs">Отправка мгновенных уведомлений</p>
                <p className="text-[11px] text-slate-500">Включает оповещения в Telegram при назначении и выполнении задач</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notificationsEnabled}
                onChange={(e) => setNotificationsEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Bot Token Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700">
                Telegram Bot Token:
              </label>
              <a
                href="https://t.me/BotFather"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-blue-600 hover:underline inline-flex items-center gap-1"
              >
                Создать в @BotFather
                <ExternalLink size={11} />
              </a>
            </div>
            <input
              type="text"
              placeholder="Например: 789123456:AAFlk9-dK3j8X..."
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
            />
            <p className="text-[11px] text-slate-400">
              Если токен не указан, система использует безопасный токен сервера по умолчанию из переменных окружения.
            </p>
          </div>

          {/* Admin Chat ID */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700 flex items-center gap-1.5">
                <UserCheck size={14} className="text-blue-600" />
                Chat ID Администратора / Дежурной смены:
              </label>
              <a
                href="https://t.me/userinfobot"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-blue-600 hover:underline inline-flex items-center gap-1"
              >
                Узнать ID в @userinfobot
                <ExternalLink size={11} />
              </a>
            </div>
            <input
              type="text"
              placeholder="Например: 987654321 или @school_admins"
              value={adminChatId}
              onChange={(e) => setAdminChatId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
            />
            <div className="flex items-center justify-between pt-1">
              <p className="text-[11px] text-slate-400">
                Сюда приходят новые поручения от руководителя, заявки и напоминания.
              </p>
              <button
                type="button"
                onClick={() => handleSendTest('admin')}
                disabled={testSending}
                className="text-[11px] text-blue-600 hover:text-blue-800 font-bold hover:underline shrink-0"
              >
                Тест для админа →
              </button>
            </div>
          </div>

          {/* Owner Chat ID */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700 flex items-center gap-1.5">
                <Shield size={14} className="text-purple-600" />
                Chat ID Руководителя / Владельца:
              </label>
              <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                Конфиденциально
              </span>
            </div>
            <input
              type="text"
              placeholder="Например: 123456789"
              value={ownerChatId}
              onChange={(e) => setOwnerChatId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-mono"
            />
            <div className="flex items-center justify-between pt-1">
              <p className="text-[11px] text-slate-400">
                Сюда приходят отчеты аудита, уведомления о просроченных задачах и выполнении поручений.
              </p>
              <button
                type="button"
                onClick={() => handleSendTest('owner')}
                disabled={testSending}
                className="text-[11px] text-purple-600 hover:text-purple-800 font-bold hover:underline shrink-0"
              >
                Тест для руководителя →
              </button>
            </div>
          </div>

          {/* Test Status Banner */}
          {testStatus && (
            <div
              className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs ${
                testStatus.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {testStatus.type === 'success' ? (
                <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle size={16} className="shrink-0 text-rose-600" />
              )}
              <span>{testStatus.message}</span>
            </div>
          )}

          {/* Help Box */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-1.5 text-[11px] text-slate-600">
            <p className="font-bold text-slate-800 flex items-center gap-1.5">
              <HelpCircle size={13} className="text-blue-600" />
              Как настроить бота за 2 минуты:
            </p>
            <ol className="list-decimal list-inside space-y-1 pl-1 text-slate-500">
              <li>Откройте @BotFather в Telegram и создайте нового бота командой <code className="font-mono bg-white px-1 py-0.5 rounded border border-slate-200">/newbot</code>.</li>
              <li>Скопируйте полученный API Token и вставьте в поле выше.</li>
              <li>Напишите вашему созданному боту команду <code className="font-mono bg-white px-1 py-0.5 rounded border border-slate-200">/start</code>, чтобы он имел право отправлять вам сообщения.</li>
              <li>Узнайте свой Chat ID в боте @userinfobot и укажите его в соответствующем поле.</li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Отмена
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-colors shadow-xs"
          >
            <Check size={15} />
            Сохранить настройки
          </button>
        </div>
      </div>
    </div>
  );
}
