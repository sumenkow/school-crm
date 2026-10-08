'use client';

import React from 'react';
import {
  Clock,
  User,
  Shield,
  Layers,
  Globe,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileSearch,
} from 'lucide-react';
import { AuditEvent } from '@/lib/audit/types';

interface AuditEventsTableProps {
  events: AuditEvent[];
  isLoading: boolean;
  page: number;
  totalPages: number;
  totalEvents: number;
  onPageChange: (newPage: number) => void;
  onSelectEvent: (event: AuditEvent) => void;
}

export function AuditEventsTable({
  events,
  isLoading,
  page,
  totalPages,
  totalEvents,
  onPageChange,
  onSelectEvent,
}: AuditEventsTableProps) {
  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const seconds = String(d.getSeconds()).padStart(2, '0');
      return `${day}.${month} ${hours}:${minutes}:${seconds}`;
    } catch {
      return iso;
    }
  };

  if (isLoading && events.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
        <div className="inline-block animate-spin text-indigo-600 mb-3">
          <Shield className="w-8 h-8" />
        </div>
        <p className="text-sm font-semibold text-slate-700">Загрузка журнала действий...</p>
        <p className="text-xs text-slate-400 mt-1">Подключение к хранилищу PostgreSQL audit_events</p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-xs">
        <FileSearch className="w-12 h-12 mx-auto text-slate-300 mb-3" />
        <h3 className="text-sm font-bold text-slate-800">Записи не найдены</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
          По заданным критериям фильтрации и поисковому запросу события аудита отсутствуют.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
      {/* 1440x900 DESKTOP TABLE WITH EXACT COLUMN BUDGET */}
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse table-fixed">
          <thead>
            <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <th className="py-3 px-3.5 w-[130px]">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Время</span>
                </div>
              </th>
              <th className="py-3 px-3.5 w-[180px]">
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Пользователь</span>
                </div>
              </th>
              <th className="py-3 px-3.5 w-[180px]">
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-slate-400" />
                  <span>Действие</span>
                </div>
              </th>
              <th className="py-3 px-3.5 w-[210px]">
                <div className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                  <span>Объект</span>
                </div>
              </th>
              <th className="py-3 px-3.5 w-[100px]">Результат</th>
              <th className="py-3 px-3.5 w-[100px]">
                <div className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                  <span>Источник</span>
                </div>
              </th>
              <th className="py-3 px-3.5 w-[130px] text-right">Детали</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {events.map((event) => {
              const isSuccess = event.result === 'SUCCESS';
              const hasDiff =
                event.changed_fields && Object.keys(event.changed_fields).length > 0;

              return (
                <tr
                  key={event.id}
                  onClick={() => onSelectEvent(event)}
                  className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                >
                  {/* TIME */}
                  <td className="py-3 px-3.5 font-mono text-[11px] text-slate-600 truncate">
                    {formatTime(event.created_at)}
                  </td>

                  {/* USER / ACTOR */}
                  <td className="py-3 px-3.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-semibold text-slate-900 truncate">
                        {event.actor_name_snapshot}
                      </span>
                      {event.actor_role_snapshot && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-mono shrink-0">
                          {event.actor_role_snapshot}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* ACTION */}
                  <td className="py-3 px-3.5">
                    <div className="min-w-0">
                      <span className="font-mono text-[11px] font-bold text-slate-800 block truncate">
                        {event.action}
                      </span>
                      <span className="text-[11px] text-slate-500 block truncate">
                        {event.description}
                      </span>
                    </div>
                  </td>

                  {/* ENTITY */}
                  <td className="py-3 px-3.5">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-900 truncate">
                          {event.entity_name_snapshot || event.entity_id}
                        </span>
                        <span className="text-[10px] px-1 py-0.2 rounded bg-indigo-50 text-indigo-700 font-mono shrink-0">
                          {event.entity_type}
                        </span>
                      </div>
                      {hasDiff && (
                        <span className="text-[10px] text-emerald-600 font-medium block truncate">
                          • {Object.keys(event.changed_fields!).length} измененных полей
                        </span>
                      )}
                    </div>
                  </td>

                  {/* RESULT */}
                  <td className="py-3 px-3.5">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        isSuccess
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                          : 'bg-rose-50 text-rose-700 border border-rose-200/60'
                      }`}
                    >
                      {isSuccess ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" /> OK
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-3 h-3" /> Сбой
                        </>
                      )}
                    </span>
                  </td>

                  {/* SOURCE */}
                  <td className="py-3 px-3.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-100 text-slate-600">
                      {event.source}
                    </span>
                  </td>

                  {/* DETAILS CTA */}
                  <td className="py-3 px-3.5 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectEvent(event);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg text-xs font-semibold transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Подробнее</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* PAGINATION BAR */}
      <div className="flex items-center justify-between px-6 py-3.5 bg-slate-50/70 border-t border-slate-200 text-xs text-slate-500">
        <div>
          <span>Всего записей: </span>
          <strong className="text-slate-900 font-bold">{totalEvents}</strong>
          <span className="text-slate-400 mx-2">|</span>
          <span>
            Страница <strong className="text-slate-900">{page}</strong> из{' '}
            <strong className="text-slate-900">{totalPages || 1}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1 || isLoading}
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1 shadow-2xs"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Назад</span>
          </button>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages || isLoading}
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1 shadow-2xs"
          >
            <span>Вперед</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
