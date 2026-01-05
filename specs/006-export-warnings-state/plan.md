# Implementation Plan: Export Warnings and State Tracking

**Branch**: `006-export-warnings-state` | **Date**: 2025-12-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-export-warnings-state/spec.md`

## Summary

Add visible warnings for legacy-converted workouts and track export state (exportedToGarminAt) in the database and UI. This includes database migration, backend state updates, and UI indicators. Coaches can see which workouts were auto-converted and which have been exported.

## Technical Context

**Language/Version**: TypeScript 5.x (backend + frontend)  
**Primary Dependencies**: Prisma (migration), NestJS (backend), React (frontend)  
**Storage**: PostgreSQL (TrainingSession.exportedToGarminAt field)  
**Testing**: Jest (backend), manual testing (frontend)  
**Target Platform**: Backend API + Coach Web frontend  
**Project Type**: Web application (full-stack feature)  
**Performance Goals**: Warning detection < 10ms, state update < 100ms  
**Constraints**: Must detect legacy format accurately, state must persist correctly  
**Scale/Scope**: Single field addition, warning detection logic, UI badges

## Constitution Check

✅ **Guardrail 21 (No Temporary Workarounds)**: No workarounds - proper implementation  
✅ **Guardrail 22 (Strict Type Safety)**: All types strictly defined  
✅ **Guardrail 23 (Controllers Must Be Thin)**: Controllers delegate to services  
✅ **Guardrail 24 (DTO/Schema Validation)**: N/A - read-only display feature  
✅ **Guardrail 25 (Migrations Required)**: Prisma migration for new field  
✅ **Guardrail 26 (No New Documentation)**: Only code, no new docs

## Project Structure

### Documentation (this feature)

```text
specs/006-export-warnings-state/
├── plan.md              # This file
├── spec.md              # Feature specification
└── tasks.md             # Task breakdown (to be created)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── prisma/
│   │   └── migrations/          # Migration for exportedToGarminAt
│   ├── weekly-plans/
│   │   └── weekly-plans.service.ts  # Add legacy detection helper
│   └── coach/
│       └── coach.service.ts     # Update export to set exportedToGarminAt
└── tests/

coach-web/
├── src/
│   ├── App.tsx          # Add warning badges and export status
│   └── App.css          # Badge styles
```

**Structure Decision**: Backend adds field and detection logic, frontend displays warnings and status. Minimal changes to existing code.

## Implementation Approach

### Phase 0: Research & Design

**Existing Infrastructure:**
- ✅ TrainingSession model exists
- ✅ Legacy detection already happens in normalization
- ✅ Session detail modal exists (UI)

**Design Decisions:**
1. **Database Field**: `exportedToGarminAt?: Date` on TrainingSession
   - Nullable (not all sessions exported)
   - Updated when export succeeds

2. **Legacy Detection**: Reuse existing normalization logic
   - Detect legacy by checking prescription structure
   - Rule: legacy if `intervals` exists and `steps` does not

3. **Warning Display**: Badge in session detail modal
   - Text: "Auto-converted from legacy format. Please review."
   - Visible before export button

4. **Export Status Display**: Badge or timestamp
   - "Exported to Garmin" with timestamp
   - Show in session list and detail modal

5. **State Update**: Set `exportedToGarminAt` when export succeeds (feature 004)
   - If update fails after successful export, log error and return success

### Phase 1: Database Schema

**Migration**: Add `exportedToGarminAt` field to TrainingSession

### Phase 2: Backend Implementation

**Files to Modify:**
1. `weekly-plans.service.ts` - Add legacy detection helper
2. `coach.service.ts` - Update export method to set exportedToGarminAt
3. Session response DTOs - Include `isLegacy` and `exportedToGarminAt` fields

### Phase 3: Frontend Implementation

**Files to Modify:**
1. `App.tsx` - Add warning badges and export status display
2. `App.css` - Add badge styles

### Phase 4: Validation

- Test legacy detection accuracy
- Test state persistence
- Test UI display of warnings and status

## Complexity Tracking

> **No violations** - Simple feature adding visibility and state tracking.
