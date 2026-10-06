# Project: Production Audit Log (Журнал действий)

## Architecture
- **Infrastructure Persistence**: Supabase PostgreSQL table `public.audit_events` with 18 fields (`id`, `created_at`, `actor_type`, `actor_id`, `actor_name_snapshot`, `actor_role_snapshot`, `action`, `result`, `entity_type`, `entity_id`, `entity_name_snapshot`, `description`, `before_data`, `after_data`, `changed_fields`, `source`, `request_id`, `session_id`, `ip_address`, `user_agent`, `metadata`).
- **Physical Immutability**: PostgreSQL engine-level triggers (`BEFORE UPDATE OR DELETE` and `BEFORE TRUNCATE`) raising exceptions (`prevent_audit_events_mutation`) to guarantee true append-only persistence against direct SQL or application tampering.
- **Strict Row-Level Security (RLS)**: Normal application roles cannot mutate audit events. `SELECT` queries on `audit_events` are strictly restricted to `owner`, `admin`, and `developer` roles. Unauthenticated callers and teachers are strictly blocked.
- **Server-Side Audit Service (`auditLogger`)**: Centralized trusted logging service in `src/lib/audit/`:
  - `src/lib/audit/auditLogger.ts`: Authoritative server logging, derives actor identity from server-verified cryptographic Supabase sessions (`createClient()`) and `public.profiles` lookup, rejecting any client-supplied spoofed headers (`x-actor-id`).
  - `src/lib/audit/redaction.ts`: Recursive secret sanitizer stripping passwords, new passwords, Telegram bot tokens, API keys, session tokens, refresh tokens to `"[REDACTED]"`.
  - `src/lib/audit/diff.ts`: Concise diff calculator computing `changed_fields` deltas.
  - `src/lib/audit/types.ts`: Strongly typed action definitions, actor types, entity types, and audit event models.
- **Domain & Security Entrypoint Instrumentation**:
  - Auth: `src/app/api/auth/users/route.ts` (create, update/elevate role, delete user), `src/app/api/auth/invite/route.ts`, `src/app/api/auth/logout/route.ts`.
  - Universal Sync Hub: `src/app/api/sync/route.ts` (students, parents, leads, tasks, payments, interactions, groups, lessons, attendance).
  - Finance & Calendar: `src/app/api/invoices/send/route.ts`, `src/components/calendar/LessonDetailsDrawer.tsx` (attendance reset + `restoreLessonBilling`).
  - Telegram & Integrations: `src/app/api/telegram/settings/route.ts`, `src/app/api/telegram/mini-app/book/route.ts`.
  - System & Settings: `src/app/api/backup/export/route.ts`, `src/app/api/courses/route.ts`.
- **Administrative API Endpoint**: `GET /api/audit-events` (`src/app/api/audit-events/route.ts`) with server-side authorization check (`owner`, `admin`, `developer`), server-side pagination (default 50 items), search by actor/entity/description/request_id, and parameter filtering.
- **Administrative UI («Журнал действий»)**:
  - Route: `/settings/audit` (`src/app/settings/audit/page.tsx`).
  - Access control: Middleware and permissions configured to allow `owner`, `admin`, `developer`.
  - 1440x900 desktop viewport guarantee: Table uses fixed column budget (1030px total on 1152px usable canvas) with zero horizontal scroll.
  - Controls: 8 Quick Tabs (`Все`, `Изменения`, `Финансы`, `Безопасность`, `Календарь`, `Ученики`, `Telegram`, `Ошибки`), 300ms debounced live search, parameter dropdowns, and server pagination.
  - Modal: `AuditEventDetailsModal` with actor snapshot, entity snapshot, structured `Поле | Было | Стало` diff table, correlation `request_id` search, and double-line secret masking.
- **Dual Track Architecture**: Implementation Track runs parallel to E2E Testing Track (`TEST_INFRA.md`, `TEST_READY.md`), culminating in Final Milestone (100% E2E test pass + adversarial coverage hardening).

