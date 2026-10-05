# Project: Phase 6 Production Hardening & Real Data Analytics

## Architecture
- **Framework**: Next.js 16.3.4 (App Router) + React 19 + Tailwind CSS + Lucide Icons + Supabase SSR.
- **Storage Layer**: Dual SSOT with LocalStorage master caches (`crm_*_master_v2`) and Supabase PostgreSQL backend.
- **Calendar & Lessons**: Calendar week view, LessonModal, LessonDetailsDrawer, lesson cancellation state machine with billing rollback (`restoreLessonBilling`).
- **Analytics Subsystem**: 7 tabs under `/analytics` (Diagnostics, Sales, Retention, Finance, Groups, Teachers, Reports). Canonical Analytics Rule: 100% real database/storage aggregations or honest empty states.
- **Testing Architecture**: Vitest/Node test runner in `tests/`, regression test suites TS-01 through TS-26.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | R1 Safety Gate & Git | Verify backup/2026-10-05/ checksums, checkout fix/phase-6-production-hardening | M0 | ORIGINAL_REQUEST §R1 |
| 2 | P0 #1 LessonModal Billing | Preserve billedStudentIds & billingDetails when editing lessons | M1 | ORIGINAL_REQUEST §R2 |
| 3 | P0 #2 Cancellation Rollback | Unified restoreLessonBilling across drawer, modal, quick actions | M1 | ORIGINAL_REQUEST §R2 |
| 4 | P0 #3 Group Status Sync | Add finished & paused to validStatuses in /api/sync/route.ts & harmonize UI | M1 | ORIGINAL_REQUEST §R2 |
| 5 | RLS & Developer Role | Enable RLS on lesson_attendance and grant access to developer, owner, admin, teacher | M2 | ORIGINAL_REQUEST §R3 |
| 6 | Ghost Attendance Cleanup | Purge mock attendance records s5..s21 | M2 | ORIGINAL_REQUEST §R3 |
| 7 | SSOT Resolution | Unify storage models for crm_invoices_v1, crm_churn_events_v1, crm_school_settings_v1 | M2 | ORIGINAL_REQUEST §R3 |
| 8 | Currency Standardization | Replace all ₽ symbols with canonical EUR (€) | M2 | ORIGINAL_REQUEST §R3 |
| 9 | Schedule Collision Detection | Cross-group teacher, classroom, and group overlapping lesson validation | M2 | ORIGINAL_REQUEST §R3 |
| 10 | Real Data Analytics (7 tabs) | Purge synthetic data across Diagnostics, Sales, Retention, Finance, Groups, Teachers, Reports | M3 | ORIGINAL_REQUEST §R4 |
| 11 | Modal Accessibility | WCAG 2.1 AA dialog role, aria-modal, focus trap, Escape dismissal for 3 modals | M4 | ORIGINAL_REQUEST §R5 |
| 12 | Regression Tests TS-16..TS-26 | Comprehensive automated regression tests | E2E-Track | ORIGINAL_REQUEST §R6 |
| 13 | Final Pre-Flight & Report | Run check, test, build, generate docs/audit/PHASE_6_FINAL.md | M5 | ORIGINAL_REQUEST §R6 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M0 | Safety Gate & Git Branching | Verify backup integrity, switch to git branch fix/phase-6-production-hardening | none | IN_PROGRESS |
| M1 | Core P0 Defects Remediation | LessonModal billing preservation, cancellation rollback, group status sync | M0 | PLANNED |
| M2 | Security, Integrity, SSOT & Collisions | RLS, ghost cleanup, SSOT storage, EUR standardization, collision detection | M1 | PLANNED |
| M3 | Mock Purge & Real Data Analytics | Real aggregations & honest empty states across all 7 analytics tabs | M2 | PLANNED |
| M4 | Modal Accessibility (WCAG 2.1 AA) | Accessible dialog attributes, focus trap, Escape key handlers | M1 | PLANNED |
| E2E | Automated Regression Test Suite | Implement TS-16 through TS-26 test suite in tests/ | M0 | IN_PROGRESS |
| M5 | Final Pre-Flight & Delivery Report | npm run check (0 errors), npm test (100% pass), npm run build (0 errors), audit doc | M3, M4, E2E | PLANNED |

## Code Layout
- `backup/2026-10-05/`: Protected backup directory (READ-ONLY)
- `src/components/calendar/`: LessonModal.tsx, LessonDetailsDrawer.tsx, Calendar collision helpers
- `src/app/api/sync/route.ts`: Group status sync endpoint
- `src/lib/data/`: lessonStorage.ts, groupStorage.ts, studentStorage.ts, mockData.ts, currencyHelper.ts
- `src/features/analytics/`: 7 analytics tabs components & hooks
- `src/components/crm/`: ConvertLeadModal.tsx, EnrollStudentFromLeadModal.tsx
- `supabase/migrations/`: Database migrations for RLS & schema
- `tests/`: TS-01..TS-26 automated tests
- `docs/audit/PHASE_6_FINAL.md`: Final delivery audit report
