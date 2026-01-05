# Tasks: Send to Garmin Button

**Input**: Design documents from `/specs/005-send-to-garmin-button/`
**Prerequisites**: plan.md ✓, spec.md ✓

**Tests**: Manual testing sufficient for MVP (optional unit tests)

**Organization**: Single user story - button component with states.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1 (single user story)

## Path Conventions

- **Web app**: `coach-web/src/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: No setup needed - uses existing infrastructure

- [x] Session detail modal exists
- [x] Backend export endpoint exists (feature 004)
- [x] API fetch utility exists

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Check Garmin connection status

No additional backend work in this feature. Uses Garmin connection status endpoint from feature 004.

**Checkpoint**: Can determine if Garmin is connected

---

## Phase 3: User Story 1 - Send to Garmin Button (Priority: P1) 🎯 MVP

**Goal**: Coach can click button to export workout to Garmin

**Independent Test**: Button appears, shows correct state, triggers export on click

### Implementation for User Story 1

- [ ] T002 [US1] Add button state management in `coach-web/src/App.tsx`
  - Add useState for: `exporting` (boolean), `exportError` (string | null), `exportSuccess` (boolean)
  - Add state for Garmin connection status

- [ ] T003 [US1] Add "Send to Garmin" button to session detail modal in `coach-web/src/App.tsx`
  - Only show for ENDURANCE sessions
  - Check Garmin connection status
  - Button text: "Send to Garmin" (enabled) or "Connect Garmin" (disabled)
  - Disable button if: no Garmin connection, non-endurance session, or exporting

- [ ] T004 [US1] Implement export handler in `coach-web/src/App.tsx`
  - `handleExportToGarmin(sessionId: string): Promise<void>`
  - Set `exporting = true`, clear errors
  - Call POST `/coach/sessions/${sessionId}/export/garmin`
  - On success: set `exportSuccess = true`, show success message
  - On error: set `exportError` with error message
  - Always: set `exporting = false` after completion

- [ ] T005 [US1] Add button states and feedback in `coach-web/src/App.tsx`
  - Loading state: Button shows "Sending..." and is disabled
  - Success state: Show "Workout sent to Garmin Connect" message (brief, then clear)
  - Error state: Show error message below button
  - Reset states after timeout (success) or on new action

- [ ] T006 [US1] Add button styles in `coach-web/src/App.css`
  - Styles for: enabled, disabled, loading states
  - Success/error message styles
  - Match existing button styles in app

**Checkpoint**: Button functional with all states and feedback

---

## Phase 4: Validation & Polish

- [ ] T007 Manual testing
  - Test button appears for endurance sessions
  - Test button disabled for non-endurance sessions
  - Test button disabled when no Garmin connection
  - Test export flow (click → loading → success)
  - Test error handling (network error, API error)
  - Test button doesn't allow multiple simultaneous exports

- [ ] T008 Verify button placement and styling
  - Button is clearly visible in modal
  - States are visually distinct
  - Messages are readable and actionable

**Checkpoint**: Feature complete and validated

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Already complete ✓
- **Foundational (Phase 2)**: Depends on feature 004 endpoint availability
- **User Story 1 (Phase 3)**: Depends on Foundational (needs connection status)
- **Validation (Phase 4)**: Depends on all implementation

### Task Dependencies

- **T001**: Can be done in backend (parallel with frontend work)
- **T002-T006**: Sequential within same file (state → button → handler → feedback → styles)
- **T007, T008**: Depends on all implementation

---

## Implementation Strategy

### MVP First

1. Backend connection status endpoint (T001) - if needed
2. Frontend button and states (T002-T006)
3. Manual testing (T007, T008)
4. **STOP and VALIDATE**: Feature complete

---

## Notes

- Simple feature - single button component
- Reuses existing modal and API utilities
- All states must be handled (enabled, disabled, loading, success, error)
- Clear feedback is critical for user experience
