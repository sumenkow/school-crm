# TEST READY: Phase 8 Settings & Administration Refactor

**Status**: READY — Test Suite Implemented, Invariants Validated & Regression Integrated  
**Date**: 2026-10-05  
**Author**: E2E Testing Track Writer  
**Target Milestone**: Phase 8 Settings & Administration Dual Track (Tiers 1–4)

---

## 1. Test Suite Deliverables

The E2E regression and integration test suite has been designed and implemented under `src/__tests__/settings/`:

| File | Scope | Checks | Status |
|---|---|---|---|
| `TEST_INFRA.md` | Test infrastructure, 4-tier methodology & feature mapping guide | N/A | Ready |
| `src/__tests__/settings/tier1_features.test.ts` | Tier 1: Core Feature Coverage (F1 through F13, >=5 test cases per feature) | 66 checks | Ready |
| `src/__tests__/settings/tier2_boundaries.test.ts` | Tier 2: Precision rounding, div-by-zero, negative prices, capacity limits, immutability guards | 15 checks | Ready |
| `src/__tests__/settings/tier3_cross_feature.test.ts` | Tier 3: Multi-module interactions (Profile+Courses+Groups, Roles+Auth, Telegram+Webhook, Import+Backup) | 6 checks | Ready |
| `src/__tests__/settings/tier4_scenarios.test.ts` | Tier 4: Real-world operational lifecycles (Direction Onboarding, Staff Promotion, Excel Import E2E) | 3 scenarios | Ready |
| `src/__tests__/settings/index.ts` | Master runner & metrics aggregator | Unified | Ready |
| `src/__tests__/phase8_settings_admin.test.ts` | Backward-compatible facade for `tests/run_all_tests.ts` | Unified | Ready |

---

## 2. Test Execution Commands

### Full Regression Test Suite (TS-01..TS-26 + Phase 8 Settings)
```bash
npm test
```

### Dedicated Phase 8 Runner
```bash
node tests/run_phase8.js
```

### Vitest Runner
```bash
npx vitest run src/__tests__/settings/
```

---

## 3. Test Coverage Breakdown (Tiers 1–4)

### Tier 1 — Core Feature Coverage (All 13 Features from `PROJECT.md`)
- **F1: Sidebar Navigation Fix (`Sidebar.tsx`)**: 6 checks (exact match on `/settings`, no double-active on `/settings/team`, `/settings/import`, `/settings/backup`, `/admin/courses`, dashboard matching).
- **F2: Owner Superuser API Protection (`DELETE /api/auth/users`)**: 5 checks (HTTP 403 on Owner deletion, explicit error message, HTTP 400 on self-deletion, teacher deletion allowed, HTTP 400 on missing ID).
- **F3: `courseStorage.ts` SSOT Foundation**: 5 checks (26 directions seeded, 4 subjects, CRUD methods exported, `crm-courses-changed` event dispatch, EUR prices).
- **F4: Settings Hub (`/settings`)**: 5 checks (4 core category cards, canonical links, 2 admin tools, permission gate, Russian localized titles).
- **F5: School Profile (`/settings/profile` & `schoolSettingsStorage.ts`)**: 5 checks ("You Europe", EUR currency, zero physical rooms/branches, 09:00–21:00 calendar bounds, Slovak IBAN & Tatra banka, sequential Faktura invoice number).
- **F6: School Profile Right Sidebar Widgets**: 5 checks (🟢 Active badge, EUR widget, stats metrics for staff/directions/students, 3 quick actions, banking payload formatting).
- **F7: Courses Registry (`/admin/courses`)**: 5 checks (4 top KPI calculations, format filter, status filter, capacity column formatting `8 чел.` vs `—`, trial badge `🔘 Доступно 0 €`).
- **F8: Course Direction Drawer (`CourseDirectionDrawer.tsx`)**: 5 checks (4 drawer tabs, format switch capacity guard, dynamic pricing `packagePrice / lessonsCount`, read-only EUR pricing badge, duration presets).
- **F9: Team & Staff Cockpit (`/settings/team`)**: 5 checks (top 4 KPI counts, 3 cockpit tabs, 7 table columns, Employee Drawer 4 tabs, Owner deactivation lock).
- **F10: Roles & Permissions Matrix (`/settings/roles`)**: 5 checks (4 summary role cards, 5 business modules, "X из Y" permissions counter, Owner UI deletion lock, PostgreSQL RLS decoupling).
- **F11: Telegram Bot Cockpit (`/settings/integrations`)**: 5 checks (🟢 Connected status card, masked token `••••••••`, edit token dialog validation, webhook URL configuration, standard commands list).
- **F12: Excel Import Wizard (`/settings/import`)**: 5 checks (4-step wizard header, «Скачать шаблон Excel» button, 9 CSV template headers, row preview status badges [Новый, Обновление, Дубликат], backup safety link).
- **F13: Backup Management Alignment (`/settings/backup`)**: 5 checks (last backup timestamp persistence, active protection badge, manual export URL format, Google Sheets sync script, role export permissions).

