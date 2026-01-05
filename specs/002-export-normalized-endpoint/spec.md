# Feature Specification: Export Normalized Endurance Workout Endpoint

**Feature ID**: 002  
**Version**: 1.0  
**Last Updated**: 2026-01-05  
**Status**: Completed

---

## Overview

### Problem Statement

Coaches and developers need a way to inspect and validate the normalized structure of endurance workouts before exporting them to third-party platforms (Garmin, Wahoo). Currently, the normalization logic exists but there's no way to see the output without implementing full OAuth integration. This creates a debugging bottleneck and prevents validation of the export-ready format.

### User Goals

- **Coaches**: Verify that their endurance prescriptions are correctly normalized before attempting export
- **Developers**: Debug normalization issues and validate export payloads without OAuth setup
- **QA**: Test export functionality independently of third-party integrations

### Success Criteria

- Coaches can retrieve the normalized structure of any endurance session they own
- Response time is under 200ms for typical workouts
- Endpoint returns clear error messages when session is not found or access is denied
- Normalized output matches the structure expected by export stubs (Garmin, Wahoo)

---

## User Scenarios

### Primary User Flows

**Scenario 1: Coach Validates Workout Structure**

1. Coach navigates to a training session in their roster
2. Coach requests the normalized export format for that session
3. System verifies coach has access to the athlete's session
4. System normalizes the endurance prescription (expands repeat blocks, converts targets)
5. Coach receives the normalized workout structure in JSON format
6. Coach can inspect the structure to verify it's correct before export

**Scenario 2: Developer Debugs Normalization**

1. Developer identifies a session with a normalization issue
2. Developer calls the endpoint with session ID
3. System returns normalized structure or clear error message
4. Developer can compare input prescription vs normalized output to identify issues

### Edge Cases

- Session exists but is not an endurance type (should return clear error)
- Session has legacy prescription format (should normalize correctly)
- Session belongs to athlete not in coach's roster (should return 403)
- Session has invalid prescription data (should return validation error)

### Error Scenarios

- **Session not found**: Return 404 with message "Training session not found"
- **Access denied**: Return 403 with message "You do not have access to this session"
- **Not endurance type**: Return 400 with message "This endpoint only supports endurance sessions"
- **Invalid prescription**: Return 400 with message describing validation failure

---

## Functional Requirements

### Must Have (MVP)

- **REQ-1**: Endpoint accepts session ID and returns normalized endurance workout
  - Acceptance: GET request to `/api/coach/sessions/:sessionId/export/normalized` returns 200 with normalized JSON structure

- **REQ-2**: Endpoint verifies coach has access to the athlete's session
  - Acceptance: Request from coach without roster access returns 403

- **REQ-3**: Endpoint only processes endurance session types
  - Acceptance: Request for strength session returns 400 with appropriate message

- **REQ-4**: Endpoint executes normalization logic (repeat expansion, target conversion)
  - Acceptance: Response contains expanded steps array with normalized duration and target fields

- **REQ-5**: Endpoint returns structure matching NormalizedWorkout type
  - Acceptance: Response JSON validates against normalized workout schema (sport, steps array, optional objective/notes)

### Should Have (Post-MVP)

- Include metadata about normalization (e.g., "legacy format converted", "repeat blocks expanded")
- Support query parameter to include original prescription alongside normalized output

### Could Have (Future)

- Batch endpoint to normalize multiple sessions at once
- Export format preview (show how it would look in Garmin/Wahoo format)

---

## Key Entities

**Normalized Endurance Workout**
- Description: The output structure after applying normalization to an endurance prescription
- Key attributes:
  - `sport`: Endurance sport type (BIKE, RUN, SWIM)
  - `steps`: Array of normalized steps (repeat blocks expanded, durations converted)
  - `objective`: Optional workout objective text
  - `notes`: Optional workout notes
- Relationships: Derived from TrainingSession.prescription field

**Training Session**
- Description: A scheduled workout session with prescription data
- Key attributes:
  - `id`: Unique session identifier
  - `type`: Session type (must be ENDURANCE for this endpoint)
  - `prescription`: Endurance prescription (may be legacy or new format)
- Relationships: Belongs to WeeklyPlan, which belongs to Coach and Athlete

---

## Non-Functional Requirements

### Performance

- Response time: < 200ms for typical workouts (10-20 steps)
- Response time: < 500ms for complex workouts (50+ steps after repeat expansion)
- No database queries beyond session lookup and roster verification

### Usability

- JSON response is human-readable (proper formatting, clear field names)
- Error messages are actionable and specific

### Reliability

- Endpoint is read-only (no side effects, idempotent)
- Handles malformed prescriptions gracefully (returns error, doesn't crash)
- Works with both legacy and new prescription formats

### Security

- Requires coach authentication (JWT token)
- Verifies coach has access to athlete via roster relationship
- Does not expose sensitive athlete data beyond what's needed for normalization
- Read-only operation (no data modification)

---

## Assumptions

- Normalization logic already exists and is tested (endurance-normalizer.ts)
- Coach authentication is handled by existing middleware
- Roster verification can reuse existing coach-athlete relationship checks
- Legacy prescription format is already supported by normalization logic

---

## Dependencies

- **Endurance Normalizer**: Depends on existing `normalizeEnduranceWorkout` function
- **Coach Service**: Depends on existing roster verification logic
- **Session Service**: Depends on existing session lookup and type validation
- **Authentication**: Depends on existing JWT authentication middleware

---

## Out of Scope

- **Actual export to third-party platforms**: This endpoint only returns normalized structure, does not send to Garmin/Wahoo
- **UI integration**: No frontend changes in this feature (endpoint only)
- **Modification of prescriptions**: This is read-only, does not update sessions
- **Batch operations**: Only single session normalization in MVP
- **Export format conversion**: Does not convert to Garmin/Wahoo specific formats (that's separate feature)

---

## Open Questions

None - all requirements are clear from MVP context.

---

## Validation Checklist

Before proceeding to planning, this specification must meet:

- [x] No implementation details (languages, frameworks, APIs)
- [x] All requirements are testable and unambiguous
- [x] Success criteria are measurable and technology-agnostic
- [x] User scenarios cover primary flows
- [x] Edge cases identified
- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Assumptions and dependencies documented
