import fs from 'fs';
import path from 'path';
import { redactSensitiveData, REDACTED_PLACEHOLDER } from '../src/lib/audit/redaction';
import { calculateChangedFields } from '../src/lib/audit/diff';
import {
  logAuditEvent,
  getInMemoryAuditEvents,
  clearInMemoryAuditEvents,
} from '../src/lib/audit/auditLogger';
import { permissions, getPermissionsForRole } from '../src/lib/auth/permissions';

export async function runAuditLogTests() {
  console.log('\n===============================================================');
  console.log('   SUITE 18: PRODUCTION AUDIT LOG & IMMUTABILITY VERIFICATION  ');
  console.log('   Testing Schema, Immutability, Redaction, Diff & Anti-Spoof  ');
  console.log('===============================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✓ ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName}`);
      failed++;
    }
  }

  // --- TIER 1: DATABASE MIGRATION, IMMUTABILITY TRIGGERS & RLS ---
  console.log('\n--- Tier 1: Schema, Immutability Triggers & RLS Policies ---');
  const migrationPath = path.join(
    process.cwd(),
    'supabase/migrations/20261006020000_create_audit_events.sql'
  );
  assert(fs.existsSync(migrationPath), 'AUD-01: Migration file 20261006020000_create_audit_events.sql exists');

  const migrationSql = fs.readFileSync(migrationPath, 'utf8');
  assert(
    migrationSql.includes('CREATE TABLE IF NOT EXISTS public.audit_events') &&
      migrationSql.includes('actor_type TEXT NOT NULL') &&
      migrationSql.includes('actor_name_snapshot TEXT NOT NULL') &&
      migrationSql.includes('changed_fields JSONB') &&
      migrationSql.includes('request_id TEXT'),
    'AUD-02: audit_events table contains required fields (actor, snapshot, diff, request_id)'
  );

  assert(
    migrationSql.includes('prevent_audit_events_mutation()') &&
      migrationSql.includes('BEFORE UPDATE OR DELETE ON public.audit_events') &&
      migrationSql.includes('BEFORE TRUNCATE ON public.audit_events'),
    'AUD-03: Append-only immutability triggers prevent UPDATE, DELETE, and TRUNCATE'
  );

  assert(
    migrationSql.includes('idx_audit_events_created_at') &&
      migrationSql.includes('idx_audit_events_actor_id') &&
      migrationSql.includes('idx_audit_events_request_id'),
    'AUD-04: High-performance indexes configured for scale'
  );

  assert(
    migrationSql.includes('crm_roles_select_audit_events') &&
      migrationSql.includes("'owner', 'developer', 'admin'") &&
      migrationSql.includes('deny_update_audit_events') &&
      migrationSql.includes('deny_delete_audit_events'),
    'AUD-05: RLS policies strictly restrict SELECT to owner/admin/dev and deny UPDATE/DELETE'
  );

  // --- TIER 2: SENSITIVE DATA REDACTION ENGINE ---
  console.log('\n--- Tier 2: Secret & Credential Redaction Engine ---');
  const sensitivePayload = {
    username: 'admin',
    password: 'superSecretPassword123!',
    new_password: 'anotherPassword456',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy',
    botToken: '123456789:ABCdefGHIjklMNOpqrSTUvwxYZ_1234567',
    apiKey: 'sk-live-9999999999999',
    refreshToken: 'ref_token_secret',
    nested: {
      client_secret: 'nestedSecret',
      normalField: 'allowedValue',
    },
    messageWithToken: 'Telegram bot token is 987654321:XYZabc123-ABCdefGHIjklMNOpqrSTUvwx_99 in raw text',
  };

  const redacted = redactSensitiveData(sensitivePayload);

  assert(redacted.password === REDACTED_PLACEHOLDER, 'AUD-06: password field is redacted');
  assert(redacted.new_password === REDACTED_PLACEHOLDER, 'AUD-07: new_password field is redacted');
  assert(redacted.botToken === REDACTED_PLACEHOLDER, 'AUD-08: botToken field is redacted');
  assert(redacted.apiKey === REDACTED_PLACEHOLDER, 'AUD-09: apiKey field is redacted');
  assert(redacted.refreshToken === REDACTED_PLACEHOLDER, 'AUD-10: refreshToken field is redacted');
  assert(redacted.nested.client_secret === REDACTED_PLACEHOLDER, 'AUD-11: Nested client_secret is redacted');
  assert(redacted.nested.normalField === 'allowedValue', 'AUD-12: Non-sensitive nested fields are preserved');
  assert(
    !redacted.messageWithToken.includes('987654321:'),
    'AUD-13: Regex-based Telegram bot token embedded in string is redacted'
  );
  assert(
    sensitivePayload.password === 'superSecretPassword123!',
    'AUD-14: Redaction is pure and does not mutate source data'
  );

  // --- TIER 3: CONCISE OBJECT DIFF ENGINE ---
  console.log('\n--- Tier 3: Concise Changed Fields Diff Engine ---');
  const beforeObj = {
    name: 'Иван Иванов',
    role: 'teacher',
    status: 'active',
    password: 'oldPassword',
  };

  const afterObj = {
    name: 'Иван Иванов',
    role: 'admin',
    status: 'active',
    phone: '+7 999 111-22-33',
    password: 'newPassword',
  };

  const diff = calculateChangedFields(beforeObj, afterObj);

  assert(diff !== null, 'AUD-15: Diff is generated for modified object');
  assert(diff?.role?.old === 'teacher' && diff?.role?.new === 'admin', 'AUD-16: Role modification captured');
  assert(diff?.phone?.old === null && diff?.phone?.new === '+7 999 111-22-33', 'AUD-17: Newly added field captured');
  assert(diff?.name === undefined, 'AUD-18: Unmodified field is omitted from diff');
  assert(
    diff?.password?.old === REDACTED_PLACEHOLDER && diff?.password?.new === REDACTED_PLACEHOLDER,
    'AUD-19: Sensitive fields inside diff are automatically redacted'
  );

  const noChangeDiff = calculateChangedFields({ a: 1 }, { a: 1 });
  assert(noChangeDiff === null, 'AUD-20: Identical objects produce null diff');

  // --- TIER 4: SERVER AUDIT LOGGER & IN-MEMORY EVENT STORE ---
  console.log('\n--- Tier 4: Server Audit Logger & Anti-Spoofing ---');
  clearInMemoryAuditEvents();

  const loggedEvent = await logAuditEvent({
    action: 'USER_ROLE_CHANGE',
    entityType: 'user',
    entityId: 'u-123',
    entityNameSnapshot: 'Анна Смирнова',
    description: 'Повышение роли до администратора',
    beforeData: { role: 'teacher' },
    afterData: { role: 'admin' },
    actor: {
      id: 'owner-1',
      name: 'Владелец CRM',
      role: 'owner',
      type: 'USER',
    },
    requestId: 'req-test-999',
    source: 'WEB',
  });

  assert(loggedEvent !== null, 'AUD-21: logAuditEvent returns created event');
  assert(loggedEvent?.actor_name_snapshot === 'Владелец CRM', 'AUD-22: Authoritative actor snapshot stored');
  assert(loggedEvent?.request_id === 'req-test-999', 'AUD-23: Request correlation ID persisted');
  assert(
    loggedEvent?.changed_fields?.role?.new === 'admin',
    'AUD-24: Diff automatically computed and attached'
  );

  const inMemoryList = getInMemoryAuditEvents();
  assert(inMemoryList.length > 0, 'AUD-25: In-memory fallback log contains logged event');

  // --- TIER 5: PERMISSIONS, ROUTE GUARDS & UI TOUCHPOINTS ---
  console.log('\n--- Tier 5: Permissions, Route Guards & UI Touchpoints ---');
  assert(permissions.canViewAuditLog('owner') === true, 'AUD-26: Owner can view audit log');
  assert(permissions.canViewAuditLog('admin') === true, 'AUD-27: Admin can view audit log');
  assert(permissions.canViewAuditLog('developer') === true, 'AUD-28: Developer can view audit log');
  assert(permissions.canViewAuditLog('teacher') === false, 'AUD-29: Teacher cannot view audit log');

  const adminPerms = getPermissionsForRole('admin');
  assert(adminPerms.canViewAuditLog === true, 'AUD-30: getPermissionsForRole returns canViewAuditLog');

  // Check middleware file content for admin allow on /settings/audit
  const middlewareFile = fs.readFileSync(path.join(process.cwd(), 'src/middleware.ts'), 'utf8');
  assert(
    middlewareFile.includes('/settings/audit') &&
      middlewareFile.includes("['developer', 'owner', 'admin']"),
    'AUD-31: Middleware explicitly allows admin to /settings/audit'
  );

  // Check Sidebar has audit link
  const sidebarFile = fs.readFileSync(
    path.join(process.cwd(), 'src/components/layout/Sidebar.tsx'),
    'utf8'
  );
  assert(
    sidebarFile.includes('/settings/audit') && sidebarFile.includes('Журнал действий'),
    'AUD-32: Sidebar navigation contains Журнал действий'
  );

  // Check Settings page has audit card
  const settingsFile = fs.readFileSync(
    path.join(process.cwd(), 'src/app/settings/page.tsx'),
    'utf8'
  );
  assert(
    settingsFile.includes('/settings/audit') && settingsFile.includes('Журнал действий'),
    'AUD-33: Settings hub includes Журнал действий administrative card'
  );

  // Check Audit Settings Page and Details Modal exist
  assert(
    fs.existsSync(path.join(process.cwd(), 'src/app/settings/audit/page.tsx')),
    'AUD-34: /settings/audit/page.tsx exists'
  );
  assert(
    fs.existsSync(path.join(process.cwd(), 'src/components/settings/audit/AuditEventDetailsModal.tsx')),
    'AUD-35: AuditEventDetailsModal component exists'
  );
  assert(
    fs.existsSync(path.join(process.cwd(), 'src/components/settings/audit/AuditEventsTable.tsx')),
    'AUD-36: AuditEventsTable component exists'
  );
  assert(
    fs.existsSync(path.join(process.cwd(), 'src/components/settings/audit/AuditFilterControls.tsx')),
    'AUD-37: AuditFilterControls component exists'
  );

  // Check API route handler exists
  assert(
    fs.existsSync(path.join(process.cwd(), 'src/app/api/audit-events/route.ts')),
    'AUD-38: GET /api/audit-events route handler exists'
  );

  console.log('===============================================================');
  console.log(`   SUITE 18 AUDIT LOG SUMMARY: ${passed} passed, ${failed} failed.`);
  console.log('===============================================================');

  return { passed, failed, total: passed + failed };
}
