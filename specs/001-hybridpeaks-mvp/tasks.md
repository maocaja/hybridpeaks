# Implementation Tasks: HybridPeaks MVP

**Feature**: 001-hybridpeaks-mvp  
**Last Updated**: 2025-12-28  
**Total Tasks**: 94  
**Estimated Timeline**: 12 weeks (6 milestones)

---

## Overview

This document breaks down the HybridPeaks MVP into actionable implementation tasks organized by milestone. Each milestone delivers a working, testable increment of functionality.

### Architecture Updates

**Frontend**:
- **Coach**: Web application (React + TypeScript)
- **Athlete**: Mobile-first Web/PWA (React + TypeScript + PWA features)
- **Shared**: Component library, API client, type definitions

**Key Features**:
- Strength logging: Simple mode (completed + RPE + notes) by default; optional detailed per-set logging
- Endurance workouts: Exportable to Garmin (first-class), Wahoo (export fallback)
- Device import: Deferred to Phase 2

---

## Task Organization

### Legend

- `[P]` = Parallelizable (can be done simultaneously with other [P] tasks)
- `[US#]` = User Story number (from specification)
- `[CRITICAL]` = Blocking task (must complete before milestone ends)

### Task Format

```
- [ ] T### [P] [US#] Description with specific file path
```

---

## Milestone 0.1: Core Infrastructure & Authentication (Week 1-2)

**Goal**: Set up project structure, database, authentication, and deployment pipeline

**Success Criteria**:
- Backend API responds to health check
- Database migrations run successfully
- Coaches and athletes can register and login
- JWT authentication works with refresh tokens
- Staging environment deployed

### Phase 1.1: Project Setup

- [ ] T001 Initialize backend project with NestJS, TypeScript, Prisma, configure tsconfig.json and nest-cli.json in `/backend`
- [ ] T002 [P] Initialize coach web app with React, TypeScript, Vite in `/frontend-coach`
- [ ] T003 [P] Initialize athlete PWA with React, TypeScript, Vite, PWA plugin in `/frontend-athlete`
- [ ] T004 [P] Create shared types package with TypeScript in `/shared-types`
- [ ] T005 Configure Docker Compose with PostgreSQL 15 and Redis 7 services in `/docker-compose.yml`
- [ ] T006 [P] Set up environment configuration with dotenv, create `.env.example` files for all apps
- [ ] T007 [P] Configure ESLint and Prettier for all workspaces in root `/.eslintrc.js` and `/.prettierrc`
- [ ] T008 Create CI/CD pipeline with GitHub Actions for lint, test, build in `/.github/workflows/ci.yml`

### Phase 1.2: Database Schema

- [ ] T009 [CRITICAL] Define Prisma schema for User, Coach, Athlete models in `/backend/prisma/schema.prisma`
- [ ] T010 [CRITICAL] Define Prisma schema for TrainingPlan, TrainingSession models
- [ ] T011 [CRITICAL] Define Prisma schema for WorkoutLog, Exercise, BenchmarkMetric models
- [ ] T012 [CRITICAL] Define Prisma schema for AIWeeklySummary, AuditLog models
- [ ] T013 Create initial database migration with `prisma migrate dev --name init`
- [ ] T014 [P] Create database seed script with sample exercises in `/backend/prisma/seed.ts`
- [ ] T015 [P] Add database indexes for performance-critical queries (today view, weekly summary)

### Phase 1.3: Authentication & Authorization

