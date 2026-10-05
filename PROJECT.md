# Project: Phase 8 Settings & Administration UI Refactor

## Architecture
Online-School Configuration Cockpit for You Europe / Smart Academy CRM.
- **SSOT Storage Layer**:
  - `schoolSettingsStorage.ts`: School profile, EUR/SEPA bank accounts, working hours, online-only settings (`localStorage['school_settings']` synced via `/api/school/settings`).
  - `courseStorage.ts`: Centralized course directions & tariffs (`localStorage['crm_courses_v1']` with sync to Supabase `courses` table).
  - `groupStorage.ts`: Existing groups, schedules, and capacity (`localStorage['crm_groups_master_v2']`).
  - `auth/users`: Supabase auth & `profiles` table.
- **Strict Business & Architectural Constraints**:
  - 100% Online School: Strictly zero physical classrooms, rooms, branches, or physical addresses.
  - Two Formats: Strictly Group (`group`) and Individual (`individual`). Capacity disabled (`—`) for individual.
  - Calculated Pricing Principle: `pricePerLesson = packagePrice / lessonsCount` read-only derived dynamically (€/зан.). No manual lesson price input.
  - Trial Lesson Model: Reuse existing trial mechanics (`isTrialAvailable: boolean` on courses, existing lead/student/lesson statuses). Zero new DB entities.
  - Primary Currency: EUR (€).
  - Protected Owner Superuser: Unrevokable, unblockable, un-deletable in UI and API (`DELETE /api/auth/users` HTTP 403).
  - Masked Telegram Token: `••••••••••••` with dedicated "Изменить токен" modal/dialog.
  - Navigation: Canonical exact matching in `Sidebar.tsx` to prevent double-active state on `/settings` and subpages.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Sidebar Navigation Fix | Fix double-active highlight for `/settings` when visiting subpages (`/settings/team`, `/settings/import`, `/settings/backup`) | M0 | Survey 3 §1.4 |
| 2 | Owner Superuser API Protection | `DELETE /api/auth/users` blocks deleting any account with `role === 'owner'` with HTTP 403 | M0 | Survey 3 §1.1.3 |
| 3 | `courseStorage.ts` SSOT Foundation | Centralized CRUD storage for 26 canonical course directions, EUR tariffs, formats, and event dispatch | M0 | Survey 2 §1.2 |
| 4 | Settings Hub (`/settings`) | Breadcrumbs, updated header, 4 Category Cards (`/settings/profile`, `/admin/courses`, `/settings/team`, `/settings/integrations`), «Административные инструменты» section | M1 | Survey 1 §1.1 |
| 5 | School Profile (`/settings/profile`) | Dedicated 2/3 + 1/3 page, 5 tabs (Основная информация, Контакты, Онлайн-формат, Рабочие часы, Банковские реквизиты EUR/SEPA) | M1 | Survey 1 §1.2 |
| 6 | School Profile Right Sidebar Widgets | Status 🟢 Активна, Currency EUR (€), Stats (4 staff, 6 directions, 18 students), Quick Actions (Open page, Copy IBAN/SWIFT, Download PDF) | M1 | Survey 1 §1.2 |
| 7 | Courses Registry (`/admin/courses`) | Dedicated cockpit page, top 4 KPI cards, format/status filters, [Таблица]/[Карточки] toggle, columns with `[x]`, format, duration, capacity `8`/`—`, tariffs count, trial indicator `🔘 Доступно 0 €` | M2 | Survey 1 §1.3 |
| 8 | Course Direction Drawer | 4-tab slide-over drawer (Основное, Тарифы (N), Пробное занятие, Группы (N)), capacity guard, read-only dynamic pricing | M2 | Survey 1 §1.3 |
| 9 | Team & Staff Cockpit (`/settings/team`) | Top KPI cards (4), tabs (Сотрудники, Роли и права, Безопасность), staff table/cards with workload and contact details, Employee Drawer (4 tabs) | M3 | Survey 3 §1.1 |
| 10 | Roles & Permissions Matrix | `/settings/team?tab=roles` / `/settings/roles`, 4 summary role cards, permissions matrix table, Role Drawer with "X из Y" permissions and Owner protection | M3 | Survey 3 §1.1.4 |
| 11 | Telegram Bot Cockpit (`/settings/integrations`) | Status card 🟢 Подключён, 4 tabs (Основные настройки, Уведомления, Каналы и получатели, Тестирование), masked token `••••••••`, edit token dialog, commands list, test actions | M4 | Survey 3 §1.2 |
| 12 | Excel Import Wizard (`/settings/import`) | 4-step wizard, «Скачать шаблон Excel» button with template download, live preview table with statuses, right sidebar with history and backup link | M4 | Survey 3 §1.3.1 |
| 13 | Backup Management Alignment (`/settings/backup`) | Last backup timestamp, active status, manual Excel/Google Sheets export, mock cleanup | M4 | Survey 3 §1.3.2 |
| 14 | E2E Testing Suite (Tiers 1-4) | Requirements-driven test suite with >=11*N test cases covering all settings and administration features | M5 | Prompt Dual Track |
| 15 | Adversarial Hardening (Tier 5) & Pre-Flight Verification | White-box stress tests, TypeScript check (0 errors), npm test (100%), npm run build clean | M5 | Prompt Dual Track & Pre-Flight |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M0 | Safety & Foundation Layer | Features 1, 2, 3 (`Sidebar.tsx`, `api/auth/users`, `courseStorage.ts`) | none | IN_PROGRESS |
| M1 | Settings Hub & School Profile | Features 4, 5, 6 (`/settings`, `/settings/profile`) | M0 | PLANNED |
| M2 | Courses & Directions Cockpit | Features 7, 8 (`/admin/courses`, `CourseDirectionDrawer.tsx`) | M0 | PLANNED |
| M3 | Team, Roles & Permissions Cockpit | Features 9, 10 (`/settings/team`, `/settings/roles`, Employee & Role Drawers) | M0 | PLANNED |
| M4 | Integrations, Import & Backup | Features 11, 12, 13 (`/settings/integrations`, `/settings/import`, `/settings/backup`) | M0 | PLANNED |
| M5 | Final E2E Test Suite & Hardening | Features 14, 15 (E2E Test validation, Adversarial tests, Pre-flight checks) | M1, M2, M3, M4 | PLANNED |

