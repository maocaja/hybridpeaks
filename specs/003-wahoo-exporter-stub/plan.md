# Implementation Plan: Wahoo Exporter Stub

**Branch**: `003-wahoo-exporter-stub` | **Date**: 2025-12-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-wahoo-exporter-stub/spec.md`

## Summary

Create a WahooExporterStub class that implements the EnduranceExporter interface, following the same pattern as GarminExporterStub. This proves the normalized workout model is platform-agnostic and can be adapted to multiple export formats. The stub accepts NormalizedWorkout and produces a Wahoo-compatible payload structure.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20.x LTS  
**Primary Dependencies**: Existing EnduranceExporter interface, NormalizedWorkout type  
**Storage**: N/A (in-memory transformation only)  
**Testing**: Jest (unit tests)  
**Target Platform**: NestJS backend (shared code)  
**Project Type**: Web application (backend module)  
**Performance Goals**: < 10ms transformation time  
**Constraints**: Must follow Garmin stub patterns, must implement EnduranceExporter interface  
**Scale/Scope**: Single class file, ~50 lines of code, minimal complexity

## Constitution Check

✅ **Guardrail 21 (No Temporary Workarounds)**: No workarounds - straightforward implementation  
✅ **Guardrail 22 (Strict Type Safety)**: Uses existing types, no `any` needed  
✅ **Guardrail 23 (Controllers Must Be Thin)**: N/A - no controllers in this feature  
✅ **Guardrail 24 (DTO/Schema Validation)**: N/A - no API endpoints  
✅ **Guardrail 25 (Migrations Required)**: N/A - no database changes  
✅ **Guardrail 26 (No New Documentation)**: Only code, no new docs

## Project Structure

### Documentation (this feature)

```text
specs/003-wahoo-exporter-stub/
├── plan.md              # This file
├── spec.md              # Feature specification
└── tasks.md             # Task breakdown (to be created)
```

### Source Code (repository root)

```text
backend/
├── src/
│   └── integrations/
│       └── endurance/
│           └── exporters/
│               ├── exporter.ts              # Existing interface
│               ├── garmin-exporter.stub.ts  # Existing reference
│               └── wahoo-exporter.stub.ts   # New file
└── tests/
    └── integrations/
        └── endurance/
            └── exporters/
                └── wahoo-exporter.stub.spec.ts  # New test file
```

**Structure Decision**: Follows exact same pattern as Garmin exporter stub. New file in same directory, test file in corresponding test directory.

## Implementation Approach

### Phase 0: Research & Design

**Existing Infrastructure:**
- ✅ `EnduranceExporter` interface exists in `exporter.ts`
- ✅ `GarminExporterStub` provides reference implementation
- ✅ `NormalizedWorkout` type from `endurance-normalizer.ts`
- ✅ Export pattern established

**Design Decisions:**
1. **File Location**: `backend/src/integrations/endurance/exporters/wahoo-exporter.stub.ts`
   - Same directory as Garmin stub
   - Follows naming convention

2. **Class Structure**: `WahooExporterStub implements EnduranceExporter`
   - Same interface as Garmin
   - Same method signature: `build(workout: NormalizedWorkout): ExportPayload`

3. **Payload Structure**: Different from Garmin to prove platform-specific adaptation
   - Garmin uses: `{ platform, sport, objective, notes, steps: [{ type, duration, targets: { primary, cadence }, note }], exportVersion }`
   - Wahoo should use different field names/organization (e.g., `workoutName` instead of `objective`, `intervals` instead of `steps`)

4. **Field Mapping**: Map all normalized fields to Wahoo structure
   - Sport, objective, notes → Wahoo equivalents
   - Steps → Intervals or similar structure
   - Targets → Wahoo target format

### Phase 1: Implementation

**Files to Create:**

1. **`backend/src/integrations/endurance/exporters/wahoo-exporter.stub.ts`**
   - Import `EnduranceExporter`, `ExportPayload`, `NormalizedWorkout`
   - Create `WahooExporterStub` class
   - Implement `build()` method
   - Map normalized workout to Wahoo payload structure
   - Return ExportPayload

2. **`backend/tests/integrations/endurance/exporters/wahoo-exporter.stub.spec.ts`**
   - Test: `build()` returns Wahoo-formatted payload
   - Test: Handles all step types (WARMUP, WORK, RECOVERY, COOLDOWN)
   - Test: Handles all target types (power, HR, pace)
   - Test: Handles cadence targets (bike)
   - Test: Handles empty steps array
   - Test: Compares structure differs from Garmin (optional)

### Phase 2: Validation

- TypeScript compilation succeeds
- All tests pass
- Code follows same patterns as Garmin stub
- Payload structure differs from Garmin (proves platform-specific)

## Complexity Tracking

> **No violations** - Simple stub implementation following existing pattern.