- [ ] T016 [CRITICAL] [US18] Implement User registration endpoint (POST /auth/register) in `/backend/src/auth/auth.controller.ts`
- [ ] T017 [CRITICAL] [US18] Implement password hashing with Argon2id in `/backend/src/auth/auth.service.ts`
- [ ] T018 [CRITICAL] [US18] Implement login endpoint with JWT generation (POST /auth/login) in `/backend/src/auth/auth.controller.ts`
- [ ] T019 [CRITICAL] [US18] Implement refresh token storage in Redis and rotation logic in `/backend/src/auth/tokens.service.ts`
- [ ] T020 [CRITICAL] [US18] Implement JWT authentication guard with Passport.js in `/backend/src/auth/guards/jwt-auth.guard.ts`
- [ ] T021 [US18] Implement roles guard (coach/athlete) in `/backend/src/auth/guards/roles.guard.ts`
- [ ] T022 [US18] Implement logout endpoint with token revocation in `/backend/src/auth/auth.controller.ts`
- [ ] T023 [P] [US18] Implement rate limiting for login attempts (5 per 5 min) in `/backend/src/common/guards/rate-limit.guard.ts`
- [ ] T024 [P] [US18] Add brute-force protection with Redis counters in `/backend/src/auth/brute-force.service.ts`

### Phase 1.4: Security Hardening

- [ ] T025 Configure Helmet.js security headers in `/backend/src/main.ts`
- [ ] T026 [P] Configure CORS policy for coach and athlete frontends
- [ ] T027 [P] Implement global exception filter with safe error messages in `/backend/src/common/filters/http-exception.filter.ts`
- [ ] T028 [P] Set up audit logging service for sensitive operations in `/backend/src/audit/audit.service.ts`
- [ ] T029 [P] Create secrets validation schema with Joi in `/backend/src/config/configuration.ts`

### Phase 1.5: Frontend Auth Scaffolding

- [ ] T030 [P] [US18] Create API client with Axios, auth interceptors in `/frontend-coach/src/api/client.ts`
- [ ] T031 [P] [US18] Create API client for athlete PWA in `/frontend-athlete/src/api/client.ts`
- [ ] T032 [P] [US18] Create auth store with Zustand in `/frontend-coach/src/stores/authStore.ts`
- [ ] T033 [P] [US18] Create auth store for athlete PWA in `/frontend-athlete/src/stores/authStore.ts`
- [ ] T034 [P] [US18] Build registration form (coach) in `/frontend-coach/src/features/auth/RegisterForm.tsx`
- [ ] T035 [P] [US18] Build registration form (athlete) in `/frontend-athlete/src/features/auth/RegisterForm.tsx`
- [ ] T036 [P] [US18] Build login form (coach) in `/frontend-coach/src/features/auth/LoginForm.tsx`
- [ ] T037 [P] [US18] Build login form (athlete PWA) in `/frontend-athlete/src/features/auth/LoginForm.tsx`
- [ ] T038 [P] [US18] Implement token storage in localStorage with secure flags

### Phase 1.6: Deployment & Health Checks

- [ ] T039 Create Railway deployment config for backend in `/railway.json`
- [ ] T040 [P] Create Railway deployment config for coach frontend
- [ ] T041 [P] Create Railway deployment config for athlete PWA
- [ ] T042 Implement health check endpoint (GET /health) in `/backend/src/health/health.controller.ts`
- [ ] T043 [P] Set up staging environment on Railway with PostgreSQL and Redis add-ons
- [ ] T044 [P] Configure production secrets in Railway dashboard (JWT_SECRET, DATABASE_URL, REDIS_URL)

**Milestone 0.1 Complete**: Authentication system works end-to-end; staging deployed

---

## Milestone 0.2: Coach Planning & Athlete Today View (Week 3-4)

**Goal**: Coaches can create weekly training plans; athletes can view today's training

**Success Criteria**:
- Coach can create a weekly plan with 2 strength + 2 endurance sessions in <15 min
- Athlete opens app and sees today's sessions immediately (<2s)
- Sessions display correctly formatted prescriptions

### Phase 2.1: Exercise Catalog

- [ ] T045 [P] [US2] [US3] Implement Exercise model CRUD endpoints in `/backend/src/exercises/exercises.controller.ts`
- [ ] T046 [P] [US2] [US3] Create system exercise seed data (50+ common exercises) in `/backend/prisma/seeds/exercises.ts`
- [ ] T047 [P] [US2] [US3] Build exercise search/autocomplete endpoint (GET /exercises?search=) in `/backend/src/exercises/exercises.service.ts`
- [ ] T048 [P] Build exercise picker component (coach) in `/frontend-coach/src/features/planning/ExercisePicker.tsx`

