'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  FileSpreadsheet,
  Download,
  Cloud,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Clock,
  Database,
  Layers,
  ChevronDown,
  ChevronUp,
  Trash2
} from 'lucide-react';
import { useRole } from '@/context/RoleContext';

const APPS_SCRIPT_CODE = `function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    for (var sheetName in data.tables) {
      var rows = data.tables[sheetName];
      if (!rows || rows.length === 0) continue;
      
      var sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        sheet = ss.insertSheet(sheetName);
      } else {
        sheet.clear();
      }
      
      var headers = Object.keys(rows[0]);
      var sheetData = [headers];
      
      for (var i = 0; i < rows.length; i++) {
        var row = [];
        for (var j = 0; j < headers.length; j++) {
          var val = rows[i][headers[j]];
          row.push(val !== null && val !== undefined ? String(val) : '');
        }
        sheetData.push(row);
      }
      
      sheet.getRange(1, 1, sheetData.length, headers.length).setValues(sheetData);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#D3E4FF");
      sheet.autoResizeColumns(1, headers.length);
    }
    
    var metaSheet = ss.getSheetByName("Инфо о бэкапе");
    if (!metaSheet) metaSheet = ss.insertSheet("Инфо о бэкапе");
    metaSheet.clear();
    metaSheet.getRange(1, 1, 3, 2).setValues([
      ["Дата обновления", new Date().toLocaleString("ru-RU")],
      ["Школа", data.schoolName || "CRM School"],
      ["Статус", "Успешно синхронизировано"]
    ]);
    metaSheet.getRange(1, 1, 3, 1).setFontWeight("bold");
    
    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;

export default function DatabaseBackupPage() {
  const { role, isOwner } = useRole();
  const [downloading, setDownloading] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string; timestamp?: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showScriptDetails, setShowScriptDetails] = useState(false);
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(null);

  // Load saved settings
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedUrl = localStorage.getItem('school_crm_sheets_webhook');
      if (savedUrl) setWebhookUrl(savedUrl);

      const savedTime = localStorage.getItem('school_crm_last_backup_time');
      if (savedTime) setLastBackupTime(savedTime);
    }
  }, []);

  const handleDownloadExcel = async () => {
    try {
      setDownloading(true);
      const res = await fetch('/api/backup/export?format=excel');
      if (!res.ok) {
        throw new Error('Ошибка скачивания');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const today = new Date().toISOString().split('T')[0];
      a.download = `school_crm_backup_${today}.xls`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      const nowStr = new Date().toLocaleString('ru-RU');
      setLastBackupTime(nowStr);
      localStorage.setItem('school_crm_last_backup_time', nowStr);
    } catch (err: any) {
      alert('Не удалось скачать резервную копию: ' + err.message);
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_CODE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSaveAndSync = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhookUrl.trim()) {
      alert('Пожалуйста, вставьте URL вебхука Google Таблицы');
      return;
    }

    try {
      setSyncing(true);
      setSyncResult(null);

      localStorage.setItem('school_crm_sheets_webhook', webhookUrl.trim());

      const res = await fetch('/api/backup/google-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl: webhookUrl.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSyncResult({
          success: false,
          message: data.error || 'Ошибка при синхронизации с Google Таблицами',
        });
      } else {
        const nowStr = new Date().toLocaleString('ru-RU');
        setLastBackupTime(nowStr);
        localStorage.setItem('school_crm_last_backup_time', nowStr);

        setSyncResult({
          success: true,
          message: `Синхронизировано успешно! Таблицы: ${data.syncedTables?.join(', ')} (${data.totalRecords} записей)`,
          timestamp: nowStr,
        });
      }
    } catch (err: any) {
      setSyncResult({
        success: false,
        message: 'Сетевая ошибка при отправке запроса: ' + err.message,
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/settings" className="inline-flex items-center gap-1 hover:text-slate-900 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
          Назад к настройкам
        </Link>
        <span>/</span>
        <span className="text-slate-800 font-semibold">Резервное копирование</span>
      </div>

      {/* Hero Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Резервное копирование базы данных
          </h1>
          <p className="text-sm text-slate-500 max-w-2xl">
            Экспорт в человекочитаемом формате (Excel и Google Таблицы) на случай сбоев сервера или базы данных. Защита от потери контактов, учеников и оплат.
          </p>
        </div>
        {lastBackupTime && (
          <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3.5 py-2 text-xs text-slate-600 self-start sm:self-auto">
            <Clock size={14} className="text-slate-400" />
            <span>Последняя копия: <strong>{lastBackupTime}</strong></span>
          </div>
        )}
      </div>

      {/* Grid: 2 Columns for Backup options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Option 1: Excel .XLSX Instant Export */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-xs">
                <FileSpreadsheet className="h-6 w-6" />
              </div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                1 клик
              </span>
            </div>

            <h2 className="text-lg font-bold text-slate-900 mt-4">
              Скачать файл Excel (.xls / .xlsx)
            </h2>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              Мгновенная выгрузка всей базы данных школы в один многостраничный файл. Все таблицы структурированы по отдельным вкладкам с русскими заголовками.
            </p>

            <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 border border-slate-100">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <span><strong>Листы:</strong> Сотрудники, Ученики, Родители, Курсы, Группы, Оплаты</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <span>Открывается в Microsoft Excel, Google Таблицах и Apple Numbers</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <button
              onClick={handleDownloadExcel}
              disabled={downloading}
              className="w-full md-btn md-btn-filled flex items-center justify-center gap-2 text-sm font-semibold"
              style={{ height: '46px' }}
            >
              <Download size={18} className={downloading ? 'animate-bounce' : ''} />
              {downloading ? 'Формирование файла...' : 'Скачать резервную копию (Excel)'}
            </button>
          </div>
        </div>

        {/* Option 2: Google Sheets Live Sync */}
        <div className="rounded-2xl border border-blue-200 bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-xs">
                <Cloud className="h-6 w-6" />
              </div>
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 border border-blue-200">
                Онлайн-синхронизация
              </span>
            </div>

            <h2 className="text-lg font-bold text-slate-900 mt-4">
              Синхронизация с Google Таблицами
            </h2>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              Автоматическая передача данных в вашу личную Google Таблицу. База обновляется в реальном времени и всегда доступна по ссылке с телефона и любого компьютера.
            </p>

            {/* Sync form */}
            <form onSubmit={handleSaveAndSync} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  URL вебхука Google Таблицы:
                </label>
                <input
                  type="url"
                  placeholder="https://script.google.com/macros/s/.../exec"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              {syncResult && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                    syncResult.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  {syncResult.success ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="font-semibold">{syncResult.success ? 'Успешно!' : 'Ошибка'}</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed">{syncResult.message}</p>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={syncing}
                className="w-full md-btn md-btn-tonal flex items-center justify-center gap-2 text-xs font-bold"
                style={{ height: '42px' }}
              >
                <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
                {syncing ? 'Синхронизация...' : 'Синхронизировать сейчас'}
              </button>
            </form>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            <button
              onClick={() => setShowScriptDetails(!showScriptDetails)}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1 cursor-pointer"
            >
              {showScriptDetails ? 'Скрыть инструкцию подключения' : 'Инструкция подключения Google Таблицы (3 шага)'}
              {showScriptDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>
      </div>

      {/* Accordion: 3-step setup guide for Google Sheets */}
      {showScriptDetails && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ExternalLink className="h-5 w-5 text-blue-600" />
            Как подключить Google Таблицу за 2 минуты:
          </h3>

          <ol className="space-y-3 text-xs text-slate-700 list-decimal list-inside leading-relaxed">
            <li>
              Создайте новую пустую таблицу на <strong>Google Диске</strong> (или откройте <a href="https://sheets.new" target="_blank" rel="noreferrer" className="text-blue-600 font-bold underline">sheets.new</a>).
            </li>
            <li>
              В меню таблицы нажмите <strong>Расширения</strong> → <strong>Apps Script</strong>.
            </li>
            <li>
              Удалите стандартный текст и вставьте код вебхука, приведенный ниже:
            </li>
          </ol>

          <div className="relative rounded-xl bg-slate-900 text-slate-100 p-4 font-mono text-[11px] max-h-60 overflow-y-auto">
            <button
              onClick={handleCopyCode}
              className="absolute top-3 right-3 rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-white hover:bg-slate-700 flex items-center gap-1.5 shadow-sm"
            >
              {copiedCode ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              {copiedCode ? 'Скопировано!' : 'Скопировать код'}
            </button>
            <pre>{APPS_SCRIPT_CODE}</pre>
          </div>

          <ol start={4} className="space-y-2 text-xs text-slate-700 list-decimal list-inside leading-relaxed pt-2">
            <li>
              Нажмите синюю кнопку <strong>«Начать развертывание»</strong> (Deploy) → <strong>«Новое развертывание»</strong> (New deployment).
            </li>
            <li>
              Тип выберите <strong>«Веб-приложение»</strong> (Web app). В поле «Кто имеет доступ» (Who has access) выберите <strong>«Все»</strong> (Anyone).
            </li>
            <li>
              Нажмите «Развернуть» и скопируйте полученный <strong>URL веб-приложения</strong> в поле выше.
            </li>
          </ol>
        </div>
      )}

      {/* Daily Automation & Disaster Recovery Card */}
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-blue-50/40 p-6 shadow-xs space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 font-bold">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Автоматическое ежедневное резервное копирование
            </h3>
            <p className="text-xs text-slate-500">
              Расписание Cron запускается раз в сутки в 03:00 ночи (UTC)
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Система оснащена фоновым планировщиком (Cron endpoint <code>/api/backup/cron</code>). Если вы привязали Google Таблицу, каждую ночь сервер отправляет актуальный снимок базы данных, гарантируя 100% сохранность клиентской базы даже при любых форс-мажорах с инфраструктурой.
        </p>

        <div className="flex items-center gap-4 text-xs font-semibold text-slate-700 pt-2 border-t border-slate-200/60">
          <span className="inline-flex items-center gap-1.5 text-emerald-700">
            <CheckCircle2 size={14} /> Защита от сбоев активна
          </span>
          <span className="inline-flex items-center gap-1.5 text-blue-700">
            <Database size={14} /> Формат хранения: Открытый (Excel / Sheets)
          </span>
        </div>
      </div>

      {/* Mock Data Cleanup — only for developer/owner */}
      {(role === 'developer' || role === 'owner') && (
        <MockDataCleanupSection />
      )}
    </div>
  );
}

function MockDataCleanupSection() {
  const [loading, setLoading] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState('');

  const handleDelete = async () => {
    if (!confirm(
      'Удалить все тестовые данные из базы данных Supabase?\n\n' +
      'Это действие необратимо. Будут удалены:\n' +
      '• Тестовые ученики\n• Тестовые родители\n• Тестовые лиды\n• Тестовые оплаты\n• Тестовые задачи\n• Тестовые взаимодействия\n\n' +
      'Реальные данные останутся нетронутыми.'
    )) return;

    setLoading(true);
    setError('');
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc('delete_mock_data');
      if (rpcError) {
        setError(rpcError.message);
      } else {
        setDone(true);
        // Also clear localStorage mock data
        try {
          localStorage.removeItem('crm_students_v2');
          localStorage.removeItem('crm_payments_v2');
          localStorage.removeItem('crm_leads_v2');
          localStorage.removeItem('crm_tasks_v1');
          localStorage.removeItem('crm_timeline_interactions_v1');
        } catch {}
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка удаления');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-6 shadow-xs space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
          <Layers className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">Удаление тестовых данных</h3>
          <p className="text-xs text-slate-500">Очистка демо-данных из базы данных Supabase</p>
        </div>
      </div>

      <p className="text-xs text-slate-600 leading-relaxed">
        Тестовые записи (ученики, оплаты, задачи, лиды и т.д.) помечены флагом <code>is_mock_data = true</code>.
        Эта операция удалит только их, не затрагивая реальные данные школы.
      </p>

      {done && (
        <div className="flex items-center gap-2 text-emerald-700 text-xs font-semibold bg-emerald-50 rounded-xl p-3">
          <CheckCircle2 size={16} />
          Тестовые данные успешно удалены из базы и localStorage!
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-rose-700 text-xs font-semibold bg-rose-100 rounded-xl p-3">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <button
        onClick={handleDelete}
        disabled={loading || done}
        className="inline-flex items-center gap-2 rounded-xl border border-rose-300 bg-white px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 transition-colors disabled:opacity-50"
      >
        {loading ? (
          <RefreshCw size={14} className="animate-spin" />
        ) : (
          <Trash2 size={14} />
        )}
        {done ? 'Удалено' : loading ? 'Удаление...' : 'Удалить тестовые данные'}
      </button>
    </div>
  );
}
