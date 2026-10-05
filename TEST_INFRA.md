# E2E Test Infra: Phase 10 — Telegram Mini App for Self-Booking by Parents

## 1. Test Philosophy & Methodology
- **Opaque-Box Specification Verification**: Tests are derived strictly from the authoritative requirements in `ORIGINAL_REQUEST.md` (lines 986–1056), the 12-screen visual reference (`media_1791220560990.jpg`), and architectural contracts in `PROJECT.md` and `docs/telegram-mini-app-architecture.md`.
- **Dual-Track Methodology**:
  - *Track 1 (Functional & Invariant Track)*: Verifies positive capabilities (group, individual, trial booking, course retrieval, child filtering, Zoom links, .ics export, Reply Keyboard, WebApp launch, Admin CRM Chat offer card).
  - *Track 2 (Adversarial & Stress Track)*: Exercises boundary limits, concurrent race conditions, capacity overflows, double booking, schedule collisions, and IDOR attacks.
- **Strict Invariant Verification**:
  1. *Zero New Entities*: Operates strictly over existing domain models (`Lesson`, `Student`, `Parent`, `Group`, `CourseDirection`, `Teacher`).
  2. *Zero Premature Billing*: Booking creation sets `isBilled: false` and `attendanceStatus: 'not_marked'`; student balances, subscriptions, and deposits incur 0 debits.
  3. *IDOR Child Ownership Guard*: Parents cannot book children who do not belong to their profile in `student.parents`.
  4. *Atomic Capacity Guard*: Prevents overbooking beyond `maxCapacity` on the last seat.
  5. *Operating Hours & Collision Guard*: Individual slots strictly validated within school operating hours (09:00–21:00) with 3-way teacher/student collision checking.

---

## 2. Feature Inventory & Test Mapping (25 Features)

| # | Feature | Scope / Requirement | Tier 1 (Core) | Tier 2 (Boundary) | Tier 3 (Cross) | Tier 4 (Scenario) |
|---|---------|---------------------|:-------------:|:-----------------:|:--------------:|:-----------------:|
| 1 | Zero New Entities & Typing Fixes | Domain model reuse without new tables/columns | ✓ (T1.1, T1.2) | ✓ (T2.1) | ✓ (T3.3) | ✓ (T4.1) |
| 2 | Group Booking Core Engine | Atomic capacity check, enrollment into `lesson.students` | ✓ (T1.1) | ✓ (T2.2, T2.3) | ✓ (T3.1) | ✓ (T4.1, T4.4) |
| 3 | Individual Booking Core Engine | Creates standard `Lesson` with `isIndividual: true` | ✓ (T1.2) | ✓ (T2.4) | ✓ (T3.2) | ✓ (T4.3) |
| 4 | Zero Premature Billing Invariant | 0 debits upon booking; billing strictly on `conducted` | ✓ (T1.1, T1.2) | ✓ (T2.1) | ✓ (T3.3) | ✓ (T4.1, T4.2) |
| 5 | IDOR & Child Ownership Guard | Server-side validation via `student.parents` | ✓ (T1.5) | ✓ (T2.5) | — | ✓ (T4.5) |
| 6 | Slot Generator 09:00–21:00 | Slots generated within school hours with conflict checks | — | ✓ (T2.4) | ✓ (T3.4) | ✓ (T4.3) |
| 7 | Telegram Client ReplyMarkup Support | Serialization of `reply_markup` into Bot API payloads | ✓ (T1.8, T1.9) | — | ✓ (T3.5) | ✓ (T4.2) |
| 8 | Screen 11: Telegram Bot Reply Keyboard | 5 persistent buttons ('📅 Записаться на занятие', etc.) | ✓ (T1.8) | — | ✓ (T3.5) | — |
| 9 | Screen 11: WebApp Inline Button Launch | '📅 Открыть расписание' with `web_app: { url }` | ✓ (T1.9) | — | ✓ (T3.5) | — |
| 10 | Telegram Chat Pipeline Preservation | Parent text messages flow to CRM ChatBox without disruption | — | — | ✓ (T3.5) | — |
| 11 | Screen 12: Admin "Предложить занятие" Button | Admin initiates booking offer from CRM ChatBox | ✓ (T1.10) | — | — | ✓ (T4.2) |
| 12 | Screen 12: Offer Lesson Modal & Card | Interactive card with deep-link CTA button | ✓ (T1.10) | — | — | ✓ (T4.2) |
| 13 | Mobile SPA Layout Isolation | Standalone mobile shell (375–430px) without desktop chrome | — | — | — | ✓ (T4.1) |
| 14 | Screen 1: Home Menu UI | Greeting, avatar, 5 quick cards, 4-tab bottom navigation | — | — | — | ✓ (T4.1) |
| 15 | Screen 2: Format Selection UI | Selectors for Group, Individual, and Trial formats | ✓ (T1.3) | — | — | ✓ (T4.1, T4.3) |
| 16 | Screen 3: Direction Selection UI | Active directions list with icons/subjects | ✓ (T1.4) | — | — | ✓ (T4.1) |
| 17 | Screen 4: Group Selection UI | Group cards, occupancy rate bar, capacity badges | — | — | ✓ (T3.1) | ✓ (T4.1) |
| 18 | Screen 5: Date & Lesson Selection UI | Date pills, lessons list, seat status badges | — | — | ✓ (T3.1) | ✓ (T4.1) |
| 19 | Screen 6: Child Selection UI | Radio selection of verified children with name and age | ✓ (T1.5) | — | — | ✓ (T4.1, T4.5) |
| 20 | Screen 7: Booking Confirmation UI | Summary card review, Zoom room, reminder toggle | — | — | — | ✓ (T4.1, T4.3) |
| 21 | Screen 8: Success State UI | Confirmation badge, Zoom link, .ics calendar export | ✓ (T1.6, T1.7) | — | — | ✓ (T4.1) |
| 22 | Screen 9: Individual Teacher Selection UI | Teacher cards with rating ★ 4.9, review counts, subject | — | — | — | ✓ (T4.3) |
| 23 | Screen 10: Individual Slots Selection UI | 60-min time slots in 09:00–21:00 with collision check | — | ✓ (T2.4) | ✓ (T3.4) | ✓ (T4.3) |
| 24 | E2E Test Suite (Tiers 1–4) | Complete opaque-box verification suite | ✓ | ✓ | ✓ | ✓ |
| 25 | Adversarial Hardening (Tier 5) | Race condition, capacity overflow, IDOR, collision stress | — | ✓ (T2.2, T2.5) | — | ✓ (T4.4) |