## Feature Inventory
Every feature from the Survey phase appears here with its assigned milestone.
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Database Migration `audit_events` | `supabase/migrations/20261006020000_create_audit_events.sql` with 18 fields, 7 indexes, immutability triggers, and RLS policies | M1 | Survey R2 |
| 2 | Server-Side Audit Service & Redaction | `src/lib/audit/auditLogger.ts`, `redaction.ts`, `diff.ts`, `types.ts` with session extraction, secret redaction, and diff calculation | M2 | Survey R3 |
| 3 | Server-Side Audit API Endpoint | `GET /api/audit-events/route.ts` with pagination, quick tabs, live search, and filter queries | M2 | Survey R3, R5 |
| 4 | Core Domain & Security Instrumentation | Authoritative server instrumentation across Auth, Sync Hub, Lessons/Attendance, Finance, Telegram, and Settings | M3 | Survey R1, R4 |
| 5 | Settings Navigation & Route Guards | Middleware (`src/middleware.ts`), permissions (`src/lib/auth/permissions.ts`), Sidebar link, and Settings hub card | M4 | Survey R5 |
| 6 | Settings UI: «Журнал действий» Table | `src/app/settings/audit/page.tsx` with 1440x900 zero-scroll layout, 6 columns, 8 quick tabs, filters, pagination, and authentic empty states | M4 | Survey R5 |
| 7 | Audit Event Details Modal | `AuditEventDetailsModal.tsx` with actor/entity snapshots, structured diff table, correlation `request_id`, and secret masking | M4 | Survey R6 |
| 8 | Automated Verification & E2E Test Suite | `tests/audit_log.test.ts` (Suite 18 in `run_all_tests.ts`) covering anti-spoofing, immutability, redaction, domain events, pagination | M5 | Survey R7 |
| 9 | Adversarial Coverage Hardening & Pre-Flight | Adversarial test cases (Tier 5), `npm run check` (0 errors), `npm test` (100% pass), `npm run build` (clean compile), forensic integrity audit | M5 | Acceptance |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Database Schema & Immutability | PostgreSQL migration `audit_events`, immutability triggers, indexes, and RLS policies | none | COMPLETED |
| 2 | Server-Side Audit Service & API | `src/lib/audit/` (`auditLogger`, `redaction`, `diff`, `types`) + `GET /api/audit-events` | M1 | COMPLETED |
| 3 | Core Domain & Security Instrumentation | Server-side audit event hooks across Auth, Roles, Sync Hub (Students/Leads/Attendance/Finance), Telegram, and Settings | M2 | COMPLETED |
| 4 | Settings UI «Журнал действий» & Modal | `/settings/audit`, route guards, Sidebar, table (1440x900 no-scroll), 8 quick tabs, search, pagination, and Details Modal | M2, M3 | COMPLETED |
| 5 | Final Milestone: E2E Verification & Adversarial Hardening | Pass 100% E2E test suite (`tests/audit_log.test.ts`), adversarial stress coverage, pre-flight checks (`check`, `test`, `build`), forensic audit | M1, M2, M3, M4 | COMPLETED |

## Interface Contracts
### `public.audit_events` Table Contract
```sql
CREATE TABLE public.audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_type TEXT NOT NULL, -- 'USER', 'SYSTEM', 'CRON', 'TELEGRAM_BOT'
  actor_id TEXT NOT NULL,
  actor_name_snapshot TEXT NOT NULL,
  actor_role_snapshot TEXT,
  action TEXT NOT NULL,
  result TEXT NOT NULL DEFAULT 'SUCCESS', -- 'SUCCESS', 'FAILURE'
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  entity_name_snapshot TEXT,
  description TEXT NOT NULL,
  before_data JSONB,
  after_data JSONB,
  changed_fields JSONB,
  source TEXT NOT NULL DEFAULT 'WEB', -- 'WEB', 'API', 'TELEGRAM', 'TELEGRAM_MINI_APP', 'SYSTEM', 'CRON'
  request_id TEXT,
  session_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB
);
```

### `auditLogger.logEvent(params)` Service Contract
```typescript
export interface AuditLogParams {
  action: string;
  entityType: string;
  entityId: string;
  entityNameSnapshot?: string;
  description: string;
  beforeData?: Record<string, any> | null;
  afterData?: Record<string, any> | null;
  result?: 'SUCCESS' | 'FAILURE';
  source?: 'WEB' | 'API' | 'TELEGRAM' | 'TELEGRAM_MINI_APP' | 'SYSTEM' | 'CRON';
  requestId?: string;
  metadata?: Record<string, any>;
  req?: Request | null; // For automatic session & header extraction
}
```

### `GET /api/audit-events` Query & Response Contract
- **Query Params**:
  - `page`: number (default: 1)
  - `pageSize`: number (default: 50, max: 100)
  - `tab`: string (`all`, `changes`, `finance`, `security`, `calendar`, `students`, `telegram`, `errors`)
  - `search`: string (actor name, entity, description, requestId)
  - `actorId`: string
  - `role`: string
  - `action`: string
  - `entityType`: string
  - `result`: 'SUCCESS' | 'FAILURE'
  - `source`: string
  - `startDate`: ISO string
  - `endDate`: ISO string
  - `requestId`: string
- **Response**:
```json
{
  "events": [...],
  "total": 128,
  "page": 1,
  "pageSize": 50,
  "totalPages": 3
}
```

## Code Layout
- `supabase/migrations/20261006020000_create_audit_events.sql` (Migration)
- `src/lib/audit/types.ts` (Audit types and interfaces)
- `src/lib/audit/redaction.ts` (Secret redaction engine)
- `src/lib/audit/diff.ts` (Object diff calculator)
- `src/lib/audit/auditLogger.ts` (Server-side authoritative audit logger)
- `src/app/api/audit-events/route.ts` (Next.js server-side audit events API)
- `src/middleware.ts` (Route guarding allowing owner and admin access to /settings/audit)
- `src/lib/auth/permissions.ts` (Role permissions matrix)
- `src/components/layout/Sidebar.tsx` (Sidebar navigation item)
- `src/app/settings/page.tsx` (Settings administrative tools hub)
- `src/app/settings/audit/page.tsx` («Журнал действий» page)
- `src/components/settings/audit/AuditEventsTable.tsx` (Fixed-width desktop table)
- `src/components/settings/audit/AuditEventDetailsModal.tsx` (Details modal with diff table)
- `src/components/settings/audit/AuditFilterControls.tsx` (Quick tabs, search, dropdowns)
- `tests/audit_log.test.ts` (Automated verification & adversarial test suite)
