# Project: Phase 10 — Telegram Mini App for Self-Booking by Parents

## Architecture
- **Domain & Storage Layer (Zero New Entities)**:
  - Reuses existing `Lesson`, `Student`, `Parent`, `Group`, `CourseDirection`, `Teacher` entities.
  - Group Booking: Enrolls student into existing `lesson.students` of target `FullLessonData` with capacity and double-booking guards.
  - Individual Booking: Creates standard `FullLessonData` with `isIndividual: true`, `studentId`, `teacherId`, `status: 'planned'`, validating 3-way collisions and school hours 09:00–21:00 via `collisionHelper.ts`.
  - Trial Booking: Reuses existing `isTrial: boolean` flag without debiting paid subscriptions.
  - Zero Premature Billing Invariant: Booking creation sets `isBilled: false` and `attendanceStatus: 'not_marked'`. Zero balance or deposit debited upon booking; billing strictly occurs upon lesson attendance/completion (`conducted`).
- **Telegram Bot & Webhook Integration Layer**:
  - Preserves 100% of existing pipeline (`Parent ↔ Telegram Bot ↔ Webhook ↔ CRM ChatBox ↔ Administrator`).
  - Screen 11: Reply Keyboard (5 buttons) and `web_app` inline button ('Открыть расписание') launching `/mini-app`.
  - Screen 12: Admin CRM Chat "Предложить занятие" in `src/components/telegram/TelegramChatBox.tsx` with modal and interactive booking card.
  - Telegram WebApp client authentication via initData with server-side validation and parent-child ownership verification.
- **Mini App Client Layer (Screens 1–10)**:
  - Mobile SPA under route `/mini-app` (isolated from desktop CRM chrome in `AppShell.tsx` and `mini-app/layout.tsx`).
  - Screen 1: Home Menu (greeting, avatar, 5 quick-action cards, 4-tab mobile bottom nav).
  - Screen 2: Format Selection (Group, Individual, Trial).
  - Screen 3: Direction Selection (flags, course directions).
  - Screen 4: Group Selection (tabs 'Группы' | 'Открытые занятия', occupancy progress bar, available seats badge).
  - Screen 5: Date & Lesson Selection (horizontal date pills, group lessons with seat status badges).
  - Screen 6: Child Selection (radio verified child selection, '+ Добавить ребёнка' modal).
  - Screen 7: Booking Confirmation (review card, Zoom room, Telegram reminder toggle).
  - Screen 8: Success State (checkmark, Zoom link, .ics calendar export, navigation buttons).
  - Screen 9: Individual Teacher Selection (cards with rating ★ 4.9, 24 reviews, subject).
  - Screen 10: Individual Slots Selection (60-min slots in 09:00–21:00 with collision checking).

