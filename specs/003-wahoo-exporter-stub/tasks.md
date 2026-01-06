# Tasks: Wahoo Exporter Stub

**Input**: Design documents from `/specs/003-wahoo-exporter-stub/`
**Prerequisites**: plan.md ✓, spec.md ✓

**Tests**: Tests are included to ensure exporter works correctly.

**Organization**: Single user story - exporter stub implementation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1 (single user story)

## Path Conventions

- **Web app**: `backend/src/`, `backend/tests/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: No setup needed - feature extends existing infrastructure

- [x] EnduranceExporter interface exists
- [x] Garmin exporter stub exists as reference
- [x] NormalizedWorkout type exists

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: No foundational work needed

- [x] All dependencies exist

**Checkpoint**: Foundation ready - implementation can begin

---

## Phase 3: User Story 1 - Wahoo Exporter Stub (Priority: P1) 🎯 MVP

**Goal**: Create WahooExporterStub that converts NormalizedWorkout to Wahoo payload format

**Independent Test**: WahooExporterStub.build() returns ExportPayload with Wahoo structure

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T001 [P] [US1] Unit test for WahooExporterStub in `backend/tests/integrations/endurance/exporters/wahoo-exporter.stub.spec.ts`
  - Test: `build()` returns ExportPayload
  - Test: Payload includes all workout fields (sport, objective, notes)
  - Test: Payload includes all steps with correct structure
  - Test: Handles steps with primary targets (power, HR, pace)
  - Test: Handles steps with cadence targets (bike)
  - Test: Handles steps with no targets
  - Test: Handles empty steps array
  - Test: Payload structure differs from Garmin format (optional comparison test)

### Implementation for User Story 1

- [ ] T002 [US1] Create WahooExporterStub class in `backend/src/integrations/endurance/exporters/wahoo-exporter.stub.ts`
  - Import `EnduranceExporter`, `ExportPayload` from `./exporter`
  - Import `NormalizedWorkout` from `../endurance-normalizer`
  - Create class implementing `EnduranceExporter` interface
  - Implement `build(workout: NormalizedWorkout): ExportPayload` method
  - Map normalized workout to Wahoo payload structure
  - Use different field names/organization than Garmin (e.g., `workoutName` vs `objective`, `intervals` vs `steps`)
  - Return ExportPayload

- [ ] T003 [US1] Map all normalized fields to Wahoo structure in `backend/src/integrations/endurance/exporters/wahoo-exporter.stub.ts`
  - Map `sport` to Wahoo sport field
  - Map `objective` to Wahoo workout name/description field
  - Map `notes` to Wahoo notes field
  - Map `steps` array to Wahoo intervals/steps structure
  - Map step `type`, `duration`, `primaryTarget`, `cadenceTarget`, `note` to Wahoo format
  - Ensure all fields are included (no data loss)

**Checkpoint**: Exporter stub is functional and all tests pass

---

## Phase 4: Validation & Polish

**Purpose**: Ensure code quality and pattern consistency

- [ ] T004 Verify TypeScript compilation succeeds
- [ ] T005 Verify code follows same patterns as Garmin stub
- [ ] T006 Verify payload structure differs from Garmin (proves platform-specific)
- [ ] T007 Run all tests and ensure 100% pass rate

**Checkpoint**: Feature complete and validated

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Already complete ✓
- **Foundational (Phase 2)**: Already complete ✓
- **User Story 1 (Phase 3)**: Can start immediately
  - Test (T001) should be written first
  - Implementation (T002, T003) follows test
- **Validation (Phase 4)**: Depends on Phase 3 completion

### Task Dependencies

- **T001**: Can be written first (test file)
- **T002**: Depends on T001 (test should fail first)
- **T003**: Part of T002 (same file, field mapping)
- **T004-T007**: Depends on all implementation tasks

### Parallel Opportunities

- T001 can be written independently
- T002 and T003 are in same file (sequential within file)

---

## Implementation Strategy

### MVP First

1. Write test (T001) - ensure it fails
2. Implement exporter stub (T002, T003)
3. Run test - ensure it passes
4. Validation (T004-T007)
5. **STOP and VALIDATE**: Feature complete

---

## Notes

- Simple feature - single class, ~50 lines
- Follows exact pattern of Garmin stub
- Payload structure should differ from Garmin to prove platform-specific adaptation
- No external dependencies or API calls


