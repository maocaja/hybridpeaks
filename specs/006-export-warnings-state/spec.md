# Feature Specification: Export Status Display and Endurance Preview (Athlete PWA)

**Feature ID**: 006  
**Version**: 2.0  
**Last Updated**: 2026-01-06  
**Status**: ✅ **COMPLETED**

---

## Overview

### Problem Statement

Athletes need to see the status of their endurance workouts (whether they've been sent to their device) and a preview of what the workout contains. Currently, athletes can see endurance sessions in their "Today" view, but they don't know if the workout has been sent to their Garmin/Wahoo device, or what the workout structure looks like. Athletes also need actionable feedback when exports fail or when they need to connect a device.

### User Goals

- **Athletes**: See if endurance workout has been sent to their device
- **Athletes**: See a preview of the endurance workout (objective, duration, targets)
- **Athletes**: Know what to do if export failed or device not connected
- **Athletes**: Understand workout structure before executing on device

### Success Criteria

- Endurance sessions show export status badge (NOT_CONNECTED, PENDING, SENT, FAILED)
- Endurance sessions show preview (objective, estimated duration, target zones/types)
- Failed exports show retry option
- NOT_CONNECTED status shows "Connect to send" action
- Status updates in real-time when export completes
- Preview is clear and actionable

---

## User Scenarios

### Primary User Flows

**Scenario 1: Athlete Views Endurance Workout (Sent Successfully)**

1. Athlete opens "Today" view in Athlete PWA
2. Athlete sees ENDURANCE session
3. Athlete sees status badge: "Sent to Garmin" (or Wahoo) with timestamp
4. Athlete sees preview:
   - Objective: "Z2 Base Ride"
   - Duration: "60 min"
   - Targets: "Power Zone 2"
5. Athlete knows workout is on device and can execute it

**Scenario 2: Athlete Views Endurance Workout (Not Connected)**

1. Athlete opens "Today" view
2. Athlete sees ENDURANCE session
3. Athlete sees status badge: "Connect to send"
4. Athlete sees preview (same as Scenario 1)
5. Athlete clicks "Go to Connections" button
6. System navigates to Profile → Connections
7. Athlete connects Garmin/Wahoo
8. System auto-pushes workout
9. Status updates to "Sent to Garmin"

**Scenario 3: Athlete Views Endurance Workout (Export Failed)**

1. Athlete opens "Today" view
2. Athlete sees ENDURANCE session
3. Athlete sees status badge: "Failed" with error message
4. Athlete sees preview
5. Athlete clicks "Retry Send" button
6. System attempts export again
7. If succeeds: Status updates to "Sent to Garmin"
8. If fails: Status shows new error, retry available again

**Scenario 4: Athlete Views Endurance Workout (Pending Export)**

1. Coach just created ENDURANCE session
2. System is processing export (normalizing, validating, sending)
3. Athlete opens "Today" view
4. Athlete sees status badge: "Sending..."
5. Athlete sees preview
6. After few seconds, status updates to "Sent to Garmin" or "Failed"

**Scenario 5: Athlete Views Endurance Workout Preview**

1. Athlete sees ENDURANCE session in "Today"
2. Athlete sees preview card showing:
   - **Objective**: "Z3 Intervals" (from prescription.objective)
   - **Duration**: "45 min" (calculated from steps)
   - **Type**: "Intervals" (derived from step structure)
   - **Targets**: "Power Zone 3" or "HR 140-160 bpm" (from primary targets)
3. Athlete understands what they'll execute on device

### Edge Cases

- Workout has both legacy warning and export status (show both, but legacy warning is less prominent)
- Export status changes while athlete is viewing (update in real-time if possible)
- Multiple endurance sessions in same day (each shows own status)
- Preview calculation fails (show "Preview unavailable" but still show status)

### Error Scenarios

- **Status fetch fails**: Show "Status unknown" but allow retry
- **Preview calculation error**: Show basic info (objective only) with "Details unavailable"
- **Network error**: Show cached status with "Last updated: [time]" indicator

---

## Functional Requirements

### Must Have (MVP)

- **REQ-1**: Export status displayed for ENDURANCE sessions
  - Acceptance: ENDURANCE sessions show status badge with one of:
    - "Connect to send" (NOT_CONNECTED)
    - "Sending..." (PENDING)
    - "Sent to [Provider]" (SENT) with timestamp
    - "Failed" (FAILED) with error message

- **REQ-2**: Status badge is visually distinct
  - Acceptance: Different colors/icons for each status:
    - NOT_CONNECTED: Gray/info
    - PENDING: Yellow/warning
    - SENT: Green/success
    - FAILED: Red/error

- **REQ-3**: Preview shows workout summary
  - Acceptance: ENDURANCE sessions show preview card with:
    - Objective (from prescription.objective)
    - Estimated duration (calculated from steps)
    - Primary target type and value (POWER/HR/PACE with zone or range)
    - Sport type (BIKE/RUN/SWIM)

- **REQ-4**: Action buttons based on status
  - Acceptance: NOT_CONNECTED shows "Go to Connections" button
  - Acceptance: FAILED shows "Retry Send" button
  - Acceptance: SENT shows no action button (read-only)

- **REQ-5**: Status updates when export completes
  - Acceptance: When auto-push completes, status updates in UI
  - Acceptance: Update happens without page refresh (polling or websocket)

- **REQ-6**: Failed export shows error message
  - Acceptance: FAILED status displays `lastExportError` message
  - Acceptance: Error message is user-friendly (not technical)

- **REQ-7**: Preview calculation handles edge cases
  - Acceptance: If duration can't be calculated, show "Duration: TBD"
  - Acceptance: If targets are missing, show "Targets: Not specified"

### Should Have (Post-MVP)

- Detailed workout view (expand preview to show all steps)
- Export history (when was it exported, how many times)
- Legacy conversion warning (if workout was auto-converted)
- Estimated completion time based on athlete's pace

### Could Have (Future)

- Workout comparison (planned vs executed from device)
- Workout notes from coach visible in preview
- Workout difficulty indicator

---

## Key Entities

**Export Status Badge**
- Description: UI component showing export status
- Key attributes:
  - `status`: NOT_CONNECTED | PENDING | SENT | FAILED
  - `provider`: GARMIN | WAHOO | null
  - `exportedAt`: DateTime | null
  - `error`: string | null
- Relationships: Tied to specific TrainingSession

**Endurance Preview Card**
- Description: UI component showing workout summary
- Key attributes:
  - `objective`: string (from prescription)
  - `estimatedDuration`: number (minutes, calculated)
  - `sport`: BIKE | RUN | SWIM
  - `primaryTarget`: { kind: POWER | HR | PACE, value: string }
  - `type`: string (derived: "Intervals", "Steady", "Tempo", etc.)
- Relationships: Derived from TrainingSession.prescription

---

## Non-Functional Requirements

### Performance

- Status fetch: < 200ms (API call)
- Preview calculation: < 50ms (client-side)
- Status update polling: Every 5-10 seconds when PENDING

### Usability

- Status badge is immediately recognizable
- Preview is clear and concise (not overwhelming)
- Action buttons are obvious and accessible
- Error messages are actionable (tell user what to do)

### Reliability

- Status accurately reflects actual export state
- Preview calculation handles missing/invalid data gracefully
- Status updates don't cause UI flicker
- Cached status shown if API unavailable

### Security

- No security concerns (read-only display of athlete's own data)

---

## Assumptions

- Export status fields exist in TrainingSession (Feature 005)
- Endurance prescription format is consistent (new step-based format)
- Athlete PWA "Today" view exists (already implemented)
- Status can be polled or pushed via API
- Preview calculation can be done client-side or server-side

---

## Dependencies

- **Export Status (Feature 005)**: Depends on export status fields in TrainingSession
- **Device Connections (Feature 004)**: Depends on connection status for NOT_CONNECTED detection
- **Athlete PWA Today View**: Depends on existing "Today" UI
- **Backend API**: Depends on endpoint to fetch export status

---

## Out of Scope

- **Workout execution in HybridPeaks**: Endurance is executed on device, not in PWA
- **Detailed step-by-step view**: Only preview summary, not full workout structure
- **Export history UI**: Only current status, not history
- **Coach view of export status**: Only athlete sees status in PWA (coach sees in different UI if needed)
- **Workout execution analysis**: MVP does NOT show how athlete executed the workout on device
  - **No import of activity data from Garmin/Wahoo**
  - **No analysis of power/HR/cadence streams**
  - **No comparison of planned vs executed workout**
  - **Athlete executes on device, coach sees adherence via manual workout logs only**

---

## Open Questions

- [NEEDS CLARIFICATION: Should status update via polling or websocket? (Recommendation: polling every 5-10s when PENDING, then stop)]
- [NEEDS CLARIFICATION: Should preview calculation be client-side or server-side? (Recommendation: server-side for consistency)]

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
