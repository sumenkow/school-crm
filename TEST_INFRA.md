# E2E Test Infra: Phase 9 — Teacher Lesson Creation & Approval Workflow

## Test Philosophy
- Opaque-box, requirement-driven. Derived strictly from `ORIGINAL_REQUEST.md` and user-facing contracts, not internal implementation quirks.
- Methodology: Category-Partition + Boundary Value Analysis + Pairwise Combinatorial + Real-World Workload Testing.
- Strict Invariant Verification: Zero New Entities, Pending Slot Reservation, 3-Way Collision Detection, Operating Hours (09:00–21:00), Zero Premature Billing, Role Impersonation Protection.

## Feature Inventory & Test Mapping
| # | Feature | Requirement Source | Tier 1 (Coverage) | Tier 2 (Boundary) | Tier 3 (Pairwise) |
|---|---------|-------------------|:-----------------:|:-----------------:|:-----------------:|
| 1 | Zero New Entities | ORIGINAL_REQUEST §1 | 5 | 5 | ✓ |
| 2 | Extended LessonStatus | ORIGINAL_REQUEST §1 | 5 | 5 | ✓ |
| 3 | Rejection Reason | ORIGINAL_REQUEST §1 | 5 | 5 | ✓ |
| 4 | Individual Lesson Fields | ORIGINAL_REQUEST §1 | 5 | 5 | ✓ |
| 5 | Pending Slot Reservation | ORIGINAL_REQUEST §2 | 5 | 5 | ✓ |
| 6 | School Hours Guard (09:00-21:00) | ORIGINAL_REQUEST §3 | 5 | 5 | ✓ |
| 7 | Teacher Collision Guard | ORIGINAL_REQUEST §3 | 5 | 5 | ✓ |
| 8 | Group Collision Guard | ORIGINAL_REQUEST §3 | 5 | 5 | ✓ |
| 9 | Student Collision Guard | ORIGINAL_REQUEST §3 | 5 | 5 | ✓ |
| 10 | Nearest Slot Suggestions | ORIGINAL_REQUEST §3 | 5 | 5 | ✓ |
| 11 | Mutation-Level Protection | ORIGINAL_REQUEST §3 | 5 | 5 | ✓ |
| 12 | Billing Safety Invariant | ORIGINAL_REQUEST §4 | 5 | 5 | ✓ |
| 13 | Trial Lesson Invariant | ORIGINAL_REQUEST §5 | 5 | 5 | ✓ |
| 14 | Role Impersonation Protection | ORIGINAL_REQUEST §6 | 5 | 5 | ✓ |
| 15 | Creation & Approval Workflow | ORIGINAL_REQUEST §7 | 5 | 5 | ✓ |

## Test Architecture
- Test Runner: Node.js runner (`node tests/index.js` which executes `tests/run_all_tests.ts`).
- New Test Suite File: `tests/ts27_to_ts32_phase9_lesson_approval.test.ts`.
- Runner Integration: Export `runPhase9Tests(): Promise<TestResult>` and invoke in `tests/run_all_tests.ts`.
- Pass/Fail Semantics: Process exits with code 0 on all tests passing, non-zero on any failure. All assertions throw descriptive errors.

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Full Teacher Creation -> Pending Reservation -> Admin Approval -> Attendance & Billing | F1, F2, F5, F12, F14, F15 | High |
| 2 | Teacher Attempt Overlap Collision -> Rejection with Nearest Slot Suggestion -> Re-submission | F5, F7, F8, F9, F10, F23 | High |
| 3 | Individual Lesson Student Collision -> Slot Conflict Handled -> Successful Approval | F4, F9, F15 | Medium |
| 4 | Teacher Creation -> Admin Rejection with Reason -> Status Cancelled -> Re-schedule | F2, F3, F34, F36 | Medium |
| 5 | Trial Lesson Creation -> Approval -> Conducted with Zero Subscription Debit | F5, F12, F13 | High |

## Coverage Thresholds
- Tier 1: Feature Coverage (>=5 test cases per core feature category)
- Tier 2: Boundary & Corner Cases (09:00 boundary, 21:00 boundary, exact slot touch, trial flag, zero duration)
- Tier 3: Pairwise combinations (Teacher locked + Individual lesson + collision, Admin reschedule + approval)
- Tier 4: Real-World Scenarios (≥5 end-to-end user workflows)
- Total tests: ≥ 40 targeted automated assertions/cases in Phase 9 test suite.