### Phase 2.2: Benchmark Metrics

- [ ] T049 [P] [US4] Implement BenchmarkMetric endpoints (GET/POST /athletes/:id/benchmarks) in `/backend/src/benchmarks/benchmarks.controller.ts`
- [ ] T050 [P] [US4] Implement service layer for benchmark CRUD and latest value queries in `/backend/src/benchmarks/benchmarks.service.ts`
- [ ] T051 [P] [US4] Build benchmark input form (coach sets 1RM, FTP, HR zones) in `/frontend-coach/src/features/athletes/BenchmarkForm.tsx`

### Phase 2.3: Training Plan Creation (Coach)

- [ ] T052 [CRITICAL] [US1] Implement TrainingPlan creation endpoint (POST /training-plans) in `/backend/src/training-plans/plans.controller.ts`
- [ ] T053 [CRITICAL] [US1] Implement validation for weekStartDate (must be Monday) and ownership checks in `/backend/src/training-plans/plans.service.ts`
- [ ] T054 [CRITICAL] [US1] Implement TrainingSession creation endpoint (POST /training-plans/:id/sessions) in `/backend/src/training-plans/sessions.controller.ts`
- [ ] T055 [US2] Implement strength prescription schema validation (exercises, sets, reps, %1RM/RPE) in `/backend/src/training-plans/dto/strength-prescription.dto.ts`
- [ ] T056 [US3] Implement endurance prescription schema validation (modality, duration, zones) in `/backend/src/training-plans/dto/endurance-prescription.dto.ts`
- [ ] T057 [US1] Implement GET endpoint for plan details with sessions in `/backend/src/training-plans/plans.controller.ts`
- [ ] T058 [P] [US1] Implement session update/delete endpoints in `/backend/src/training-plans/sessions.controller.ts`

### Phase 2.4: Coach Planning UI

- [ ] T059 [CRITICAL] [US1] Build weekly calendar grid component in `/frontend-coach/src/features/planning/WeeklyCalendar.tsx`
- [ ] T060 [CRITICAL] [US1] Build athlete selector dropdown in `/frontend-coach/src/features/planning/AthleteSelector.tsx`
- [ ] T061 [US2] Build strength session form with exercise picker, sets/reps, intensity in `/frontend-coach/src/features/planning/StrengthSessionForm.tsx`
- [ ] T062 [US3] Build endurance session form with modality, duration, zones in `/frontend-coach/src/features/planning/EnduranceSessionForm.tsx`
- [ ] T063 [US1] Implement session drag-and-drop to reorder or reschedule
- [ ] T064 [P] [US1] Build session preview card component in `/frontend-coach/src/features/planning/SessionCard.tsx`
- [ ] T065 [US1] Implement save plan flow with optimistic updates using React Query

### Phase 2.5: Athlete Today View (PWA)

- [ ] T066 [CRITICAL] [US5] Implement GET /today endpoint returning today's sessions in `/backend/src/today/today.controller.ts`
- [ ] T067 [CRITICAL] [US5] Implement service layer with date filtering and active plan lookup in `/backend/src/today/today.service.ts`
- [ ] T068 [CRITICAL] [US5] Build Today screen component (athlete PWA) in `/frontend-athlete/src/features/today/TodayScreen.tsx`
- [ ] T069 [CRITICAL] [US5] Build session card displaying prescription preview in `/frontend-athlete/src/features/today/SessionCard.tsx`
- [ ] T070 [US5] Add "Start Workout" button that navigates to logging screen
- [ ] T071 [P] [US5] Implement React Query hook for today's sessions with caching in `/frontend-athlete/src/features/today/useTodaySessions.ts`
- [ ] T072 [P] [US5] Add pull-to-refresh for today view

