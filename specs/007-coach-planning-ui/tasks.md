# Tasks: Coach Planning UI

**Input**: Design documents from `/specs/007-coach-planning-ui/`
**Prerequisites**: plan.md ✓, spec.md ✓, Backend APIs (Features 001-006) ✓

**Tests**: Component tests and integration tests for UI flows.

**Organization**: Single user story - complete planning UI implementation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1 (coach planning UI feature)

## Path Conventions

- **Web app**: `coach-web/src/`

---

## Phase 1: Foundation (Shared Infrastructure)

**Purpose**: Set up project structure, API hooks, and shared components

- [ ] T001 [P] Create feature folder structure in `coach-web/src/features/planning/`
  - Create `components/`, `hooks/`, `api/` subdirectories
  - Create `PlanningScreen.tsx` main component

- [ ] T002 [P] Set up API client hooks in `coach-web/src/shared/hooks/useApi.ts`
  - Create base `useApi` hook with authentication
  - Handle JWT token from localStorage
  - Handle errors and loading states

- [ ] T003 [P] Create useWeeklyPlan hook in `coach-web/src/features/planning/hooks/useWeeklyPlan.ts`
  - `useGetWeeklyPlan(athleteId, weekStart)`: Fetch plan
  - `useCreateWeeklyPlan()`: Create plan mutation
  - `useUpdateWeeklyPlan()`: Update plan mutation
  - Use React Query for caching and refetching

- [ ] T004 [P] Create useAthletes hook in `coach-web/src/features/planning/hooks/useAthletes.ts`
  - `useGetAthletes()`: Fetch coach's athlete roster
  - Use React Query for caching

- [ ] T005 [P] Create useExercises hook in `coach-web/src/features/planning/hooks/useExercises.ts`
  - `useGetExercises(search?)`: Fetch exercises with optional search
  - Use React Query for caching and search debouncing

- [ ] T006 [P] Create shared Button component in `coach-web/src/shared/components/Button.tsx`
  - Variants: primary, secondary, ghost, danger
  - Sizes: small, medium, large
  - Loading state support
  - Disabled state support

- [ ] T007 [P] Create shared Input component in `coach-web/src/shared/components/Input.tsx`
  - Text, number, email input types
  - Error state support
  - Label and placeholder support

- [ ] T008 [P] Create shared Modal component in `coach-web/src/shared/components/Modal.tsx`
  - Overlay backdrop
  - Close button
  - Header, body, footer sections
  - Escape key to close

- [ ] T009 [P] Create shared LoadingSpinner component in `coach-web/src/shared/components/LoadingSpinner.tsx`
  - Spinner animation
  - Size variants

**Checkpoint**: Foundation ready - API hooks and shared components available

---

## Phase 2: Core Components (Blocking Prerequisites)

**Purpose**: Build core UI components (calendar, selectors, session cards)

- [ ] T010 [US1] Build WeeklyCalendar component in `coach-web/src/features/planning/components/WeeklyCalendar.tsx`
  - Display Monday-Sunday grid (7 columns)
  - Show date headers for each day
  - Display sessions as cards in day cells
  - Support multiple sessions per day
  - Color code by session type
  - Empty state when no sessions
  - Responsive layout (stack on mobile)

- [ ] T011 [US1] Build AthleteSelector component in `coach-web/src/features/planning/components/AthleteSelector.tsx`
  - Dropdown showing athletes
  - Search/filter functionality
  - Show athlete name and email
  - Loading state while fetching
  - Empty state when no athletes

- [ ] T012 [US1] Build WeekSelector component in `coach-web/src/features/planning/components/WeekSelector.tsx`
  - Date picker for week start
  - Default to next Monday
  - Validate date is Monday
  - Show week range (e.g., "Jan 6 - Jan 12, 2026")
  - Previous/next week navigation

- [ ] T013 [US1] Build SessionCard component in `coach-web/src/features/planning/components/SessionCard.tsx`
  - Display session type badge (color-coded)
  - Show session title
  - Show key details:
    - Strength: "3 exercises, 12 sets"
    - Endurance: "60 min, Zone 2"
  - Edit/delete buttons on hover
  - Click to open edit form
  - Visual feedback on hover/click

- [ ] T014 [US1] Integrate components into PlanningScreen in `coach-web/src/features/planning/PlanningScreen.tsx`
  - Layout with header (athlete selector, week selector)
  - Calendar grid in main area
  - "Add Session" button
  - Loading state
  - Error state
  - Empty state

**Checkpoint**: Core components built and integrated - UI structure complete

---

## Phase 3: Session Forms (Priority: P1) 🎯 MVP

**Goal**: Build session creation/editing forms

### Strength Session Form

- [ ] T015 [US1] Build StrengthSessionForm component in `coach-web/src/features/planning/components/StrengthSessionForm.tsx`
  - Modal wrapper
  - Exercise picker (searchable dropdown)
  - Sets input (number, min 1)
  - Reps input (number, min 1)
  - Intensity selector (%1RM / RPE / ABS)
  - Intensity value input (based on type)
  - Title input (optional)
  - Rest period input (optional)
  - Tempo input (optional)
  - Add/remove exercise buttons
  - Form validation
  - Submit button

- [ ] T016 [US1] Implement exercise picker with search in StrengthSessionForm
  - Search input with debouncing
  - Filter exercises by name
  - Display exercise list
  - Select exercise
  - Show selected exercise

- [ ] T017 [US1] Implement multiple exercises support in StrengthSessionForm
  - Add exercise button
  - Remove exercise button
  - List of exercises
  - Each exercise has sets/reps/intensity

### Endurance Session Form

