# Tasks: Garmin OAuth Integration

**Input**: Design documents from `/specs/004-garmin-oauth/`
**Prerequisites**: plan.md ✓, spec.md ✓

**Tests**: Tests are included for OAuth flow and export functionality.

**Organization**: Two main user stories - OAuth connection and workout export.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1 (OAuth connection), US2 (Workout export)

## Path Conventions

- **Web app**: `backend/src/`, `backend/tests/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database schema for Garmin connections

- [ ] T001 Create Prisma migration for GarminConnection model
  - Add model to `backend/prisma/schema.prisma`
  - Fields: id, coachUserId (unique), accessToken, refreshToken, expiresAt, connectedAt, timestamps
  - Relationship: One-to-one with User (coach only)
  - Run migration: `npx prisma migrate dev`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core OAuth infrastructure

- [x] Authentication framework exists (JWT, Passport)
- [ ] T002 [P] [US1] Create Garmin OAuth service structure
  - Create `backend/src/auth/garmin/garmin-oauth.service.ts`
  - Add methods: `generateAuthUrl()`, `exchangeCodeForTokens()`, `refreshAccessToken()`
  - Add token encryption/decryption helpers

- [ ] T003 [P] [US1] Create Garmin API service
  - Create `backend/src/auth/garmin/garmin-api.service.ts`
  - Add methods: `createWorkout()`, `refreshToken()`
  - Use axios or fetch for API calls
  - Handle API errors and rate limits

**Checkpoint**: OAuth infrastructure ready - endpoints can be implemented

---

## Phase 3: User Story 1 - OAuth Connection (Priority: P1) 🎯 MVP

**Goal**: Coach can connect Garmin account via OAuth flow

**Independent Test**: GET `/auth/garmin/connect` redirects to Garmin, callback stores tokens

### Tests for User Story 1

- [ ] T004 [P] [US1] Unit test for GarminOAuthService in `backend/tests/auth/garmin/garmin-oauth.service.spec.ts`
  - Test: `generateAuthUrl()` returns correct Garmin OAuth URL with state
  - Test: `exchangeCodeForTokens()` stores tokens in database
  - Test: `refreshAccessToken()` updates expired tokens
  - Test: Handles OAuth errors correctly

- [ ] T005 [P] [US1] Integration test for OAuth flow in `backend/tests/auth/garmin/garmin-oauth.integration.spec.ts`
  - Test: GET `/auth/garmin/connect` redirects to Garmin
  - Test: GET `/auth/garmin/callback` with valid code stores tokens
  - Test: GET `/auth/garmin/callback` with invalid code returns error
  - Test: OAuth state parameter prevents CSRF

### Implementation for User Story 1

- [ ] T006 [US1] Create GarminOAuthController in `backend/src/auth/garmin/garmin-oauth.controller.ts`
  - GET `/auth/garmin/connect` - redirects to Garmin OAuth URL
  - GET `/auth/garmin/callback` - handles OAuth callback, exchanges code
  - Use JwtAuthGuard and RolesGuard (COACH only)
  - Generate and validate state parameter

- [ ] T007 [US1] Implement OAuth service methods in `backend/src/auth/garmin/garmin-oauth.service.ts`
  - `generateAuthUrl(state: string): string` - build Garmin OAuth URL
  - `exchangeCodeForTokens(code: string, coachUserId: string): Promise<void>` - exchange code, store tokens
  - `getConnection(coachUserId: string): Promise<GarminConnection | null>` - get stored connection
  - `refreshAccessTokenIfNeeded(coachUserId: string): Promise<string>` - auto-refresh if expired

- [ ] T008 [US1] Implement token storage in `backend/src/auth/garmin/garmin-oauth.service.ts`
  - Encrypt tokens before storing in database
  - Decrypt tokens when retrieving
  - Store expiresAt timestamp
  - Handle connection updates (reconnect)

- [ ] T009 [US1] Create DTO for OAuth callback in `backend/src/auth/garmin/dto/garmin-callback.dto.ts`
  - Validate: code (required), state (required)
  - Use class-validator decorators

- [ ] T009a [US1] Add connection status endpoint in `backend/src/coach/coach.controller.ts`
  - GET `/coach/garmin/status` returns `{ connected: boolean, connectedAt?: string }`
  - Uses GarminOAuthService to check connection for the coach

**Checkpoint**: OAuth connection flow functional and tested

---

## Phase 4: User Story 2 - Workout Export (Priority: P1) 🎯 MVP

**Goal**: Coach can export validated workout to Garmin

**Independent Test**: POST `/coach/sessions/:id/export/garmin` creates workout in Garmin

### Tests for User Story 2

- [ ] T010 [P] [US2] Unit test for export validation in `backend/tests/coach/export-validation.spec.ts`
  - Test: Validates steps.length ≥ 1
  - Test: Validates duration > 0
  - Test: Validates targets (zone OR min/max)
  - Test: Validates cadence only for BIKE
  - Test: Returns clear error messages

- [ ] T011 [P] [US2] Integration test for export endpoint in `backend/tests/coach/export-garmin.integration.spec.ts`
  - Test: POST export with valid workout succeeds
  - Test: POST export without Garmin connection returns 403
  - Test: POST export with invalid workout returns 400
  - Test: POST export with expired token auto-refreshes

### Implementation for User Story 2

- [ ] T012 [US2] Add export endpoint to CoachController in `backend/src/coach/coach.controller.ts`
  - POST `/coach/sessions/:sessionId/export/garmin`
  - Use JwtAuthGuard, RolesGuard (COACH)
  - Call coachService.exportToGarmin()

- [ ] T013 [US2] Implement export method in CoachService in `backend/src/coach/coach.service.ts`
  - `exportToGarmin(coachUserId: string, sessionId: string): Promise<void>`
  - Verify coach has Garmin connection
  - Fetch session, verify roster access
  - Normalize workout
  - Validate normalized workout (steps ≥ 1, duration > 0, valid targets, cadence only BIKE)
  - Convert to Garmin format using exporter
  - Call Garmin API to create workout
  - Handle errors with clear messages

- [ ] T014 [US2] Implement validation logic in `backend/src/coach/coach.service.ts`
  - Create `validateNormalizedWorkout(workout: NormalizedWorkout): void`
  - Check: steps.length ≥ 1
  - Check: All steps have duration > 0
  - Check: All primary targets are valid (zone OR min/max)
  - Check: Cadence targets only for BIKE sport
  - Throw BadRequestException with specific error message

- [ ] T015 [US2] Implement Garmin API client in `backend/src/auth/garmin/garmin-api.service.ts`
  - `createWorkout(accessToken: string, workout: ExportPayload): Promise<string>`
  - Make HTTP POST to Garmin workout creation endpoint
  - Handle API errors (400, 401, 403, 500)
  - Return Garmin workout ID

- [ ] T016 [US2] Update GarminExporterStub if needed in `backend/src/integrations/endurance/exporters/garmin-exporter.stub.ts`
  - Verify export format matches Garmin API requirements
  - Update if stub format differs from real API

**Checkpoint**: Export flow functional with validation and error handling

---

## Phase 5: Polish & Cross-Cutting

- [ ] T017 Add environment variables for Garmin OAuth
  - GARMIN_CLIENT_ID
  - GARMIN_CLIENT_SECRET
  - GARMIN_REDIRECT_URI
  - GARMIN_API_BASE_URL
  - GARMIN_AUTH_URL
  - GARMIN_TOKEN_URL
  - GARMIN_TOKEN_ENCRYPTION_KEY

- [ ] T018 Add error handling and logging
  - Log OAuth flow events (connect, callback, errors)
  - Log export attempts (success, failure, validation errors)
  - Never log tokens in plain text

- [ ] T019 Manual testing
  - Test OAuth flow with Garmin test account
  - Test export with various workout types
  - Test validation with invalid workouts
  - Test token refresh flow

**Checkpoint**: Feature complete and validated

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Must complete first (database schema)
- **Foundational (Phase 2)**: Depends on Setup, blocks US1
- **User Story 1 (Phase 3)**: Depends on Foundational
- **User Story 2 (Phase 4)**: Depends on US1 (needs OAuth connection)
- **Polish (Phase 5)**: Depends on all implementation

### Task Dependencies

- **T001**: Must be first (database schema)
- **T002, T003**: Can run in parallel (different services)
- **T004, T005**: Can write in parallel (unit vs integration)
- **T006-T009**: Sequential (controller → service → storage → DTO)
- **T010, T011**: Can write in parallel
- **T012-T016**: Sequential (endpoint → service → validation → API client → exporter)

---

## Implementation Strategy

### MVP First

1. Database schema (T001)
2. OAuth infrastructure (T002, T003)
3. OAuth endpoints (T004-T009) → Test OAuth flow
4. Export endpoint (T010-T016) → Test export flow
5. Polish (T017-T019)
6. **STOP and VALIDATE**: Feature complete

---

## Notes

- OAuth state parameter is critical for CSRF protection
- Token encryption is mandatory (never store plain text)
- Validation happens before API call (defensive)
- Auto-refresh tokens to avoid user friction
- Clear error messages for all failure cases
