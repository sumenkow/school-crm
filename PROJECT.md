# Project: You Europe / Smart Academy CRM — Phase 8 Settings & Administration Refactor

## Architecture
Online-only European educational center cockpit for **You Europe / Smart Academy CRM**.
The system operates 100% online in EUR (€) without physical classrooms, branches, or hybrid formats.

### Core Modules & Data Flow
1. **Navigation & Global Layout (`Sidebar.tsx`)**:
   - Canonical single-active navigation item mapping without duplicate active state on subroutes.
2. **Settings Hub (`/settings`)**:
   - Primary cockpit overview displaying 4 core category cards at top: School Profile, Courses & Directions, Team & Access, Integrations.
   - Dedicated Administration section below: Excel Import & Database Backup.
3. **School Profile & Faktura (`schoolSettingsStorage.ts`, `SchoolProfileModal.tsx`)**:
   - SSOT storage key `crm_school_profile_v1` backed by `/api/school/settings`.
   - Online-only fixed indicator, EUR (€) fixed badge, operating hours 09:00–21:00 (Mon–Sat) controlling calendar grid.
   - European Faktura billing details: Tatra banka, a.s., IBAN SK34..., SWIFT/BIC TATRSKBX, next invoice number.
4. **Course & Directions Domain (`courseStorage.ts`, `/admin/courses`)**:
   - SSOT storage key `crm_courses_v1` with event `crm-courses-changed`. Syncs to Supabase `courses` table.
   - Strict format support: `Group` (numeric capacity) and `Individual` (capacity disabled / '—').
   - Strict calculated pricing: `packagePrice / lessonsCount` (€/зан.) — zero manual lesson price input.
   - Native trial availability flag `isTrialAvailable: boolean` reusing existing CRM trial mechanics (Zero New Entities).
   - 26 realistic European online school directions across 4 subject categories.
5. **Team & Access Control (`/settings/team`, `roleContext.tsx`, `api/auth/users`)**:
   - Canonical route `/settings/team` managing Owner, Admin, Teacher.
   - Non-revokable Owner protection with superuser badge.
   - Clear UI separation between application access permissions and Postgres RLS security policies.
6. **Integrations Hub (`TelegramSettingsModal.tsx`, `/api/telegram/*`, Google Sheets sync)**:
   - Masked token `••••••••` with dedicated "Изменить токен" modal.
   - Webhook registration & status, connection test buttons, Chat IDs, notification switches.
   - Google Sheets synchronization status.