- [ ] T018 [US1] Build EnduranceSessionForm component in `coach-web/src/features/planning/components/EnduranceSessionForm.tsx`
  - Modal wrapper
  - Modality selector (BIKE / RUN / SWIM)
  - Duration input (minutes)
  - Intensity zone selector (Power / HR / Pace)
  - Zone target input (zone number or range)
  - Cadence target input (optional, for BIKE)
  - Title input (optional)
  - Form validation
  - Submit button

- [ ] T019 [US1] Implement modality-specific fields in EnduranceSessionForm
  - Show cadence input only for BIKE
  - Show pace zones only for RUN/SWIM
  - Show power zones only for BIKE

**Checkpoint**: Session forms functional - coaches can create sessions

---

## Phase 4: Integration & Save Flow (Priority: P1) 🎯 MVP

**Goal**: Connect all components, implement save flow

- [x] T020 [US1] Connect calendar to API in PlanningScreen ✅
  - Load plan when athlete/week selected
  - Display sessions in calendar
  - Show loading state while fetching
  - Show error state on failure

- [x] T021 [US1] Implement add session flow in PlanningScreen ✅
  - Click "Add Session" opens form modal
  - Select session type (Strength/Endurance)
  - Fill form and submit
  - Add session to local state (optimistic update)
  - Show in calendar grid
  - Handle errors

- [x] T022 [US1] Implement edit session flow in PlanningScreen ✅
  - Click session card opens form modal
  - Load session data into form
  - Modify fields and submit
  - Update session in local state
  - Refresh calendar grid
  - Handle errors

- [x] T023 [US1] Implement delete session flow in PlanningScreen ✅
  - Click delete button on session card
  - Show confirmation dialog
  - Remove session from local state
  - Refresh calendar grid
  - Handle errors

- [x] T024 [US1] Implement save plan flow in PlanningScreen ✅
  - "Save Plan" button (disabled when no changes)
  - Show unsaved changes indicator
  - Validate all sessions before save
  - Show loading state during save
  - Call API to save plan
  - Show success message
  - Show error message on failure
  - Refresh calendar after save

- [x] T025 [US1] Implement form validation in session forms ✅
  - Real-time validation feedback
  - Highlight invalid fields
  - Show specific error messages
  - Prevent submit if validation fails
  - Validate required fields
  - Validate numeric ranges

- [x] T026 [US1] Handle loading states throughout PlanningScreen ✅
  - Loading spinner while fetching plan
  - Loading state during save
  - Disable buttons during operations
  - Show loading indicators

- [x] T027 [US1] Handle error states throughout PlanningScreen ✅
  - Display error messages
  - Retry button on error
  - Clear errors on retry
  - Handle network errors
  - Handle validation errors

- [x] T028 [US1] Handle empty states in PlanningScreen ✅
  - No athletes: Show "Add Athlete" message
  - No plan: Show "Create Plan" message
  - No sessions: Show "Add Session" message

**Checkpoint**: ✅ Full CRUD flow works - coaches can create and manage plans

**Status**: ✅ **COMPLETED** - All tasks done, modals working correctly

---

## Phase 5: Polish & Cross-Cutting Concerns

- [ ] T029 [P] Improve styling and responsiveness
  - Polish calendar grid layout
  - Improve session card styling
  - Ensure responsive on tablet
  - Improve form styling
  - Add hover states
  - Add focus states

- [ ] T030 [P] Add confirmation dialogs
  - Delete session confirmation
  - Unsaved changes warning
  - Use shared Modal component

- [ ] T031 [P] Add success/error messages
  - Toast notifications or inline messages
  - Success: "Plan saved successfully"
  - Error: "Failed to save plan: [error]"
  - Auto-dismiss after 5 seconds

- [ ] T032 [P] Write component tests
  - Test WeeklyCalendar component
  - Test AthleteSelector component
  - Test WeekSelector component
  - Test SessionCard component
  - Test StrengthSessionForm component
  - Test EnduranceSessionForm component

- [ ] T033 [P] Write integration tests
  - Test create plan flow
  - Test edit session flow
  - Test delete session flow
  - Test save plan flow
  - Test error handling

- [ ] T034 [P] Manual testing
  - Test on desktop browsers (Chrome, Firefox, Safari, Edge)
  - Test on tablet
  - Test with slow network
  - Test error scenarios
  - Test edge cases

- [ ] T035 [P] Performance optimization
  - Optimize re-renders (useMemo, useCallback)
  - Debounce search inputs
  - Lazy load components if needed
  - Optimize calendar rendering

- [ ] T036 [P] Documentation updates
  - Update README if needed
  - Document component props
  - Document hooks usage

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundation (Phase 1)**: No dependencies - can start immediately
- **Core Components (Phase 2)**: Depends on Foundation completion
- **Session Forms (Phase 3)**: Depends on Core Components completion
- **Integration (Phase 4)**: Depends on Session Forms completion
- **Polish (Phase 5)**: Depends on Integration completion

### Feature Dependencies

- **Backend APIs**: Required - all endpoints must be functional
- **Authentication**: Required - JWT tokens must work
- **Exercise Catalog**: Required - for exercise picker
- **Athlete Roster**: Required - for athlete selector

### Parallel Opportunities

- T001-T009 can run in parallel (different files)
- T010-T013 can run in parallel (different components)
- T015-T019 can run in parallel (different forms)
- T029-T036 can run in parallel (different polish tasks)

---

## Notes

- Use React Query for all API calls (caching, refetching)
- Follow existing design system (colors, spacing, typography)
- Use TypeScript strictly (no `any` types)
- Validate forms client-side and server-side
- Handle all error scenarios gracefully
- Provide clear loading and error feedback
- Make UI responsive (desktop and tablet)

---

**Total Tasks**: 36  
**Estimated Timeline**: 3 weeks  
**Priority**: P1 (MVP Critical)

