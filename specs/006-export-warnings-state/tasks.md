# Tasks: Export Status Display and Endurance Preview (Athlete PWA)

**Input**: Design documents from `/specs/006-export-warnings-state/`
**Prerequisites**: plan.md ✓, spec.md ✓, Feature 005 (Auto-Push) ✓

**Tests**: Manual testing for UI components and status updates.

**Organization**: Single user story - UI display and preview calculation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1 (export status and preview display)

## Path Conventions

- **Web app**: `athlete-pwa/src/`, `backend/src/` (optional)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: No setup needed - extends existing infrastructure

- [x] Athlete PWA "Today" view exists
- [x] Session fetching exists
- [x] API client exists
- [x] Export status fields exist in TrainingSession (Feature 005)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: No foundational work needed - all dependencies exist

- [x] Export status available in session data (Feature 005)
- [x] Endurance prescription format consistent
- [x] React component structure exists

**Checkpoint**: Foundation ready - UI implementation can begin

---

## Phase 3: User Story 1 - Export Status and Preview Display (Priority: P1) 🎯 MVP

**Goal**: Athlete can see export status and workout preview for endurance sessions

**Independent Test**: View ENDURANCE session in "Today", see status badge and preview card

### Implementation for User Story 1

- [x] T001 [US1] Create ExportStatusBadge component in `athlete-pwa/src/App.tsx` (integrated inline)
  - Props: `status` (NOT_CONNECTED | PENDING | SENT | FAILED), `provider` (GARMIN | WAHOO | null), `exportedAt` (Date | null), `error` (string | null)
  - Render badge with appropriate color and icon:
    - NOT_CONNECTED: Gray badge, "Connect to send" text
    - PENDING: Yellow badge, "Sending..." text
    - SENT: Green badge, "Sent to [Provider]" text with timestamp
    - FAILED: Red badge, "Failed" text with error message
  - Show action buttons:
    - NOT_CONNECTED: "Go to Connections" button
    - FAILED: "Retry Send" button
  - Style with CSS (use existing color variables)

- [x] T002 [US1] Create EndurancePreview component in `athlete-pwa/src/App.tsx` (integrated inline, utility extracted to `utils/endurance-preview.ts`)
  - Props: `prescription` (JSON object)
  - Calculate and display:
    - **Objective**: From `prescription.objective` or "Endurance Workout"
    - **Duration**: Calculate from steps (sum of durations), format as "X min" or "X km"
    - **Sport**: From `prescription.sport` (BIKE | RUN | SWIM)
    - **Primary Target**: From first step's `primaryTarget` (format: "Power Zone 3" or "HR 140-160 bpm")
  - Handle edge cases:
    - Missing objective: Show "Endurance Workout"
    - Missing duration: Show "Duration: TBD"
    - Missing targets: Show "Targets: Not specified"
  - Render preview card with styled layout

- [x] T003 [US1] Integrate status badge and preview in "Today" view in `athlete-pwa/src/App.tsx`
  - For ENDURANCE sessions in "Today" view:
    - Render `ExportStatusBadge` above or below session title
    - Render `EndurancePreview` with session prescription
  - Position components appropriately (badge at top, preview below)

- [x] T004 [US1] Implement status polling in `athlete-pwa/src/App.tsx`
  - When session has `exportStatus = PENDING`:
    - Start polling `GET /api/athlete/sessions/:id` every 5-10 seconds
    - Update session state when status changes
    - Stop polling when status is SENT or FAILED
  - Use `useEffect` with interval
  - Clean up interval on unmount

- [x] T005 [US1] Implement action button handlers in `athlete-pwa/src/App.tsx`
  - "Go to Connections" button:
    - Navigate to Profile → Connections (or show connections modal)
    - Can use React Router or state management
  - "Retry Send" button:
    - Call `POST /api/athlete/sessions/:id/retry-export` (if implemented)
    - Or trigger manual export (if endpoint exists)
    - Show loading state during retry
    - Update status after retry

- [x] T006 [US1] Add styles for status badge and preview in `athlete-pwa/src/App.css`
  - Status badge styles:
    - Colors: Gray (NOT_CONNECTED), Yellow (PENDING), Green (SENT), Red (FAILED)
    - Icons: Info, Clock, Check, X
    - Badge shape: Pill or rounded rectangle
  - Preview card styles:
    - Card layout with padding
    - Objective as title
    - Duration, sport, target as details
    - Responsive design (mobile-friendly)

- [x] T007 [P] [US1] Retry export endpoint added in `backend/src/athlete/athlete.controller.ts` (`POST /sessions/:id/retry-export`)
  - `GET /sessions/:id/export-status`: Returns export status for session
  - Only if existing session endpoints don't include status
  - Otherwise, use existing session data

**Checkpoint**: Export status and preview display functional

---

## Phase 4: Polish & Cross-Cutting Concerns

- [x] T008 [P] Manual testing
  - Test status badge display for all statuses
  - Test preview calculation with various prescriptions
  - Test action buttons (navigation, retry)
  - Test status polling and real-time updates
  - Test error handling (network errors, invalid data)
  - Test mobile responsiveness

- [x] T009 [P] Error handling improvements
  - Handle network errors gracefully
  - Show cached status if API unavailable
  - Handle invalid prescription data in preview

- [x] T010 [P] Performance optimization (preview calculation extracted to utility module)
  - Optimize preview calculation (memoization if needed)
  - Reduce polling frequency if needed
  - Lazy load preview component if needed

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: No dependencies - all exists
- **User Story 1 (Phase 3)**: Depends on Feature 005 (export status fields)
- **Polish (Phase 4)**: Depends on User Story 1 completion

### Feature Dependencies

- **Feature 005 (Auto-Push)**: Required - provides export status fields

### Parallel Opportunities

- T001, T002 can run in parallel (different components)
- T003, T004, T005 can run in parallel (different parts of App.tsx)
- T008, T009, T010 can run in parallel (different polish tasks)

---

## Notes

- Status polling should be efficient (don't poll too frequently)
- Preview calculation should handle edge cases gracefully
- Action buttons should be clear and accessible
- Mobile-friendly design is critical (PWA for athletes)
- Status updates should feel real-time (polling every 5-10s is acceptable for MVP)
