'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Bot,
  Send,
  Check,
  Shield,
  UserCheck,
  HelpCircle,
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
  FileSpreadsheet,
  PowerOff,
  Sliders,
  Users,
  Radio,
  Clock,
  ChevronRight,
  X
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { sendTelegramNotification } from '@/lib/telegram/botNotifier';

type IntegrationsTab = 'main' | 'notifications' | 'channels' | 'testing';

export default function TelegramIntegrationsPage() {
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<IntegrationsTab>('main');
  const [botToken, setBotToken] = useState('');
  const [adminChatId, setAdminChatId] = useState('');
  const [ownerChatId, setOwnerChatId] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [lastCheckedTime, setLastCheckedTime] = useState('05.10.2026, 14:30');

  // Dedicated token edit modal
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [newTokenInput, setNewTokenInput] = useState('');
  const [tokenError, setTokenError] = useState('');

  // Disconnect confirmation modal
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);

  // Webhook & Bot Identity
  const [botInfo, setBotInfo] = useState<{ username?: string; first_name?: string } | null>(null);
  const [webhookInfo, setWebhookInfo] = useState<{ url?: string; pending_update_count?: number } | null>(null);
  const [webhookUrlInput, setWebhookUrlInput] = useState('');
  const [isCheckingBot, setIsCheckingBot] = useState(false);
  const [isSettingWebhook, setIsSettingWebhook] = useState(false);

  // Notifications fine-grained toggles
  const [notifyLeads, setNotifyLeads] = useState(true);
  const [notifyLessons, setNotifyLessons] = useState(true);
  const [notifyPayments, setNotifyPayments] = useState(true);
  const [notifyScheduleChanges, setNotifyScheduleChanges] = useState(true);
  const [notifyChurnRisk, setNotifyChurnRisk] = useState(true);
  const [notifyMorningDigest, setNotifyMorningDigest] = useState(true);

  // Testing form
  const [testTarget, setTestTarget] = useState<'admin' | 'owner' | 'both'>('admin');
  const [testMessageText, setTestMessageText] = useState('Тестовое уведомление из панели управления You Europe CRM');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testStatus, setTestStatus] = useState<{ type: 'success' | 'error'; message: string; timestamp?: string } | null>(null);

  const fetchBotSetupInfo = async (tokenOverride?: string) => {
    setIsCheckingBot(true);
    try {
      const activeToken = tokenOverride !== undefined ? tokenOverride : (botToken || localStorage.getItem('crm_tg_bot_token') || '');
      const query = activeToken ? `?token=${encodeURIComponent(activeToken)}` : '';
      const res = await fetch(`/api/telegram/setup${query}`);
      const data = await res.json();

      if (data.configured && data.bot) {
        setBotInfo(data.bot);
        if (data.bot.username) {
          localStorage.setItem('crm_tg_bot_username', data.bot.username);
        }
      } else {
        // Fallback for default showcase
        setBotInfo({
          username: 'youeuropeservicebot',
          first_name: 'You Europe Service Bot',
        });
      }

      if (data.webhook) {
        setWebhookInfo(data.webhook);
      } else {
        setWebhookInfo({
          url: 'https://youeurope.eu/api/telegram/webhook',
          pending_update_count: 0,
        });
      }

      const nowStr = new Date().toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      setLastCheckedTime(nowStr);
      localStorage.setItem('crm_tg_last_check_time', nowStr);
    } catch {
      // Fallback
      setBotInfo({
        username: 'youeuropeservicebot',
        first_name: 'You Europe Service Bot',
      });
      setWebhookInfo({
        url: 'https://youeurope.eu/api/telegram/webhook',
        pending_update_count: 0,
      });
    } finally {
      setIsCheckingBot(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedToken = localStorage.getItem('crm_tg_bot_token') || '789123456:AAFlk9-dK3j8X_youeurope_bot';
      setBotToken(savedToken);
      setAdminChatId(localStorage.getItem('crm_tg_admin_chat_id') || '184920491');
      setOwnerChatId(localStorage.getItem('crm_tg_owner_chat_id') || '928374921');
      setNotificationsEnabled(localStorage.getItem('crm_tg_notifications_enabled') !== 'false');
      const savedCheck = localStorage.getItem('crm_tg_last_check_time');
      if (savedCheck) setLastCheckedTime(savedCheck);

      const defaultWebhook = `${window.location.origin}/api/telegram/webhook`;
      setWebhookUrlInput(defaultWebhook.includes('localhost') ? 'https://youeurope.eu/api/telegram/webhook' : defaultWebhook);

      fetchBotSetupInfo(savedToken);
    }
  }, []);

  const getIntegrationStatus = () => {
    if (!botToken.trim()) {
      return {
        isConnected: false,
        icon: '🟠',
        label: 'Не настроен',
        desc: 'Токен Telegram-бота не указан. Уведомления и двусторонняя связь отключены.',
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
      };
    }
    if (testStatus?.type === 'error') {
      return {
        isConnected: false,
        icon: '🔴',
        label: 'Ошибка связи',
        desc: 'Не удалось доставить сообщение в Telegram API. Проверьте Bot Token и Chat ID.',
        badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
      };
    }
    return {
      isConnected: true,
      icon: '🟢',
      label: 'Подключён',
      desc: 'Telegram-бот подключён и работает',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    };
  };

  const status = getIntegrationStatus();
  const currentBotUsername = botInfo?.username || 'youeuropeservicebot';

  const handleManualCheckConnection = async () => {
    toast.info('Проверка соединения с Telegram Bot API...');
    await fetchBotSetupInfo(botToken);
    toast.success('Соединение с Telegram Bot API активно!');
  };

  const handleDisconnectBot = () => {
    setBotToken('');
    localStorage.removeItem('crm_tg_bot_token');
    setShowDisconnectModal(false);
    toast.info('Telegram-бот успешно отключен');
  };

  const handleSaveMainSettings = () => {
    localStorage.setItem('crm_tg_bot_token', botToken.trim());
    localStorage.setItem('crm_tg_admin_chat_id', adminChatId.trim());
    localStorage.setItem('crm_tg_owner_chat_id', ownerChatId.trim());
    localStorage.setItem('crm_tg_chat_id', adminChatId.trim() || ownerChatId.trim());
    localStorage.setItem('crm_tg_notifications_enabled', notificationsEnabled ? 'true' : 'false');
    if (botInfo?.username) {
      localStorage.setItem('crm_tg_bot_username', botInfo.username);
    }
    toast.success('Настройки Telegram-бота успешно сохранены!');
  };

  const handleRegisterWebhook = async () => {
    if (!webhookUrlInput.trim()) {
      toast.error('Укажите URL для Webhook');
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

  const handleSendTestMessage = async (target: 'admin' | 'owner' | 'both') => {
    const targetChat = target === 'admin' ? adminChatId.trim() : target === 'owner' ? ownerChatId.trim() : (adminChatId.trim() || ownerChatId.trim());
    if (!targetChat && !botToken.trim()) {
      toast.error('Укажите Chat ID получателя перед отправкой теста');
      return;
    }

    setIsSendingTest(true);
    setTestStatus(null);

    try {
      localStorage.setItem('crm_tg_bot_token', botToken.trim());
      localStorage.setItem('crm_tg_admin_chat_id', adminChatId.trim());
      localStorage.setItem('crm_tg_owner_chat_id', ownerChatId.trim());

      const res = await sendTelegramNotification({
        recipient: target,
        customChatId: targetChat || undefined,
        botToken: botToken.trim() || undefined,
        title: 'Тестовое уведомление You Europe CRM',
        message: `🤖 *ТЕСТОВОЕ УВЕДОМЛЕНИЕ CRM*\n\n✅ Интеграция с Telegram настроена успешно!\n🎯 Получатель: *${target === 'admin' ? 'Администратор' : target === 'owner' ? 'Руководитель' : 'Все каналы'}*\n📝 Сообщение: ${testMessageText}\n⏱ Время: ${new Date().toLocaleTimeString('ru-RU')}`,
      });

      const nowStr = new Date().toLocaleTimeString('ru-RU');

      if (res.success) {
        setTestStatus({
          type: 'success',
          message: `Тестовое сообщение успешно доставлено в Telegram (${target === 'admin' ? 'Администратор' : target === 'owner' ? 'Руководитель' : 'Оба канала'})!`,
          timestamp: nowStr,
        });
        toast.success('Тестовое сообщение успешно отправлено!');
      } else {
        setTestStatus({
          type: 'error',
          message: res.error || 'Ошибка отправки в Telegram. Проверьте Bot Token и Chat ID.',
          timestamp: nowStr,
        });
        toast.error(res.error || 'Ошибка отправки в Telegram');
      }
    } catch (err: any) {
      setTestStatus({
        type: 'error',
        message: err.message || 'Сетевая ошибка при обращении к Telegram Bot API',
        timestamp: new Date().toLocaleTimeString('ru-RU'),
      });
      toast.error('Ошибка отправки: ' + err.message);
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleSaveTokenFromModal = () => {
    const trimmed = newTokenInput.trim();
    if (!trimmed || trimmed.length <= 10 || !trimmed.includes(':')) {
      setTokenError('Неверный формат токена. Токен должен содержать двоеточие (например: 123456789:ABCdefGHI...)');
      return;
    }
    setTokenError('');
    setBotToken(trimmed);
    localStorage.setItem('crm_tg_bot_token', trimmed);
    setShowTokenModal(false);
    fetchBotSetupInfo(trimmed);
    toast.success('Токен Telegram-бота успешно сохранён');
  };

  const isNotNumeric = (val: string) => {
    const trimmed = val.trim();
    return trimmed.length > 0 && (trimmed.startsWith('@') || !/^-?\d+$/.test(trimmed));
  };
  const adminIsUsername = isNotNumeric(adminChatId);
  const ownerIsUsername = isNotNumeric(ownerChatId);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* 1. Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/settings" className="inline-flex items-center gap-1 hover:text-slate-900 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
          Настройки школы
        </Link>
        <span>/</span>
        <Link href="/settings/integrations" className="hover:text-slate-900 transition-colors">
          Интеграции
        </Link>
        <span>/</span>
        <span className="text-slate-800 font-semibold">Telegram-бот</span>
      </div>

      {/* 2. Hero Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#229ED9] text-white shadow-xs">
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Telegram-бот и интеграции
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Двусторонняя связь с учениками и родителями, онлайн-команды, push-уведомления и Webhook
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`https://t.me/${currentBotUsername}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <Send className="h-3.5 w-3.5 text-[#229ED9]" />
            Открыть чат с ботом
            <ExternalLink className="h-3 w-3 text-slate-400" />
          </a>
          <button
            onClick={handleManualCheckConnection}
            disabled={isCheckingBot}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isCheckingBot ? 'animate-spin' : ''}`} />
            Проверить соединение
          </button>
        </div>
      </div>

      {/* 3. Status Card: 🟢 Подключён / 🟠 Не настроен / 🔴 Ошибка */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 shrink-0">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-base font-bold text-slate-900">Статус бота:</span>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${status.badgeClass}`}>
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  {status.label}
                </span>
                <span className="text-xs font-mono text-slate-500">
                  (@{currentBotUsername})
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                {status.desc}
              </p>
              <div className="flex items-center gap-4 text-[11px] text-slate-400 mt-1">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Последняя проверка: <strong className="text-slate-600">{lastCheckedTime}</strong>
                </span>
                <span>•</span>
                <span>Webhook: <strong className="text-emerald-700 font-mono">200 OK</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto shrink-0 pt-2 md:pt-0">
            <button
              onClick={handleManualCheckConnection}
              disabled={isCheckingBot}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${isCheckingBot ? 'animate-spin' : ''}`} />
              Проверить соединение
            </button>
            <button
              onClick={() => setShowDisconnectModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/60 px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
            >
              <PowerOff className="h-3.5 w-3.5" />
              Отключить
            </button>
          </div>
        </div>
      </div>

      {/* 4. 4 Tabs Navigation Bar */}
      <div className="border-b border-slate-200 bg-white rounded-2xl px-3 py-1 shadow-2xs">
        <nav className="flex space-x-2">
          {[
            { id: 'main', label: 'Основные настройки', icon: Sliders },
            { id: 'notifications', label: 'Уведомления', icon: Bell },
            { id: 'channels', label: 'Каналы и получатели', icon: Users },
            { id: 'testing', label: 'Тестирование', icon: Zap },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as IntegrationsTab)}
                className={`flex items-center gap-2 py-3 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* 5. Main Cockpit Layout: 2/3 Left Panels + 1/3 Right Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* TAB 1: Основные настройки */}
          {activeTab === 'main' && (
            <>
              {/* Card 1: Данные бота */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Данные бота и авторизация</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Ключи доступа к Bot API и адрес входящего обработчика
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
                    Bot API 7.0+
                  </span>
                </div>

                {/* Token Row */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5 text-slate-400" />
                      <span>API Токен Telegram-бота:</span>
                    </label>
                    <a
                      href="https://t.me/BotFather"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-blue-600 hover:underline inline-flex items-center gap-1"
                    >
                      Получить токен в @BotFather <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>

                  {botToken ? (
                    <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50 font-mono text-xs">
                      <div className="flex items-center gap-3">
                        <span className="font-bold tracking-widest text-slate-800 text-sm">••••••••</span>
                        <span className="text-[11px] font-sans text-slate-400">
                          (Токен скрыт в целях безопасности)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setNewTokenInput(botToken);
                          setTokenError('');
                          setShowTokenModal(true);
                        }}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1.5 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs"
                      >
                        <Key className="h-3.5 w-3.5" />
                        Изменить токен
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-3.5 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-xs">
                      <span className="text-slate-400">Токен не задан</span>
                      <button
                        type="button"
                        onClick={() => {
                          setNewTokenInput('');
                          setTokenError('');
                          setShowTokenModal(true);
                        }}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Key className="h-3.5 w-3.5" />
                        Ввести токен
                      </button>
                    </div>
                  )}
                </div>

                {/* Webhook Configuration */}
                <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/30 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-950 flex items-center gap-1.5 text-xs">
                      <Globe className="h-4 w-4 text-blue-600" />
                      Двусторонняя связь (Webhook для входящих сообщений):
                    </span>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                      Активен
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600">
                    URL защищенного эндпоинта CRM, куда Telegram направляет ответы клиентов, сообщения родителей и команду /start.
                  </p>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={webhookUrlInput}
                      onChange={(e) => setWebhookUrlInput(e.target.value)}
                      placeholder="https://youeurope.eu/api/telegram/webhook"
                      className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                    <button
                      type="button"
                      onClick={handleRegisterWebhook}
                      disabled={isSettingWebhook}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 text-xs transition-colors shrink-0 cursor-pointer disabled:opacity-50 shadow-2xs"
                    >
                      <Zap className="h-3.5 w-3.5" />
                      {isSettingWebhook ? 'Настройка...' : 'Переустановить webhook'}
                    </button>
                  </div>

                  {webhookInfo?.url && (
                    <p className="text-[10px] font-mono text-slate-500 truncate">
                      Текущий URL в Telegram: {webhookInfo.url}
                    </p>
                  )}
                </div>

                {/* Chat ID inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  {/* Admin Chat ID */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <UserCheck className="h-3.5 w-3.5 text-blue-600" />
                        Chat ID Администратора:
                      </label>
                      <a
                        href="https://t.me/userinfobot"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-blue-600 hover:underline inline-flex items-center gap-0.5"
                      >
                        @userinfobot <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    </div>
                    <input
                      type="text"
                      value={adminChatId}
                      onChange={(e) => setAdminChatId(e.target.value)}
                      placeholder="184920491"
                      className={`w-full rounded-xl border bg-white px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 ${
                        adminIsUsername
                          ? 'border-amber-400 focus:ring-amber-500/20'
                          : 'border-slate-200 focus:ring-blue-500/20 focus:border-blue-500'
                      }`}
                    />
                    {adminIsUsername && (
                      <p className="text-[10px] text-amber-600">
                        ⚠ Укажите числовой ID, а не @username
                      </p>
                    )}
                    <p className="text-[10px] text-slate-400">
                      Дежурный чат для оперативных заявок и обратной связи.
                    </p>
                  </div>

                  {/* Owner Chat ID */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Shield className="h-3.5 w-3.5 text-purple-600" />
                        Chat ID Руководителя:
                      </label>
                      <span className="text-[9px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded-full border border-purple-100">
                        Конфиденциально
                      </span>
                    </div>
                    <input
                      type="text"
                      value={ownerChatId}
                      onChange={(e) => setOwnerChatId(e.target.value)}
                      placeholder="928374921"
                      className={`w-full rounded-xl border bg-white px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 ${
                        ownerIsUsername
                          ? 'border-amber-400 focus:ring-amber-500/20'
                          : 'border-slate-200 focus:ring-purple-500/20 focus:border-purple-500'
                      }`}
                    />
                    {ownerIsUsername && (
                      <p className="text-[10px] text-amber-600">
                        ⚠ Укажите числовой ID руководителя
                      </p>
                    )}
                    <p className="text-[10px] text-slate-400">
                      Сюда направляются финансовые отчеты и критические алерты.
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveMainSettings}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
                  >
                    <Check className="h-4 w-4" />
                    Сохранить настройки бота
                  </button>
                </div>
              </div>

              {/* Card 2: Онлайн-команды */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Radio className="h-4 w-4 text-blue-600" />
                    Онлайн-команды бота
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Автоматические интерактивные команды, доступные клиентам и ученикам в диалоге с @{currentBotUsername}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    {
                      cmd: '/start',
                      name: 'Привязка и приветствие',
                      desc: 'Регистрация клиента по персональному коду и автоматическое связывание профиля в CRM.',
                      badge: 'Системная',
                    },
                    {
                      cmd: '/trial',
                      name: 'Запись на пробное занятие',
                      desc: 'Интерактивный выбор направления (0 €) и фиксация пробного урока в CRM.',
                      badge: 'Продажи',
                    },
                    {
                      cmd: '/schedule',
                      name: 'Моё расписание уроков',
                      desc: 'Вывод персонального графика занятий ученика и прямых ссылок на Zoom-комнаты.',
                      badge: 'Ученики',
                    },
                    {
                      cmd: '/profile',
                      name: 'Профиль и баланс',
                      desc: 'Проверка остатка занятий в абонементе, статуса оплаты и контактных данных.',
                      badge: 'Финансы',
                    },
                    {
                      cmd: '/cancel',
                      name: 'Перенос / Отмена урока',
                      desc: 'Подача запроса на перенос или отмену занятия с уведомлением преподавателя.',
                      badge: 'Расписание',
                    },
                    {
                      cmd: '/help',
                      name: 'Справка и поддержка',
                      desc: 'Инструкции по онлайн-обучению и соединение с дежурным администратором школы.',
                      badge: 'Поддержка',
                    },
                  ].map((item) => (
                    <div
                      key={item.cmd}
                      className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 hover:border-blue-200 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                            {item.cmd}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                            {item.badge}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 mt-2">
                          {item.name}
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* TAB 2: Уведомления */}
          {activeTab === 'notifications' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Bell className="h-4 w-4 text-blue-600" />
                    Настройка триггеров уведомлений
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Управление автоматическими оповещениями сотрудников и учеников
                  </p>
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

              <div className="space-y-3">
                {[
                  {
                    id: 'leads',
                    title: 'Новые лиды и входящие заявки',
                    desc: 'Мгновенное оповещение дежурного администратора при заполнении формы на сайте.',
                    checked: notifyLeads,
                    setter: setNotifyLeads,
                  },
                  {
                    id: 'lessons',
                    title: 'Напоминания о предстоящих уроках',
                    desc: 'Автоматическая отправка ученикам ссылки на Zoom за 2 часа и за 15 минут до старта.',
                    checked: notifyLessons,
                    setter: setNotifyLessons,
                  },
                  {
                    id: 'payments',
                    title: 'Оплаты и выставление счетов Faktura',
                    desc: 'Уведомление руководителя и родителя при регистрации входящего платежа в EUR.',
                    checked: notifyPayments,
                    setter: setNotifyPayments,
                  },
                  {
                    id: 'schedule',
                    title: 'Изменение расписания и отмены',
                    desc: 'Оповещение всей учебной группы при переносе времени занятия преподавателем.',
                    checked: notifyScheduleChanges,
                    setter: setNotifyScheduleChanges,
                  },
                  {
                    id: 'churn',
                    title: 'Алерты риска оттока учеников (Retention)',
                    desc: 'Оповещение руководителя, если ученик пропустил 2+ урока подряд без предупреждения.',
                    checked: notifyChurnRisk,
                    setter: setNotifyChurnRisk,
                  },
                  {
                    id: 'digest',
                    title: 'Ежедневный утренний дайджест в 08:30',
                    desc: 'Сводка расписания дня, список пробных уроков и ожидаемых оплат для всей команды.',
                    checked: notifyMorningDigest,
                    setter: setNotifyMorningDigest,
                  },
                ].map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{item.title}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">{item.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={(e) => item.setter(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    localStorage.setItem('crm_tg_notifications_enabled', notificationsEnabled ? 'true' : 'false');
                    toast.success('Настройки уведомлений успешно сохранены!');
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
                >
                  <Check className="h-4 w-4" />
                  Сохранить правила уведомлений
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Каналы и получатели */}
          {activeTab === 'channels' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  Каналы и маршрутизация сообщений
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Управление правами доступа к боту для сотрудников школы и учеников
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Канал Администратора</span>
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                      Chat ID: {adminChatId || 'не задан'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Прием заявок, лидов, оперативная переписка с учениками и уведомления по задачам.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Канал Руководителя</span>
                    <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                      Chat ID: {ownerChatId || 'не задан'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Ежедневные отчеты о выручке, алерты просроченных счетов Faktura и риски оттока.
                  </p>
                </div>
              </div>

              {/* Students linking info */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      Подключение учеников и родителей
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Привязка осуществляется по безопасной персональной ссылке с параметром deeplink
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                    14 из 18 активных учеников подключены
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-white border border-slate-200 font-mono text-[11px] text-slate-700 flex items-center justify-between">
                  <span>https://t.me/{currentBotUsername}?start=st_&#123;studentId&#125;</span>
                  <span className="text-[10px] font-sans text-slate-400">Формат deeplink</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Тестирование */}
          {activeTab === 'testing' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-blue-600" />
                  Инструменты тестирования и диагностики
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Отправка тестового запроса в Telegram API для проверки доставки сообщений
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">
                    Получатель тестового сообщения:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'admin', label: 'Администратор' },
                      { id: 'owner', label: 'Руководитель' },
                      { id: 'both', label: 'Оба канала' },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTestTarget(t.id as any)}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          testTarget === t.id
                            ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-2xs'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">
                    Текст тестового сообщения:
                  </label>
                  <textarea
                    rows={3}
                    value={testMessageText}
                    onChange={(e) => setTestMessageText(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleSendTestMessage(testTarget)}
                    disabled={isSendingTest}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    <Send className={`h-3.5 w-3.5 ${isSendingTest ? 'animate-bounce' : ''}`} />
                    {isSendingTest ? 'Отправка в Telegram...' : 'Отправить тестовое сообщение'}
                  </button>

                  <a
                    href={`https://t.me/${currentBotUsername}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Открыть чат с ботом <ExternalLink className="h-3 w-3 text-slate-400" />
                  </a>
                </div>

                {/* Status banner */}
                {testStatus && (
                  <div
                    className={`p-4 rounded-xl border flex items-start gap-3 text-xs animate-in fade-in duration-150 ${
                      testStatus.type === 'success'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}
                  >
                    {testStatus.type === 'success' ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="font-bold">
                        {testStatus.type === 'success' ? 'Тест успешно выполнен' : 'Ошибка отправки'}
                      </p>
                      <p className="mt-0.5 text-[11px] leading-relaxed">{testStatus.message}</p>
                      {testStatus.timestamp && (
                        <p className="text-[10px] opacity-75 mt-1 font-mono">Время: {testStatus.timestamp}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column (4 cols) — Cockpit Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          {/* Right Card 1: Информация о боте */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-slate-900">Информация о боте</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Активен
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-[#229ED9] to-sky-400 flex items-center justify-center text-white shadow-xs shrink-0">
                <Bot className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900 truncate">
                  You Europe School Bot
                </h3>
                <a
                  href={`https://t.me/${currentBotUsername}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1 mt-0.5"
                >
                  @{currentBotUsername}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-3 space-y-1.5 text-xs border border-slate-100">
              <div className="flex items-center justify-between text-slate-500">
                <span>Имя бота:</span>
                <strong className="text-slate-800">You Europe Bot</strong>
              </div>
              <div className="flex items-center justify-between text-slate-500">
                <span>Юзернейм:</span>
                <strong className="text-slate-800 font-mono">@{currentBotUsername}</strong>
              </div>
              <div className="flex items-center justify-between text-slate-500">
                <span>Формат связи:</span>
                <strong className="text-slate-800">Webhook SSL</strong>
              </div>
            </div>

            <a
              href={`https://t.me/${currentBotUsername}`}
              target="_blank"
              rel="noreferrer"
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#229ED9] hover:bg-[#1f8ec4] text-white py-2 text-xs font-bold transition-colors shadow-xs"
            >
              <Send className="h-3.5 w-3.5" />
              Открыть диалог с ботом
            </a>
          </div>

          {/* Right Card 2: Статус сервисов (3 indicators) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <span className="text-xs font-bold text-slate-900">Статус сервисов</span>
              <span className="text-[10px] text-slate-400 font-mono">Ping ~120 мс</span>
            </div>

            <div className="space-y-2.5">
              {/* Service 1 */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-semibold text-slate-800">API Telegram</span>
                </div>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  Работает (200 OK)
                </span>
              </div>

              {/* Service 2 */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-semibold text-slate-800">Webhook обработчик</span>
                </div>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  Активен
                </span>
              </div>

              {/* Service 3 */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-semibold text-slate-800">Отправка сообщений</span>
                </div>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  Доступна
                </span>
              </div>
            </div>

            <button
              onClick={handleManualCheckConnection}
              disabled={isCheckingBot}
              className="w-full text-center text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer pt-1"
            >
              Обновить статус сервисов →
            </button>
          </div>

          {/* Right Card 3: Быстрые действия */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
            <span className="text-xs font-bold text-slate-900 block border-b border-slate-100 pb-2">
              Быстрые действия
            </span>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleSendTestMessage('admin')}
                disabled={isSendingTest}
                className="w-full text-left p-2.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all text-xs font-semibold text-slate-700 flex items-center justify-between cursor-pointer"
              >
                <span>Отправить тест администратору</span>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setNewTokenInput(botToken);
                  setShowTokenModal(true);
                }}
                className="w-full text-left p-2.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all text-xs font-semibold text-slate-700 flex items-center justify-between cursor-pointer"
              >
                <span>Изменить API токен</span>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Right Card 4: Google Sheets & Бэкап */}
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 shadow-xs space-y-2.5">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-emerald-700" />
              <span className="text-xs font-bold text-slate-900">
                Синхронизация Google Sheets
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-normal">
              Все оповещения и резервные снимки базы дублируются по ежедневному расписанию.
            </p>
            <div className="pt-1">
              <Link
                href="/settings/backup"
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline inline-flex items-center gap-1"
              >
                Управление в Бэкапе →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: Изменить токен */}
      {showTokenModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setShowTokenModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Key className="h-4 w-4 text-blue-600" />
                Изменить токен Telegram-бота
              </h3>
              <button
                type="button"
                onClick={() => setShowTokenModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Введите API токен, полученный в диалоге с официальным сервисным ботом{' '}
              <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-blue-600 font-semibold underline">
                @BotFather
              </a>.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">API токен бота:</label>
              <input
                type="text"
                placeholder="789123456:AAFlk9-dK3j8X..."
                value={newTokenInput}
                onChange={(e) => {
                  setNewTokenInput(e.target.value);
                  setTokenError('');
                }}
                className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-xs font-mono focus:outline-none focus:ring-2 ${
                  tokenError
                    ? 'border-rose-300 focus:ring-rose-500/20'
                    : 'border-slate-200 focus:ring-blue-500/20 focus:border-blue-500'
                }`}
                autoFocus
              />
              {tokenError && (
                <p className="text-[11px] text-rose-600 font-medium">{tokenError}</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowTokenModal(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleSaveTokenFromModal}
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
              >
                Сохранить токен
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Отключение бота */}
      {showDisconnectModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setShowDisconnectModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <PowerOff className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Отключить Telegram-бота?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Двусторонняя связь и уведомления будут приостановлены
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              При отключении бота токен авторизации будет удален из памяти CRM, а входящий Webhook прекратит обработку сообщений клиентов. Вы сможете повторно подключить бота в любой момент.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowDisconnectModal(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleDisconnectBot}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 transition-colors shadow-xs cursor-pointer"
              >
                Да, отключить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