### Tier 2 — Boundary & Corner Cases (15 Checks)
- Precision division: 25 € / 1 lesson = 25.00 €/зан.
- Two-decimal rounding: 110 € / 8 lessons = 13.75 €/зан.
- Repeating fraction rounding: 99 € / 7 = 14.14 €/зан., 100 € / 3 = 33.33 €/зан., 100 € / 6 = 16.67 €/зан.
- Zero lessons count handling: `calculateLessonPrice(100, 0)` = 0 (no NaN/crash).
- Negative count and price guards: `calculateLessonPrice(100, -5)` = 0, `calculateLessonPrice(-120, 8)` = 0.
- Extreme string lengths: 255-character school name, 1000-character description.
- Slovak IBAN normalization: whitespace trimming, uppercase conversion.
- Calendar hours fallback on non-numeric strings and null values.
- Capacity constraints: individual format strictly 1, group format 2–16.
- 0 € trial lesson toggle: zero duplicate entities in DB.
- Owner immutability: demotion and deactivation blocked even by another Owner.

### Tier 3 — Cross-Feature Combinations (6 Checks)
- Operating hours (10:00–20:00) strictly enforce lesson calendar boundaries.
- Course tariff updates propagate dynamically to group tuition calculations.
- Telegram token masked in overview while preserved for webhook dispatch.
- Roles matrix cross-enforces Owner protection and hierarchical delete permissions.
- Import wizard deduplication matches against existing students with backup reminder.
- Dynamic tariff pricing propagates to Faktura invoice generation with sequential numbering.

### Tier 4 — Real-World Application Scenarios (3 Scenarios)
- **Scenario 1: Complete Online Educational Direction Onboarding**: Full lifecycle from form input to 3-tiered tariff calculation, 0€ trial enable, SSOT persistence, and event broadcasting.
- **Scenario 2: Staff Promotion Lifecycle & Owner Superuser Protection**: Protection against Owner deletion/demotion, promotion of Teacher to Admin, deactivation of inactive staff.
- **Scenario 3: End-to-End Excel Import & Disaster Recovery Backup Lifecycle**: Template download, file upload, column mapping, deduplication preview, and snapshot timestamp synchronization.

---

## 4. Status of Previously Escalated Defects

1. **Defect 1: Null Coercion in `schoolSettingsStorage.ts`**  
   - **Resolution**: Verified RESOLVED. Lines 81–86 of `src/lib/data/schoolSettingsStorage.ts` now properly guard with `parsed.calendarStartHour != null && !isNaN(Number(parsed.calendarStartHour)) && Number(parsed.calendarStartHour) > 0`.
2. **Defect 2: `courseStorage.ts` Missing**  
   - **Resolution**: Verified RESOLVED. `src/lib/data/courseStorage.ts` is fully implemented with 26 canonical European online directions, EUR tariffs, format capacity rules, and dynamic price calculation.

---

## 5. Verification Sign-off

- **Coverage**: 100% of 13 features in Feature Inventory covered with >=5 tests in Tier 1.
- **Independence**: All tests use isolated in-memory storage fixtures (`tests/helpers/testEnv.ts`) and clean up after execution.
- **Integration**: Seamless integration with master test harness `tests/run_all_tests.ts`.
