'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Shield,
  ChevronRight,
  Lock,
  Database,
  ArrowLeft,
  AlertTriangle,
} from 'lucide-react';
import { AuditEvent, AuditEventsResponse } from '@/lib/audit/types';
import {
  AuditFilterControls,
  AuditTabType,
} from '@/components/settings/audit/AuditFilterControls';
import { AuditEventsTable } from '@/components/settings/audit/AuditEventsTable';
import { AuditEventDetailsModal } from '@/components/settings/audit/AuditEventDetailsModal';

export default function AuditSettingsPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [totalEvents, setTotalEvents] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters
  const [currentTab, setCurrentTab] = useState<AuditTabType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [resultFilter, setResultFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Selected event for details modal
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);

  const fetchAuditEvents = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      if (currentTab !== 'all') params.set('tab', currentTab);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (resultFilter) params.set('result', resultFilter);
      if (sourceFilter) params.set('source', sourceFilter);
      if (roleFilter) params.set('role', roleFilter);

      const res = await fetch(`/api/audit-events?${params.toString()}`);
      if (!res.ok) {
        if (res.status === 403 || res.status === 401) {
          throw new Error('Доступ запрещен: требуется роль администратора или владельца');
        }
        throw new Error(`Ошибка загрузки журнала (${res.status})`);
      }

      const data: AuditEventsResponse = await res.json();
      setEvents(data.events || []);
      setTotalEvents(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err: any) {
      console.error('Fetch audit events failed:', err);
      setErrorMessage(err.message || 'Не удалось загрузить события аудита');
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, currentTab, searchQuery, resultFilter, sourceFilter, roleFilter]);

  useEffect(() => {
    fetchAuditEvents();
  }, [fetchAuditEvents]);

  const handleTabChange = (tab: AuditTabType) => {
    setCurrentTab(tab);
    setPage(1);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setPage(1);
  };

  const handleResultChange = (res: string) => {
    setResultFilter(res);
    setPage(1);
  };

  const handleSourceChange = (src: string) => {
    setSourceFilter(src);
    setPage(1);
  };

  const handleRoleChange = (role: string) => {
    setRoleFilter(role);
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* BREADCRUMB NAVIGATION */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/settings" className="hover:text-slate-900 transition-colors flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Настройки</span>
        </Link>
        <ChevronRight className="w-3 h-3 text-slate-400" />
        <span className="font-semibold text-slate-800">Журнал действий</span>
      </div>

      {/* PAGE HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
                Журнал действий (Audit Trail)
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Неизменяемый реестр ключевых действий пользователей и фоновых процессов системы
              </p>
            </div>
          </div>
        </div>

        {/* SECURITY STATUS BADGE */}
        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3.5 py-1.5 rounded-xl text-xs font-semibold self-start md:self-auto">
          <Lock className="w-4 h-4 text-emerald-600" />
          <span>Append-Only Immutability Active</span>
        </div>
      </div>

      {/* ERROR NOTICE IF ACCESS FORBIDDEN */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* FILTER CONTROLS */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <AuditFilterControls
          currentTab={currentTab}
          onTabChange={handleTabChange}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          resultFilter={resultFilter}
          onResultChange={handleResultChange}
          sourceFilter={sourceFilter}
          onSourceChange={handleSourceChange}
          roleFilter={roleFilter}
          onRoleChange={handleRoleChange}
          onRefresh={fetchAuditEvents}
          isLoading={isLoading}
        />
      </div>

      {/* AUDIT EVENTS TABLE */}
      <AuditEventsTable
        events={events}
        isLoading={isLoading}
        page={page}
        totalPages={totalPages}
        totalEvents={totalEvents}
        onPageChange={(newPage) => setPage(newPage)}
        onSelectEvent={(event) => setSelectedEvent(event)}
      />

      {/* AUDIT EVENT DETAILS MODAL */}
      <AuditEventDetailsModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onFilterByRequestId={(reqId) => {
          setSearchQuery(reqId);
          setPage(1);
        }}
      />
    </div>
  );
}
