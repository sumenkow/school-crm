# Project: Phase 9 — Teacher Lesson Creation & Approval Workflow

## Architecture
- **Data & Invariants Layer** (`src/types/index.ts`, `src/lib/data/collisionHelper.ts`, `src/lib/data/lessonStorage.ts`):
  - Extends `LessonStatus` to include `'pending' | 'planned' | 'conducted' | 'cancelled'` with backward compatibility for `'scheduled' | 'completed'`.
  - Extends `FullLessonData` with `rejectionReason?: string`, `isIndividual?: boolean`, `studentId?: string`.
  - Zero New Entities: strictly uses existing `Lesson` model; no new database tables.
  - Three-way collision detection: school operating hours (09:00–21:00), teacher availability, group availability, student availability.
  - Slot reservation: `'pending'` lessons reserve slots and block double booking.
  - Zero Premature Billing: creation/approval never debits balances; billing strictly occurs on attendance marking for `present` students.
- **Modal & Creation Flow** (`src/components/calendar/LessonModal.tsx`, `ScheduleLessonModal.tsx`, conflict & success dialogs):
  - Type Switcher (`👥 Групповое занятие` vs `👤 Индивидуальное занятие`).
  - Group preview card / Student live search.
  - Role-locked teacher field (`Мария Иванова (текущий пользователь)` for teachers; selectable dropdown for admin/owner).
  - Duration auto-calculation, Zoom URL pre-fill, trial lesson flag, Telegram checkbox.
  - Dynamic CTA: Teacher: `'Отправить на подтверждение'`, Admin: `'Создать занятие'`.
  - Conflict dialog («Время занято») with conflict badges and nearest free slot suggestions.
  - Success modal («Занятие создано»).
- **Calendar & Administrative Approval** (`src/app/calendar/page.tsx`, `src/components/calendar/LessonDetailsDrawer.tsx`, `src/components/layout/NotificationCenter.tsx`):
  - Operating hours pill indicator (`Сетка: 09:00 – 21:00`).
  - Pending lessons styled with amber badge and border (`🟡 На подтверждении`).
  - Clicking slot auto-fills date, time, and current teacher.
  - Lesson click opens `LessonDetailsDrawer` with approval actions: `🟢 Подтвердить`, `🔴 Отклонить` (with rejection reason prompt), `✏️ Изменить`.
  - NotificationCenter alerts teachers and managers of pending, approved, and rejected lessons.

