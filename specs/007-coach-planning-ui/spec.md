# Feature Specification: Coach Planning UI

**Feature ID**: 007  
**Version**: 1.0  
**Last Updated**: 2026-01-06  
**Status**: Draft

---

## Overview

### Problem Statement

Coaches need an intuitive, efficient interface to create and manage weekly training plans for their athletes. Currently, coaches can create weekly plans via API calls, but there's no user-friendly UI that allows them to:
- Visualize the week in a calendar format
- Select athletes from their roster
- Create strength and endurance sessions with proper forms
- See session previews before saving
- Edit and reorganize sessions easily

Without a proper planning UI, coaches must use API tools or write code to create plans, which is inefficient and error-prone. This creates a barrier to adoption and limits the platform's usability for non-technical coaches.

### User Goals

- **Coaches**: Create complete weekly training plans (6-8 sessions) in under 15 minutes
- **Coaches**: Visualize the week at a glance and see how sessions are distributed
- **Coaches**: Easily add, edit, and delete sessions without technical knowledge
- **Coaches**: Select athletes from their roster with a simple dropdown
- **Coaches**: Use forms that guide them through creating proper prescriptions
- **Platform**: Provide a professional, intuitive interface that coaches enjoy using

### Success Criteria

- Coach can create a weekly plan with 2 strength + 2 endurance sessions in <15 minutes
- Coach can visualize the entire week in a calendar grid format
- Coach can select athlete from dropdown and see their current plan
- Coach can add sessions using guided forms (strength/endurance)
- Coach can edit existing sessions inline
- Coach can delete sessions with confirmation
- Coach can save plan and see success feedback
- Form validation prevents invalid prescriptions
- UI is responsive and works on desktop and tablet
- All API calls use proper error handling and loading states

---

## User Scenarios

### Primary User Flows

**Scenario 1: Coach Creates New Weekly Plan**

1. Coach logs into coach web app
2. Coach navigates to Planning section
3. Coach sees empty calendar grid (Monday-Sunday)
4. Coach selects athlete from dropdown (shows list of athletes in roster)
5. Coach selects week start date (defaults to next Monday)
6. Coach clicks "Add Session" on Monday
7. Coach selects session type (Strength or Endurance)
8. Coach fills out session form:
   - For Strength: Exercise picker, sets/reps, intensity (%1RM/RPE/ABS)
   - For Endurance: Modality, duration, intensity zones
9. Coach clicks "Add Session" to save
10. Session appears in calendar grid
11. Coach repeats for other days
12. Coach clicks "Save Plan" button
13. System validates all sessions
14. Plan is saved and coach sees success message
15. Athlete receives notification (future feature)

**Scenario 2: Coach Edits Existing Plan**

1. Coach selects athlete from dropdown
2. Coach selects week (shows existing plan if it exists)
3. Coach sees calendar grid with existing sessions
4. Coach clicks on a session card
5. Session form opens with current values
6. Coach modifies fields (e.g., changes reps from 8 to 10)
7. Coach clicks "Update Session"
8. Session updates in calendar grid
9. Coach clicks "Save Plan" to persist changes

**Scenario 3: Coach Deletes Session**

1. Coach clicks on session card
2. Coach clicks "Delete" button
3. Confirmation dialog appears: "Delete this session?"
4. Coach confirms deletion
5. Session disappears from calendar grid
6. Coach clicks "Save Plan" to persist deletion

**Scenario 4: Coach Views Week Overview**

1. Coach selects athlete and week
2. Coach sees calendar grid with all sessions
3. Each session shows:
   - Type badge (Strength/Endurance)
   - Title
   - Key details (exercises count for strength, duration for endurance)
   - Color coding by type
4. Coach can see at a glance:
   - How many sessions per day
   - Total sessions for the week
   - Distribution of strength vs endurance

### Edge Cases

- **No athletes in roster**: Show empty state with "Add Athlete" button
- **Week already has plan**: Load existing plan and show sessions
- **Invalid prescription**: Show validation errors inline, prevent save
- **Network error**: Show error message, allow retry
- **Unsaved changes**: Warn coach before navigating away
- **Multiple sessions per day**: Allow multiple sessions, show stacked cards
- **Past week**: Disable editing (read-only mode)
- **Future weeks**: Allow full editing

### Error Scenarios

- **API error on save**: Show error message, keep form data, allow retry
- **Validation error**: Highlight invalid fields, show specific error messages
- **Session conflict**: Show warning if session overlaps with existing
- **Athlete not found**: Show error, allow coach to select different athlete

---

## Functional Requirements