7. **Administrative Tools (`/settings/import`, `/settings/backup`)**:
   - Import: 4-step wizard preserved with button renamed to «Скачать шаблон Excel».
   - Backup: Last backup timestamp, active protection status, manual export triggers.

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Canonical Navigation & Sidebar Fix | Eliminate duplicate active state between `/settings` and `/settings/team`, `/settings/import`, `/settings/backup` in `Sidebar.tsx` | M1 | Survey 1, 3 |
| 2 | Settings Hub Overview Layout | Replace legacy 2-hero banner layout with top 4 Category Cards grid and lower Administration section on `/settings` | M1 | Survey 1 |
| 3 | Online-Only School Profile Model | Eliminate physical rooms/branches/addresses; display fixed «Онлайн-школа» badge | M2 | Survey 1 |
| 4 | EUR (€) & Banking Details for Faktura | Read-only EUR badge; complete Faktura details (Tatra banka, IBAN, SWIFT/BIC, next invoice #, VAT note) | M2 | Survey 1 |
| 5 | Calendar Operating Hours SSOT | Configure and display 09:00–21:00 (Пн–Сб) operating hours wired to calendar grid | M2 | Survey 1 |
| 6 | Course Storage SSOT (`courseStorage.ts`) | Centralized client & cloud storage for courses with 26 seed directions and event broadcasting | M3 | Survey 2 |
| 7 | Courses & Directions Registry Page | Implement full compact registry table at `/admin/courses` with search, filters, formats, capacity, and status | M3 | Survey 2 |
| 8 | Learning Formats & Capacity Logic | Strict `Group` vs `Individual`. Numeric capacity for Group; '—' and disabled input for Individual | M3 | Survey 2 |
| 9 | Dynamic Calculated Tariffs Model | Tariffs package table in EUR (€); price per lesson derived strictly dynamically (`packagePrice / lessonsCount`); no manual entry | M3 | Survey 2 |
| 10 | Trial Lesson Toggle Integration | Reuse existing trial mechanics with `isTrialAvailable: boolean` toggle on course | M3 | Survey 2 |
| 11 | Team & Access Control Canonical Route | `/settings/team` verified as single canonical route with clear RLS vs UI permissions separation | M4 | Survey 3 |
| 12 | Owner Role Non-Revokable Protection | Protect Owner in UI and backend API (`DELETE /api/auth/users`) against deletion, blocking, and demotion | M4 | Survey 3 |
| 13 | Telegram Bot Secure Token Masking | Mask token as `••••••••` with dedicated "Изменить токен" modal in `TelegramSettingsModal.tsx` | M5 | Survey 3 |
| 14 | Telegram & Google Sheets Status Hub | Interactive webhook test, chat IDs, notifications toggle, Google Sheets sync status card | M5 | Survey 3 |
| 15 | Import Wizard Excel Template Button | Rename sample button to «Скачать шаблон Excel» with template download in `/settings/import` | M6 | Survey 3 |
| 16 | Backup Status & Manual Trigger Display | Display last backup timestamp, active status pill, and manual export triggers in `/settings/backup` | M6 | Survey 3 |
| 17 | Comprehensive E2E Test Suite | Automated test suite across Tiers 1–4 validating all Phase 8 features and pre-flight checks | M7 | Requirement |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Navigation & Settings Hub | `Sidebar.tsx`, `src/app/settings/page.tsx` layout refactor with 4 category cards & admin section | none | DONE |
| M2 | School Profile & Faktura | `schoolSettingsStorage.ts`, `SchoolProfileModal.tsx`, online-only indicators, EUR currency, Faktura details | M1 | DONE |
| M3 | Courses & Directions Registry | `courseStorage.ts`, `/admin/courses/page.tsx`, `CourseDirectionDrawer.tsx`, dynamic tariffs, Group/Individual formats | M1 | DONE |
| M4 | Team & Access Control | `/settings/team/page.tsx`, `api/auth/users/route.ts`, Owner superuser guard, RLS vs UI permission clarity | M1 | DONE |
| M5 | Integrations (Telegram & External) | `TelegramSettingsModal.tsx`, token masking modal, webhook testing, Google Sheets sync card | M1 | DONE |
| M6 | Administrative Tools (Import & Backup) | `/settings/import/page.tsx` template button rename, `/settings/backup/page.tsx` integration | M1 | DONE |
| M7 | E2E Testing & Pre-Flight Verification | Requirement-driven test suite (Tiers 1–4), `npm run check`, `npm test`, `npm run build` | M1–M6 | IN_PROGRESS |

---

## Interface Contracts

### `courseStorage.ts` ↔ UI Components (`/admin/courses`, Modals)
```ts
export type CourseFormat = 'group' | 'individual';
export type CourseStatus = 'active' | 'archived';

export interface CourseTariff {
  id: string;
  lessonsCount: number; // 4, 8, 16, 24
  packagePrice: number; // EUR (€)
  status: 'active' | 'archived';
  name?: string;
}

export interface CourseDirection {
  id: string;
  name: string;
  subject: 'Иностранные языки' | 'Информатика и IT' | 'Точные науки' | 'Развитие интеллекта';
  description?: string;
  format: CourseFormat;
  ageGroup: string;
  lessonDuration: string;
  lessonDurationMinutes: number;
  capacity: number; // e.g. 6-8 for group; 1 for individual
  tariffs: CourseTariff[];
  isTrialAvailable: boolean;
  status: CourseStatus;
  color?: string;
}

// Helper: Calculate price per lesson dynamically
export function calculateLessonPrice(packagePrice: number, lessonsCount: number): number {
  if (!lessonsCount || lessonsCount <= 0) return 0;
  return Math.round((packagePrice / lessonsCount) * 100) / 100;
}
```

### `schoolSettingsStorage.ts` ↔ School Profile & Calendar
```ts
export interface SchoolProfileData {
  name: string;
  slogan: string;
  legalEntity: string;
  accountHolder?: string;
  inn: string;
  ogrn: string;
  bankAccount: string;
  iban?: string;
  swiftBic?: string;
  bankName: string;
  bik: string;
  phone: string;
  email: string;
  workHours: string;
  workDays?: string;
  calendarStartHour?: number; // 9
  calendarEndHour?: number;   // 21
  timezone: string;
  currency?: string;          // Strictly 'EUR'
  vatNote?: string;
  nextInvoiceNumber?: number;
  schoolFormat?: 'online';    // Strictly online-only
}
```

---

## Code Layout
- `src/components/layout/Sidebar.tsx`: Navigation sidebar item active state logic.
- `src/app/settings/page.tsx`: Settings Hub overview page.
- `src/components/settings/SchoolProfileModal.tsx`: School profile & Faktura settings modal.
- `src/lib/data/schoolSettingsStorage.ts`: School settings persistent data layer.
- `src/lib/data/courseStorage.ts`: Central course directions & tariffs data layer.
- `src/app/admin/courses/page.tsx`: Courses & directions registry page.
- `src/components/settings/CourseDirectionDrawer.tsx`: Slide-over drawer for adding/editing course directions.
- `src/app/settings/team/page.tsx`: Canonical team & access control page.
- `src/app/api/auth/users/route.ts`: Backend user management API with Owner protection.
- `src/components/settings/TelegramSettingsModal.tsx`: Telegram bot configuration modal with masked token.
- `src/app/settings/import/page.tsx`: 4-step Excel import wizard with template download.
- `src/app/settings/backup/page.tsx`: Database backup and Google Sheets sync page.
