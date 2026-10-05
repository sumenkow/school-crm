# E2E Test Infra: Phase 8 Settings & Administration Refactor

## Test Philosophy & Methodology
- **Opaque-Box Requirement-Driven Testing**: Tests are designed directly from business specifications in `PROJECT.md` and `ORIGINAL_REQUEST.md` (section `## 2026-10-05T09:46:46Z`).
- **4-Tier Architecture**:
  1. **Tier 1 — Feature Coverage (>=5 test cases per feature)**: Deep validation of individual functional blocks (F1 through F12).
  2. **Tier 2 — Boundary & Corner Cases**: Precision rounding, single-item packages, zero/negative guards, input formatting, immutable security boundaries.
  3. **Tier 3 — Cross-Feature Combinations**: Multi-subsystem interactions (tariffs ↔ groups, operating hours ↔ calendar, token masking ↔ security).
  4. **Tier 4 — Real-World Application Scenarios**: End-to-end operational workflows (complete online school initialization, tariff packaging workflow).
- **Test Integrity**: Zero facade tests. Pure assertions checking dynamic calculation, schema compliance, event dispatch, and UI contract invariants.

---

## Environment & Harness Architecture
- **Harness**: Node.js in-memory execution harness using `jiti` with path alias resolution (`@/` to `./src`).
- **Environment Mocking (`tests/helpers/testEnv.ts`)**:
  - In-memory `localStorage` with `getItem`, `setItem`, `removeItem`, `clear`.
  - In-memory `window` with `CustomEvent` and `dispatchEvent` for storage event listeners (`crm-courses-changed`, `crm-school-settings-changed`).
  - Mocked `fetch` for cloud API routes (`/api/school/settings`, `/api/courses`, `/api/telegram/setup`, `/api/auth/users`).
- **Test Suite Location**: `src/__tests__/phase8_settings_admin.test.ts`.
- **Integrated Test Runner**: Integrated with `tests/run_all_tests.ts` via `npm test` (`node tests/index.js`). Also compatible with `vitest`.

---

## Feature Inventory & Test Coverage Mapping (Tiers 1–4)

| Feature | Scope / Contract | Tier 1 (Happy Path) | Tier 2 (Boundary & Corner) | Tier 3 (Cross-Feature) | Tier 4 (E2E Scenario) |
|---|---|---|---|---|---|
| **F1: Canonical Navigation** | `Sidebar.tsx` exact match on `/settings`, no double active state on `/settings/team`, `/settings/import`, `/settings/backup` | T1-F1.1 .. T1-F1.5 | Sub-path slash matching, trailing slashes | Navigation state during tab switches | Full navigation audit across roles |
| **F2: Settings Hub Layout** | `/settings` 4 Category Cards + Lower Administration Section | T1-F2.1 .. T1-F2.5 | Missing data empty states, responsive flags | Card click routes to canonical subpages | Hub overview journey |
| **F3: School Profile Model** | `schoolSettingsStorage.ts`: Online-only badge, zero physical rooms/branches | T1-F3.1 .. T1-F3.5 | Empty address/slogan, unicode chars | Profile updates broadcast to listeners | School setup journey |
| **F4: Currency & Faktura** | Fixed EUR (€) badge, Tatra banka, IBAN, SWIFT/BIC, invoice sequence | T1-F4.1 .. T1-F4.5 | IBAN spacing normalization, invoice # overflow | Faktura data sync to storage | Invoice setup & issuance |
| **F5: Operating Hours SSOT** | 09:00–21:00 (Пн–Сб) controlling calendar grid start/end | T1-F5.1 .. T1-F5.5 | Inverted start/end hour guards, single-day schedules | Operating hours reflected in calendar | Schedule builder sync |
| **F6: Courses Storage SSOT** | `courseStorage.ts`: CRUD, 26 initial directions, 4 categories | T1-F6.1 .. T1-F6.5 | Empty names, duplicate IDs, category filters | Course changes trigger group sync | Course catalog initialization |
| **F7: Formats & Capacity** | Group (numeric capacity) vs Individual (capacity '—' / disabled) | T1-F7.1 .. T1-F7.5 | Minimum capacity 1, extreme capacity, zero capacity | Format change resets capacity | Direction drawer format switch |
| **F8: Tariffs & Pricing** | Strictly `packagePrice / lessonsCount`, no manual lesson price, EUR | T1-F8.1 .. T1-F8.5 | Single-lesson packages, fractional rounding (13.75 €) | Tariff change updates group tuition | Tiered tariff creation (4/8/16) |
| **F9: Trial Lesson Toggle** | `isTrialAvailable: boolean`, zero duplicate Trial entities | T1-F9.1 .. T1-F9.5 | Boolean coercion, default fallback | Trial booking relies on course flag | Course trial availability workflow |
| **F10: Team & Access Control** | `/settings/team`, `/api/auth/users`: Owner superuser badge, non-revokable | T1-F10.1 .. T1-F10.5 | Attempt to demote/delete/deactivate Owner | RLS vs UI permission separation | Owner security audit |
| **F11: Telegram Integrations** | Masked token `••••••••`, dedicated modal, interactive webhook test | T1-F11.1 .. T1-F11.5 | Malformed token formats, empty token masking | Masking prevents accidental exposure | Telegram bot configuration |
| **F12: Administrative Tools** | `/settings/import` button «Скачать шаблон Excel», `/settings/backup` status | T1-F12.1 .. T1-F12.5 | Backup timestamp missing, large file mock | Import/backup state persistence | Disaster recovery drill |

---

## Execution Commands
- **Full CRM Verification Suite (TS-01..TS-26 + Phase 8)**:
  ```bash
  npm test
  ```
- **Direct Test Runner Execution**:
  ```bash
  node tests/index.js
  ```
- **Vitest Runner (if installed in dev environment)**:
  ```bash
  npx vitest run src/__tests__/phase8_settings_admin.test.ts
  ```
