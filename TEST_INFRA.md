# TEST_INFRA.md — Phase 8 Settings & Administration Test Infrastructure

## 1. Overview & Architecture
This document defines the comprehensive opaque-box E2E and integration test framework for **Phase 8 Settings & Administration UI Refactor** for the You Europe / Smart Academy CRM.

The test infrastructure is designed around a rigorous **4-Tier Testing Methodology** that validates:
- Core business invariants (100% online school, strictly EUR currency, dynamic lesson pricing `packagePrice / lessonsCount`, zero physical room/branch entities, unrevokable/un-deletable Owner superuser).
- All 13 core features in the `PROJECT.md` Feature Inventory (F1 through F13).
- Boundary conditions, error recoveries, and edge cases.
- Cross-module integrations between settings, courses, groups, user auth, Telegram bot, and backup tools.
- Real-world operational workflows mimicking administrative life cycles.

---

## 2. 4-Tier Testing Methodology

```
+------------------------------------------------------------------------+
|                      Tier 4: Real-World Scenarios                      |
| (E2E Onboarding, Staff Promotion & Owner Protection, Excel Import E2E)  |
+------------------------------------------------------------------------+
                                   ▲
+------------------------------------------------------------------------+
|                   Tier 3: Cross-Feature Combinations                   |
| (Profile+Courses+Groups, Roles+Auth, Telegram+Webhook, Import+Backup)   |
+------------------------------------------------------------------------+
                                   ▲
+------------------------------------------------------------------------+
|                  Tier 2: Boundary & Corner Cases                       |
| (Rounding, Div-by-Zero, Formats, Capacity Guards, Immutability Guards) |
+------------------------------------------------------------------------+
                                   ▲
+------------------------------------------------------------------------+
|                     Tier 1: Core Feature Coverage                      |
|       (>= 5 test cases per feature for all 13 Feature Inventory items)  |
+------------------------------------------------------------------------+
```

### Tier 1 — Core Feature Coverage (F1 to F13)
Each feature from the `PROJECT.md` Feature Inventory has at least 5 dedicated, isolated test cases:
1. **F1: Sidebar Navigation Fix (`Sidebar.tsx`)**: Exact match for `/settings`, subpath highlighting for `/settings/team`, `/settings/import`, `/settings/backup`, `/admin/courses`.
2. **F2: Owner Superuser API Protection (`DELETE /api/auth/users`)**: Blocks Owner deletion with HTTP 403, self-deletion guard, role immutability.
3. **F3: `courseStorage.ts` SSOT Foundation**: CRUD operations, 26 initial directions, 4 educational categories, EUR tariffs, `crm-courses-changed` event.
4. **F4: Settings Hub (`/settings`)**: Breadcrumbs, Russian titles, 4 Category Cards, separated Administration section, permission gate.
5. **F5: School Profile (`/settings/profile` / `schoolSettingsStorage.ts`)**: 5 tabs, online-only validation, zero physical branch/room entities, Slovak IBAN, SEPA/Faktura bank details, 09:00–21:00 operating hours.
6. **F6: School Profile Right Sidebar Widgets**: Status 🟢 Активна, Currency EUR (€), Stats (4 staff, 6 directions, 18 students), Quick Actions (Open page, Copy IBAN/SWIFT, Download PDF).
7. **F7: Courses Registry (`/admin/courses`)**: Top 4 KPI summary cards, format and status filters, [Таблица]/[Карточки] toggle, column rendering, capacity display (`8` vs `—`), trial indicator `🔘 Доступно 0 €`.
8. **F8: Course Direction Drawer (`CourseDirectionDrawer.tsx`)**: 4-tab slide-over (Основное, Тарифы, Пробное занятие, Группы), dynamic pricing calculation, capacity disabled on individual format, preset selections.
9. **F9: Team & Staff Cockpit (`/settings/team`)**: Top 4 KPI summary cards, tabs (Сотрудники, Роли и права, Безопасность), staff table/cards with workload and contact details, Employee Drawer.
10. **F10: Roles & Permissions Matrix (`/settings/roles`)**: 4 summary role cards, permissions matrix table across 5 modules, Role Drawer with "X из Y" permissions, system Owner protection.
11. **F11: Telegram Bot Cockpit (`/settings/integrations`)**: Status card 🟢 Подключён, 4 tabs, masked token `••••••••`, edit token dialog, commands list, test actions.
12. **F12: Excel Import Wizard (`/settings/import`)**: 4-step wizard header, «Скачать шаблон Excel» button, live preview table with statuses [Новый, Обновление, Дубликат], right sidebar with history and backup link.
13. **F13: Backup Management Alignment (`/settings/backup`)**: Last backup timestamp, active status badge, manual Excel/Google Sheets export trigger, mock cleanup.