## Code Layout
- `src/types/index.ts`: Type definitions for `LessonStatus`, `FullLessonData`.
- `src/lib/data/collisionHelper.ts`: 3-way collision logic, school hours check, slot suggestions.
- `src/lib/data/lessonStorage.ts`: Lesson persistence, approval/rejection mutations, billing invariants.
- `src/components/calendar/LessonModal.tsx`: Lesson modal with creation flow and drawer hooks.
- `src/components/calendar/ScheduleLessonModal.tsx`: Creation modal logic with role locking, type switching, conflict and success dialogs.
- `src/components/calendar/LessonDetailsDrawer.tsx`: Admin approval/rejection drawer with status badge and actions.
- `src/app/calendar/page.tsx`: Main calendar page with pending card styling, drawer mounting, and slot click handling.
- `src/components/layout/NotificationCenter.tsx`: Real-time notification center for lesson workflow events.
- `tests/ts27_to_ts32_phase9_lesson_approval.test.ts`: E2E and unit test suite.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Zero New Entities | Extend existing Lesson model without creating new tables | M1 | ORIGINAL_REQUEST §1 |
| 2 | Extended LessonStatus | Add 'pending', 'planned', 'conducted', 'cancelled' with backward compat | M1 | ORIGINAL_REQUEST §1 |
| 3 | Rejection Reason Field | rejectionReason?: string on FullLessonData | M1 | ORIGINAL_REQUEST §1 |
| 4 | Individual Lesson Fields | isIndividual?: boolean, studentId?: string on FullLessonData | M1 | ORIGINAL_REQUEST §1 |
| 5 | Pending Slot Reservation | 'pending' lessons occupy time and block double-booking | M1 | ORIGINAL_REQUEST §2 |
| 6 | School Hours Guard | Collision check verifies lesson fits in 09:00–21:00 | M1 | ORIGINAL_REQUEST §3 |
| 7 | Teacher Collision Guard | Teacher cannot have overlapping lessons (including pending) | M1 | ORIGINAL_REQUEST §3 |
| 8 | Group Collision Guard | Group cannot have overlapping lessons (including pending) | M1 | ORIGINAL_REQUEST §3 |
| 9 | Student Collision Guard | Individual student cannot have overlapping lessons | M1 | ORIGINAL_REQUEST §3 |
| 10 | Nearest Slot Suggestions | suggestAlternativeSlots generates top free slots within 09:00–21:00 | M1 | ORIGINAL_REQUEST §3 |
| 11 | Mutation-Level Protection | saveLessonToStorage validates collisions prior to writing | M1 | ORIGINAL_REQUEST §3 |
| 12 | Billing Safety Invariant | Lesson creation/approval strictly incurs zero debit to balances/subscriptions | M1 | ORIGINAL_REQUEST §4 |
| 13 | Trial Lesson Invariant | Trial lessons respect trial flag without debiting paid packages | M1 | ORIGINAL_REQUEST §5 |
| 14 | Role Impersonation Protection | Teachers locked to own teacherId; only Admin/Owner can switch | M2 | ORIGINAL_REQUEST §6 |
| 15 | Type Switcher Tabs | Switch between Group (👥) and Individual (👤) lesson creation | M2 | ORIGINAL_REQUEST §7 |
| 16 | Group Preview Card | Course, student count, age, duration preview with 'Посмотреть учеников' | M2 | ORIGINAL_REQUEST §7 |
| 17 | Student Live Search | Searchable dropdown with avatar, student name, course, status | M2 | ORIGINAL_REQUEST §7 |
| 18 | Auto-calculated Duration | End time auto-calculated from start time and course/direction duration | M2 | ORIGINAL_REQUEST §7 |
| 19 | Pre-filled Zoom URL | Teacher Zoom link pre-populated with copy button | M2 | ORIGINAL_REQUEST §7 |
| 20 | Topic & Homework Inputs | Topic and homework fields in creation modal | M2 | ORIGINAL_REQUEST §7 |
| 21 | Options Checkboxes | Telegram notification checkbox and Trial lesson checkbox | M2 | ORIGINAL_REQUEST §7 |
| 22 | Dynamic CTA Button | 'Отправить на подтверждение' (teacher) vs 'Создать занятие' (admin) | M2 | ORIGINAL_REQUEST §7 |
| 23 | Conflict Warning Dialog | «Время занято» dialog with conflict details | M2 | ORIGINAL_REQUEST §7 |
| 24 | Conflict Badges | Badges for Teacher Conflict, Group Conflict, Student Conflict | M2 | ORIGINAL_REQUEST §7 |
| 25 | Conflict Slot Quick-Pick | One-click apply button for nearest alternative free slots | M2 | ORIGINAL_REQUEST §7 |
| 26 | Success State Modal | «Занятие создано» modal with summary card and '🟡 На подтверждении' | M2 | ORIGINAL_REQUEST §7 |
| 27 | Success Modal Actions | '+ Создать ещё одно занятие' and 'Закрыть' buttons | M2 | ORIGINAL_REQUEST §7 |
| 28 | Calendar Slot Click Prefill | Clicking open slot auto-fills date, time, and current teacher | M3 | ORIGINAL_REQUEST §7 |
| 29 | Operating Hours Pill | Visual indicator: 'Сетка: 09:00 – 21:00' | M3 | ORIGINAL_REQUEST §7 |
| 30 | Pending Card Amber Styling | Amber badge and border: '🟡 На подтверждении' on calendar cards | M3 | ORIGINAL_REQUEST §7 |
| 31 | Calendar Drawer Mounting | Clicking lesson opens LessonDetailsDrawer | M3 | ORIGINAL_REQUEST §7 |
| 32 | Drawer Status Badge | '🟡 На подтверждении' badge displayed in drawer | M3 | ORIGINAL_REQUEST §7 |
| 33 | Admin Approve Action | '🟢 Подтвердить' button transitions pending to planned | M3 | ORIGINAL_REQUEST §7 |
| 34 | Admin Reject Action | '🔴 Отклонить' button with rejection reason prompt modal | M3 | ORIGINAL_REQUEST §7 |
| 35 | Admin Edit Action | '✏️ Изменить' button allows adjusting time/teacher before approving | M3 | ORIGINAL_REQUEST §7 |
| 36 | Notification Workflow | NotificationCenter alerts teachers and managers of approval events | M3 | ORIGINAL_REQUEST §7 |
| 37 | E2E Regression Verification | 100% pass of E2E test suite covering all features and invariants | M4 | Quality Criteria |
| 38 | Adversarial Hardening | Tier 5 stress test validation under edge cases and concurrency | M4 | Quality Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Core Data, Storage & 3-Way Collision Detection | Types, collisionHelper.ts, lessonStorage.ts, billing invariants | none | DONE |
| M2 | Dynamic Lesson Modal, Conflict Dialog & Success Modal | Creation flow, role locking, type switcher, collision dialog, success modal | M1 | DONE |
| M3 | Calendar Mounting, Amber Badges, Approval Drawer & Notifications | Calendar grid pending styling, drawer mounting, approve/reject flow, NotificationCenter | M1, M2 | PLANNED |
| M4 | Final Milestone: 100% E2E Pass & Adversarial Hardening | Phase 1: Pass 100% of E2E test suite (Tiers 1-4). Phase 2: Tier 5 adversarial hardening | M1, M2, M3 | PLANNED |

## Interface Contracts
### Data Layer (`collisionHelper.ts` & `lessonStorage.ts`) ↔ UI Modals
- `checkThreeWayCollision(lessons: FullLessonData[], candidate: CandidateLesson): CollisionResult`
  - Returns `{ hasConflict: boolean, conflicts: ConflictDetail[], nearestSlots: AvailableSlot[] }`
  - `ConflictDetail`: `{ type: 'teacher' | 'group' | 'student' | 'hours', message: string, conflictingLesson?: FullLessonData }`
- `suggestAlternativeSlots(lessons: FullLessonData[], candidate: CandidateLesson, count?: number): AvailableSlot[]`
  - Returns up to `count` (default 3) slots strictly between 09:00 and 21:00 on candidate date.
- `saveLessonToStorage(lesson: FullLessonData): { success: boolean, lesson?: FullLessonData, error?: string }`
  - Validates operating hours and 3-way collisions; persists to storage; updates cache.
- `approveLessonInStorage(lessonId: string): Promise<FullLessonData | null>`
  - Transitions `status: 'pending'` to `'planned'`, clears any `rejectionReason`, emits event.
- `rejectLessonInStorage(lessonId: string, reason: string): Promise<FullLessonData | null>`
  - Transitions `status: 'pending'` to `'cancelled'`, sets `rejectionReason: reason`, emits event.