## Code Layout
- `src/lib/data/lessonStorage.ts`: Typing fixes, `bookGroupLesson`, `bookIndividualLesson`, Zero Premature Billing guards.
- `src/app/api/telegram/mini-app/`: API routes for parent resolution, directions, groups, teachers, and booking.
- `src/lib/telegram/telegramClient.ts`: `sendTelegramDirectMessage` with `replyMarkup?: any`.
- `src/app/api/telegram/webhook/route.ts`: Screen 11 Reply Keyboard & WebApp launch button, message pipeline preservation.
- `src/components/telegram/TelegramChatBox.tsx`: Screen 12 "Предложить занятие" button and modal.
- `src/app/mini-app/layout.tsx`: Mobile SPA layout with Telegram WebApp SDK script and dev mock.
- `src/app/mini-app/page.tsx`: Screens 1–10 SPA implementation.
- `tests/phase10_telegram_mini_app.test.ts`: Automated test suite for Phase 10.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Zero New Entities & Typing Fixes | Fix TS errors in lessonStorage.ts and reuse existing domain models | M1 | ORIGINAL_REQUEST R2 |
| 2 | Group Booking Core Engine | Atomic capacity validation, double-booking prevention, enrollment into lesson.students | M1 | ORIGINAL_REQUEST R2, R6 |
| 3 | Individual Booking Core Engine | Standard lesson creation with isIndividual: true, collision check, school hours 09:00–21:00 | M1 | ORIGINAL_REQUEST R2, R6 |
| 4 | Zero Premature Billing Invariant | Booking creates lessons with 0 debits; billing strictly on conducted/attendance | M1 | ORIGINAL_REQUEST R3 |
| 5 | IDOR & Child Ownership Guard | Server-side verification that student belongs to parent via student.parents | M1 | ORIGINAL_REQUEST R6 |
| 6 | Slot Generator 09:00–21:00 | Update teachers/route.ts slot start hour to 09:00 according to school hours | M1 | Architecture Doc §4 |
| 7 | Telegram Client ReplyMarkup Support | Add replyMarkup?: any to sendTelegramDirectMessage in telegramClient.ts | M2 | Architecture Doc §2 |
| 8 | Screen 11: Telegram Bot Reply Keyboard | 5 Reply Keyboard buttons ('📅 Записаться на занятие', '📆 Мои занятия', etc.) | M2 | ORIGINAL_REQUEST R4, Screen 11 |
| 9 | Screen 11: WebApp Inline Button Launch | Bot sends '📅 Открыть расписание' web_app inline button launching /mini-app | M2 | ORIGINAL_REQUEST R4, Screen 11 |
| 10 | Telegram Chat Pipeline Preservation | Normal parent text messages continue flowing to CRM ChatBox without interference | M2 | ORIGINAL_REQUEST R4 |
| 11 | Screen 12: Admin "Предложить занятие" Button | Button added above input field in TelegramChatBox.tsx | M2 | ORIGINAL_REQUEST R5, Screen 12 |
| 12 | Screen 12: Offer Lesson Modal & Card | Modal to choose open group/slot and send interactive booking card to Telegram | M2 | ORIGINAL_REQUEST R5, Screen 12 |
| 13 | Mobile SPA Layout Isolation | Layout for /mini-app with Telegram WebApp script, mobile viewport, and dev mock | M3 | ORIGINAL_REQUEST R1 |
| 14 | Screen 1: Home Menu UI | Personalized greeting, avatar, 5 quick-action cards, 4-tab mobile bottom nav | M3 | ORIGINAL_REQUEST R1, Screen 1 |
| 15 | Screen 2: Format Selection UI | Cards for Group, Individual, Trial formats | M3 | ORIGINAL_REQUEST R1, Screen 2 |
| 16 | Screen 3: Direction Selection UI | Active course directions with flags/icons | M3 | ORIGINAL_REQUEST R1, Screen 3 |
| 17 | Screen 4: Group Selection UI | Tabs 'Группы' \| 'Открытые занятия', progress bar, seat badges | M3 | ORIGINAL_REQUEST R1, Screen 4 |
| 18 | Screen 5: Date & Lesson Selection UI | Horizontal date pills, lessons list, seat status badges | M3 | ORIGINAL_REQUEST R1, Screen 5 |
| 19 | Screen 6: Child Selection UI | Radio verified child selection, '+ Добавить ребёнка' modal | M3 | ORIGINAL_REQUEST R1, Screen 6 |
| 20 | Screen 7: Booking Confirmation UI | Review card, Zoom room, selected child, Telegram reminder toggle | M3 | ORIGINAL_REQUEST R1, Screen 7 |
| 21 | Screen 8: Success State UI | Confirmation checkmark, Zoom link, .ics export, navigation | M3 | ORIGINAL_REQUEST R1, Screen 8 |
| 22 | Screen 9: Individual Teacher Selection UI | Teacher cards with rating ★ 4.9, 24 reviews, subject | M3 | ORIGINAL_REQUEST R1, Screen 9 |
| 23 | Screen 10: Individual Slots Selection UI | 60-min slots in 09:00–21:00 with conflict checking | M3 | ORIGINAL_REQUEST R1, Screen 10 |
| 24 | E2E Test Suite (Tiers 1–4) | Comprehensive opaque-box test suite published in TEST_READY.md | M4 | Quality Criteria |
| 25 | Adversarial Hardening (Tier 5) | Stress tests on race conditions, capacity overflows, and IDOR attacks | M4 | Quality Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Core Data, Storage Typing & Backend Booking APIs | Typing fixes in lessonStorage.ts, bookGroupLesson/bookIndividualLesson, school hours slots, billing invariants | none | PLANNED |
| M2 | Telegram Bot Pipeline & CRM Chat "Предложить занятие" | replyMarkup in client, Screen 11 Bot Reply Keyboard & WebApp launch, Screen 12 Offer Lesson in TelegramChatBox | M1 | PLANNED |
| M3 | Mini App Mobile SPA Shell & Client Polish | Mobile layout & SDK mock, Screens 1–10 complete Polish & verification | M1 | PLANNED |
| M4 | Final Milestone: 100% E2E Pass & Adversarial Hardening | Phase 1: 100% pass of E2E test suite (Tiers 1–4). Phase 2: Tier 5 adversarial coverage hardening | M1, M2, M3 | PLANNED |

## Interface Contracts
### Booking Engine (`lessonStorage.ts`) ↔ API Endpoints (`/api/telegram/mini-app/book`)
- `bookGroupLesson(lessonId: string, studentId: string, options?: { isTrial?: boolean }): Promise<{ success: boolean, lesson?: FullLessonData, error?: string }>`
  - Verifies lesson exists; checks group capacity atomically; checks student not already enrolled; adds student to `lesson.students` with `attendanceStatus: 'not_marked'` and `isBilled: false`.
- `bookIndividualLesson(params: { studentId: string, teacherId: string, date: string, startTime: string, endTime: string, isTrial?: boolean }): Promise<{ success: boolean, lesson?: FullLessonData, error?: string }>`
  - Checks 3-way collision (`checkThreeWayCollision`); checks school hours (09:00–21:00); creates `FullLessonData` with `isIndividual: true`, `status: 'planned'`, `isBilled: false`.
### Telegram Client (`telegramClient.ts`) ↔ Webhook & ChatBox
- `sendTelegramDirectMessage(options: { token?: string, chatId: string, text: string, parseMode?: string, replyMarkup?: any }): Promise<TelegramSendResult>`
  - Serializes `reply_markup` into Telegram Bot API JSON payload.
