'use client';

import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Shield,
  Clock,
  User,
  Globe,
  Activity,
  FileText,
  AlertCircle,
  CheckCircle2,
  Code,
  Layers,
} from 'lucide-react';
import { AuditEvent } from '@/lib/audit/types';

interface AuditEventDetailsModalProps {
  event: AuditEvent | null;
  onClose: () => void;
  onFilterByRequestId?: (requestId: string) => void;
}

export function AuditEventDetailsModal({
  event,
  onClose,
  onFilterByRequestId,
}: AuditEventDetailsModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'diff' | 'payload' | 'meta'>('diff');

  if (!event) return null;

  const copyToClipboard = (text: string, fieldKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const changedFieldsList = event.changed_fields
    ? Object.entries(event.changed_fields)
    : [];

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  const isSuccess = event.result === 'SUCCESS';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`p-2 rounded-xl flex items-center justify-center ${
                isSuccess ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
              }`}
            >
              <Shield className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-slate-900 truncate">
                  {event.action}
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                    isSuccess
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {isSuccess ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" /> Успешно
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3.5 h-3.5" /> Ошибка
                    </>
                  )}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 truncate">{event.description}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors"
            title="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* METADATA SUMMARY BAR */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-6 py-3.5 bg-slate-100/50 border-b border-slate-100 text-xs">
          <div>
            <span className="text-slate-500 block">Время события:</span>
            <span className="font-medium text-slate-800 flex items-center gap-1.5 mt-0.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              {formatDate(event.created_at)}
            </span>
          </div>

          <div>
            <span className="text-slate-500 block">Инициатор:</span>
            <span className="font-medium text-slate-800 flex items-center gap-1.5 mt-0.5 truncate">
              <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{event.actor_name_snapshot}</span>
              {event.actor_role_snapshot && (
                <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-mono">
                  {event.actor_role_snapshot}
                </span>
              )}
            </span>
          </div>

          <div>
            <span className="text-slate-500 block">Сущность:</span>
            <span className="font-medium text-slate-800 flex items-center gap-1.5 mt-0.5 truncate">
              <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="font-semibold text-slate-900">{event.entity_type}</span>
              {event.entity_name_snapshot && (
                <span className="text-slate-600 truncate">({event.entity_name_snapshot})</span>
              )}
            </span>
          </div>

          <div>
            <span className="text-slate-500 block">Источник & IP:</span>
            <span className="font-medium text-slate-800 flex items-center gap-1.5 mt-0.5 truncate">
              <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{event.source}</span>
              {event.ip_address && (
                <span className="text-slate-500 font-mono text-[11px] truncate">
                  ({event.ip_address})
                </span>
              )}
            </span>
          </div>
        </div>

        {/* TABS */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('diff')}
            className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'diff'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Изменения полей ({changedFieldsList.length})
          </button>
          <button
            onClick={() => setActiveTab('payload')}
            className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'payload'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            Снимки состояния (JSON)
          </button>
          <button
            onClick={() => setActiveTab('meta')}
            className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'meta'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Технические реквизиты
          </button>
        </div>

        {/* TAB CONTENTS */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeTab === 'diff' && (
            <div>
              {changedFieldsList.length === 0 ? (
                <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Activity className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-medium text-slate-600">
                    Прямых изменений полей не зафиксировано
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Операция не модифицировала значения отдельных полей объекта
                  </p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-semibold">
                        <th className="py-2.5 px-4 w-1/4">Поле</th>
                        <th className="py-2.5 px-4 w-3/8 text-rose-800">Было (Предыдущее)</th>
                        <th className="py-2.5 px-4 w-3/8 text-emerald-800">Стало (Новое)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {changedFieldsList.map(([field, delta]) => (
                        <tr key={field} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4 font-semibold text-slate-700 break-all font-sans">
                            {field}
                          </td>
                          <td className="py-3 px-4 text-rose-700 bg-rose-50/40 break-all align-top">
                            {delta.old === null || delta.old === undefined ? (
                              <span className="text-slate-400 italic font-sans">— пусто —</span>
                            ) : typeof delta.old === 'object' ? (
                              JSON.stringify(delta.old, null, 1)
                            ) : (
                              String(delta.old)
                            )}
                          </td>
                          <td className="py-3 px-4 text-emerald-700 bg-emerald-50/40 break-all align-top">
                            {delta.new === null || delta.new === undefined ? (
                              <span className="text-slate-400 italic font-sans">— удалено —</span>
                            ) : typeof delta.new === 'object' ? (
                              JSON.stringify(delta.new, null, 1)
                            ) : (
                              String(delta.new)
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'payload' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-700">До изменений (Before Data)</span>
                  {event.before_data && (
                    <button
                      onClick={() =>
                        copyToClipboard(JSON.stringify(event.before_data, null, 2), 'before')
                      }
                      className="text-[11px] text-slate-500 hover:text-slate-700 flex items-center gap-1"
                    >
                      {copiedField === 'before' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      Копировать
                    </button>
                  )}
                </div>
                <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl text-[11px] font-mono overflow-x-auto max-h-72">
                  {event.before_data ? JSON.stringify(event.before_data, null, 2) : '// Нет данных до операции'}
                </pre>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-700">После изменений (After Data)</span>
                  {event.after_data && (
                    <button
                      onClick={() =>
                        copyToClipboard(JSON.stringify(event.after_data, null, 2), 'after')
                      }
                      className="text-[11px] text-slate-500 hover:text-slate-700 flex items-center gap-1"
                    >
                      {copiedField === 'after' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      Копировать
                    </button>
                  )}
                </div>
                <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl text-[11px] font-mono overflow-x-auto max-h-72">
                  {event.after_data ? JSON.stringify(event.after_data, null, 2) : '// Нет данных после операции'}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'meta' && (
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs space-y-3 font-mono">
              <div className="flex items-start justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-sans">ID события (UUID):</span>
                <span className="text-slate-800 font-bold select-all">{event.id}</span>
              </div>

              <div className="flex items-start justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-sans">ID запроса (Request ID):</span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-800 select-all font-semibold">
                    {event.request_id || '—'}
                  </span>
                  {event.request_id && (
                    <>
                      <button
                        onClick={() => copyToClipboard(event.request_id!, 'reqId')}
                        className="p-1 hover:bg-slate-200 rounded text-slate-500"
                        title="Копировать ID"
                      >
                        {copiedField === 'reqId' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      </button>
                      {onFilterByRequestId && (
                        <button
                          onClick={() => {
                            onFilterByRequestId(event.request_id!);
                            onClose();
                          }}
                          className="text-[10px] bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-2 py-0.5 rounded font-sans font-medium"
                        >
                          Найти связанные
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-start justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-sans">ID сессии:</span>
                <span className="text-slate-800 select-all">{event.session_id || '—'}</span>
              </div>

              <div className="flex items-start justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-sans">User Agent:</span>
                <span className="text-slate-700 max-w-md text-right break-words text-[11px]">
                  {event.user_agent || '—'}
                </span>
              </div>

              {event.metadata && Object.keys(event.metadata).length > 0 && (
                <div className="pt-1">
                  <span className="text-slate-500 font-sans block mb-1">Дополнительные метаданные:</span>
                  <pre className="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 text-[11px]">
                    {JSON.stringify(event.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-600" />
            <span>Неизменяемая запись PostgreSQL audit_events</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
