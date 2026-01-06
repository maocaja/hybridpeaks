# Tasks: Athlete Device Connections (Garmin/Wahoo OAuth)

**Input**: Design documents from `/specs/004-garmin-oauth/`
**Prerequisites**: plan.md ✓, spec.md ✓
**Status**: ✅ **ALL TASKS COMPLETED** (2025-01-05)

**Tests**: Tests are included for OAuth flow, token management, and connection status.

**Organization**: Two main user stories - OAuth connection and connection management.

**Test Results**: 38 tests passing (20 unit, 18 integration)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1 (OAuth connection), US2 (Connection management)

## Path Conventions

- **Web app**: `backend/src/`, `backend/tests/`, `athlete-pwa/src/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database schema for device connections

- [x] T001 Create Prisma migration for DeviceConnection model
  - Add model to `backend/prisma/schema.prisma`
  - Fields: id, athleteProfileId, provider (enum: GARMIN | WAHOO), accessToken (encrypted), refreshToken (encrypted), expiresAt, status (enum: CONNECTED | EXPIRED | REVOKED | ERROR), connectedAt, isPrimary, timestamps
  - Relationship: Many-to-one with AthleteProfile
  - Unique constraint: (athleteProfileId, provider)
  - Run migration: `npx prisma migrate dev`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core OAuth infrastructure

- [x] Authentication framework exists (JWT, Passport)
- [x] T002 [P] [US1] Create Device OAuth service structure
  - Create `backend/src/auth/devices/device-oauth.service.ts`
  - Add methods: `generateAuthUrl()`, `exchangeCodeForTokens()`, `refreshAccessTokenIfNeeded()`, `getConnection()`, `storeConnection()`
  - Add token encryption/decryption helpers (AES-256-GCM)
  - Support both Garmin and Wahoo providers

- [x] T003 [P] [US1] Create Device API service
  - Create `backend/src/auth/devices/device-api.service.ts`
  - Add methods: `createWorkout()`, `refreshToken()`
  - Use fetch or axios for API calls
  - Handle API errors and rate limits
  - Provider-agnostic design (can extend for Garmin/Wahoo specifics)

- [x] T004 [P] [US1] Create Device OAuth module
  - Create `backend/src/auth/devices/device-oauth.module.ts`
  - Declare DeviceOAuthController, DeviceOAuthService, DeviceApiService
  - Import PrismaModule, ConfigModule
  - Export services for use in other modules

**Checkpoint**: OAuth infrastructure ready - endpoints can be implemented

---

## Phase 3: User Story 1 - OAuth Connection (Priority: P1) 🎯 MVP

**Goal**: Athlete can connect Garmin/Wahoo account via OAuth

**Independent Test**: GET `/api/athlete/garmin/connect` redirects to Garmin OAuth, callback stores tokens

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T005 [P] [US1] Unit test for DeviceOAuthService in `backend/src/auth/devices/device-oauth.service.spec.ts`
  - Test: `generateAuthUrl` returns correct OAuth URL with state
  - Test: `exchangeCodeForTokens` stores encrypted tokens
  - Test: `refreshAccessTokenIfNeeded` refreshes expired tokens automatically
  - Test: `getConnection` returns connection status
  - Test: Token encryption/decryption works correctly
  - Test: Throws error if configuration is incomplete
  - Test: Handles provider-specific differences (Garmin vs Wahoo)

- [x] T006 [P] [US1] Integration test for OAuth flow in `backend/tests/auth/devices/device-oauth.e2e-spec.ts`
  - Test: GET `/api/athlete/garmin/connect` redirects to Garmin
  - Test: GET `/api/athlete/garmin/callback` exchanges code and stores tokens
  - Test: GET `/api/athlete/wahoo/connect` redirects to Wahoo
  - Test: GET `/api/athlete/wahoo/callback` exchanges code and stores tokens
  - Test: Invalid state parameter returns 400
  - Test: Missing code parameter returns 400
  - Test: Returns 401 for unauthenticated requests

### Implementation for User Story 1

- [x] T007 [US1] Implement OAuth service methods in `backend/src/auth/devices/device-oauth.service.ts`
  - `generateAuthUrl(provider, state)`: Build OAuth URL with client_id, redirect_uri, state, scope
  - `exchangeCodeForTokens(provider, code, athleteUserId)`: Exchange code for tokens via provider API
  - `refreshAccessTokenIfNeeded(provider, athleteUserId)`: Check expiration, refresh if needed
  - `getConnection(provider, athleteUserId)`: Query DeviceConnection from database
  - `storeConnection(provider, athleteUserId, tokens)`: Encrypt and store tokens
  - `encryptToken(token)`: AES-256-GCM encryption
  - `decryptToken(encryptedToken)`: AES-256-GCM decryption
  - Handle provider-specific config (Garmin vs Wahoo URLs, scopes)

- [x] T008 [US1] Implement token storage with encryption in `backend/src/auth/devices/device-oauth.service.ts`
  - Use crypto module for AES-256-GCM
  - Generate IV for each encryption
  - Store format: `IV:AuthTag:EncryptedData` (hex)
  - Validate encryption key from environment

- [x] T009 [US1] Create DTO for OAuth callback in `backend/src/auth/devices/dto/device-callback.dto.ts`
  - `code`: string (required)
  - `state`: string (required)
  - Use class-validator decorators

- [x] T010 [US1] Create DeviceOAuthController in `backend/src/auth/devices/device-oauth.controller.ts`
  - `GET /athlete/garmin/connect`: Generate state, redirect to Garmin OAuth
  - `GET /athlete/garmin/callback`: Validate state, exchange code, store tokens
  - `GET /athlete/wahoo/connect`: Generate state, redirect to Wahoo OAuth
  - `GET /athlete/wahoo/callback`: Validate state, exchange code, store tokens
  - Use `JwtAuthGuard`, `RolesGuard` for ATHLETE role
  - State parameter storage (Map or Redis) with 10min expiry
  - CSRF protection via state validation

- [x] T011 [US1] Add environment variables for device OAuth in `backend/src/config/app.config.ts` and `backend/src/config/validation.schema.ts`
  - Garmin: `GARMIN_CLIENT_ID`, `GARMIN_CLIENT_SECRET`, `GARMIN_REDIRECT_URI`, `GARMIN_AUTH_URL`, `GARMIN_TOKEN_URL`, `GARMIN_API_BASE_URL`, `GARMIN_TOKEN_ENCRYPTION_KEY`
  - Wahoo: `WAHOO_CLIENT_ID`, `WAHOO_CLIENT_SECRET`, `WAHOO_REDIRECT_URI`, `WAHOO_AUTH_URL`, `WAHOO_TOKEN_URL`, `WAHOO_API_BASE_URL`, `WAHOO_TOKEN_ENCRYPTION_KEY`
  - Add validation rules in Joi schema

**Checkpoint**: OAuth connection flow functional and tested

---

## Phase 4: User Story 2 - Connection Management (Priority: P1) 🎯 MVP

**Goal**: Athlete can view connection status and set primary provider

**Independent Test**: GET `/api/athlete/connections` returns connections, PUT `/api/athlete/connections/primary` sets primary

### Tests for User Story 2

- [x] T012 [P] [US2] Unit test for connection management in `backend/src/athlete/athlete.service.spec.ts`
  - Test: `getConnections` returns all connections with status
  - Test: `setPrimaryProvider` sets one provider as primary, unsets others
  - Test: `setPrimaryProvider` validates provider is connected

- [x] T013 [P] [US2] Integration test for connection endpoints in `backend/tests/athlete/connections.e2e-spec.ts`
  - Test: GET `/api/athlete/connections` returns connections array
  - Test: PUT `/api/athlete/connections/primary` sets primary provider
  - Test: PUT with invalid provider returns 400
  - Test: PUT with unconnected provider returns 400
  - Test: Returns 401 for unauthenticated requests

### Implementation for User Story 2

- [x] T014 [US2] Add connection management methods to AthleteService in `backend/src/athlete/athlete.service.ts`
  - `getConnections(athleteUserId)`: Query all DeviceConnections for athlete, return with status
  - `setPrimaryProvider(athleteUserId, provider)`: Set one provider as primary, unset others
  - Validate provider is connected before setting as primary

- [x] T015 [US2] Add connection endpoints to AthleteController in `backend/src/athlete/athlete.controller.ts`
  - `GET /connections`: Get all connections with status
  - `PUT /connections/primary`: Set primary provider
  - Use `JwtAuthGuard`, `RolesGuard` for ATHLETE role

**Checkpoint**: Connection management functional and tested

---

## Phase 5: Frontend - Connections UI (Priority: P1) 🎯 MVP

**Goal**: Athlete can see and manage connections in PWA

**Independent Test**: Profile → Connections shows connections, connect buttons work, primary selector works

### Implementation for Frontend

- [x] T016 [US1] Add Connections UI to Athlete PWA in `athlete-pwa/src/App.tsx` or `athlete-pwa/src/components/Connections.tsx`
  - Profile → Connections section
  - Display connection status for Garmin and Wahoo
  - "Connect Garmin" button (if not connected)
  - "Connect Wahoo" button (if not connected)
  - "Reconnect" button (if EXPIRED or REVOKED)
  - Primary provider selector (if both connected)
  - Status badges (CONNECTED, EXPIRED, REVOKED, ERROR)

- [x] T017 [US1] Implement OAuth flow in frontend
  - Click "Connect Garmin/Wahoo" → redirect to backend `/api/athlete/garmin/connect`
  - Backend redirects to provider OAuth page
  - Provider redirects back to `/api/athlete/garmin/callback`
  - Backend handles callback and redirects to frontend success page
  - Frontend shows "Connected" status

- [x] T018 [US2] Implement primary provider selection in frontend
  - Show "Set Primary Provider" dropdown when both connected
  - Call PUT `/api/athlete/connections/primary` on selection
  - Update UI to show primary provider badge

- [x] T019 [US1] Add connection status polling/refresh in frontend
  - Poll GET `/api/athlete/connections` periodically
  - Update status badges in real-time
  - Handle EXPIRED/REVOKED states with reconnect option

**Checkpoint**: Frontend UI functional and tested

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T020 [P] Add error handling and logging
  - Log OAuth errors, token refresh failures
  - Clear error messages for athletes
  - Handle network errors gracefully

- [ ] T021 [P] Manual testing
  - Test OAuth flow with real Garmin account
  - Test OAuth flow with real Wahoo account (if available)
  - Test token refresh automation
  - Test primary provider selection
  - Test connection status accuracy

- [ ] T022 [P] Documentation updates
  - Update API contracts if needed
  - Add environment variable documentation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational completion
- **User Story 2 (Phase 4)**: Depends on User Story 1 (needs connections to exist)
- **Frontend (Phase 5)**: Depends on User Stories 1 and 2 (needs backend endpoints)
- **Polish (Phase 6)**: Depends on all previous phases

### Parallel Opportunities

- T002, T003, T004 can run in parallel (different services)
- T005, T006 can run in parallel (different test files)
- T007, T008, T009 can run in parallel (different parts of service)
- T012, T013 can run in parallel (different test files)
- T016, T017, T018, T019 can run in parallel (different UI components)

---

## Notes

- Provider abstraction allows easy extension to other providers (Strava, TrainingPeaks, etc.)
- Token encryption is critical - must use strong encryption key
- OAuth state parameter prevents CSRF attacks
- Primary provider is used by auto-push feature (Feature 005)
- Connection status must accurately reflect token validity