### Phase 2.6: Coach Dashboard

- [ ] T073 [P] [US19] Implement GET /coaches/me/athletes endpoint in `/backend/src/coaches/coaches.controller.ts`
- [ ] T074 [P] [US19] Build athlete roster list in `/frontend-coach/src/features/dashboard/AthleteList.tsx`
- [ ] T075 [P] [US19] Add quick stats (current week adherence) per athlete

**Milestone 0.2 Complete**: Coaches can plan weekly training; athletes see today's sessions

---

## Milestone 0.3: Workout Logging (Offline-Capable) (Week 5-6)

**Goal**: Athletes can log workouts (strength simple mode, endurance) with offline support

**Success Criteria**:
- Athlete logs a strength workout in <2 minutes (simple mode: completed + RPE + notes)
- Athlete logs an endurance workout with duration and HR
- Logging works offline; data syncs automatically when online
- Optional detailed per-set logging available for strength

### Phase 3.1: Workout Logging Backend

- [ ] T076 [CRITICAL] [US6] Implement WorkoutLog creation endpoint (POST /workout-logs) in `/backend/src/workout-logs/logs.controller.ts`
- [ ] T077 [CRITICAL] [US6] [US7] Implement service layer with uniqueness check (sessionId + athleteId) in `/backend/src/workout-logs/logs.service.ts`
- [ ] T078 [US6] Implement strength actual data validation (simple mode + detailed mode) in `/backend/src/workout-logs/dto/strength-actual.dto.ts`
- [ ] T079 [US7] Implement endurance actual data validation in `/backend/src/workout-logs/dto/endurance-actual.dto.ts`
- [ ] T080 [US8] Add RPE and notes fields to workout log DTO
- [ ] T081 [P] [US9] Implement batch sync endpoint (POST /sync/workout-logs) for offline queue in `/backend/src/workout-logs/sync.controller.ts`
- [ ] T082 [P] Implement idempotency using clientId field to prevent duplicate logs

### Phase 3.2: PWA Offline Infrastructure

- [ ] T083 [CRITICAL] [US9] Configure service worker with Workbox for offline caching in `/frontend-athlete/src/serviceWorkerRegistration.ts`
- [ ] T084 [CRITICAL] [US9] Set up IndexedDB for local workout log storage with Dexie.js in `/frontend-athlete/src/db/database.ts`
- [ ] T085 [CRITICAL] [US9] Implement offline sync queue with retry logic in `/frontend-athlete/src/stores/offlineStore.ts`
- [ ] T086 [US9] Add network status detection with online/offline event listeners
- [ ] T087 [P] [US9] Show sync status indicator in UI (pending/synced/error)

### Phase 3.3: Strength Workout Logging (Simple Mode)

- [ ] T088 [CRITICAL] [US6] Build strength logging screen (simple mode) in `/frontend-athlete/src/features/logging/StrengthLoggingScreen.tsx`
- [ ] T089 [CRITICAL] [US6] [US8] Build simple completion form: completed checkbox, overall RPE (1-10), session notes in `/frontend-athlete/src/features/logging/SimpleLogForm.tsx`
- [ ] T090 [US6] Add toggle to switch to detailed mode (per-set logging)
- [ ] T091 [P] [US6] Build detailed per-set logger component (weight, reps, RPE per set) in `/frontend-athlete/src/features/logging/DetailedSetLogger.tsx`
- [ ] T092 [US6] Implement prescription vs actual comparison logic (met/exceeded/missed)
- [ ] T093 [P] [US8] Build RPE picker component (1-10 scale with descriptions)
- [ ] T094 [P] [US8] Build notes textarea with character counter (max 1000 chars)

### Phase 3.4: Endurance Workout Logging

