# Tasks: Export Warnings and State Tracking

**Input**: Design documents from `/specs/006-export-warnings-state/`
**Prerequisites**: plan.md ✓, spec.md ✓

**Tests**: Manual testing sufficient for MVP

**Organization**: Two main parts - warnings and state tracking.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1 (Warnings), US2 (State tracking)

## Path Conventions

- **Web app**: `backend/src/`, `coach-web/src/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database schema for export state

- [ ] T001 Create Prisma migration for exportedToGarminAt field
  - Add `exportedToGarminAt DateTime?` to TrainingSession model in `backend/prisma/schema.prisma`
  - Run migration: `npx prisma migrate dev`
  - Field is nullable (not all sessions exported)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Legacy detection and state update infrastructure

- [x] Legacy normalization logic exists
- [ ] T002 [P] [US1] Add legacy detection helper in `backend/src/weekly-plans/weekly-plans.service.ts`
  - Create `isLegacyPrescription(prescription: Prisma.JsonValue): boolean`
  - Check if prescription has `intervals` and does not have `steps`
  - Return true if legacy format detected

- [ ] T003 [P] [US2] Update export method to set exportedToGarminAt in `backend/src/coach/coach.service.ts`
  - In `exportToGarmin()` method, after successful Garmin API call
  - Update TrainingSession: `exportedToGarminAt = new Date()`
  - Use Prisma update: `prisma.trainingSession.update({ where: { id: sessionId }, data: { exportedToGarminAt: new Date() } })`
  - If update fails, log error and keep export success response

**Checkpoint**: Backend can detect legacy and track export state

---

## Phase 3: User Story 1 - Legacy Warning Display (Priority: P1) 🎯 MVP

**Goal**: Coaches see warning when workout was auto-converted from legacy format

**Independent Test**: Legacy-converted sessions show warning badge in UI

### Implementation for User Story 1

- [ ] T004 [US1] Add isLegacy field to session response in backend
  - Update session DTOs or response mapping to include `isLegacy: boolean`
  - Use `isLegacyPrescription()` helper to determine value
  - Include in session detail and list responses

- [ ] T005 [US1] Add warning badge to session detail modal in `coach-web/src/App.tsx`
  - Check `session.isLegacy` property
  - Display badge: "Auto-converted from legacy format. Please review."
  - Show before export button (if present)
  - Style as warning/info badge

- [ ] T006 [US1] Add warning badge styles in `coach-web/src/App.css`
  - Warning badge styles (yellow/orange background, readable text)
  - Match existing badge styles in app

**Checkpoint**: Legacy warnings visible in UI

---

## Phase 4: User Story 2 - Export State Display (Priority: P1) 🎯 MVP

**Goal**: Coaches see which workouts have been exported to Garmin

**Independent Test**: Exported sessions show "Exported to Garmin" badge with timestamp

### Implementation for User Story 2

- [ ] T007 [US2] Include exportedToGarminAt in session responses in backend
  - Update session DTOs to include `exportedToGarminAt?: Date`
  - Include in session detail and list responses
  - Return null if not exported

- [ ] T008 [US2] Add export status badge to session detail modal in `coach-web/src/App.tsx`
  - Check `session.exportedToGarminAt` property
  - If present: Display "Exported to Garmin" with formatted timestamp
  - Show near export button or session header
  - Style as success/info badge

- [ ] T009 [US2] Add export status badge styles in `coach-web/src/App.css`
  - Export status badge styles (green/success color)
  - Timestamp formatting (e.g., "2 hours ago", "Dec 30, 2025")

- [ ] T010 [US2] Add export status to session list (Week tab) in `coach-web/src/App.tsx`
  - Show small badge or icon for exported sessions in list view
  - Indicate which sessions are already exported

**Checkpoint**: Export state visible in UI

---

## Phase 5: Integration & Polish

- [ ] T011 Verify both warnings and status can appear together
  - Session can have both legacy warning and export status
  - Both badges display correctly
  - No visual conflicts

- [ ] T012 Manual testing
  - Test legacy detection with legacy prescriptions
  - Test legacy detection with new prescriptions (no false positives)
  - Test export state updates after export
  - Test UI displays both warnings and status correctly
  - Test timestamp formatting

**Checkpoint**: Feature complete and validated

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Must complete first (database schema)
- **Foundational (Phase 2)**: Depends on Setup, blocks US1 and US2
- **User Story 1 (Phase 3)**: Depends on Foundational
- **User Story 2 (Phase 4)**: Depends on Foundational and feature 004 (export functionality)
- **Integration (Phase 5)**: Depends on all implementation

### Task Dependencies

- **T001**: Must be first (database schema)
- **T002, T003**: Can run in parallel (different services)
- **T004**: Depends on T002 (needs detection helper)
- **T005, T006**: Sequential (UI → styles)
- **T007**: Can be done independently
- **T008-T010**: Sequential (detail → styles → list)
- **T011, T012**: Depends on all implementation

---

## Implementation Strategy

### MVP First

1. Database migration (T001)
2. Backend detection and state update (T002, T003, T004, T007)
3. Frontend warnings (T005, T006)
4. Frontend export status (T008-T010)
5. Integration testing (T011, T012)
6. **STOP and VALIDATE**: Feature complete

---

## Notes

- Legacy detection must be accurate (no false positives/negatives)
- Export state updates atomically with export operation (feature 004)
- UI badges should be clear but not intrusive
- Both warnings and status can appear on same session
