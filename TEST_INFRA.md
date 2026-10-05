# E2E Test Infra: Phase 6 Production Hardening & Real Data Analytics

## Test Philosophy
- Opaque-box, requirement-driven, and unit/integration regression testing.
- Methodology: Category-Partition + BVA + Pairwise + Workload Testing.
- Test runner: `npm test` running `tests/index.js` executing all test suites TS-01..TS-26.

## Feature Inventory & Test Mapping
| # | Feature | Source | TS Test ID | Pass Criteria |
|---|---------|--------|------------|---------------|
| 1 | LessonModal billing state preservation | ORIGINAL_REQUEST §R2 | TS-16 | Editing lesson retains billedStudentIds and billingDetails |
| 2 | Unified lesson cancellation rollback | ORIGINAL_REQUEST §R2 | TS-17 | Cancelling/deleting lesson triggers restoreLessonBilling across drawer, modal, page |
| 3 | Group status sync canonicalization | ORIGINAL_REQUEST §R2 | TS-18 | Sync preserves 'finished' and 'paused' without resetting to 'active' |
| 4 | RLS & Developer role | ORIGINAL_REQUEST §R3 | TS-19 | lesson_attendance has RLS enabled with developer, owner, admin, teacher access |
| 5 | Ghost attendance cleanup | ORIGINAL_REQUEST §R3 | TS-20 | Non-existent s5..s21 attendance records are removed without referential error |
| 6 | Currency standardization to EUR | ORIGINAL_REQUEST §R3 | TS-21 | All billing, UI helpers, and analytics format in canonical EUR (€) |
| 7 | Analytics reality (zero mock fallbacks) | ORIGINAL_REQUEST §R4 | TS-22 | 7 tabs contain zero synthetic fallback arrays or fake names |
| 8 | Teacher collision detection | ORIGINAL_REQUEST §R3 | TS-23 | Teacher cannot have overlapping conducted lessons |
| 9 | Room collision detection | ORIGINAL_REQUEST §R3 | TS-24 | Classroom cannot host overlapping lessons |
| 10 | Modal accessibility & focus | ORIGINAL_REQUEST §R5 | TS-25 | ConvertLeadModal, EnrollStudentModal, LessonModal have role=dialog, aria-modal, Escape |
| 11 | End-to-end integration flows | ORIGINAL_REQUEST §R6 | TS-26 | Full journey Lead -> Student -> Group -> Lesson -> Attendance -> Billing -> Cancel Rollback |
