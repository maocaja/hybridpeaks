# Feature Specification: Wahoo Exporter Stub

**Feature ID**: 003  
**Version**: 1.0  
**Last Updated**: 2025-12-30  
**Status**: Draft

---

## Overview

### Problem Statement

The platform currently has a Garmin exporter stub that demonstrates the normalized workout structure can be converted to Garmin's format. To validate that the endurance prescription model is truly platform-agnostic and export-ready, we need a second exporter stub (Wahoo) to prove the model works for multiple platforms, not just Garmin.

### User Goals

- **Developers**: Validate that the normalized workout structure can be adapted to different platform formats
- **Product**: Demonstrate platform-agnostic design (support for Garmin AND Wahoo)
- **Future Integration**: Provide foundation for actual Wahoo OAuth integration

### Success Criteria

- Wahoo exporter stub exists and implements the EnduranceExporter interface
- Wahoo exporter accepts the same NormalizedWorkout input as Garmin exporter
- Wahoo exporter produces a payload structure that differs from Garmin (proving platform-specific adaptation)
- Both exporters can be used interchangeably with the same normalized input
- Code follows same patterns as Garmin exporter stub

---

## User Scenarios

### Primary User Flows

**Scenario 1: Developer Tests Wahoo Export Format**

1. Developer has a normalized workout structure
2. Developer instantiates WahooExporterStub
3. Developer calls `build()` with normalized workout
4. Developer receives Wahoo-formatted payload
5. Developer can compare Garmin vs Wahoo formats to see differences

**Scenario 2: Future OAuth Integration Uses Stub**

1. Wahoo OAuth integration is implemented (future feature)
2. Integration uses WahooExporterStub to format workouts
3. Stub provides correct payload structure for Wahoo API

### Edge Cases

- Normalized workout with no steps (should return empty steps array)
- Normalized workout with only warmup/cooldown (no work steps)
- Normalized workout with cadence targets (bike only)
- Normalized workout with pace targets (run/swim)

### Error Scenarios

- Invalid normalized workout structure (should throw type error at compile time, not runtime)
- Missing required fields in normalized workout (handled by TypeScript types)

---

## Functional Requirements

### Must Have (MVP)

- **REQ-1**: WahooExporterStub class implements EnduranceExporter interface
  - Acceptance: Class implements `build(workout: NormalizedWorkout): ExportPayload` method

- **REQ-2**: Wahoo exporter accepts same input as Garmin exporter
  - Acceptance: Both exporters can be called with identical NormalizedWorkout instances

- **REQ-3**: Wahoo exporter produces different payload structure than Garmin
  - Acceptance: Payload structure differs in field names or organization (proves platform-specific adaptation)

- **REQ-4**: Wahoo exporter handles all normalized workout fields
  - Acceptance: Exports sport, steps, objective, notes, and all step-level fields (duration, targets, cadence)

- **REQ-5**: Wahoo exporter follows same code patterns as Garmin stub
  - Acceptance: Similar file structure, naming conventions, and export patterns

### Should Have (Post-MVP)

- Unit tests comparing Garmin vs Wahoo output formats
- Documentation comments explaining Wahoo-specific format choices

### Could Have (Future)

- Actual Wahoo API integration (beyond stub)
- Wahoo-specific validation rules
- Support for Wahoo-specific features not in normalized model

---

## Key Entities

**WahooExporterStub**
- Description: Implementation of EnduranceExporter that converts NormalizedWorkout to Wahoo-compatible payload
- Key attributes:
  - Implements `build()` method
  - Accepts `NormalizedWorkout` input
  - Returns `ExportPayload` (Record<string, unknown>)
- Relationships: Implements EnduranceExporter interface, uses NormalizedWorkout type

**ExportPayload**
- Description: Platform-specific workout representation (structure varies by platform)
- Key attributes: Platform-specific fields organized for target platform API
- Relationships: Returned by all exporter implementations

---

## Non-Functional Requirements

### Performance

- Export operation completes in < 10ms (simple data transformation)
- No external API calls (stub only, no network)

### Usability

- Code is readable and follows existing patterns
- TypeScript types provide compile-time safety

### Reliability

- Handles all valid NormalizedWorkout structures
- Type system prevents invalid inputs

### Security

- No security concerns (stub only, no external calls)
- No user data exposure (internal transformation only)

---

## Assumptions

- Wahoo API structure differs from Garmin (field names, organization)
- Normalized workout structure is sufficient for Wahoo export
- Stub format doesn't need to match exact Wahoo API (just demonstrate structure)
- Future OAuth integration will use this stub as foundation

---

## Dependencies

- **EnduranceExporter Interface**: Depends on existing exporter interface
- **NormalizedWorkout Type**: Depends on normalized workout type from endurance-normalizer
- **Garmin Exporter Stub**: Should follow similar patterns for consistency

---

## Out of Scope

- **Actual Wahoo OAuth Integration**: This is just the stub, not full integration
- **Wahoo API Calls**: No network requests in this feature
- **Wahoo Account Management**: No user authentication or account linking
- **Import from Wahoo**: Only export direction, not import

---

## Open Questions

None - straightforward stub implementation following existing pattern.

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