### Tier 2 — Boundary & Corner Cases
- Single-lesson package division (e.g. 25 € / 1 lesson = 25.00 €/зан.).
- Exact decimal rounding (110 € / 8 = 13.75 €/зан.).
- Repeating fraction roundings (99 € / 7 = 14.14 €/зан., 100 € / 3 = 33.33 €/зан., 100 € / 6 = 16.67 €/зан.).
- Zero and negative lessons count / package price guards (no division by zero or NaN).
- Boundary capacity constraints (group capacity 2–16 vs individual strictly 1).
- Format switches (switching between group and individual restores or resets capacity).
- Input normalization (Slovak IBAN space trimming, uppercase sanitization).
- Null / non-numeric fallback recovery for calendar operating hours.
- Extreme character lengths (255-character school names, descriptions).
- Token masking robustness (malformed, empty, or long token strings).

### Tier 3 — Cross-Feature Combinations
- **Profile + Courses + Groups**: School operating hours (09:00–21:00) and currency (EUR) constrain course tariffs and group lesson scheduling boundaries.
- **Roles Matrix + User Deletion**: Owner access gate blocks non-owners, API blocks deleting Owner, Admin cannot revoke Owner privileges.
- **Telegram Token Masking + Webhook Registration**: Raw token masked in UI overview while preserved in backend storage for webhook dispatch.
- **Import Wizard + Backup Safety Reminder**: Step 1 links to `/settings/backup` for safety snapshot prior to bulk import; deduplication against existing database.
- **Course Direction Drawer + Dynamic Pricing Propagation**: Editing a course tariff updates tuition calculations across associated groups and invoice forecasts.

### Tier 4 — Real-World Application Scenarios
- **Scenario 1: Complete Online School Direction Onboarding**: Admin creates a new group course ("German B1 University Prep"), configures 3-tiered tariffs (4/8/16 lessons), enables 0€ trial, verifies SSOT persistence and event dispatch.
- **Scenario 2: Staff Promotion & Owner Protection Lifecycle**: Admin attempts to delete Owner (blocked), attempts to demote Owner (blocked), Owner promotes Teacher to Admin, Owner deactivates inactive staff member.
- **Scenario 3: End-to-End Excel Import & Backup Safety Lifecycle**: Admin accesses `/settings/import`, downloads standardized template «Скачать шаблон Excel», verifies row parsing, simulates deduplication against existing students, triggers backup timestamp synchronization.

---

## 3. Directory Layout & Module Structure

The test suite is structured modularly under `src/__tests__/settings/`:

```
src/__tests__/
├── settings/
│   ├── index.ts                   # Master runner, metric aggregation & CLI entry
│   ├── tier1_features.test.ts     # Tier 1: F1 to F13 comprehensive feature coverage
│   ├── tier2_boundaries.test.ts   # Tier 2: Boundary, rounding, and security invariants
│   ├── tier3_cross_feature.test.ts# Tier 3: Multi-module interactions & propagation
│   └── tier4_scenarios.test.ts    # Tier 4: Real-world administrative lifecycles
└── phase8_settings_admin.test.ts  # Backward-compatible wrapper for tests/run_all_tests.ts
```

---

## 4. Test Environment & Mocking Strategy

The tests run in an in-memory Node.js environment powered by `tests/helpers/testEnv.ts` and `jiti`:
- **In-Memory LocalStorage**: Fully simulates browser `localStorage` (`getItem`, `setItem`, `removeItem`, `clear`, `length`).
- **In-Memory Window & DOM Events**: Mock `window.addEventListener`, `window.removeEventListener`, `window.dispatchEvent`, and `CustomEvent` to test reactive event buses (`crm-courses-changed`, `crm-school-settings-changed`, `crm-groups-changed`).
- **Mock Supabase & HTTP Fetch**: Intercepts `/api/courses`, `/api/school/settings`, `/api/auth/users`, and `/api/backup/export`.
- **Zero Flakiness**: All tests are fully synchronous or cleanly awaited asynchronous promises, completely deterministic and isolated from network or external database state.

---

## 5. Execution Commands

### 1. Run Complete Master Regression Suite (TS-01..TS-26 + Phase 8)
```bash
npm test
```

### 2. Run Phase 8 Dedicated Runner
```bash
node tests/run_phase8.js
```

### 3. Run with Vitest (if configured)
```bash
npx vitest run src/__tests__/settings/
```
