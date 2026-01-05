# Feature Specification: Garmin OAuth Integration

**Feature ID**: 004  
**Version**: 1.0  
**Last Updated**: 2025-12-30  
**Status**: Draft

---

## Overview

### Problem Statement

Coaches need to export endurance workouts directly to Garmin Connect so athletes can access them on their devices. Currently, workouts can be normalized and exported in Garmin format, but there's no way to actually send them to Garmin's platform. This requires OAuth authentication to access Garmin's API and create workouts.

### User Goals

- **Coaches**: Connect their Garmin account and export workouts directly to Garmin Connect
- **Athletes**: Access exported workouts on their Garmin devices
- **Platform**: Enable seamless workout transfer to the most popular fitness platform

### Success Criteria

- Coaches can initiate Garmin OAuth connection from the platform
- Coaches can complete OAuth flow and grant access
- Platform stores Garmin access and refresh tokens securely
- Coaches can export a workout to Garmin and it appears as a draft in Garmin Connect
- Export operation completes successfully for valid endurance workouts
- Error messages are clear when export fails

---

## User Scenarios

### Primary User Flows

**Scenario 1: Coach Connects Garmin Account**

1. Coach navigates to settings/integrations
2. Coach clicks "Connect Garmin" button
3. System redirects coach to Garmin OAuth authorization page
4. Coach authorizes the application
5. Garmin redirects back with authorization code
6. System exchanges code for access and refresh tokens
7. System stores tokens securely linked to coach account
8. Coach sees "Garmin Connected" status

**Scenario 2: Coach Exports Workout to Garmin**

1. Coach views an endurance training session
2. Coach clicks "Send to Garmin" button
3. System verifies coach has Garmin connected
4. System normalizes the workout
5. System validates normalized workout (steps ≥ 1, durations > 0, valid targets, cadence only for BIKE)
6. System converts validated workout to Garmin format using exporter
7. System calls Garmin API to create workout as draft
8. System shows success message: "Workout sent to Garmin"
9. Workout appears in coach's Garmin Connect account as draft

**Scenario 3: Export Validation Fails**

1. Coach clicks "Send to Garmin" button
2. System normalizes the workout
3. System validates normalized workout
4. Validation fails (e.g., no steps, invalid duration, cadence on non-BIKE)
5. System shows error: "Workout validation failed: [specific reason]"
6. Export is cancelled, no API call made

### Edge Cases

- Coach already has Garmin connected (show "Reconnect" option)
- Garmin token expired (refresh token automatically, retry export)
- Garmin API returns error (show specific error message)
- Workout export fails mid-process (rollback, show error)

### Error Scenarios

- **OAuth denied**: Coach denies authorization → Show message "Authorization cancelled"
- **OAuth error**: Garmin returns error → Show "Failed to connect Garmin. Please try again."
- **Token refresh fails**: Refresh token invalid → Require re-authorization
- **Export fails**: Garmin API error → Show "Failed to export workout. [specific error]"
- **No Garmin connection**: Coach tries to export without connection → Show "Please connect Garmin first"
- **Validation fails**: Workout doesn't pass validation → Show "Workout validation failed: [specific reason]" (e.g., "Workout must have at least one step", "Invalid duration", "Cadence targets only allowed for bike workouts")

---

## Functional Requirements

### Must Have (MVP)

- **REQ-1**: OAuth initiation endpoint redirects to Garmin authorization
  - Acceptance: GET `/auth/garmin/connect` redirects to Garmin OAuth URL with correct parameters

- **REQ-2**: OAuth callback endpoint exchanges code for tokens
  - Acceptance: GET `/auth/garmin/callback?code=...` stores access and refresh tokens in database

- **REQ-3**: Platform stores Garmin tokens securely
  - Acceptance: Tokens stored in database linked to coach user, encrypted at rest

- **REQ-4**: Export endpoint creates workout in Garmin
  - Acceptance: POST `/coach/sessions/:id/export/garmin` creates draft workout in Garmin Connect

- **REQ-5**: System refreshes expired access tokens automatically
  - Acceptance: When access token expires, system uses refresh token to get new access token

- **REQ-6**: Export uses normalized workout and Garmin exporter
  - Acceptance: Export flow: normalize → convert to Garmin format → send to API

