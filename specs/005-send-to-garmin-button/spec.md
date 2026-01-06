# Feature Specification: Auto-Push Endurance Workouts to Devices

**Feature ID**: 005  
**Version**: 2.0  
**Last Updated**: 2026-01-06  
**Status**: ✅ **COMPLETED**

---

## Overview

### Problem Statement

When coaches create or update endurance workouts, athletes need these workouts to automatically appear on their Garmin or Wahoo devices. Currently, workouts are stored in HybridPeaks but athletes must manually recreate them on their devices. The system should automatically push endurance workouts to the athlete's connected device provider when the coach saves the workout.

### User Goals

- **Coaches**: Create endurance workouts and have them automatically sent to athlete devices (no manual export)
- **Athletes**: Receive workouts on their devices automatically when coach programs them
- **Platform**: Seamlessly deliver workouts to devices without manual intervention

### Success Criteria

- When coach creates/updates ENDURANCE session, system automatically pushes to athlete's device
- System uses athlete's primary provider (or only connected provider)
- System handles cases where athlete has no connection (workout saved but not exported)
- Export status is tracked per session (NOT_CONNECTED, PENDING, SENT, FAILED)
- Failed exports can be retried automatically or manually
- Coach doesn't need to do anything - push happens automatically

---

## User Scenarios

### Primary User Flows

**Scenario 1: Coach Creates Endurance Workout (Athlete Has Connection)**

1. Coach creates weekly plan with ENDURANCE session
2. Coach saves the plan
3. System detects ENDURANCE session was created
4. System checks athlete's device connections
5. System finds athlete has Garmin connected (primary provider)
6. System normalizes workout
7. System validates normalized workout
8. System exports to Garmin using athlete's token
9. System updates session: `exportStatus = SENT`, `exportProvider = GARMIN`, `exportedAt = now()`
10. Athlete sees workout in Garmin Connect and on device

**Scenario 2: Coach Creates Endurance Workout (Athlete Has No Connection)**

1. Coach creates weekly plan with ENDURANCE session
2. Coach saves the plan
3. System detects ENDURANCE session was created
4. System checks athlete's device connections
5. System finds athlete has no connections
6. System updates session: `exportStatus = NOT_CONNECTED`, `exportProvider = null`
7. Athlete sees "Connect to send" status in PWA
8. Later, athlete connects Garmin
9. System detects new connection and pushes pending workouts
10. System updates session: `exportStatus = SENT`, `exportProvider = GARMIN`

**Scenario 3: Coach Updates Endurance Workout**

