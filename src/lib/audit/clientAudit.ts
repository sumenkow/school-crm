'use client';

import { AuditEvent, AuditSource, AuditResult } from './types';

export const CLIENT_AUDIT_STORAGE_KEY = 'crm_client_audit_events';

/**
 * Returns locally stored audit events from browser storage (for offline resilience and local reactivity)
 */
export function getLocalAuditEvents(): AuditEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CLIENT_AUDIT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Persists an audit event locally and dispatches a cross-window notification
 */
export function saveLocalAuditEvent(event: AuditEvent): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getLocalAuditEvents();
    const updated = [event, ...current.filter((e) => e.id !== event.id)].slice(0, 500);
    localStorage.setItem(CLIENT_AUDIT_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('crm-audit-events-changed', { detail: event }));
  } catch {}
}

/**
 * Resolves the active user identity (name, role, id) from CRM state
 */
export function getActiveActor(): { name: string; role: string; id: string } {
  if (typeof window === 'undefined') {
    return { name: 'Администратор', role: 'admin', id: 'usr_admin' };
  }
  try {
    const role = (localStorage.getItem('crm_active_role') || 'owner') as string;
    const profileRaw = localStorage.getItem('crm_user_profile_v1');
    let name = 'Пользователь CRM';
    let id = 'usr_' + role;
    if (profileRaw) {
      const p = JSON.parse(profileRaw);
      if (p.userName) name = p.userName;
      if (p.userId) id = p.userId;
    }
    if (name === 'Пользователь CRM' || name === 'Сотрудник школы') {
      if (role === 'owner') name = 'Владелец школы';
      else if (role === 'admin') name = 'Администратор';
      else if (role === 'teacher') name = 'Преподаватель';
    }
    return { name, role, id };
  } catch {
    return { name: 'Администратор', role: 'admin', id: 'usr_admin' };
  }
}

export interface ClientAuditLogParams {
  action: string;
  entityType: string;
  entityId?: string;
  entityNameSnapshot?: string;
  description: string;
  actorName?: string;
  actorRole?: string;
  actorId?: string;
  beforeData?: any;
  afterData?: any;
  changedFields?: Record<string, { before: any; after: any }> | null;
  result?: AuditResult;
  source?: AuditSource;
  metadata?: Record<string, any> | null;
}

/**
 * Authoritative Client-Side Audit Logger.
 * Records real operations of all roles (owner, teacher, admin) locally and dispatches to /api/audit-events.
 */
export function recordClientAuditEvent(params: ClientAuditLogParams): AuditEvent {
  const actor = getActiveActor();
  const actorName = params.actorName || actor.name;
  const actorRole = params.actorRole || actor.role;
  const actorId = params.actorId || actor.id;

  const event: AuditEvent = {
    id: 'aud_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
    created_at: new Date().toISOString(),
    actor_type: 'USER',
    actor_id: actorId,
    actor_name_snapshot: actorName,
    actor_role_snapshot: actorRole,
    action: params.action,
    result: params.result || 'SUCCESS',
    entity_type: params.entityType,
    entity_id: params.entityId || 'entity_' + Date.now(),
    entity_name_snapshot: params.entityNameSnapshot || null,
    description: params.description,
    before_data: params.beforeData || null,
    after_data: params.afterData || null,
    changed_fields: (params.changedFields as any) || null,
    source: params.source || 'WEB',
    request_id: 'req_' + Date.now().toString(36),
    metadata: params.metadata || null,
  };

  // 1. Immediately store in client storage for zero-lag reactivity
  saveLocalAuditEvent(event);

  // 2. Dispatch to server-side audit API endpoint asynchronously
  if (typeof window !== 'undefined') {
    try {
      fetch('/api/audit-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId,
          entityNameSnapshot: params.entityNameSnapshot,
          description: params.description,
          beforeData: params.beforeData,
          afterData: params.afterData,
          changedFields: params.changedFields,
          result: params.result || 'SUCCESS',
          source: params.source || 'WEB',
          metadata: params.metadata,
          actor: {
            id: actorId,
            name: actorName,
            role: actorRole,
            type: 'USER',
          },
        }),
      }).catch(() => {});
    } catch {}
  }

  return event;
}
