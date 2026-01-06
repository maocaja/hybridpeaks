# Implementation Plan: Auto-Push Endurance Workouts to Devices

**Branch**: `005-auto-push-endurance` | **Date**: 2025-01-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-send-to-garmin-button/spec.md`

## Summary

Automatically push endurance workouts to athlete devices when coaches create or update ENDURANCE sessions. System uses athlete's connected device provider (Garmin or Wahoo) to create workouts in their account. Export status is tracked per session (NOT_CONNECTED, PENDING, SENT, FAILED) and failed exports can be retried. Pending workouts are automatically pushed when athletes connect devices.

**⚠️ MVP Scope Clarification**: This feature **pushes planned workouts TO devices only**. MVP does NOT import executed workout data, analyze performance, or compare planned vs executed. Athletes execute on device, coaches see adherence via manual logs. Analysis of execution (summary + laps) is post-MVP.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20.x LTS  
**Primary Dependencies**: NestJS, Prisma ORM, Device OAuth (Feature 004), Endurance Normalizer (Feature 002), Exporters (Feature 003)  
**Storage**: PostgreSQL (TrainingSession model extended with export status fields)  
**Testing**: Jest (unit tests for auto-push logic, integration tests for triggers)  
**Target Platform**: NestJS REST API (backend)  
**Project Type**: Web application (backend only for this feature)  
**Performance Goals**: < 3s for auto-push (async, doesn't block plan save)  
**Constraints**: Must be asynchronous, must handle failures gracefully, must not block coach workflow  
**Scale/Scope**: One export per session create/update, background job processing, retry logic for failures

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

✅ **Guardrail 21 (No Temporary Workarounds)**: Uses standard async job pattern, no workarounds  
✅ **Guardrail 22 (Strict Type Safety)**: Export status fields typed as enums, all inputs/outputs typed  
✅ **Guardrail 23 (Controllers Must Be Thin)**: Auto-push triggered from service layer, not controllers  
✅ **Guardrail 24 (DTO/Schema Validation)**: Export status validated via Prisma schema  
✅ **Guardrail 25 (Migrations Required)**: TrainingSession model extended with export fields  
✅ **Guardrail 26 (No New Documentation)**: Only updating existing API contracts if needed

## Project Structure

### Documentation (this feature)

```text
specs/005-send-to-garmin-button/
├── plan.md              # This file
├── spec.md              # Feature specification
└── tasks.md             # Task breakdown (to be created)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── weekly-plans/
│   │   └── weekly-plans.service.ts        # Add auto-push hooks on create/update
│   ├── athlete/
│   │   └── athlete.service.ts            # Add push pending workouts method
│   ├── integrations/
│   │   └── endurance/
│   │       ├── endurance-normalizer.ts   # Existing - used for normalization
│   │       └── exporters/
│   │           ├── garmin-exporter.stub.ts  # Existing - used for conversion
│   │           └── wahoo-exporter.stub.ts    # Existing - used for conversion
│   └── prisma/
│       └── schema.prisma                 # Add export status fields to TrainingSession
└── tests/
    └── weekly-plans/
        └── auto-push.e2e-spec.ts         # Integration tests for auto-push
```

**Structure Decision**: This feature extends the existing `weekly-plans` service with auto-push hooks. The export logic uses existing normalizer and exporters from Features 002-003, and device connections from Feature 004. Export status is stored directly in TrainingSession model.

## Implementation Approach

### Phase 0: Research & Design

**Existing Infrastructure:**
- ✅ `WeeklyPlansService` exists with session create/update methods
- ✅ `endurance-normalizer.ts` exists with `normalizeEnduranceWorkout()` function
- ✅ `GarminExporterStub` and `WahooExporterStub` exist
- ✅ Device connections exist (Feature 004) with `DeviceOAuthService`
- ✅ `TrainingSession` model accessible via Prisma

**Design Decisions:**

1. **Database Schema Extension**: Add to `TrainingSession` model
   - `exportStatus`: enum (NOT_CONNECTED | PENDING | SENT | FAILED)
   - `exportProvider`: enum (GARMIN | WAHOO | null)
   - `exportedAt`: DateTime | null
   - `externalWorkoutId`: string | null (provider's workout ID)
   - `lastExportError`: string | null

2. **Auto-Push Trigger**:
   - Hook into `WeeklyPlansService.createSession()` and `WeeklyPlansService.updateSession()`
   - Only trigger for ENDURANCE sessions
   - Execute asynchronously (don't block save operation)
   - Use background job or async queue (simple: Promise-based for MVP)

3. **Provider Selection**:
   - Check athlete's device connections
   - If primary provider set → use primary
   - If only one connected → use that one
   - If none connected → set `exportStatus = NOT_CONNECTED`

4. **Export Flow**:
   - Normalize workout (expand repeat blocks)
   - Validate normalized workout (steps ≥ 1, duration > 0, valid targets, cadence only BIKE)
   - Convert to provider format (Garmin/Wahoo exporter)
   - Get athlete's access token (refresh if needed)
   - Call provider API to create workout
   - Update session: `exportStatus = SENT`, `exportProvider`, `exportedAt`, `externalWorkoutId`

5. **Error Handling**:
   - Validation fails → `exportStatus = FAILED`, `lastExportError = "Validation failed: ..."`
   - Provider API error → `exportStatus = FAILED`, `lastExportError = "[provider error]"`
   - Token expired → auto-refresh and retry
   - Token revoked → `exportStatus = NOT_CONNECTED`, require reconnect

6. **Pending Workouts Push**:
   - When athlete connects device, find all `NOT_CONNECTED` ENDURANCE sessions
   - Push them automatically
   - Update status to SENT or FAILED

### Phase 1: Implementation

**Files to Create/Modify:**

1. **Database Schema** (`backend/prisma/schema.prisma`)
   - Add export status fields to `TrainingSession` model
   - Create migration

2. **Weekly Plans Service** (`backend/src/weekly-plans/weekly-plans.service.ts`)
   - Add `autoPushEnduranceWorkout(sessionId, athleteUserId)` method
   - Hook into `createSession()` and `updateSession()` for ENDURANCE sessions
   - Call auto-push asynchronously (Promise-based)

3. **Export Service** (`backend/src/integrations/endurance/endurance-export.service.ts`) - NEW
   - `exportWorkoutToProvider(sessionId, athleteUserId, provider)`: Main export logic
   - `normalizeAndValidate(workout)`: Normalize and validate workout
   - `selectProvider(athleteUserId)`: Select provider (primary or only connected)
   - `createWorkoutInProvider(provider, accessToken, workout)`: Call provider API
   - Handle errors and update session status

4. **Athlete Service** (`backend/src/athlete/athlete.service.ts`)
   - `pushPendingWorkouts(athleteUserId, provider)`: Push all NOT_CONNECTED sessions
   - Called when athlete connects device

5. **Validation Helper** (`backend/src/integrations/endurance/endurance-export.service.ts`)
   - `validateNormalizedWorkout(workout)`: Validate before export
   - Reuse validation logic from Feature 004 (if extracted)

### Phase 2: Validation

- Manual testing: Create ENDURANCE session, verify auto-push
- Test provider selection (primary vs only connected)
- Test error handling (validation fails, API errors)
- Test pending workouts push when athlete connects
- Test retry logic for failed exports

## Complexity Tracking

> **No violations** - This feature follows existing patterns and adds minimal complexity through async processing.
