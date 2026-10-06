import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { AuditEvent, AuditLogParams, AuditActorType } from './types';
import { redactSensitiveData } from './redaction';
import { calculateChangedFields } from './diff';
import { randomUUID } from 'crypto';

// In-memory fallback buffer for local testing / offline resilience
const inMemoryAuditLog: AuditEvent[] = [];

/**
 * Returns in-memory audit events (used for test assertions & local development)
 */
export function getInMemoryAuditEvents(): AuditEvent[] {
  return [...inMemoryAuditLog];
}

/**
 * Clears in-memory audit events (used in tests)
 */
export function clearInMemoryAuditEvents(): void {
  inMemoryAuditLog.length = 0;
}

/**
 * Authoritative Server Audit Logging Service.
 * Captures user and system actions with secret redaction, change diffing, and anti-spoofing verification.
 */
export async function logAuditEvent(params: AuditLogParams): Promise<AuditEvent | null> {
  try {
    let actorType: AuditActorType = params.actor?.type || 'SYSTEM';
    let actorId = params.actor?.id || 'system';
    let actorName = params.actor?.name || 'Система';
    let actorRole = params.actor?.role || null;

    let ipAddress = params.ipAddress || null;
    let userAgent = params.userAgent || null;
    let requestId = params.requestId || null;

    // 1. Inspect request headers if available (Anti-Spoofing: NEVER trust client x-actor-id)
    if (params.req) {
      const headers = params.req.headers;
      ipAddress =
        ipAddress ||
        headers.get('x-forwarded-for')?.split(',')[0].trim() ||
        headers.get('x-real-ip') ||
        null;
      userAgent = userAgent || headers.get('user-agent') || null;
      requestId = requestId || headers.get('x-request-id') || null;
    }

    if (!requestId) {
      requestId = randomUUID();
    }

    // 2. Derive authenticated user from Supabase session if not explicitly provided
    if (!params.actor?.id) {
      try {
        const supabase = await createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          actorType = 'USER';
          actorId = user.id;

          // Fetch authoritative profile name & role
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, role')
            .eq('id', user.id)
            .single();

          actorName = profile?.full_name || user.email || 'Пользователь CRM';
          actorRole = profile?.role || (user.user_metadata?.role as string) || null;
        }
      } catch {
        // Fallback to initial actor (e.g. SYSTEM or unauthenticated)
      }
    }

    // 3. Redact sensitive values from payloads
    const cleanBefore = params.beforeData ? redactSensitiveData(params.beforeData) : null;
    const cleanAfter = params.afterData ? redactSensitiveData(params.afterData) : null;
    const cleanMetadata = params.metadata ? redactSensitiveData(params.metadata) : null;

    // 4. Calculate diff if not explicitly provided
    const changedFields =
      params.changedFields || calculateChangedFields(cleanBefore, cleanAfter);

    const auditEvent: AuditEvent = {
      id: randomUUID(),
      created_at: new Date().toISOString(),
      actor_type: actorType,
      actor_id: actorId,
      actor_name_snapshot: actorName,
      actor_role_snapshot: actorRole,
      action: params.action,
      result: params.result || 'SUCCESS',
      entity_type: params.entityType,
      entity_id: params.entityId,
      entity_name_snapshot: params.entityNameSnapshot || null,
      description: params.description,
      before_data: cleanBefore,
      after_data: cleanAfter,
      changed_fields: changedFields,
      source: params.source || 'WEB',
      request_id: requestId,
      session_id: params.sessionId || null,
      ip_address: ipAddress,
      user_agent: userAgent,
      metadata: cleanMetadata,
    };

    // Store in in-memory fallback log
    inMemoryAuditLog.unshift(auditEvent);
    if (inMemoryAuditLog.length > 500) {
      inMemoryAuditLog.pop();
    }

    // 5. Persist to Supabase public.audit_events via admin client if configured
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const admin = createAdminClient();
        await admin.from('audit_events').insert({
          id: auditEvent.id,
          created_at: auditEvent.created_at,
          actor_type: auditEvent.actor_type,
          actor_id: auditEvent.actor_id,
          actor_name_snapshot: auditEvent.actor_name_snapshot,
          actor_role_snapshot: auditEvent.actor_role_snapshot,
          action: auditEvent.action,
          result: auditEvent.result,
          entity_type: auditEvent.entity_type,
          entity_id: auditEvent.entity_id,
          entity_name_snapshot: auditEvent.entity_name_snapshot,
          description: auditEvent.description,
          before_data: auditEvent.before_data,
          after_data: auditEvent.after_data,
          changed_fields: auditEvent.changed_fields,
          source: auditEvent.source,
          request_id: auditEvent.request_id,
          session_id: auditEvent.session_id,
          ip_address: auditEvent.ip_address,
          user_agent: auditEvent.user_agent,
          metadata: auditEvent.metadata,
        });
      } catch (dbErr) {
        console.warn('Supabase audit_events write warning (fallback active):', dbErr);
      }
    }

    return auditEvent;
  } catch (error) {
    // Non-blocking guarantee: Never fail the main business transaction because of an audit logging error
    console.error('Fatal error during audit event logging:', error);
    return null;
  }
}
