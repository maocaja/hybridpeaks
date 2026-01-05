# Feature Specification: Send to Garmin Button

**Feature ID**: 005  
**Version**: 1.0  
**Last Updated**: 2025-12-30  
**Status**: Draft

---

## Overview

### Problem Statement

Coaches can export workouts to Garmin via the API endpoint, but there's no UI way to trigger this action. Coaches need a visible, accessible button in the Coach Web interface to send workouts to Garmin without using API tools or curl commands.

### User Goals

- **Coaches**: Click a button to export workout to Garmin from the UI
- **Coaches**: See clear feedback about export status (sending, success, error)

### Success Criteria

- Button appears in session detail modal for endurance sessions
- Button shows appropriate states: enabled, disabled (no Garmin connection), sending, success, error
- Clicking button triggers export and shows feedback
- Success message confirms workout was sent
- Error message explains what went wrong

---

## User Scenarios

### Primary User Flows

**Scenario 1: Coach Exports Workout via Button**

1. Coach opens session detail modal (Week tab or session details)
2. Coach sees "Send to Garmin" button (if endurance session and Garmin connected)
3. Coach clicks button
4. Button shows "Sending..." state
5. System calls export endpoint
6. System shows success message: "Workout sent to Garmin Connect"
7. Button shows success state briefly, then returns to normal

**Scenario 2: Coach Without Garmin Connection**

1. Coach opens session detail modal
2. Coach sees "Send to Garmin" button disabled or "Connect Garmin" link
3. Coach clicks "Connect Garmin" (if available)
4. System redirects to Garmin OAuth flow

**Scenario 3: Export Fails**

1. Coach clicks "Send to Garmin" button
2. Button shows "Sending..." state
3. Export fails (API error, network error, etc.)
4. System shows error message: "Failed to send workout. [specific reason]"
5. Button returns to enabled state (allows retry)

### Edge Cases

- Button clicked while previous export is still in progress (disable button, show "Sending...")
- Multiple sessions open, export one (only that session's button shows state)
- Network disconnection during export (show network error)

### Error Scenarios

- **No Garmin connection**: Button disabled or shows "Connect Garmin" message
- **Export API error**: Show specific error from backend
- **Network error**: Show "Network error. Please check connection and try again."
- **Session not found**: Show "Session not found" (shouldn't happen in normal flow)

---

## Functional Requirements

### Must Have (MVP)

- **REQ-1**: Button appears in session detail modal for endurance sessions
  - Acceptance: Button visible when viewing ENDURANCE session details

- **REQ-2**: Button state reflects Garmin connection status
  - Acceptance: Button enabled if Garmin connected, disabled/shows message if not

- **REQ-3**: Button triggers export API call
  - Acceptance: Clicking button calls POST `/coach/sessions/:id/export/garmin`

- **REQ-4**: Button shows loading state during export
  - Acceptance: Button shows "Sending..." and is disabled during API call

- **REQ-5**: Success feedback displayed after export
  - Acceptance: Success message appears: "Workout sent to Garmin Connect"

- **REQ-6**: Error feedback displayed on failure
  - Acceptance: Error message appears with specific error reason

### Should Have (Post-MVP)

- Show export timestamp ("Exported 2 hours ago")
- Disable button if already exported (prevent duplicate exports)
- Export history/log

### Could Have (Future)

- Batch export multiple sessions
- Export to multiple platforms (Garmin + Wahoo)
- Export schedule (auto-export future sessions)

---

## Key Entities

**Export Button State**
- Description: UI state for the export button
- Key attributes:
  - `enabled`: Whether button can be clicked
  - `loading`: Whether export is in progress
  - `success`: Whether last export succeeded
  - `error`: Error message if export failed
- Relationships: Tied to specific session ID

---

## Non-Functional Requirements

### Performance

- Button click response: < 100ms (immediate visual feedback)
- Export API call: < 3s (depends on backend/Garmin API)

### Usability

- Button is clearly visible and labeled
- States are visually distinct (enabled, disabled, loading, success, error)
- Error messages are actionable
- Success feedback is clear and brief

### Reliability

- Button state persists correctly during export
- Multiple clicks don't trigger multiple exports
- Network errors are handled gracefully

### Security

- No security concerns (UI only, calls authenticated API)

---

## Assumptions

- Session detail modal already exists (Week tab or similar)
- Backend export endpoint exists (feature 004)
- Garmin connection status available via API
- Button only appears for endurance sessions

---

## Dependencies

- **Backend Export Endpoint**: Depends on POST `/coach/sessions/:id/export/garmin` (feature 004)
- **Garmin Connection Status**: Depends on endpoint to check connection status
- **Session Detail Modal**: Depends on existing modal UI (Week tab)

---

## Out of Scope

- **Garmin OAuth flow in UI**: OAuth handled separately (feature 004)
- **Export to other platforms**: Only Garmin in MVP
- **Export history UI**: Only export action, not history view
- **Batch operations**: Only single session export

---

## Open Questions

None - straightforward UI feature.

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