- **REQ-7**: Final validation of ENDURANCE workout before export
  - Acceptance: System validates normalized workout has:
    - At least 1 step (steps.length ≥ 1)
    - All steps have duration > 0 (seconds > 0 OR meters > 0)
    - All primary targets are valid (zone OR min/max present)
    - Cadence targets only present for BIKE sport
  - Acceptance: Invalid workouts are rejected with clear error message before API call

- **REQ-8**: Garmin connection status endpoint
  - Acceptance: GET `/coach/garmin/status` returns `{ connected: boolean, connectedAt?: string }`

- **REQ-9**: OAuth and API endpoints are configurable
  - Acceptance: Auth, token, and API base URLs come from environment configuration

- **REQ-10**: Tokens are encrypted at rest using application-level encryption
  - Acceptance: Tokens are stored encrypted and decrypted only in backend services

### Should Have (Post-MVP)

- Disconnect Garmin functionality
- View connection status in UI
- Export history/log

### Could Have (Future)

- Import workouts from Garmin
- Sync workout completion status
- Update existing Garmin workouts
- Batch export multiple workouts

---

## Key Entities

**GarminConnection**
- Description: Stores OAuth tokens and connection status for a coach's Garmin account
- Key attributes:
  - `coachUserId`: Link to coach user
  - `accessToken`: Garmin API access token (encrypted)
  - `refreshToken`: Garmin API refresh token (encrypted)
  - `expiresAt`: Access token expiration timestamp
  - `connectedAt`: When connection was established
- Relationships: One-to-one with Coach/User

**GarminWorkoutExport**
- Description: Tracks exported workouts (for future features)
- Key attributes:
  - `sessionId`: Training session that was exported
  - `garminWorkoutId`: ID returned by Garmin API
  - `exportedAt`: Timestamp of export
  - `status`: Success/failure status
- Relationships: Links TrainingSession to Garmin workout

---

## Non-Functional Requirements

### Performance

- OAuth redirect: < 100ms (immediate redirect)
- Token exchange: < 2s (Garmin API call)
- Workout export: < 3s (normalize + convert + API call)

### Usability

- OAuth flow should be clear and intuitive
- Error messages explain what went wrong and what to do
- Success feedback confirms export completed

### Reliability

- Handle Garmin API rate limits gracefully
- Retry logic for transient failures
- Token refresh happens automatically without user intervention

### Security

- Tokens encrypted at rest in database
- OAuth state parameter prevents CSRF attacks
- Tokens never exposed in frontend or logs
- Secure token storage following OAuth 2.0 best practices
- OAuth and API endpoints configured via server-side environment (no hard-coded URLs)

---

## Assumptions

- Garmin Connect API supports OAuth 2.0 authorization code flow
- Garmin API supports creating workouts as drafts
- Garmin API accepts workout format from our exporter stub (or similar)
- One Garmin connection per coach (not per athlete)
- Coaches export their own planned workouts (not athlete's completed workouts)

---

## Dependencies

- **Garmin Connect API**: External dependency - OAuth and workout creation endpoints
- **Endurance Normalizer**: Depends on existing normalization logic
- **Garmin Exporter**: Depends on existing Garmin exporter stub (may need updates for real API)
- **Database**: Needs new table for GarminConnection
- **Encryption**: Needs secure token storage mechanism
- **Garmin Status Endpoint**: Exposed to UI for connection checks
- **Validation Logic**: Depends on normalized workout structure validation (can live in exporter or service layer)

---

## Out of Scope

- **Import from Garmin**: Only export direction in MVP
- **Sync workout status**: No bidirectional sync
- **Update existing workouts**: Only create new drafts
- **Athlete Garmin connections**: Only coach connections in MVP
- **Wahoo OAuth**: Separate feature (feature 003 is just stub)

---

## Open Questions

- [NEEDS CLARIFICATION: Garmin API endpoint URLs and exact OAuth flow details]
- [NEEDS CLARIFICATION: Garmin workout creation API format - does stub format match?]
- [NEEDS CLARIFICATION: Token encryption method - use database encryption or application-level?]

---

## Validation Checklist

Before proceeding to planning, this specification must meet:

- [ ] No implementation details (languages, frameworks, APIs) - NEEDS CLARIFICATION markers added
- [x] All requirements are testable and unambiguous
- [x] Success criteria are measurable and technology-agnostic
- [x] User scenarios cover primary flows
- [x] Edge cases identified
- [ ] No [NEEDS CLARIFICATION] markers remain - 3 clarifications needed
- [x] Assumptions and dependencies documented
