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
import { getLocalAuditEvents } from '@/lib/audit/clientAudit';
import {
  AuditFilterControls,
  AuditTabType,
} from '@/components/settings/audit/AuditFilterControls';
import { AuditEventsTable } from '@/components/settings/audit/AuditEventsTable';
import { AuditEventDetailsModal } from '@/components/settings/audit/AuditEventDetailsModal';
import { usePermissions, useRole } from '@/context/RoleContext';

export default function AuditSettingsPage() {
  const { role } = useRole();
  const { canViewAuditLog } = usePermissions();
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
    if (role === 'teacher' || !canViewAuditLog) {
      setIsLoading(false);
      return;
    }
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

      let serverEvents: AuditEvent[] = [];
      let serverTotal = 0;

      try {
        const res = await fetch(`/api/audit-events?${params.toString()}`);
        if (res.ok) {
          const data: AuditEventsResponse = await res.json();
          serverEvents = data.events || [];
          serverTotal = data.total || 0;
        }
      } catch {
        // Fallback to local
      }

      const localEvents = getLocalAuditEvents();

      // Merge and deduplicate by id
      const seenIds = new Set<string>();
      const combined: AuditEvent[] = [];
      for (const e of [...localEvents, ...serverEvents]) {
        if (e && e.id && !seenIds.has(e.id)) {
          seenIds.add(e.id);
          combined.push(e);
        }
      }

      // Sort chronologically descending
      combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Apply client-side filters for instant responsiveness
      let filtered = combined;
      if (currentTab === 'changes') {
        filtered = filtered.filter((e) => e.changed_fields && Object.keys(e.changed_fields).length > 0);
      } else if (currentTab === 'finance') {
        filtered = filtered.filter((e) => ['payment', 'payments', 'invoice', 'invoices', 'subscription', 'subscriptions', 'finance', 'refund'].includes(e.entity_type));
      } else if (currentTab === 'security') {
        filtered = filtered.filter((e) => e.action.startsWith('AUTH_') || e.action.startsWith('ROLE_') || e.action.startsWith('USER_') || ['user', 'users', 'profile', 'auth', 'roles'].includes(e.entity_type));
      } else if (currentTab === 'calendar') {
        filtered = filtered.filter((e) => ['lesson', 'lessons', 'group', 'groups', 'schedule', 'courses', 'course', 'tasks', 'task'].includes(e.entity_type));
      } else if (currentTab === 'students') {
        filtered = filtered.filter((e) => ['student', 'students', 'parent', 'parents', 'lead', 'leads'].includes(e.entity_type));
      } else if (currentTab === 'telegram') {
        filtered = filtered.filter((e) => ['TELEGRAM', 'TELEGRAM_MINI_APP'].includes(e.source) || e.entity_type === 'telegram');
      } else if (currentTab === 'errors') {
        filtered = filtered.filter((e) => e.result === 'FAILURE');
      }

      if (roleFilter) filtered = filtered.filter((e) => (e.actor_role_snapshot || '').toLowerCase() === roleFilter.toLowerCase());
      if (resultFilter) filtered = filtered.filter((e) => e.result === resultFilter);
      if (sourceFilter) filtered = filtered.filter((e) => e.source === sourceFilter);
      if (searchQuery.trim()) {
        const s = searchQuery.trim().toLowerCase();
        filtered = filtered.filter((e) =>
          e.actor_name_snapshot?.toLowerCase().includes(s) ||
          e.entity_name_snapshot?.toLowerCase().includes(s) ||
          e.description?.toLowerCase().includes(s) ||
          e.action?.toLowerCase().includes(s) ||
          e.entity_id?.toLowerCase().includes(s)
        );
      }

      const total = filtered.length;
      const startIndex = (page - 1) * pageSize;
      const paginated = filtered.slice(startIndex, startIndex + pageSize);

      setEvents(paginated);
      setTotalEvents(total);
      setTotalPages(Math.ceil(total / pageSize) || 1);
    } catch (err: any) {
      console.error('Fetch audit events failed:', err);
      setErrorMessage(err.message || 'Не удалось загрузить события аудита');
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, currentTab, searchQuery, resultFilter, sourceFilter, roleFilter]);

  useEffect(() => {
    fetchAuditEvents();
    window.addEventListener('crm-audit-events-changed', fetchAuditEvents);
    return () => window.removeEventListener('crm-audit-events-changed', fetchAuditEvents);
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

  if (role === 'teacher' || !canViewAuditLog) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center space-y-4 max-w-lg mx-auto">
        <div className="h-12 w-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-slate-900">Доступ ограничен</h2>
          <p className="text-xs text-slate-500">
            У вас нет прав для просмотра журнала действий (Audit Trail). Раздел доступен только администраторам и владельцу школы.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all"
        >
          Вернуться на рабочий стол
        </Link>
      </div>
    );
  }

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