- [ ] T095 [CRITICAL] [US7] Build endurance logging screen in `/frontend-athlete/src/features/logging/EnduranceLoggingScreen.tsx`
- [ ] T096 [CRITICAL] [US7] [US8] Build form: duration, distance (optional), avg HR, avg power (optional), RPE, notes in `/frontend-athlete/src/features/logging/EnduranceLogForm.tsx`
- [ ] T097 [US7] Add modality-specific input fields (run=pace, bike=power/cadence)
- [ ] T098 [P] [US7] Implement prescription vs actual comparison (duration, zones)

### Phase 3.5: Offline Sync Implementation

- [ ] T099 [CRITICAL] [US9] Implement save-to-IndexedDB on workout completion in logging screens
- [ ] T100 [CRITICAL] [US9] Implement background sync trigger on connectivity restored
- [ ] T101 [US9] Implement retry logic for failed sync attempts (max 3 retries, exponential backoff)
- [ ] T102 [P] [US9] Add manual "Retry Sync" button for error state
- [ ] T103 [P] Show synced checkmark on today view for completed sessions

**Milestone 0.3 Complete**: Athletes can log workouts offline; sync works automatically

---

## Milestone 0.4: Progress Visualization & Weekly Summary (Week 7-8)

**Goal**: Athletes and coaches view weekly adherence, volume, and session history

**Success Criteria**:
- Weekly summary shows planned vs executed sessions
- Adherence rate displays within 5 seconds
- Strength volume and endurance volume calculated correctly
- Coach can view athlete weekly summaries

### Phase 4.1: Weekly Summary Backend

- [ ] T104 [CRITICAL] [US10] [US11] [US12] Implement GET /athletes/:id/weekly-summary endpoint in `/backend/src/progress/progress.controller.ts`
- [ ] T105 [CRITICAL] [US12] Implement adherence rate calculation service (completed / planned) in `/backend/src/progress/progress.service.ts`
- [ ] T106 [CRITICAL] [US11] Implement strength volume calculation (sum of sets × reps × load) in `/backend/src/progress/calculations.service.ts`
- [ ] T107 [CRITICAL] [US11] Implement endurance volume calculation (total duration or TSS) in `/backend/src/progress/calculations.service.ts`
- [ ] T108 [US10] Implement session status aggregation (completed, missed, modified)
- [ ] T109 [P] Add database indexes for weekly summary queries (athleteId, completedAt)
- [ ] T110 [P] Implement caching for weekly summaries (Redis, 1 hour TTL)

### Phase 4.2: Athlete Weekly Summary UI

- [ ] T111 [CRITICAL] [US10] Build weekly summary screen (athlete PWA) in `/frontend-athlete/src/features/progress/WeeklySummaryScreen.tsx`
- [ ] T112 [CRITICAL] [US12] Build adherence chart component (progress ring or bar) in `/frontend-athlete/src/features/progress/AdherenceChart.tsx`
- [ ] T113 [US11] Build volume display component (strength kg, endurance min/TSS) in `/frontend-athlete/src/features/progress/VolumeDisplay.tsx`
- [ ] T114 [US10] Build session list with status indicators (completed ✓, missed ✗, modified ~)
- [ ] T115 [P] Add week navigation (previous/next week arrows)

### Phase 4.3: Coach Athlete Progress View

- [ ] T116 [P] [US19] [US20] Implement ownership check for coach accessing athlete data in `/backend/src/common/guards/ownership.guard.ts`
- [ ] T117 [P] Build athlete progress screen (coach web app) in `/frontend-coach/src/features/athletes/AthleteProgressScreen.tsx`
- [ ] T118 [P] Display weekly summary with same components as athlete view
- [ ] T119 [P] Add athlete comparison view (multiple athletes side-by-side)

**Milestone 0.4 Complete**: Weekly summaries work for athletes and coaches

---

## Milestone 0.5: AI Weekly Assistant (Week 9-10)

**Goal**: AI generates weekly summaries with explainable, optional recommendations

**Success Criteria**:
- AI summary generates Sunday evening for athletes with ≥1 logged session
- Summary includes adherence, patterns, suggestions with reasoning
- Disclaimer displayed: "This is training guidance, not medical advice"
- Suggestions are read-only; no auto-apply to plans