## Interface Contracts
### `courseStorage.ts` ↔ Course Management & Groups
- Types:
  ```ts
  export type CourseFormat = 'group' | 'individual';
  export type CourseStatus = 'active' | 'archived';
  export interface CourseTariff {
    id: string;
    lessonsCount: number;
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
    capacity: number; // 6-8 for group; 1 for individual
    tariffs: CourseTariff[];
    isTrialAvailable: boolean;
    status: CourseStatus;
    color?: string;
  }
  ```
- Functions: `getStoredCourses()`, `getCourseById(id)`, `saveCourse(course)`, `deleteCourse(id)`, `calcPricePerLesson(tariff)`.
- Event: `crm-courses-changed`.

### `DELETE /api/auth/users` ↔ Client UI
- Request: `DELETE /api/auth/users?id={userId}`
- Response if target is owner: `HTTP 403 Forbidden` (`{ error: 'Удаление аккаунта владельца школы запрещено' }`).

### School Profile ↔ SSOT
- Storage: `getSchoolSettings()`, `saveSchoolSettings()` in `schoolSettingsStorage.ts`.
- Cloud endpoint: `GET/POST /api/school/settings`.

## Code Layout
- `src/app/settings/page.tsx` — Settings hub
- `src/app/settings/profile/page.tsx` — School profile page
- `src/app/admin/courses/page.tsx` — Courses & directions registry
- `src/components/settings/CourseDirectionDrawer.tsx` — 4-tab course direction drawer
- `src/app/settings/team/page.tsx` — Team, roles & security cockpit
- `src/app/settings/integrations/page.tsx` — Telegram & external integrations cockpit
- `src/app/settings/import/page.tsx` — 4-step Excel import wizard with template download
- `src/app/settings/backup/page.tsx` — Backup management
- `src/lib/data/courseStorage.ts` — Course SSOT storage
- `src/app/api/auth/users/route.ts` — User auth & Owner protection API
- `src/components/layout/Sidebar.tsx` — Navigation active state
