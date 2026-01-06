# Tasks: Auto-Push Endurance Workouts to Devices

**Input**: Design documents from `/specs/005-send-to-garmin-button/`
**Prerequisites**: plan.md ✓, spec.md ✓, Feature 004 (Device Connections) ✓

**Tests**: Tests are included for auto-push triggers, export logic, and error handling.

**Organization**: Single user story - auto-push implementation with status tracking.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1 (auto-push feature)

## Path Conventions

- **Web app**: `backend/src/`, `backend/tests/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database schema for export status

- [x] T001 Create Prisma migration for export status fields
  - Add fields to `TrainingSession` model in `backend/prisma/schema.prisma`
  - Fields: `exportStatus` (enum: NOT_CONNECTED | PENDING | SENT | FAILED), `exportProvider` (enum: GARMIN | WAHOO | null), `exportedAt` (DateTime | null), `externalWorkoutId` (string | null), `lastExportError` (string | null)
  - Run migration: `npx prisma migrate dev`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core export infrastructure

- [x] Endurance normalizer exists (Feature 002)
- [x] Garmin/Wahoo exporters exist (Feature 003)
- [x] Device connections exist (Feature 004)
- [x] T002 [P] [US1] Create Endurance Export service structure
  - Create `backend/src/integrations/endurance/endurance-export.service.ts`
  - Add methods: `exportWorkoutToProvider()`, `normalizeAndValidate()`, `selectProvider()`, `createWorkoutInProvider()`
  - Inject DeviceOAuthService, DeviceApiService
  - Import normalizer and exporters

**Checkpoint**: Export infrastructure ready - auto-push can be implemented

---

## Phase 3: User Story 1 - Auto-Push Implementation (Priority: P1) 🎯 MVP

**Goal**: Endurance workouts automatically pushed to athlete devices when coach saves

**Independent Test**: Creating ENDURANCE session triggers auto-push, status updated correctly

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T003 [P] [US1] Unit test for export logic in `backend/src/integrations/endurance/endurance-export.service.spec.ts`
  - Test: `exportWorkoutToProvider` normalizes, validates, and exports workout
  - Test: `selectProvider` uses primary provider if set
  - Test: `selectProvider` uses only connected provider if no primary
  - Test: `selectProvider` returns null if no connections
  - Test: `validateNormalizedWorkout` rejects invalid workouts
  - Test: Handles provider API errors correctly
  - Test: Updates session status to SENT on success
  - Test: Updates session status to FAILED on error

- [x] T004 [P] [US1] Integration test for auto-push in `backend/test/integrations/endurance/auto-push.e2e-spec.ts`
  - Test: Creating ENDURANCE session triggers auto-push
  - Test: Updating ENDURANCE session triggers new export
  - Test: Auto-push uses athlete's connected provider
  - Test: Auto-push sets NOT_CONNECTED if no provider connected
  - Test: Auto-push sets SENT on successful export
  - Test: Auto-push sets FAILED on validation error
  - Test: Auto-push sets FAILED on provider API error

### Implementation for User Story 1

- [x] T005 [US1] Add export status fields to TrainingSession in `backend/prisma/schema.prisma`
  - Add enum types: `ExportStatus`, `ExportProvider`
  - Add fields to TrainingSession model
  - Create migration

- [x] T006 [US1] Implement Endurance Export service in `backend/src/integrations/endurance/endurance-export.service.ts`
  - `exportWorkoutToProvider(sessionId, athleteUserId, provider)`: Main export method
    - Fetch session and prescription
    - Normalize workout
    - Validate normalized workout
    - Convert to provider format
    - Get access token (refresh if needed)
    - Create workout in provider
    - Update session status
  - `normalizeAndValidate(prescription)`: Normalize and validate
  - `selectProvider(athleteUserId)`: Select provider (primary or only connected)
  - `validateNormalizedWorkout(workout)`: Validate before export
  - `createWorkoutInProvider(provider, accessToken, workout)`: Call provider API
  - Handle errors and update session status appropriately

- [x] T007 [US1] Add auto-push hooks to WeeklyPlansService in `backend/src/weekly-plans/weekly-plans.service.ts`
  - In `createSession()`: After creating ENDURANCE session, call `autoPushEnduranceWorkout()` asynchronously
  - In `updateSession()`: After updating ENDURANCE session, call `autoPushEnduranceWorkout()` asynchronously
  - Only trigger for ENDURANCE sessions
  - Don't block save operation (use Promise, don't await)

- [x] T008 [US1] Implement auto-push method in EnduranceExportService (moved from WeeklyPlansService)
  - `autoPushEnduranceWorkout(sessionId, athleteUserId)`: Async method
  - Select provider for athlete
  - If no provider: Set `exportStatus = NOT_CONNECTED`
  - If provider exists: Call `EnduranceExportService.exportWorkoutToProvider()`
  - Handle errors gracefully (log, don't throw)

- [x] T009 [US1] Add push pending workouts method to EnduranceExportService (called from DeviceOAuthController)
  - `pushPendingWorkouts(athleteUserId, provider)`: Find all NOT_CONNECTED ENDURANCE sessions
  - Call `EnduranceExportService.exportWorkoutToProvider()` for each
  - Called when athlete connects device (from Feature 004)

- [x] T010 [US1] Integrate with Device OAuth service
  - Import DeviceOAuthService and DeviceApiService in EnduranceExportService
  - Use `getConnection()` to check provider connection
  - Use `refreshAccessTokenIfNeeded()` to get valid token
  - Use `DeviceApiService.createWorkout()` to create workout in provider

**Checkpoint**: Auto-push functional and tested

---

## Phase 4: Polish & Cross-Cutting Concerns

- [x] T011 [P] Add error handling and logging
  - Log export attempts, successes, failures
  - Clear error messages in `lastExportError`
  - Handle token refresh failures
  - Handle network errors with retry logic

- [x] T012 [P] Manual testing
  - Test auto-push with Garmin connection
  - Test auto-push with Wahoo connection
  - Test auto-push with no connection (NOT_CONNECTED)
  - Test pending workouts push when athlete connects
  - Test error scenarios (validation fails, API errors)

- [x] T013 [P] Documentation updates
  - Update API contracts if needed
  - Document export status fields

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS user story
- **User Story 1 (Phase 3)**: Depends on Foundational completion AND Feature 004 (Device Connections)
- **Polish (Phase 4)**: Depends on User Story 1 completion

### Feature Dependencies

- **Feature 002 (Normalizer)**: Required - used for normalization
- **Feature 003 (Exporters)**: Required - used for format conversion
- **Feature 004 (Device Connections)**: Required - used for provider selection and token management

### Parallel Opportunities

- T003, T004 can run in parallel (different test files)
- T006, T007, T008 can run in parallel (different service methods)
- T011, T012, T013 can run in parallel (different polish tasks)

---

## Notes

- Auto-push must be asynchronous to not block coach workflow
- Export status must be accurate and updated immediately
- Failed exports should be retryable (manual or automatic)
- Pending workouts push happens when athlete connects device
- Provider selection logic: primary > only connected > none
