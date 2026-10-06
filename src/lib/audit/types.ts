/**
 * Types and interfaces for the Production Audit Log subsystem.
 */

export type AuditActorType = 'USER' | 'SYSTEM' | 'CRON' | 'TELEGRAM_BOT';

export type AuditResult = 'SUCCESS' | 'FAILURE';

export type AuditSource = 'WEB' | 'API' | 'TELEGRAM' | 'TELEGRAM_MINI_APP' | 'SYSTEM' | 'CRON';

export interface AuditFieldDiff {
  old: any;
  new: any;
}

export type AuditChangedFields = Record<string, AuditFieldDiff>;

export interface AuditEvent {
  id: string;
  created_at: string;
  actor_type: AuditActorType;
  actor_id: string;
  actor_name_snapshot: string;
  actor_role_snapshot?: string | null;
  action: string;
  result: AuditResult;
  entity_type: string;
  entity_id: string;
  entity_name_snapshot?: string | null;
  description: string;
  before_data?: Record<string, any> | null;
  after_data?: Record<string, any> | null;
  changed_fields?: AuditChangedFields | null;
  source: AuditSource;
  request_id?: string | null;
  session_id?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  metadata?: Record<string, any> | null;
}

export interface AuditLogParams {
  action: string;
  entityType: string;
  entityId: string;
  entityNameSnapshot?: string | null;
  description: string;
  beforeData?: Record<string, any> | null;
  afterData?: Record<string, any> | null;
  changedFields?: AuditChangedFields | null;
  result?: AuditResult;
  source?: AuditSource;
  requestId?: string | null;
  sessionId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, any> | null;
  actor?: {
    type?: AuditActorType;
    id?: string;
    name?: string;
    role?: string | null;
  };
  req?: Request | null;
}

export interface AuditQueryParams {
  page?: number;
  pageSize?: number;
  tab?: 'all' | 'changes' | 'finance' | 'security' | 'calendar' | 'students' | 'telegram' | 'errors';
  search?: string;
  actorId?: string;
  role?: string;
  action?: string;
  entityType?: string;
  result?: AuditResult;
  source?: AuditSource;
  startDate?: string;
  endDate?: string;
  requestId?: string;
}

export interface AuditEventsResponse {
  events: AuditEvent[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