### REQ-1: Weekly Calendar Grid
- Display Monday-Sunday grid layout
- Show date headers for each day
- Display sessions as cards within day cells
- Support multiple sessions per day (stacked or listed)
- Color code by session type (strength = red, endurance = blue)
- Show empty state when no sessions
- Responsive layout (desktop and tablet)

### REQ-2: Athlete Selector
- Dropdown showing all athletes in coach's roster
- Search/filter functionality for large rosters
- Show athlete name and email
- Default to first athlete if available
- Load athlete's existing plan when selected
- Show loading state while fetching plan

### REQ-3: Week Selector
- Date picker for week start date
- Default to next Monday
- Validate that date is a Monday
- Show week range (e.g., "Jan 6 - Jan 12, 2026")
- Navigate to previous/next week
- Load plan for selected week

### REQ-4: Strength Session Form
- Exercise picker (searchable, autocomplete)
- Sets input (number, min 1)
- Reps input (number, min 1)
- Intensity selector (%1RM / RPE / ABS)
- Intensity value input (based on type)
- Title input (optional, defaults to exercise name)
- Rest period input (optional, seconds)
- Tempo input (optional, e.g., "3-0-1-0")
- Add multiple exercises to session
- Remove exercise from session
- Reorder exercises (drag-and-drop optional)

### REQ-5: Endurance Session Form
- Modality selector (BIKE / RUN / SWIM)
- Duration input (minutes or distance)
- Intensity zones selector:
  - Power zones (for BIKE)
  - Heart rate zones (for all)
  - Pace zones (for RUN/SWIM)
- Zone target input (e.g., "Zone 2" or "140-160 bpm")
- Cadence target (optional, for BIKE)
- Title input (optional)
- Steps/repeat blocks builder (advanced, optional for MVP)
- Simple mode: duration + zone (MVP)
- Advanced mode: structured steps (post-MVP)

### REQ-6: Session Card Component
- Display session type badge
- Show session title
- Show key details:
  - Strength: "3 exercises, 12 sets total"
  - Endurance: "60 min, Zone 2"
- Show edit/delete buttons on hover
- Click to open edit form
- Visual feedback on hover/click

### REQ-7: Save Plan Flow
- "Save Plan" button (disabled when no changes)
- Show unsaved changes indicator
- Validate all sessions before save
- Show loading state during save
- Show success message on save
- Show error message on failure
- Refresh calendar after save
- Optimistic updates (optional, nice-to-have)

### REQ-8: Form Validation
- Real-time validation feedback
- Highlight invalid fields
- Show specific error messages
- Prevent save if validation fails
- Validate:
  - Required fields present
  - Numeric ranges valid
  - Exercise exists
  - Week start is Monday
  - No duplicate sessions (optional)

### REQ-9: Session Management
- Add session (opens form modal)
- Edit session (opens form with current values)
- Delete session (with confirmation)
- Duplicate session (optional, nice-to-have)
- Move session to different day (drag-and-drop optional)

### REQ-10: Loading and Error States
- Loading spinner while fetching plan
- Loading state during save
- Error message display
- Retry button on error
- Empty states (no athletes, no plan, no sessions)

---

## Out of Scope (MVP)

- Drag-and-drop session reordering (nice-to-have, can use buttons)
- Advanced endurance step builder (simple duration + zone for MVP)
- Session templates/library (post-MVP)
- Copy plan from previous week (post-MVP)
- Bulk operations (post-MVP)
- Real-time collaboration (post-MVP)
- Mobile app (web only for MVP)
- Offline support (online only for MVP)

---

## Technical Constraints

- Must use existing API endpoints (`POST /weekly-plans`, `PUT /weekly-plans/:id`)
- Must follow existing prescription schemas
- Must validate prescriptions server-side (backend already does this)
- Must handle authentication (JWT tokens)
- Must be responsive (desktop and tablet)
- Must work in modern browsers (Chrome, Firefox, Safari, Edge)

---

## Dependencies

- **Feature 001**: Weekly Plans API (already implemented)
- **Feature 002**: Exercise Catalog API (already implemented)
- **Feature 004**: Athlete Roster API (already implemented)
- Backend endpoints must be functional
- Authentication system must be working

---

## Success Metrics

- **Time to create plan**: <15 minutes for 6-8 sessions
- **Error rate**: <5% of saves fail validation
- **User satisfaction**: Coaches can use UI without training
- **Adoption**: 80% of coaches use UI instead of API directly

---

## Future Enhancements (Post-MVP)

- Session templates and library
- Copy plan from previous week
- Drag-and-drop session reordering
- Advanced endurance step builder
- Bulk session operations
- Plan comparison view
- Mobile app version
- Offline support

---

**Status**: Draft - Ready for review and implementation planning

