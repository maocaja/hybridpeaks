# Implementation Plan: Export Status Display and Endurance Preview (Athlete PWA)

**Branch**: `006-export-status-ui` | **Date**: 2025-01-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-export-warnings-state/spec.md`

## Summary

Display export status and endurance workout preview in Athlete PWA. Athletes can see if their endurance workouts have been sent to their devices (Garmin/Wahoo), view a preview of the workout structure, and take action if export failed or device not connected. Status updates in real-time when exports complete.

**⚠️ MVP Scope Clarification**: This feature shows **export status and workout preview only**. MVP does NOT show how the workout was executed on device, does NOT import activity data, and does NOT provide execution analysis. Athletes execute on device, coaches see adherence via manual logs. Execution analysis (summary + laps) is post-MVP.

## Technical Context

**Language/Version**: TypeScript 5.x, React 18.x  
**Primary Dependencies**: React, Vite, existing Athlete PWA infrastructure  
**Storage**: Read-only from TrainingSession (export status fields from Feature 005)  
**Testing**: Manual testing, component testing (optional)  
**Target Platform**: Progressive Web App (PWA) for athletes  
**Project Type**: Web application (frontend only for this feature)  
**Performance Goals**: < 200ms for status fetch, < 50ms for preview calculation  
**Constraints**: Must work offline (cached status), must update in real-time, must be mobile-friendly  
**Scale/Scope**: Status display for all ENDURANCE sessions, preview calculation client-side or server-side

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

✅ **Guardrail 21 (No Temporary Workarounds)**: Uses standard React patterns, no workarounds  
✅ **Guardrail 22 (Strict Type Safety)**: All components typed with TypeScript  
✅ **Guardrail 23 (Controllers Must Be Thin)**: N/A - frontend only  
✅ **Guardrail 24 (DTO/Schema Validation)**: API responses validated via TypeScript types  
✅ **Guardrail 25 (Migrations Required)**: N/A - frontend only  
✅ **Guardrail 26 (No New Documentation)**: Only updating existing API contracts if needed

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
athlete-pwa/
├── src/
│   ├── App.tsx                              # Add export status display to "Today" view
│   ├── components/
│   │   └── EndurancePreview.tsx             # NEW: Endurance workout preview component
│   └── services/
│       └── api.ts                           # Add GET /sessions/:id/export-status endpoint

backend/
├── src/
│   └── athlete/
│       └── athlete.controller.ts            # Add GET /sessions/:id/export-status endpoint (optional)
```

**Structure Decision**: This feature extends the existing Athlete PWA "Today" view with export status badges and endurance preview cards. Status can be fetched from existing session endpoints or a dedicated status endpoint. Preview calculation can be done client-side or server-side.

## Implementation Approach

### Phase 0: Research & Design

**Existing Infrastructure:**
- ✅ Athlete PWA "Today" view exists
- ✅ Session fetching and display exists
- ✅ API client exists (`apiFetch` function)
- ✅ TrainingSession model has export status fields (Feature 005)

**Design Decisions:**

1. **Status Display**:
   - Badge component showing export status
   - Colors: Gray (NOT_CONNECTED), Yellow (PENDING), Green (SENT), Red (FAILED)
   - Icons: Info, Clock, Check, X
   - Timestamp for SENT status

2. **Preview Card**:
   - Shows: Objective, Estimated Duration, Sport Type, Primary Target
   - Calculated from prescription JSON
   - Client-side calculation for MVP (can move to server later)

3. **Action Buttons**:
   - NOT_CONNECTED: "Go to Connections" button → navigate to Profile → Connections
   - FAILED: "Retry Send" button → call retry endpoint (if implemented)
   - SENT: No action button (read-only)

4. **Status Updates**:
   - Polling: Poll status every 5-10 seconds when PENDING
   - Stop polling when status is SENT or FAILED
   - Real-time updates via WebSocket (future enhancement, not MVP)

5. **API Endpoints**:
   - Option 1: Extend existing session endpoints to include export status
   - Option 2: Add dedicated `GET /api/athlete/sessions/:id/export-status` endpoint
   - MVP: Use existing session endpoints (status already in response from Feature 005)

### Phase 1: Implementation

**Files to Create/Modify:**

1. **Backend (Optional)** (`backend/src/athlete/athlete.controller.ts`)
   - Add `GET /sessions/:id/export-status` endpoint if needed
   - Or extend existing session endpoints to include export status

2. **Frontend - Status Badge** (`athlete-pwa/src/App.tsx` or component)
   - `ExportStatusBadge` component
   - Props: `status`, `provider`, `exportedAt`, `error`
   - Render appropriate badge based on status
   - Show action buttons (Go to Connections, Retry Send)

3. **Frontend - Preview Card** (`athlete-pwa/src/components/EndurancePreview.tsx`)
   - `EndurancePreview` component
   - Props: `prescription` (JSON)
   - Calculate: objective, duration, sport, primary target
   - Render preview card

4. **Frontend - Integration** (`athlete-pwa/src/App.tsx`)
   - In "Today" view, for ENDURANCE sessions:
     - Show `ExportStatusBadge`
     - Show `EndurancePreview`
   - Add status polling when PENDING
   - Handle action button clicks

5. **Frontend - Status Polling** (`athlete-pwa/src/App.tsx`)
   - Poll session status when `exportStatus = PENDING`
   - Poll every 5-10 seconds
   - Stop polling when status changes to SENT or FAILED

### Phase 2: Validation

- Manual testing: View ENDURANCE sessions, verify status badges
- Test preview calculation with various prescriptions
- Test action buttons (Go to Connections, Retry Send)
- Test status polling and real-time updates
- Test error handling (network errors, invalid data)

## Complexity Tracking

> **No violations** - This feature follows existing React patterns and adds minimal complexity.