---

## 3. Test Architecture & Runner Setup

- **Test Runner**: Node.js test execution via `jiti` (`npm test` invoking `tests/index.js` -> `tests/run_all_tests.ts`).
- **Phase 10 Test Suite**: `tests/phase10_telegram_mini_app.test.ts`.
- **Environment Isolation**: `tests/helpers/testEnv.ts` provides mock in-memory `localStorage`, `window`, and `CustomEvent` contexts.
- **Fail-Fast & Exit Semantics**: Process exits with code 0 on 100% pass, non-zero on any assertion failure.
- **Static Analysis Compliance**: Verified with `npm run check` (`tsc --noEmit`) passing with 0 errors.

---

## 4. Real-World Application Workflows (Tier 4)

1. **Scenario 1 (Full Parent Self-Booking Flow)**:
   Parent opens Mini App -> resolved profile & verified children -> chooses Group format -> chooses German B1 -> chooses open lesson -> selects child Maria -> reviews confirmation card -> completes booking -> receives success screen with Zoom link & .ics calendar export.
2. **Scenario 2 (Admin CRM Chat Offer -> Parent Booking)**:
   Admin in CRM `TelegramChatBox` chooses open lesson and sends interactive offer card -> Parent receives card in Telegram with inline booking button -> clicks and confirms -> child enrolled with zero premature billing.
3. **Scenario 3 (Individual Lesson Booking Flow)**:
   Parent selects Individual format -> chooses teacher Anna Schmidt (★ 4.9, 24 reviews) -> selects free 60-minute slot (16:00–17:00) -> selects child Alexander -> confirms -> standard `Lesson` created with `isIndividual: true`, teacher slot blocked.
4. **Scenario 4 (Concurrency & Last-Seat Race Resilience)**:
   Group lesson with capacity 10 and 9 seats filled -> two parents concurrently attempt booking last seat -> exactly 1 succeeds, 2nd receives graceful `FULL` error -> roster strictly capped at 10.
5. **Scenario 5 (Multi-Child Parent Isolation Workflow)**:
   Parent Olga books Child 1 (Maria) into German Group lesson and Child 2 (Alexander) into Math Individual lesson on the same date -> both succeed with complete student isolation and zero billing debits.

---

## 5. Coverage Thresholds
- **Tier 1 (Core Feature Coverage)**: ≥ 10 comprehensive checks (Features 1–10).
- **Tier 2 (Boundary & Corner Cases)**: ≥ 5 comprehensive checks (Features 11–15).
- **Tier 3 (Cross-Feature Combinations)**: ≥ 5 comprehensive checks (Features 16–20).
- **Tier 4 (Real-World Scenarios)**: ≥ 5 full lifecycle user scenarios (Features 21–25).
- **Total Suite Passing**: 25/25 checks passed (100%), 15/15 master suites passed in `npm test`.