### Phase 5.1: AI Service Integration

- [ ] T120 [CRITICAL] [US13] Set up OpenAI API client with GPT-4 model in `/backend/src/ai-assistant/openai.service.ts`
- [ ] T121 [CRITICAL] [US13] Implement weekly summary prompt engineering with structured JSON output in `/backend/src/ai-assistant/prompts/weekly-summary.prompt.ts`
- [ ] T122 [US13] Implement data aggregation service (collect planned/executed, RPE, notes) in `/backend/src/ai-assistant/data-aggregator.service.ts`
- [ ] T123 [US14] Add explainability requirement to prompt (mandatory "reasoning" field for each suggestion)
- [ ] T124 [US16] Add medical advice disclaimer to prompt instructions
- [ ] T125 [P] Implement error handling with retry logic (3 attempts, exponential backoff)
- [ ] T126 [P] Add timeout handling (30 seconds max per AI call)

### Phase 5.2: Background Job Processing

- [ ] T127 [CRITICAL] [US13] Set up BullMQ job queue with Redis connection in `/backend/src/queue/queue.module.ts`
- [ ] T128 [CRITICAL] [US13] Create weekly summary job processor in `/backend/src/ai-assistant/weekly-summary.processor.ts`
- [ ] T129 [US13] Implement cron job (Sunday 9 PM) to trigger summary generation for all active athletes
- [ ] T130 [P] Implement job retry logic and dead-letter queue for failed summaries
- [ ] T131 [P] Add job monitoring dashboard (BullMQ Board) for debugging

### Phase 5.3: AI Summary Storage & Retrieval

- [ ] T132 [US13] Implement POST endpoint to store AI summary in database in `/backend/src/ai-assistant/summaries.controller.ts`
- [ ] T133 [US13] Implement GET /athletes/:id/ai-summary endpoint with weekEndDate query param
- [ ] T134 [US14] Validate AI response structure (adherence, patterns, suggestions with reasoning)
- [ ] T135 [P] [US16] Ensure disclaimer field is always present in stored summary

### Phase 5.4: AI Summary UI (Athlete & Coach)

- [ ] T136 [CRITICAL] [US13] [US14] Build AI insights card component in `/frontend-athlete/src/features/progress/AIInsightsCard.tsx`
- [ ] T137 [US14] Display adherence rate, total volume, fatigue analysis at top
- [ ] T138 [US14] Build patterns list component (bullet points of identified patterns)
- [ ] T139 [CRITICAL] [US14] Build suggestions list with collapsible reasoning in `/frontend-athlete/src/features/progress/SuggestionItem.tsx`
- [ ] T140 [US15] [US17] Ensure suggestions are read-only (no "Apply" button, just informational)
- [ ] T141 [US16] Display disclaimer at bottom of card (fixed text, always visible)
- [ ] T142 [P] Add "loading" and "no summary yet" states
- [ ] T143 [P] Build same AI insights card for coach web app to view athlete summaries

### Phase 5.5: AI Observability (No Sensitive Data)

- [ ] T144 [P] Implement logging for AI service calls (athleteId, weekEndDate, success/failure, latency) in `/backend/src/ai-assistant/ai-logger.service.ts`
- [ ] T145 [P] Add metrics aggregation (success rate, avg latency, token usage)
- [ ] T146 [P] Ensure no PII or workout details are logged (only IDs and metadata)

**Milestone 0.5 Complete**: AI assistant generates weekly summaries with explainability

---

## Milestone 0.6: Garmin Integration & Polish (Week 11-12)

**Goal**: Export endurance workouts to Garmin; security hardening; UX polish

**Success Criteria**:
- Coaches can export planned endurance workouts to Garmin format
- Garmin workouts appear on athlete's device
- Wahoo export as .fit file download (fallback)
- All security headers and rate limiting active
- Accessibility audit passes (WCAG 2.1 AA)

### Phase 6.1: Garmin Workout Export