1. Coach updates existing ENDURANCE session (changes steps, targets, etc.)
2. Coach saves the plan
3. System detects ENDURANCE session was updated
4. System checks if session was previously exported
5. If exported, system creates new workout in provider (doesn't update existing)
6. System updates session: `exportStatus = SENT`, `exportedAt = now()` (new timestamp)
7. Athlete sees updated workout in device

**Scenario 4: Export Fails (Provider API Error)**

1. Coach creates ENDURANCE session
2. System attempts auto-push to Garmin
3. Garmin API returns error (invalid format, rate limit, etc.)
4. System updates session: `exportStatus = FAILED`, `lastExportError = "..."` 
5. System logs error for debugging
6. Athlete sees "Failed" status with option to retry
7. System can retry automatically on next connection check or manual retry

**Scenario 5: Athlete Connects Device After Workout Created**

1. Coach creates ENDURANCE session (athlete has no connection)
2. Session has `exportStatus = NOT_CONNECTED`
3. Athlete connects Garmin account
4. System detects new connection
5. System finds all ENDURANCE sessions with `exportStatus = NOT_CONNECTED` for this athlete
6. System pushes all pending workouts
7. Sessions updated to `exportStatus = SENT`

### Edge Cases

- Athlete has both Garmin and Wahoo connected (use primary provider)
- Athlete has only one connection (use that one)
- Workout validation fails (don't export, set status to FAILED with validation error)
- Provider token expired (auto-refresh and retry)
- Provider token revoked (set status to NOT_CONNECTED, require reconnect)
- Network error during export (retry logic, set status to PENDING then FAILED after max retries)
- Coach updates workout multiple times (each update creates new workout in provider)

### Error Scenarios

- **No athlete connection**: Workout saved but `exportStatus = NOT_CONNECTED` (not an error, expected state)
- **Validation fails**: Workout doesn't pass validation → `exportStatus = FAILED`, `lastExportError = "Validation failed: [reason]"`
- **Provider API error**: Provider returns 400/500 → `exportStatus = FAILED`, `lastExportError = "[provider error]"`
- **Token expired**: Auto-refresh token and retry export
- **Token revoked**: `exportStatus = NOT_CONNECTED`, require athlete to reconnect
- **Network error**: Retry with exponential backoff, set `exportStatus = PENDING` then `FAILED` after max retries

---

## Functional Requirements

### Must Have (MVP)

- **REQ-1**: Auto-push triggers when coach creates ENDURANCE session
  - Acceptance: Creating ENDURANCE session in weekly plan triggers export attempt
  - Acceptance: Export happens asynchronously (doesn't block plan save)

- **REQ-2**: Auto-push triggers when coach updates ENDURANCE session
  - Acceptance: Updating ENDURANCE session triggers new export attempt
  - Acceptance: Previous export status doesn't prevent new export

- **REQ-3**: System selects provider based on athlete connections
  - Acceptance: If athlete has primary provider set → use primary
  - Acceptance: If athlete has only one connection → use that one
  - Acceptance: If athlete has no connections → set `exportStatus = NOT_CONNECTED`

- **REQ-4**: Export status tracked per session
  - Acceptance: `TrainingSession` has fields:
    - `exportStatus`: NOT_CONNECTED | PENDING | SENT | FAILED
    - `exportProvider`: GARMIN | WAHOO | null
    - `exportedAt`: DateTime | null
    - `externalWorkoutId`: string | null (provider's workout ID)
    - `lastExportError`: string | null

- **REQ-5**: System normalizes workout before export
  - Acceptance: Uses existing endurance normalizer to expand repeat blocks, normalize targets, etc.

- **REQ-6**: System validates normalized workout before export
  - Acceptance: Validates:
    - steps.length ≥ 1
    - All steps have duration > 0
    - All primary targets are valid (zone OR min/max)
    - Cadence targets only for BIKE sport
  - Acceptance: Invalid workouts set `exportStatus = FAILED` with validation error

- **REQ-7**: System uses athlete's provider token for export
  - Acceptance: Export uses token from athlete's DeviceConnection, not coach's
  - Acceptance: Token is refreshed automatically if expired

- **REQ-8**: Failed exports can be retried
  - Acceptance: System can retry failed exports (automatic or manual trigger)
  - Acceptance: Retry uses same provider as original attempt

- **REQ-9**: Pending workouts pushed when athlete connects device
  - Acceptance: When athlete connects provider, system finds all `NOT_CONNECTED` sessions and pushes them
  - Acceptance: Pushes happen asynchronously (background job)

### Should Have (Post-MVP)

- Manual retry button in UI (athlete can retry failed exports)
- Export queue management (prioritize, cancel pending)
- Batch retry for multiple failed exports
- Export history (track multiple exports per session)

### Could Have (Future)

- Update existing workouts in provider (instead of creating new)
- Export schedule (delay export until specific date)
- Export to multiple providers simultaneously

---

## Key Entities

**TrainingSession (Enhanced)**
- Description: Training session with export status tracking
- Key attributes:
  - `exportStatus`: NOT_CONNECTED | PENDING | SENT | FAILED
  - `exportProvider`: GARMIN | WAHOO | null
  - `exportedAt`: DateTime | null
  - `externalWorkoutId`: string | null (provider's workout ID)
  - `lastExportError`: string | null
- Relationships: Links to athlete's DeviceConnection via provider

**Auto-Push Job**
- Description: Background process that pushes workouts to devices
- Key attributes:
  - `sessionId`: Training session to export
  - `athleteUserId`: Athlete whose device to export to
  - `provider`: GARMIN | WAHOO
  - `status`: PENDING | PROCESSING | COMPLETED | FAILED
  - `retryCount`: number
- Relationships: One job per export attempt

---

## Non-Functional Requirements

### Performance

- Auto-push trigger: < 100ms (async, doesn't block plan save)
- Export processing: < 3s (normalize + validate + convert + API call)
- Background job processing: Handles multiple exports concurrently

### Usability

- Coach doesn't need to do anything - push is automatic
- Export status visible to athlete in PWA
- Failed exports show clear error messages

### Reliability

- Handle provider API rate limits gracefully
- Retry logic for transient failures (network, rate limits)
- Token refresh happens automatically
- Failed exports don't block future exports
- Export status accurately reflects actual state

### Security

- Uses athlete's tokens (not coach's)
- Tokens never exposed in logs
- Export errors don't expose sensitive token information

---

## Assumptions

- Endurance normalizer and exporters exist (Features 002-003)
- Device connections exist (Feature 004)
- Coach creates/updates sessions via weekly plan (existing flow)
- Provider APIs support creating workouts (Garmin confirmed, Wahoo TBD)
- One export per session update is sufficient (no update existing workout in MVP)
- Failed exports can be retried later (not blocking)

---

## Dependencies

- **Device Connections (Feature 004)**: Depends on athlete having connected Garmin/Wahoo
- **Endurance Normalizer (Feature 002)**: Depends on normalization logic
- **Garmin/Wahoo Exporters (Feature 003)**: Depends on exporter stubs/implementations
- **Weekly Plans Service**: Depends on session create/update hooks
- **Database**: Needs migration to add export status fields to TrainingSession

---

## Out of Scope

- **Manual export buttons**: No manual triggers - only automatic
- **Coach export actions**: Coach doesn't trigger exports
- **Update existing workouts**: Only create new workouts in provider
- **Import from providers**: Only export direction in MVP
  - **MVP does NOT import executed workout data from Garmin/Wahoo**
  - **MVP does NOT analyze workout performance from device data**
  - **MVP only pushes planned workouts TO devices** - execution analysis is post-MVP
- **Export scheduling**: Exports happen immediately when coach saves
- **Workout analysis**: No automatic analysis of how athlete executed the workout on device (manual logs only in MVP)

---

## Open Questions

- [NEEDS CLARIFICATION: Should failed exports auto-retry? How many times? What's the backoff strategy?]
- [NEEDS CLARIFICATION: When coach updates workout, should we update existing workout in provider or create new? (Recommendation: create new for MVP)]

---

## Validation Checklist

Before proceeding to planning, this specification must meet:

- [ ] No implementation details (languages, frameworks, APIs) - 2 clarifications needed
- [x] All requirements are testable and unambiguous
- [x] Success criteria are measurable and technology-agnostic
- [x] User scenarios cover primary flows
- [x] Edge cases identified
- [ ] No [NEEDS CLARIFICATION] markers remain - 2 clarifications needed
- [x] Assumptions and dependencies documented
