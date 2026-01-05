# Feature Specification: Export Warnings and State Tracking

**Feature ID**: 006  
**Version**: 1.0  
**Last Updated**: 2025-12-30  
**Status**: Draft

---

## Overview

### Problem Statement

When legacy endurance prescriptions are normalized, the system logs warnings but coaches don't see them. Coaches need visibility into when workouts were auto-converted and should review them before export. Additionally, coaches need to know which workouts have already been exported to avoid duplicate exports.

### User Goals

- **Coaches**: See when a workout was auto-converted from legacy format
- **Coaches**: Know which workouts have been exported to Garmin
- **Coaches**: Avoid accidentally exporting the same workout twice
- **Coaches**: Review converted workouts before export

### Success Criteria

- Legacy-converted workouts show visible warning badge/text
- Exported workouts show "Exported" indicator
- Warning appears before export (coach can review)
- Export state persists and is visible in UI
- Coaches can distinguish exported vs non-exported workouts

---

## User Scenarios

### Primary User Flows

**Scenario 1: Coach Sees Legacy Conversion Warning**

1. Coach views endurance session that was created from legacy format
2. Coach sees warning badge: "Auto-converted from legacy format. Please review."
3. Coach reviews workout structure before export
4. Coach decides to export or edit first

**Scenario 2: Coach Sees Export Status**

1. Coach views endurance session
2. Coach sees "Exported to Garmin" badge or timestamp
3. Coach knows this workout is already in Garmin
4. Coach doesn't try to export again

**Scenario 3: Coach Exports and Sees Status Update**

1. Coach exports workout to Garmin
2. Export succeeds
3. Session detail shows "Exported to Garmin" with timestamp
4. Coach can see when it was exported

### Edge Cases

- Workout exported multiple times (show latest export timestamp)
- Workout has both legacy warning and export status (show both)
- Export fails but state was partially updated (rollback state)

### Error Scenarios

- Warning detection fails (no warning shown, but workout still works)
- Export state update fails (export succeeds but state not saved - show success but no badge)

---

## Functional Requirements

### Must Have (MVP)

- **REQ-1**: Legacy conversion warning displayed in UI
  - Acceptance: Sessions with legacy prescriptions show warning badge/text: "Auto-converted. Please review."

- **REQ-2**: Export state stored in database
  - Acceptance: `exportedToGarminAt` field added to TrainingSession model

- **REQ-3**: Export state displayed in UI
  - Acceptance: Exported sessions show "Exported to Garmin" badge or timestamp

- **REQ-4**: Warning appears before export
  - Acceptance: Warning visible in session detail modal before export button

- **REQ-5**: Export updates state
  - Acceptance: Successful export sets `exportedToGarminAt` timestamp

- **REQ-6**: Legacy detection follows a deterministic rule
  - Acceptance: Prescription is considered legacy if it has `intervals` and does not have `steps`

### Should Have (Post-MVP)

- Warning details (what was converted, original format)
- Export history (multiple exports tracked)
- Clear warning button (dismiss after review)

### Could Have (Future)

- Export to multiple platforms (track which platform)
- Export validation (check if workout still matches Garmin version)
- Auto-dismiss warnings after coach reviews

---

## Key Entities

**TrainingSession (Enhanced)**
- Description: Training session with export state tracking
- Key attributes:
  - `exportedToGarminAt`: Timestamp when exported to Garmin (nullable)
  - `prescription`: Endurance prescription (may be legacy or new format)
- Relationships: Existing TrainingSession model extended

**Legacy Conversion Warning**
- Description: UI indicator for auto-converted workouts
- Key attributes:
  - `isLegacy`: Whether prescription was converted from legacy format
  - `message`: Warning text to display
- Relationships: Derived from prescription format detection

---

## Non-Functional Requirements

### Performance

- Warning detection: < 10ms (simple format check)
- State update: < 100ms (database write)
- UI rendering: No noticeable delay

### Usability

- Warning is visible but not intrusive
- Export status is clear and unambiguous
- Badges/icons are recognizable

### Reliability

- State persists correctly across sessions
- Warning detection is accurate (no false positives/negatives)
- Export state updates immediately after successful export
- If export succeeds but state update fails, export remains successful and the failure is logged

### Security

- No security concerns (read-only warnings, state tracking)

---

## Assumptions

- Legacy prescription format can be detected (already done in normalization)
- Export state only needed for Garmin (not Wahoo in MVP)
- One export per session is sufficient (no export history needed in MVP)
- Warning only needed for legacy conversions (new format doesn't need warning)

---

## Dependencies

- **Legacy Detection**: Depends on existing normalization logic that detects legacy format
- **Export Endpoint**: Depends on export functionality (feature 004) to update state
- **Session Model**: Depends on TrainingSession model (needs migration)
- **UI Components**: Depends on session detail modal (Week tab)

---

## Out of Scope

- **Export history**: Only latest export timestamp, not full history
- **Multiple platform tracking**: Only Garmin in MVP
- **Warning dismissal**: Warnings always shown (no dismiss in MVP)
- **Export validation**: No checking if Garmin workout still matches

---

## Open Questions

None - straightforward feature combining warning display and state tracking.

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
