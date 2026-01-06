# Tasks: Export Normalized Endurance Workout Endpoint

**Input**: Design documents from `/specs/002-export-normalized-endpoint/`
**Prerequisites**: plan.md ✓, spec.md ✓

**Tests**: Tests are included to ensure endpoint works correctly with all error cases.

**Organization**: Single user story - endpoint implementation with validation and error handling.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1 (single user story for this feature)

## Path Conventions

- **Web app**: `backend/src/`, `backend/tests/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: No setup needed - feature extends existing infrastructure

- [x] Infrastructure already exists (CoachService, normalizer, auth)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: No foundational work needed - all dependencies exist

- [x] Endurance normalizer exists and is tested
- [x] Coach service and roster verification exists
- [x] Authentication middleware exists
- [x] TrainingSession model and Prisma setup exists

**Checkpoint**: Foundation ready - implementation can begin

---

## Phase 3: User Story 1 - Export Normalized Workout (Priority: P1) 🎯 MVP

**Goal**: Coach can retrieve normalized structure of endurance workout for debugging/validation

**Independent Test**: GET `/api/coach/sessions/:sessionId/export/normalized` returns normalized workout JSON or appropriate error

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T001 [P] [US1] Unit test for `getNormalizedWorkout` service method in `backend/src/coach/coach.service.spec.ts`
  - Test: Returns normalized workout for valid endurance session
  - Test: Throws 404 when session not found
  - Test: Throws 403 when coach doesn't have roster access
  - Test: Throws 400 when session is not endurance type
  - Test: Handles legacy prescription format correctly
  - Test: Handles new step-based prescription format correctly
  - Test: Expands repeat blocks correctly

- [ ] T002 [P] [US1] Integration test for endpoint in `backend/tests/coach/export-normalized.integration.spec.ts`
  - Test: GET endpoint returns 200 with normalized workout
  - Test: GET endpoint returns 404 for non-existent session
  - Test: GET endpoint returns 403 for unauthorized coach
  - Test: GET endpoint returns 400 for strength session
  - Test: Response structure matches NormalizedWorkout type

### Implementation for User Story 1

- [ ] T003 [US1] Add `getNormalizedWorkout` method to `CoachService` in `backend/src/coach/coach.service.ts`
  - Fetch session with weeklyPlan relation
  - Extract athleteUserId from weeklyPlan
  - Call `verifyCoachAthleteRelationship` to check access
  - Validate session type is ENDURANCE
  - Import `normalizeEnduranceWorkout` from endurance-normalizer
  - Parse prescription JSON and normalize
  - Return normalized workout structure
  - Handle errors (404, 403, 400) with appropriate exceptions

- [ ] T004 [US1] Add GET endpoint to `CoachController` in `backend/src/coach/coach.controller.ts`
  - Route: `GET /sessions/:sessionId/export/normalized`
  - Extract sessionId from route param
  - Call `coachService.getNormalizedWorkout(coachUserId, sessionId)`
  - Return normalized workout JSON
  - Use existing guards (JwtAuthGuard, RolesGuard)

- [ ] T005 [US1] Add import for `normalizeEnduranceWorkout` and types in `backend/src/coach/coach.service.ts`
  - Import from `../integrations/endurance/endurance-normalizer`
  - Import `EndurancePrescription` and `NormalizedWorkout` types

- [ ] T006 [US1] Add error handling for invalid prescription format in `backend/src/coach/coach.service.ts`
  - Catch normalization errors
  - Return 400 with descriptive error message

**Checkpoint**: Endpoint is functional and all tests pass

---

## Phase 4: Validation & Polish

**Purpose**: Manual testing and validation

- [ ] T007 Manual test with curl/Postman
  - Test with legacy prescription
  - Test with new step-based prescription
  - Test with repeat blocks
  - Verify response time < 200ms
  - Verify error cases (404, 403, 400)

- [ ] T008 Verify response structure matches NormalizedWorkout type
  - Check TypeScript compilation
  - Verify JSON structure in response

**Checkpoint**: Feature complete and validated

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Already complete ✓
- **Foundational (Phase 2)**: Already complete ✓
- **User Story 1 (Phase 3)**: Can start immediately
  - Tests (T001, T002) can be written in parallel
  - Implementation (T003-T006) must follow test writing
- **Validation (Phase 4)**: Depends on Phase 3 completion

### Task Dependencies

- **T001, T002**: Can be written in parallel (different test files)
- **T003**: Depends on T001 (test should fail first)
- **T004**: Depends on T003 (needs service method)
- **T005, T006**: Can be done as part of T003 (same file)
- **T007, T008**: Depends on all implementation tasks

### Parallel Opportunities

- T001 and T002 can be written in parallel (unit vs integration tests)
- T005 and T006 can be done within T003 (same service file)

---

## Implementation Strategy

### MVP First

1. Write tests (T001, T002) - ensure they fail
2. Implement service method (T003, T005, T006)
3. Implement controller endpoint (T004)
4. Run tests - ensure they pass
5. Manual validation (T007, T008)
6. **STOP and VALIDATE**: Feature complete

---

## Notes

- This is a read-only endpoint - no data modification
- Reuses existing infrastructure (no new dependencies)
- Simple feature - single endpoint, single service method
- Tests are critical to ensure error handling works correctly


