# Implementation Plan: Export Normalized Endurance Workout Endpoint

**Branch**: `002-export-normalized-endpoint` | **Date**: 2025-12-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-export-normalized-endpoint/spec.md`

## Summary

Add a read-only GET endpoint that allows coaches to retrieve the normalized structure of endurance workouts. This endpoint validates coach-athlete roster access, executes the existing normalization logic, and returns the export-ready workout structure. This enables debugging and validation of export functionality without requiring full OAuth integration.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20.x LTS  
**Primary Dependencies**: NestJS, Prisma ORM, existing endurance-normalizer  
**Storage**: PostgreSQL (read-only queries to TrainingSession)  
**Testing**: Jest (unit tests for service, integration tests for endpoint)  
**Target Platform**: NestJS REST API (backend)  
**Project Type**: Web application (backend only for this feature)  
**Performance Goals**: < 200ms response time for typical workouts  
**Constraints**: Read-only operation, must verify roster access, must handle legacy prescriptions  
**Scale/Scope**: Single endpoint, minimal code changes, leverages existing infrastructure

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

✅ **Guardrail 21 (No Temporary Workarounds)**: No workarounds needed - uses existing normalizer  
✅ **Guardrail 22 (Strict Type Safety)**: All inputs/outputs will use DTOs with strict typing  
✅ **Guardrail 23 (Controllers Must Be Thin)**: Controller delegates to service, service handles business logic  
✅ **Guardrail 24 (DTO/Schema Validation)**: Session ID validated via route param, response typed  
✅ **Guardrail 25 (Migrations Required)**: No database schema changes - read-only feature  
✅ **Guardrail 26 (No New Documentation)**: Only updating existing API contracts if needed

## Project Structure

### Documentation (this feature)

```text
specs/002-export-normalized-endpoint/
├── plan.md              # This file
├── spec.md              # Feature specification
└── tasks.md             # Task breakdown (to be created)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── coach/
│   │   ├── coach.controller.ts      # Add GET /sessions/:sessionId/export/normalized
│   │   └── coach.service.ts          # Add getNormalizedWorkout() method
│   └── integrations/
│       └── endurance/
│           └── endurance-normalizer.ts  # Existing - no changes
└── tests/
    └── coach/
        └── export-normalized.spec.ts     # Integration tests
```

**Structure Decision**: This feature extends the existing `coach` module with a new endpoint and service method. The normalization logic already exists in `integrations/endurance/endurance-normalizer.ts` and will be imported and used.

## Implementation Approach

### Phase 0: Research & Design

**Existing Infrastructure:**
- ✅ `endurance-normalizer.ts` exists with `normalizeEnduranceWorkout()` function
- ✅ `CoachService.verifyCoachAthleteRelationship()` exists for roster verification
- ✅ `TrainingSession` model accessible via Prisma with `prescription` JSONB field
- ✅ Coach authentication via JWT middleware (`JwtAuthGuard`, `RolesGuard`)

**Design Decisions:**
1. **Endpoint Location**: `/api/coach/sessions/:sessionId/export/normalized`
   - Follows RESTful pattern
   - Under `/coach` namespace (coach-only access)
   - `/sessions/:sessionId` identifies the resource
   - `/export/normalized` indicates the operation

2. **Service Method**: `CoachService.getNormalizedWorkout(coachUserId, sessionId)`
   - Reuses existing `verifyCoachAthleteRelationship` pattern
   - Fetches session, validates type, normalizes, returns

3. **Error Handling**:
   - 404: Session not found
   - 403: Coach doesn't have access to athlete
   - 400: Session is not endurance type or prescription is invalid

4. **Response Format**: Direct return of `NormalizedWorkout` type
   - Matches structure from `endurance-normalizer.ts`
   - No additional wrapping needed for MVP

### Phase 1: Implementation

**Files to Create/Modify:**

1. **`backend/src/coach/coach.service.ts`**
   - Add `getNormalizedWorkout(coachUserId: string, sessionId: string)` method
   - Fetch session with weeklyPlan relation
   - Extract athleteUserId from weeklyPlan
   - Verify coach-athlete relationship
   - Validate session type is ENDURANCE
   - Import and call `normalizeEnduranceWorkout()`
   - Return normalized structure

2. **`backend/src/coach/coach.controller.ts`**
   - Add `GET /sessions/:sessionId/export/normalized` endpoint
   - Extract sessionId from route param
   - Call service method
   - Return normalized workout

3. **`backend/src/coach/dto/` (if needed)**
   - No new DTOs required - sessionId is route param, response is typed

4. **Tests**
   - Unit test for `getNormalizedWorkout` service method
   - Integration test for endpoint (happy path, error cases)

### Phase 2: Validation

- Manual testing with curl/Postman
- Verify with legacy prescriptions
- Verify with new step-based prescriptions
- Verify error cases (404, 403, 400)
- Performance check (< 200ms)

## Complexity Tracking

> **No violations** - This feature follows existing patterns and adds minimal complexity.
