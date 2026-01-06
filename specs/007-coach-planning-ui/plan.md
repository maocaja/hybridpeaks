# Implementation Plan: Coach Planning UI

**Branch**: `007-coach-planning-ui` | **Date**: 2026-01-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-coach-planning-ui/spec.md`

## Summary

Build a complete, user-friendly UI for coaches to create and manage weekly training plans. The UI includes a weekly calendar grid, athlete selector, session forms (strength and endurance), and a save flow. Coaches can create complete weekly plans (6-8 sessions) in under 15 minutes without technical knowledge.

**⚠️ MVP Scope Clarification**: This feature focuses on the **UI layer only**. Backend APIs already exist and are functional. The UI must use existing endpoints and follow existing prescription schemas. Advanced features like drag-and-drop, templates, and bulk operations are post-MVP.

## Technical Context

**Language/Version**: TypeScript 5.x, React 18.x  
**Primary Dependencies**: React, Vite, React Query (for data fetching), Form validation library  
**Storage**: No local storage needed (all data from API)  
**Testing**: Vitest + React Testing Library (component tests)  
**Target Platform**: Web application (desktop and tablet)  
**Project Type**: React SPA (coach-web)  
**Performance Goals**: <2s to load plan, <1s to add/edit session, <3s to save plan  
**Constraints**: Must use existing API endpoints, must follow existing prescription schemas, must be responsive  
**Scale/Scope**: Single coach managing multiple athletes, weekly plans with 6-8 sessions typical

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

✅ **Guardrail 21 (No Temporary Workarounds)**: Uses standard React patterns, no workarounds  
✅ **Guardrail 22 (Strict Type Safety)**: All components typed with TypeScript, props interfaces defined  
✅ **Guardrail 23 (Controllers Must Be Thin)**: UI components call API hooks, no business logic in components  
✅ **Guardrail 24 (DTO/Schema Validation)**: Form validation matches backend DTOs  
✅ **Guardrail 25 (Migrations Required)**: No database changes needed (using existing schema)  
✅ **Guardrail 26 (No New Documentation)**: Only using existing API contracts

## Project Structure

### Documentation (this feature)

```text
specs/007-coach-planning-ui/
├── plan.md              # This file
├── spec.md              # Feature specification
└── tasks.md             # Task breakdown (to be created)
```

### Source Code (repository root)

```text
coach-web/
├── src/
│   ├── features/
│   │   └── planning/
│   │       ├── PlanningScreen.tsx          # Main planning screen
│   │       ├── components/
│   │       │   ├── WeeklyCalendar.tsx      # Calendar grid component
│   │       │   ├── AthleteSelector.tsx     # Athlete dropdown
│   │       │   ├── WeekSelector.tsx        # Week date picker
│   │       │   ├── SessionCard.tsx         # Session card component
│   │       │   ├── StrengthSessionForm.tsx # Strength form modal
│   │       │   └── EnduranceSessionForm.tsx # Endurance form modal
│   │       ├── hooks/
│   │       │   ├── useWeeklyPlan.ts        # Fetch/create/update plan
│   │       │   ├── useAthletes.ts          # Fetch athletes list
│   │       │   └── useExercises.ts         # Fetch exercises for picker
│   │       └── api/
│   │           └── planningApi.ts          # API client functions
│   └── shared/
│       ├── components/
│       │   ├── Button.tsx                  # Reusable button
│       │   ├── Input.tsx                   # Reusable input
│       │   ├── Modal.tsx                   # Reusable modal
│       │   └── LoadingSpinner.tsx         # Loading indicator
│       └── hooks/
│           └── useApi.ts                   # API client hook
```

**Structure Decision**: Following feature-based folder structure. Components are organized by feature, with shared components in `shared/`. API calls abstracted into hooks for reusability and testability.

## Implementation Approach

### Phase 0: Research & Design

**Existing Infrastructure:**
- ✅ `POST /api/weekly-plans` endpoint exists and works
- ✅ `PUT /api/weekly-plans/:id` endpoint exists and works
- ✅ `GET /api/weekly-plans/:id` endpoint exists and works
- ✅ `GET /api/coach/athletes` endpoint exists (athlete roster)
- ✅ `GET /api/exercises` endpoint exists (exercise catalog)
- ✅ Prescription schemas are well-defined
- ✅ Authentication system works (JWT tokens)

**UI Patterns to Follow:**
- Use existing design system (colors, spacing, typography)
- Follow mobile-first responsive design
- Use modals for forms (consistent with athlete PWA)
- Show loading states during API calls
- Display error messages clearly
- Use optimistic updates where appropriate

**Design Decisions:**
- Calendar grid: 7 columns (Monday-Sunday), responsive stacking on mobile
- Session cards: Color-coded by type, show key info, click to edit
- Forms: Modal dialogs, step-by-step for complex forms
- Validation: Real-time, inline error messages
- Save flow: Single "Save Plan" button, validate before save

### Phase 1: Foundation (Week 1)

**Goal**: Set up project structure, API hooks, and basic components

**Tasks**:
1. Create feature folder structure
2. Set up API client hooks (useApi, useWeeklyPlan, useAthletes, useExercises)
3. Create shared components (Button, Input, Modal, LoadingSpinner)
4. Set up form validation utilities
5. Create basic PlanningScreen layout

**Deliverables**:
- Feature folder structure created
- API hooks functional
- Shared components ready
- Basic screen layout

### Phase 2: Core Components (Week 1-2)

**Goal**: Build core UI components (calendar, selectors, session cards)

**Tasks**:
1. Build WeeklyCalendar component (grid layout, day cells)
2. Build AthleteSelector component (dropdown with search)
3. Build WeekSelector component (date picker, week navigation)
4. Build SessionCard component (display session info, edit/delete buttons)
5. Integrate components into PlanningScreen

**Deliverables**:
- Calendar grid displays correctly
- Athlete selection works
- Week selection works
- Session cards display (static data first)

### Phase 3: Session Forms (Week 2)

**Goal**: Build session creation/editing forms

**Tasks**:
1. Build StrengthSessionForm component
   - Exercise picker with search
   - Sets/reps inputs
   - Intensity selector and value input
   - Title input
   - Optional fields (rest, tempo)
   - Add multiple exercises
2. Build EnduranceSessionForm component
   - Modality selector
   - Duration input
   - Intensity zone selector
   - Zone target input
   - Title input
   - Simple mode (duration + zone)
3. Add form validation
4. Connect forms to API

**Deliverables**:
- Strength form functional
- Endurance form functional
- Forms validate correctly
- Forms save to API

### Phase 4: Integration & Save Flow (Week 2-3)

**Goal**: Connect all components, implement save flow, handle edge cases

**Tasks**:
1. Connect calendar to API (load existing plan)
2. Implement add session flow (open form, save, update calendar)
3. Implement edit session flow (load form, update, refresh)
4. Implement delete session flow (confirm, remove, refresh)
5. Implement save plan flow (validate, save, show feedback)
6. Handle loading states
7. Handle error states
8. Handle empty states

**Deliverables**:
- Full CRUD flow works
- Save flow works
- Error handling complete
- Loading states complete

### Phase 5: Polish & Testing (Week 3)

**Goal**: Polish UI, add tests, fix bugs

**Tasks**:
1. Improve styling and responsiveness
2. Add loading indicators
3. Add success/error messages
4. Add confirmation dialogs
5. Write component tests
6. Write integration tests
7. Fix bugs and edge cases
8. Performance optimization

**Deliverables**:
- UI polished and responsive
- Tests written and passing
- Bugs fixed
- Performance acceptable

## Technical Decisions

### State Management
- **Local state**: Use React useState for component state
- **Server state**: Use React Query for API data (caching, refetching)
- **Form state**: Use controlled components (no form library for MVP)

### Form Validation
- **Client-side**: Real-time validation using custom validators
- **Server-side**: Backend validates, show errors from API response
- **Validation rules**: Match backend DTO validation exactly

### API Integration
- **React Query**: For data fetching, caching, and refetching
- **Custom hooks**: Abstract API calls into reusable hooks
- **Error handling**: Show user-friendly error messages
- **Loading states**: Show spinners during API calls

### Component Architecture
- **Presentational components**: Display data, handle UI interactions
- **Container components**: Manage state, call hooks, pass props
- **Shared components**: Reusable UI elements
- **Feature components**: Feature-specific components

## Testing Strategy

### Unit Tests
- Test individual components in isolation
- Test form validation logic
- Test API hooks
- Test utility functions

### Integration Tests
- Test full user flows (create plan, edit session, save)
- Test API integration
- Test error handling
- Test loading states

### Manual Testing
- Test on different screen sizes (desktop, tablet)
- Test with different browsers
- Test with slow network (loading states)
- Test error scenarios

## Performance Considerations

- **Lazy loading**: Load components on demand
- **Memoization**: Memoize expensive calculations
- **Debouncing**: Debounce search inputs
- **Optimistic updates**: Update UI before API response (optional)
- **Caching**: Use React Query caching for API data

## Security Considerations

- **Authentication**: All API calls include JWT token
- **Authorization**: Backend validates coach-athlete relationship
- **Input validation**: Validate all inputs client-side and server-side
- **XSS prevention**: Sanitize user inputs before display

## Dependencies

- **React Query**: For data fetching and caching
- **Date library**: For date manipulation (date-fns or dayjs)
- **Form validation**: Custom validators (no library for MVP)

## Risks & Mitigations

### Risk 1: Complex form validation
- **Mitigation**: Start simple, validate against backend DTOs, iterate

### Risk 2: Performance with many sessions
- **Mitigation**: Use React Query caching, optimize renders, lazy load

### Risk 3: API changes breaking UI
- **Mitigation**: Type all API responses, use TypeScript strictly

### Risk 4: Browser compatibility
- **Mitigation**: Test on major browsers, use modern APIs only

## Success Criteria

- ✅ Coach can create weekly plan in <15 minutes
- ✅ All forms validate correctly
- ✅ Save flow works reliably
- ✅ UI is responsive and works on tablet
- ✅ Error handling is clear and helpful
- ✅ Loading states provide good feedback

---

**Status**: Ready for implementation