- [ ] T147 [CRITICAL] Implement Garmin Connect API OAuth2 integration in `/backend/src/integrations/garmin/garmin-auth.service.ts`
- [ ] T148 [CRITICAL] Implement Garmin workout format conversion (endurance sessions → Garmin workout JSON) in `/backend/src/integrations/garmin/workout-converter.service.ts`
- [ ] T149 [CRITICAL] Implement POST endpoint to push workout to Garmin Connect in `/backend/src/integrations/garmin/garmin.controller.ts`
- [ ] T150 Add athlete Garmin account linking flow (coach initiates, athlete authorizes)
- [ ] T151 [P] Build "Export to Garmin" button in coach planning UI
- [ ] T152 [P] Show export status (pending/success/error) per session

### Phase 6.2: Wahoo Export Fallback

- [ ] T153 Implement .fit file generation for endurance workouts in `/backend/src/integrations/wahoo/fit-generator.service.ts`
- [ ] T154 [P] Implement GET endpoint to download .fit file in `/backend/src/integrations/wahoo/wahoo.controller.ts`
- [ ] T155 [P] Add "Download for Wahoo" button in athlete PWA (manual upload to device)

### Phase 6.3: Security Hardening Completion

- [ ] T156 [CRITICAL] Verify all endpoints have authentication guards
- [ ] T157 [CRITICAL] Verify ownership checks in all athlete-scoped endpoints
- [ ] T158 Implement input sanitization for free-text fields (notes, names)
- [ ] T159 [P] Add CSRF token validation for state-changing requests
- [ ] T160 [P] Run OWASP ZAP security scan and fix findings
- [ ] T161 [P] Set up vulnerability scanning in CI (npm audit, Snyk)

### Phase 6.4: UX Polish & Accessibility

- [ ] T162 [P] Implement loading skeletons for all async data fetches
- [ ] T163 [P] Add empty states for lists (no sessions, no athletes)
- [ ] T164 [P] Implement error boundaries in React components
- [ ] T165 [P] Add toast notifications for success/error feedback
- [ ] T166 [CRITICAL] Run accessibility audit with Lighthouse (target WCAG 2.1 AA)
- [ ] T167 [P] Fix color contrast issues (min 4.5:1 for text)
- [ ] T168 [P] Add ARIA labels to interactive elements
- [ ] T169 [P] Ensure keyboard navigation works throughout apps

### Phase 6.5: Performance Optimization

- [ ] T170 [P] Implement code splitting in coach and athlete apps
- [ ] T171 [P] Add React Query caching for frequently accessed data (today, weekly summary)
- [ ] T172 [P] Optimize bundle size (tree shaking, lazy loading)
- [ ] T173 [P] Add service worker precaching for PWA shell
- [ ] T174 [P] Run Lighthouse performance audit (target >90 score)

### Phase 6.6: Documentation & Handoff

- [ ] T175 Update API documentation (OpenAPI spec) with all endpoints
- [ ] T176 [P] Create onboarding tutorial for coach (first-time experience)
- [ ] T177 [P] Create onboarding tutorial for athlete PWA
- [ ] T178 [P] Write deployment runbook (Railway setup, secrets, migrations)
- [ ] T179 [P] Document Garmin integration setup process
- [ ] T180 [P] Create admin guide for monitoring and troubleshooting

**Milestone 0.6 Complete**: MVP ready for production launch

---

## Post-MVP (Deferred to Phase 2)

### Not Included in MVP Tasks

- **Device Import**: Automatic import of executed workouts from Garmin/Wahoo (Phase 2)
- **Wearable Auto-Sync**: Real-time heart rate, power data during workouts (Phase 2)
- **Multi-Week Periodization**: Mesocycle and macrocycle planning views (Phase 2)
- **Historical Trend Charts**: PR tracking, fitness curve analysis (Phase 2)
- **In-App Messaging**: Coach-athlete communication (Phase 2)
- **Team Management**: Group programs, team dashboard (Phase 2)
- **Video Exercise Library**: Technique demonstrations (Phase 2)

