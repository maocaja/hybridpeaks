# Implementation Plan: Send to Garmin Button

**Branch**: `005-send-to-garmin-button` | **Date**: 2025-12-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-send-to-garmin-button/spec.md`

## Summary

Add a "Send to Garmin" button to the Coach Web session detail modal that triggers workout export to Garmin. The button shows appropriate states (enabled, disabled, loading, success, error) and provides clear feedback to coaches. This is a frontend-only feature that calls the existing backend export endpoint.

## Technical Context

**Language/Version**: TypeScript 5.x, React 18.x  
**Primary Dependencies**: React, existing Coach Web components, fetch/axios for API calls  
**Storage**: N/A (frontend only, uses backend API)  
**Testing**: React Testing Library (optional, manual testing sufficient for MVP)  
**Target Platform**: Web browser (Coach Web app)  
**Project Type**: Web application (frontend only)  
**Performance Goals**: Button click response < 100ms, export API call < 3s  
**Constraints**: Must work with existing session modal, must handle all button states  
**Scale/Scope**: Single button component, minimal code changes

## Constitution Check

✅ **Guardrail 21 (No Temporary Workarounds)**: No workarounds - proper React component  
✅ **Guardrail 22 (Strict Type Safety)**: TypeScript with strict types for all states  
✅ **Guardrail 23 (Controllers Must Be Thin)**: N/A - frontend only  
✅ **Guardrail 24 (DTO/Schema Validation)**: N/A - calls validated backend endpoint  
✅ **Guardrail 25 (Migrations Required)**: N/A - no database changes  
✅ **Guardrail 26 (No New Documentation)**: Only code, no new docs

## Project Structure

### Documentation (this feature)

```text
specs/005-send-to-garmin-button/
├── plan.md              # This file
├── spec.md              # Feature specification
└── tasks.md             # Task breakdown (to be created)
```

### Source Code (repository root)

```text
coach-web/
├── src/
│   ├── App.tsx          # Add button to session detail modal
│   └── App.css          # Button styles and states
└── tests/               # Optional tests
```

**Structure Decision**: Minimal changes - add button to existing session modal in App.tsx. No new components needed for MVP.

## Implementation Approach

### Phase 0: Research & Design

**Existing Infrastructure:**
- ✅ Session detail modal exists (Week tab)
- ✅ Backend export endpoint exists (feature 004)
- ✅ Garmin connection status endpoint exists (feature 004)
- ✅ API fetch utility exists

**Design Decisions:**
1. **Button Location**: Session detail modal (where session details are shown)
2. **Button States**: 
   - Enabled (Garmin connected, endurance session)
   - Disabled (no Garmin connection, or non-endurance session)
   - Loading ("Sending...")
   - Success (brief success state, then back to enabled)
   - Error (show error message, button returns to enabled)

3. **State Management**: React useState for button state and error messages
4. **API Call**: Use existing apiFetch utility to call POST `/coach/sessions/:id/export/garmin`
5. **Feedback**: Inline success/error messages below button or as toast

### Phase 1: Implementation

**Files to Modify:**
1. `coach-web/src/App.tsx` - Add button to session modal
2. `coach-web/src/App.css` - Add button styles for all states

**Components:**
- Button component (inline in modal)
- State management (useState hooks)
- API call handler
- Error/success message display

### Phase 2: Validation

- Manual testing with various states
- Test with/without Garmin connection
- Test error cases
- Test success flow

## Complexity Tracking

> **No violations** - Simple UI component following existing patterns.
