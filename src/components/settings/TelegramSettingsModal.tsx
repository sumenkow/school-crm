'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
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
  AlertCircle,
  AlertTriangle,
  Globe,
  RefreshCw,
  Zap,
  Lock,
  Key,
  FileSpreadsheet
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

  // Dedicated token edit modal & backup state
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [newTokenInput, setNewTokenInput] = useState('');
  const [lastBackupTime, setLastBackupTime] = useState('');

  // Webhook & Bot Identity
  const [botInfo, setBotInfo] = useState<{ username?: string; first_name?: string } | null>(null);
  const [webhookInfo, setWebhookInfo] = useState<{ url?: string; pending_update_count?: number; last_error_message?: string } | null>(null);
  const [webhookUrlInput, setWebhookUrlInput] = useState('');
  const [isCheckingBot, setIsCheckingBot] = useState(false);
  const [isSettingWebhook, setIsSettingWebhook] = useState(false);

  const fetchBotSetupInfo = async (tokenOverride?: string) => {
    setIsCheckingBot(true);
    try {
      const activeToken = tokenOverride !== undefined ? tokenOverride : (botToken || localStorage.getItem('crm_tg_bot_token') || '');
      const query = (activeToken && !activeToken.includes('•••')) ? `?token=${encodeURIComponent(activeToken)}` : '';
      const res = await fetch(`/api/telegram/setup${query}`);
      const data = await res.json();

      if (data.configured && data.bot) {
        setBotInfo(data.bot);
        if (data.bot.username) {
          localStorage.setItem('crm_tg_bot_username', data.bot.username);
        }
      }

      if (data.webhook) {
        setWebhookInfo(data.webhook);
      }
    } catch {
      // Keep existing botInfo / webhookInfo from Supabase settings
    } finally {
      setIsCheckingBot(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && isOpen) {
      const savedToken = localStorage.getItem('crm_tg_bot_token') || '';
      setBotToken(savedToken);
      setAdminChatId(localStorage.getItem('crm_tg_admin_chat_id') || localStorage.getItem('crm_tg_chat_id') || '');
      setOwnerChatId(localStorage.getItem('crm_tg_owner_chat_id') || '');
      setNotificationsEnabled(localStorage.getItem('crm_tg_notifications_enabled') !== 'false');
      setLastBackupTime(localStorage.getItem('school_crm_last_backup_time') || '');
      setTestStatus(null);

      const defaultWebhook = `${window.location.origin}/api/telegram/webhook`;
      setWebhookUrlInput(defaultWebhook);

      // Fetch persistent settings from Supabase
      fetch('/api/telegram/settings')
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.settings) {
            const s = data.settings;
            if (s.adminChatId) setAdminChatId(s.adminChatId);
            if (s.ownerChatId) setOwnerChatId(s.ownerChatId);
            if (s.webhookUrl) setWebhookUrlInput(s.webhookUrl);
            if (s.notificationsEnabled !== undefined) setNotificationsEnabled(s.notificationsEnabled);
            if (s.botUsername) {
              localStorage.setItem('crm_tg_bot_username', s.botUsername);
            }
            if (s.hasBotToken || s.status === 'connected') {
              if (!savedToken) {
                setBotToken('••••••••');
              }
              setBotInfo((prev) => prev || {
                id: 1,
                is_bot: true,
                first_name: 'You Europe Bot',
                username: s.botUsername || 'youeuropeservicebot',
              });
            }
          }
        })
        .catch((err) => console.warn('Could not fetch /api/telegram/settings:', err));

      if (!localStorage.getItem('crm_tg_bot_username')) {
        localStorage.setItem('crm_tg_bot_username', 'youeuropeservicebot');
      }

      fetchBotSetupInfo(savedToken);
    }
  }, [isOpen]);

  const getIntegrationStatus = () => {
    if (!botToken.trim()) {
      return {
        status: 'not_configured',
        icon: '🟠',
        label: 'Не настроен',
        desc: 'Токен Telegram-бота не указан. Уведомления и двусторонняя связь отключены.',
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
      };
    }
    if (botInfo?.username) {
      return {
        status: 'connected',
        icon: '🟢',
        label: 'Подключён',
        desc: `Бот @${botInfo.username} (${botInfo.first_name || 'Бот'}) успешно авторизован и готов к работе.`,
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      };
    }
    if (testStatus?.type === 'error' || (!isCheckingBot && !botInfo && botToken.trim() && botToken !== '••••••••')) {
      return {
        status: 'error',
        icon: '🔴',
        label: 'Ошибка',
        desc: 'Не удалось авторизовать бота. Проверьте правильность токена и доступность Telegram API.',
        badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
      };
    }
    return {
      status: 'checking',
      icon: '🟠',
      label: 'Проверка...',
      desc: 'Проверка подключения к Telegram Bot API...',
      badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
    };
  };

  const currentStatus = getIntegrationStatus();

  if (!isOpen) return null;

  const handleSave = async () => {
    // 1. Sync locally for fast cache
    localStorage.setItem('crm_tg_bot_token', botToken.trim());
    localStorage.setItem('crm_tg_admin_chat_id', adminChatId.trim());
    localStorage.setItem('crm_tg_owner_chat_id', ownerChatId.trim());
    localStorage.setItem('crm_tg_chat_id', adminChatId.trim() || ownerChatId.trim());
    localStorage.setItem('crm_tg_notifications_enabled', notificationsEnabled ? 'true' : 'false');
    if (botInfo?.username) {
      localStorage.setItem('crm_tg_bot_username', botInfo.username);
    }

    // 2. Persist to Supabase via /api/telegram/settings
    try {
      await fetch('/api/telegram/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: botToken.trim(),
          adminChatId: adminChatId.trim(),
          ownerChatId: ownerChatId.trim(),
          botUsername: botInfo?.username || 'youeuropeservicebot',
          webhookUrl: webhookUrlInput.trim(),
          notificationsEnabled,
        }),
      });
    } catch (err) {
      console.warn('Could not persist settings to Supabase:', err);
    }

    toast.success('Настройки Telegram-бота успешно сохранены!');
    onClose();
  };

  const handleRegisterWebhook = async () => {
    if (!webhookUrlInput.trim()) {
      toast.error('Укажите URL для Webhook');
      return;
    }
    if (!botToken.trim()) {
      toast.error('Сначала укажите Telegram Bot Token');
      return;
    }

    setIsSettingWebhook(true);
    try {
      const res = await fetch('/api/telegram/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customBotToken: botToken.trim(),
          webhookUrl: webhookUrlInput.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Ошибка регистрации Webhook');
      }

      toast.success('Webhook успешно зарегистрирован в Telegram!');
      fetchBotSetupInfo(botToken.trim());
    } catch (err: any) {
      toast.error(err.message || 'Ошибка регистрации Webhook');
    } finally {
      setIsSettingWebhook(false);
    }
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#229ED9] text-white shadow-xs">
              <Bot size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Интеграция с Telegram-ботом</h2>
              <p className="text-xs text-slate-500">
                Двусторонняя связь с клиентами, рассылки, уведомления и сохранение истории
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
          {/* Integration Status Card: 🟢 Подключён / 🟠 Не настроен / 🔴 Ошибка */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/80">
            <div className="flex items-center gap-3">
              <div className="text-xl shrink-0 select-none">{currentStatus.icon}</div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-xs">Статус интеграции:</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${currentStatus.badgeClass}`}>
                    {currentStatus.label}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">{currentStatus.desc}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => fetchBotSetupInfo(botToken)}
              disabled={isCheckingBot}
              className="text-[11px] text-slate-500 hover:text-blue-600 inline-flex items-center gap-1 cursor-pointer shrink-0 ml-2"
            >
              <RefreshCw size={11} className={isCheckingBot ? 'animate-spin' : ''} />
              Обновить
            </button>
          </div>

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

          {/* Bot Token Field with Masking */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700 flex items-center gap-1.5">
                <Lock size={13} className="text-slate-500" />
                <span>Telegram Bot Token:</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fetchBotSetupInfo(botToken)}
                  disabled={isCheckingBot}
                  className="text-[11px] text-slate-500 hover:text-blue-600 inline-flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw size={11} className={isCheckingBot ? 'animate-spin' : ''} />
                  Проверить
                </button>
                <a
                  href="https://t.me/BotFather"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  @BotFather <ExternalLink size={11} />
                </a>
              </div>
            </div>

            {botToken ? (
              <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white font-mono text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="font-bold tracking-widest text-slate-800 text-sm">••••••••</span>
                  <span className="text-[11px] font-sans text-slate-400">
                    (Токен скрыт в целях безопасности)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setNewTokenInput(botToken);
                    setShowTokenModal(true);
                  }}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <Key size={13} />
                  Изменить токен
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-xs">
                <span className="text-slate-400">Токен не задан</span>
                <button
                  type="button"
                  onClick={() => {
                    setNewTokenInput('');
                    setShowTokenModal(true);
                  }}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <Key size={13} />
                  Ввести токен
                </button>
              </div>
            )}

            {botInfo?.username ? (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-semibold">
                <Bot size={13} className="text-emerald-600 shrink-0" />
                <span>Бот активен: <strong>{botInfo.first_name}</strong> (@{botInfo.username})</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50/70 text-blue-900 border border-blue-200 text-[11px] font-medium">
                <Bot size={13} className="text-blue-600 shrink-0" />
                <span>Адрес бота школы: <strong>@youeuropeservicebot</strong></span>
              </div>
            )}
          </div>

          {/* Webhook Configuration Section */}
          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-blue-950 flex items-center gap-1.5">
                <Globe size={14} className="text-blue-600" />
                Двусторонняя связь (Webhook для входящих сообщений):
              </span>
              {webhookInfo?.url ? (
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                  Активен
                </span>
              ) : (
                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200">
                  Не настроен
                </span>
              )}
            </div>

            <p className="text-[11px] text-slate-600">
              URL эндпоинта CRM, куда Telegram будет отправлять ответы клиентов и команду привязки /start.
            </p>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={webhookUrlInput}
                onChange={(e) => setWebhookUrlInput(e.target.value)}
                placeholder="https://your-crm.vercel.app/api/telegram/webhook"
                className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleRegisterWebhook}
                disabled={isSettingWebhook}
                className="inline-flex items-center gap-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold px-3.5 py-2 text-xs transition-colors shrink-0 cursor-pointer"
              >
                <Zap size={13} />
                {isSettingWebhook ? 'Настройка...' : 'Зарегистрировать'}
              </button>
            </div>

            {webhookInfo?.url && (
              <p className="text-[10px] font-mono text-slate-500 truncate">
                Текущий URL в Telegram: {webhookInfo.url}
              </p>
            )}
          </div>

          {/* Admin Chat ID */}
          {(() => {
            const isNotNumeric = (val: string) => {
              const trimmed = val.trim();
              return trimmed.length > 0 && (trimmed.startsWith('@') || !/^-?\d+$/.test(trimmed));
            };
            const adminIsUsername = isNotNumeric(adminChatId);
            const ownerIsUsername = isNotNumeric(ownerChatId);

            return (
              <>
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
                    placeholder="Например: 123456789 (только цифры)"
                    value={adminChatId}
                    onChange={(e) => setAdminChatId(e.target.value)}
                    className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 font-mono ${
                      adminIsUsername
                        ? 'border-amber-400 focus:ring-amber-500/20 focus:border-amber-500'
                        : 'border-slate-200 focus:ring-blue-500/20 focus:border-blue-500'
                    }`}
                  />
                  {adminIsUsername && (
                    <div className="p-2.5 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-900 text-[11px] space-y-1.5 animate-in fade-in duration-150">
                      <div className="flex items-center gap-1.5 font-bold text-amber-800">
                        <AlertTriangle size={13} className="text-amber-600 shrink-0" />
                        <span>Требуется числовой Chat ID, а не @username ({adminChatId})</span>
                      </div>
                      <p className="text-amber-700 leading-normal">
                        Telegram Bot API запрещает ботам писать по @username. Необходим ваш личный цифровой ID (например: <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold text-amber-900">123456789</code>). Также не забудьте нажать кнопку «Запустить» (/start) в диалоге с ботом школы.
                      </p>
                      <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        <a
                          href="https://t.me/userinfobot"
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-200/70 hover:bg-amber-200 text-amber-950 font-bold transition-colors"
                        >
                          1. Узнать ID в @userinfobot <ExternalLink size={10} />
                        </a>
                        {botInfo?.username && (
                          <a
                            href={`https://t.me/${botInfo.username}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-900 font-bold transition-colors"
                          >
                            2. Нажать /start в @{botInfo.username} <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-1">
                    <p className="text-[11px] text-slate-400">
                      Сюда приходят новые поручения от руководителя, заявки и напоминания.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleSendTest('admin')}
                      disabled={testSending}
                      className="text-[11px] text-blue-600 hover:text-blue-800 font-bold hover:underline shrink-0 cursor-pointer"
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
                    placeholder="Например: 123456789 (только цифры)"
                    value={ownerChatId}
                    onChange={(e) => setOwnerChatId(e.target.value)}
                    className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 font-mono ${
                      ownerIsUsername
                        ? 'border-amber-400 focus:ring-amber-500/20 focus:border-amber-500'
                        : 'border-slate-200 focus:ring-purple-500/20 focus:border-purple-500'
                    }`}
                  />
                  {ownerIsUsername && (
                    <div className="p-2.5 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-900 text-[11px] space-y-1.5 animate-in fade-in duration-150">
                      <div className="flex items-center gap-1.5 font-bold text-amber-800">
                        <AlertTriangle size={13} className="text-amber-600 shrink-0" />
                        <span>Требуется числовой Chat ID, а не @username ({ownerChatId})</span>
                      </div>
                      <p className="text-amber-700 leading-normal">
                        Укажите личный числовой ID руководителя из <a href="https://t.me/userinfobot" target="_blank" rel="noreferrer" className="underline font-bold">@userinfobot</a>.
                      </p>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-1">
                    <p className="text-[11px] text-slate-400">
                      Сюда приходят отчеты аудита, уведомления о просроченных задачах и выполнении поручений.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleSendTest('owner')}
                      disabled={testSending}
                      className="text-[11px] text-purple-600 hover:text-purple-800 font-bold hover:underline shrink-0 cursor-pointer"
                    >
                      Тест для руководителя →
                    </button>
                  </div>
                </div>
              </>
            );
          })()}

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

          {/* Google Sheets Synchronization Card */}
          <div className="p-3.5 rounded-xl border border-emerald-200/80 bg-emerald-50/40 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet size={16} className="text-emerald-700 shrink-0" />
                <span className="font-bold text-slate-900 text-xs">
                  Синхронизация с Google Sheets & Резервные копии
                </span>
              </div>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                Активно (03:00 UTC)
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-normal">
              {lastBackupTime
                ? `Последняя выгрузка данных школы: ${lastBackupTime}. Автоматическая архивация базы выполняется ежедневно.`
                : 'Автоматическая синхронизация всех таблиц школы (ученики, группы, платежи) выполняется ежедневно в 03:00 UTC.'}
            </p>
            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-slate-500">
                Экспорт Excel и подключение Google Apps Script Webhook
              </span>
              <Link
                href="/settings/backup"
                onClick={onClose}
                className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                Управление в Бэкапе →
              </Link>
            </div>
          </div>

          {/* Help Box */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2 text-[11px] text-slate-600">
            <p className="font-bold text-slate-800 flex items-center gap-1.5">
              <HelpCircle size={13} className="text-blue-600" />
              Инструкция по настройке Telegram:
            </p>
            <div className="space-y-1.5 text-slate-600">
              <p>
                <strong>1. Для уведомлений Администратора / Руководителя:</strong>
              </p>
              <ul className="list-disc list-inside pl-1 space-y-0.5 text-slate-500">
                <li>Откройте бота <a href="https://t.me/userinfobot" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">@userinfobot</a> и нажмите <strong>/start</strong>.</li>
                <li>Скопируйте число из строки <strong>Id</strong> (например: <code className="font-mono font-bold text-slate-700">123456789</code>) и вставьте в поле выше.</li>
                <li>Откройте вашего созданного бота школы и нажмите кнопку <strong>«Запустить»</strong> (/start), чтобы разрешить ему писать вам.</li>
              </ul>
              <p className="pt-1">
                <strong>2. Для учеников, родителей и лидов:</strong>
              </p>
              <ul className="list-disc list-inside pl-1 space-y-0.5 text-slate-500">
                <li>Нажмите синюю кнопку <strong>«Зарегистрировать»</strong> в блоке Webhook выше.</li>
                <li>В профиле ученика/лида нажмите <strong>«Подключить Telegram»</strong> и отправьте клиенту персональную ссылку. При переходе бот свяжет чат с CRM автоматически.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Отмена
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
          >
            <Check size={15} />
            Сохранить настройки
          </button>
        </div>
      </div>

      {/* Dedicated "Изменить токен" Modal */}
      {showTokenModal && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setShowTokenModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl border border-slate-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Key size={16} className="text-blue-600" />
                Изменить токен Telegram-бота
              </h3>
              <button
                type="button"
                onClick={() => setShowTokenModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Введите API токен бота, полученный у официального сервисного бота <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-blue-600 font-semibold underline">@BotFather</a> в Telegram.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">API токен:</label>
              <input
                type="text"
                placeholder="Например: 789123456:AAFlk9-dK3j8X..."
                value={newTokenInput}
                onChange={(e) => setNewTokenInput(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowTokenModal(false)}
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={async () => {
                  const trimmed = newTokenInput.trim();
                  setBotToken(trimmed);
                  localStorage.setItem('crm_tg_bot_token', trimmed);
                  setShowTokenModal(false);
                  fetchBotSetupInfo(trimmed);
                  try {
                    await fetch('/api/telegram/settings', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ botToken: trimmed }),
                    });
                  } catch (err) {
                    console.warn('Could not persist token to Supabase:', err);
                  }
                  toast.success('Токен успешно обновлен');
                }}
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-colors cursor-pointer"
              >
                Сохранить токен
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