---

## Dependency Graph

### Critical Path (Must Complete in Order)

```
M0.1: Auth (T001-T044)
  ↓
M0.2: Planning Backend (T052-T058)
  ↓
M0.2: Planning UI (T059-T065)
  ↓
M0.2: Today View (T066-T072)
  ↓
M0.3: Logging Backend (T076-T082)
  ↓
M0.3: Logging UI (T088-T098)
  ↓
M0.4: Weekly Summary (T104-T115)
  ↓
M0.5: AI Assistant (T120-T143)
  ↓
M0.6: Polish & Launch (T156-T180)
```

### Parallel Work Streams

**Stream A: Coach Planning**
- T045-T048 (Exercise catalog)
- T049-T051 (Benchmarks)
- T059-T065 (Planning UI)

**Stream B: Athlete Today View**
- T066-T072 (Today endpoint + UI)

**Stream C: Offline Infrastructure**
- T083-T087 (PWA setup)

**Stream D: Security**
- T025-T029 (Security hardening)
- T156-T161 (Security completion)

**Stream E: UX Polish**
- T162-T169 (Accessibility + UX)
- T170-T174 (Performance)

---

## Task Estimation Summary

| Milestone | Tasks | Est. Duration | Parallelizable |
|-----------|-------|---------------|----------------|
| 0.1       | 44    | 2 weeks       | 18 tasks [P]   |
| 0.2       | 31    | 2 weeks       | 14 tasks [P]   |
| 0.3       | 28    | 2 weeks       | 9 tasks [P]    |
| 0.4       | 16    | 2 weeks       | 7 tasks [P]    |
| 0.5       | 26    | 2 weeks       | 9 tasks [P]    |
| 0.6       | 35    | 2 weeks       | 22 tasks [P]   |
| **Total** | **180** | **12 weeks** | **79 tasks [P]** |

---

## Implementation Strategy

### MVP-First Approach

**Minimal Viable Milestone (M0.1 + M0.2 + M0.3)**:
- Auth works
- Coach can plan weekly training
- Athlete can view today + log workouts (simple mode)
- **Estimated**: 6 weeks to working prototype

**Full MVP (All Milestones)**:
- Add weekly summaries + AI assistant + Garmin export
- **Estimated**: 12 weeks to production launch

### Team Recommendations

**2-Person Team**:
- Week 1-2: Pair on M0.1 (infrastructure critical)
- Week 3-12: Split Stream A (Coach) and Stream B (Athlete)

**3-Person Team**:
- Person 1: Backend (API, database, AI)
- Person 2: Coach Web App
- Person 3: Athlete PWA

### Quality Gates

**Before each milestone completion**:
1. All [CRITICAL] tasks complete
2. Manual smoke test of user flows
3. No blocking security issues (M0.1, M0.6)
4. Staging deployment successful

---

## Success Metrics Mapping

| Success Criterion | Related Tasks |
|-------------------|---------------|
| Daily execution <10s | T066-T072 (Today view optimization) |
| Logging <2 min | T088-T098 (Simple logging mode) |
| Mobile usability | T083-T087 (PWA), T166-T169 (Accessibility) |
| Coach programming <15 min | T059-T065 (Planning UI) |
| AI utility 70%+ | T136-T143 (AI UI with reasoning) |
| Offline reliability | T083-T103 (Offline sync) |
| User retention | All logging tasks |
| Cross-modal visibility | T104-T115 (Weekly summary) |
| Adherence <5s | T104-T110 (Optimized queries) |
| AI transparency 80%+ | T139 (Reasoning display) |

---

## Notes

- All file paths are relative to project root
- `[P]` tasks can start as soon as their dependencies are met
- `[CRITICAL]` tasks block milestone completion
- `[US#]` maps to specification user stories for traceability
- Each task targets 0.5-2 days of work for a mid-level developer

---

**Ready for implementation!** Start with Milestone 0.1 and proceed sequentially through milestones.

