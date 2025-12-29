# Technical Implementation Plan: HybridPeaks MVP

**Feature ID**: 001-hybridpeaks-mvp  
**Version**: 1.0  
**Last Updated**: 2025-12-28  
**Status**: Active

---

## Table of Contents

1. [Technology Stack](#technology-stack)
2. [Architecture & Patterns](#architecture--patterns)
3. [Data & Persistence](#data--persistence)
4. [Authentication & Authorization](#authentication--authorization)
5. [Security Hardening Baseline](#security-hardening-baseline)
6. [Offline & Sync Strategy](#offline--sync-strategy)
7. [AI Assistant Architecture](#ai-assistant-architecture)
8. [Delivery Plan](#delivery-plan)
9. [Constitution Check](#constitution-check)

---

## Technology Stack

### Frontend Framework and Language

**Decision**: **React Native with TypeScript**

**Rationale**:
- **Mobile-First Requirement**: React Native provides true native mobile apps for iOS and Android from a single codebase
- **Cross-Platform Efficiency**: 90% code sharing between platforms enables faster MVP delivery and easier maintenance
- **TypeScript Safety**: Type safety reduces bugs, improves maintainability, and provides excellent IDE support
- **Ecosystem Maturity**: Rich component libraries (React Native Paper, React Navigation), robust offline support (Redux Persist, WatermelonDB)
- **Web Potential**: Future web version can leverage React.js with significant code reuse (shared business logic, utilities)

**Trade-offs**:
- ✅ **Pros**: Single team can deliver iOS + Android; faster iteration; strong offline libraries; large talent pool
- ❌ **Cons**: Not quite as performant as fully native Swift/Kotlin; bridge overhead for intensive computations (not a concern for this use case)
- **Alternatives Considered**:
  - **Flutter**: Excellent performance and UI, but smaller ecosystem, less mature offline/sync libraries, Dart language less familiar to most developers
  - **Native (Swift + Kotlin)**: Best performance/UX, but 2x development effort, separate codebases to maintain, overkill for MVP

**Key Libraries**:
- **UI Components**: React Native Paper (Material Design adherence for accessibility)
- **Navigation**: React Navigation v6 (type-safe routing, deep linking support)
- **State Management**: Zustand (lightweight, simple) + React Query (server state management, caching, sync)
- **Offline Storage**: WatermelonDB (SQLite-based, optimized for React Native, supports sync)
- **Forms & Validation**: React Hook Form + Zod (minimal re-renders, type-safe schemas)

---

### Backend Framework and Language

**Decision**: **Node.js with NestJS framework and TypeScript**

**Rationale**:
- **Full-Stack TypeScript**: Shared types between frontend and backend reduces integration errors and improves developer velocity
- **NestJS Architecture**: Built-in support for clean architecture patterns (modules, dependency injection, layering), aligns with "Explicit Over Implicit" principle
- **Async Performance**: Node.js event loop handles concurrent I/O well (multiple athletes logging simultaneously, AI job processing)
- **Ecosystem Fit**: Excellent TypeScript ORM (Prisma), robust validation libraries (class-validator, Zod), mature auth solutions (Passport.js)
- **Developer Familiarity**: Large talent pool; team can work across frontend and backend with minimal context switching

**Trade-offs**:
- ✅ **Pros**: Type sharing with frontend; fast prototyping; excellent tooling; strong async handling; lightweight deployment
- ❌ **Cons**: Single-threaded (mitigated by clustering); less performant for CPU-intensive tasks (AI processing will be delegated to external service)
- **Alternatives Considered**:
  - **Python (FastAPI/Django)**: Better for AI/ML integration, but loses full-stack TypeScript advantage; slower iteration for MVP
  - **Go**: Excellent performance and concurrency, but smaller ecosystem for rapid prototyping; steeper learning curve
  - **Ruby on Rails**: Rapid prototyping, but less modern; declining ecosystem; not ideal for mobile-first APIs

**Key Libraries**:
- **Framework**: NestJS v10 (modular architecture, dependency injection, decorators)
- **ORM**: Prisma (type-safe queries, excellent migrations, schema-first design)
- **Validation**: class-validator + class-transformer (automatic DTO validation)
- **Authentication**: Passport.js (JWT strategy, extensible for future OAuth2)
- **Job Queue**: BullMQ (Redis-based, for AI summary generation, notifications)

---

### Database Choice

**Decision**: **PostgreSQL 15+**

**Rationale**:
- **Relational Model Fit**: Training plans, sessions, logs, and athlete-coach relationships are naturally relational
- **ACID Guarantees**: Strong consistency for training data integrity (immutable workout logs, versioned plans)
- **JSON Support**: JSONB columns for flexible data (exercise parameters, AI summary insights) without sacrificing relational benefits
- **Performance**: Excellent query performance for reporting queries (weekly adherence, volume calculations)
- **Ecosystem**: First-class Prisma support; robust backup/replication; widely deployed (easy hosting)

**Trade-offs**:
- ✅ **Pros**: Strong consistency; flexible (relational + JSON); proven at scale; excellent tooling; easy migrations
- ❌ **Cons**: Slightly more complex than NoSQL for MVP; requires schema migrations (mitigated by Prisma)
- **Alternatives Considered**:
  - **MongoDB**: Flexible schema, but loses relational benefits; eventual consistency risks for training data; less suitable for complex reporting queries
  - **SQLite**: Simple for MVP, but limited scalability; no concurrent writes (not suitable for multi-athlete logging)

**Schema Design Principles**:
- Normalize for data integrity (athletes, coaches, exercises as separate tables)
- Use JSONB for variable structures (exercise parameters differ by type, AI insights vary)
- Index foreign keys, frequently queried fields (athlete_id, coach_id, date ranges)
- Partition workout_logs by date if scale requires (deferred post-MVP)

---

### Supporting Components (Justified for MVP)

**Redis (Optional but Recommended)**

**Decision**: **Include Redis for session storage and job queue**

**Rationale**:
- **Session Management**: Fast session lookups for JWT refresh token storage and revocation
- **Job Queue**: BullMQ requires Redis; needed for async AI summary generation and notification dispatching
- **Minimal Complexity**: Single Redis instance (no clustering needed for MVP); widely available in hosting environments

**Trade-offs**:
- ✅ **Pros**: Offloads session storage from database; enables reliable background jobs; fast in-memory operations
- ❌ **Cons**: Adds operational dependency (mitigated by managed Redis services like Redis Cloud, ElastiCache)
- **Alternative**: Store sessions in PostgreSQL (simpler, but slower; adds load to primary database; no job queue solution)

**Use Cases for MVP**:
1. JWT refresh token storage (with TTL expiration)
2. AI summary job queue (weekly summary generation)
3. Rate limiting counters (login attempts, API throttling)

---

**No Other Supporting Components for MVP**

**Deferred**:
- **CDN**: No static assets, media, or videos in MVP → deferred
- **Message Queue (Kafka, RabbitMQ)**: BullMQ (Redis-based) sufficient for MVP job volume → deferred
- **Object Storage (S3)**: No file uploads in MVP → deferred
- **Search Engine (Elasticsearch)**: No full-text search required → deferred
- **Monitoring/APM (Datadog, New Relic)**: Structured logging + basic metrics sufficient for MVP → deferred

---

## Architecture & Patterns

### Backend Architecture: Clean Architecture (Hexagonal-Light)

**Decision**: **Layered architecture with clear boundaries and dependency inversion**

**Layers**:

```
┌─────────────────────────────────────────────────────────┐
│  API Layer (Controllers, DTOs, Guards)                  │
│  - HTTP request handling, validation, serialization     │
│  - Authentication guards, role checks                   │
│  - No business logic; thin controllers                  │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  Application Layer (Use Cases / Services)               │
│  - Orchestrates domain logic and infrastructure         │
│  - Transaction boundaries, error handling               │
│  - Calls repositories, external services                │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  Domain Layer (Entities, Value Objects, Domain Rules)   │
│  - Pure business logic (no infrastructure dependencies) │
│  - Validation rules, state transitions                  │
│  - Training load calculations, adherence metrics        │
└─────────────────────────────────────────────────────────┘
                        ↑
┌─────────────────────────────────────────────────────────┐
│  Infrastructure Layer (Repositories, External Services) │
│  - Database access (Prisma), Redis, AI service client   │
│  - Implements interfaces defined in domain/application  │
│  - No business logic; pure data access                  │
└─────────────────────────────────────────────────────────┘
```

**Key Principles**:

1. **Dependency Direction**: Outer layers depend on inner layers; domain layer has zero dependencies
2. **Thin Controllers**: Controllers only handle HTTP concerns (parsing, validation, serialization); delegate to services
3. **Business Logic in Domain/Application**: Domain layer contains pure business rules; application layer orchestrates workflows
4. **Repository Pattern**: Abstract database access behind interfaces; enables testing and future data store changes
5. **DTOs for API Boundaries**: Separate DTOs (request/response) from domain entities; use class-validator for automatic validation

**Example Structure**:

```typescript
// API Layer (controllers/training-plan.controller.ts)
@Controller('training-plans')
export class TrainingPlanController {
  constructor(private readonly planService: TrainingPlanService) {}

  @Post()
  @UseGuards(CoachGuard)
  async create(@Body() dto: CreatePlanDto): Promise<PlanResponseDto> {
    return this.planService.createWeeklyPlan(dto);
  }
}

// Application Layer (services/training-plan.service.ts)
export class TrainingPlanService {
  constructor(
    private readonly planRepo: TrainingPlanRepository,
    private readonly athleteRepo: AthleteRepository,
  ) {}

  async createWeeklyPlan(dto: CreatePlanDto): Promise<PlanResponseDto> {
    // 1. Fetch athlete (verify ownership)
    const athlete = await this.athleteRepo.findById(dto.athleteId);
    
    // 2. Create domain entity
    const plan = TrainingPlan.create({ ...dto, athlete });
    
    // 3. Validate domain rules
    plan.validate(); // throws if conflicts
    
    // 4. Persist
    return this.planRepo.save(plan);
  }
}

// Domain Layer (entities/training-plan.entity.ts)
export class TrainingPlan {
  private constructor(/* ... */) {}
  
  static create(props: CreatePlanProps): TrainingPlan {
    const plan = new TrainingPlan(/* ... */);
    plan.validate();
    return plan;
  }
  
  validate(): void {
    // Domain rules: e.g., check for session conflicts
    if (this.hasHighIntensityConflict()) {
      throw new DomainException('Conflicting high-intensity sessions');
    }
  }
}

// Infrastructure Layer (repositories/training-plan.repository.ts)
export class TrainingPlanRepository {
  constructor(private readonly prisma: PrismaService) {}
  
  async save(plan: TrainingPlan): Promise<TrainingPlan> {
    const data = this.toPrismaModel(plan);
    const saved = await this.prisma.trainingPlan.create({ data });
    return this.toDomainEntity(saved);
  }
}
```

**Transaction Handling**:
- Use Prisma's `$transaction` API in service layer (application layer owns transaction boundaries)
- Wrap multi-step operations (e.g., create plan + notify athlete) in transactions
- Unit of Work pattern deferred (adds complexity; Prisma transactions sufficient for MVP)

---

### Frontend Architecture: Feature-Based Modules

**Decision**: **Organize by feature/domain, not by technical layer**

**Structure**:

```
src/
├── features/
│   ├── today/               # Today view (REQ-5)
│   │   ├── screens/
│   │   │   └── TodayScreen.tsx
│   │   ├── components/
│   │   │   ├── SessionCard.tsx
│   │   │   └── StartWorkoutButton.tsx
│   │   ├── hooks/
│   │   │   └── useTodaySessions.ts
│   │   └── api/
│   │       └── todayApi.ts
│   │
│   ├── workout-logging/     # Logging flows (REQ-6, REQ-7)
│   │   ├── screens/
│   │   │   ├── StrengthLoggingScreen.tsx
│   │   │   └── EnduranceLoggingScreen.tsx
│   │   ├── components/
│   │   │   ├── SetLogger.tsx
│   │   │   ├── RPEPicker.tsx
│   │   │   └── NotesInput.tsx
│   │   ├── hooks/
│   │   │   ├── useWorkoutLogger.ts
│   │   │   └── useOfflineSync.ts
│   │   └── api/
│   │       └── workoutLogApi.ts
│   │
│   ├── planning/            # Coach planning (REQ-1, REQ-2, REQ-3)
│   │   ├── screens/
│   │   │   ├── PlanningScreen.tsx
│   │   │   └── SessionEditorScreen.tsx
│   │   ├── components/
│   │   │   ├── WeekCalendar.tsx
│   │   │   ├── StrengthSessionForm.tsx
│   │   │   └── EnduranceSessionForm.tsx
│   │   ├── hooks/
│   │   │   └── usePlanEditor.ts
│   │   └── api/
│   │       └── planningApi.ts
│   │
│   ├── progress/            # Weekly summary, adherence (REQ-10, REQ-11, REQ-12)
│   │   ├── screens/
│   │   │   └── WeeklySummaryScreen.tsx
│   │   ├── components/
│   │   │   ├── AdherenceChart.tsx
│   │   │   ├── VolumeDisplay.tsx
│   │   │   └── AIInsightsCard.tsx
│   │   ├── hooks/
│   │   │   └── useWeeklySummary.ts
│   │   └── api/
│   │       └── progressApi.ts
│   │
│   └── auth/                # Authentication (REQ-18)
│       ├── screens/
│       │   ├── LoginScreen.tsx
│       │   └── RegisterScreen.tsx
│       ├── hooks/
│       │   └── useAuth.ts
│       └── api/
│           └── authApi.ts
│
├── shared/                  # Shared across features
│   ├── components/          # UI library
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   └── LoadingSpinner.tsx
│   ├── hooks/
│   │   ├── useAsync.ts
│   │   └── useDebounce.ts
│   ├── utils/
│   │   ├── date.ts
│   │   ├── validation.ts
│   │   └── calculations.ts
│   ├── api/
│   │   ├── client.ts        # Axios/Fetch wrapper with auth
│   │   └── types.ts         # Shared API types
│   └── store/
│       ├── authStore.ts     # Zustand store for auth state
│       └── offlineStore.ts  # Pending sync queue
│
├── navigation/
│   └── AppNavigator.tsx     # React Navigation setup
│
└── App.tsx                  # Root component, providers
```

**Rationale**:
- **Colocation**: Related code lives together; reduces cognitive load and file hopping
- **Scalability**: Easy to add new features without touching existing structure
- **Testability**: Each feature is independently testable
- **Code Splitting**: Features can be lazy-loaded if needed (future optimization)

**API Client Layer**:

```typescript
// shared/api/client.ts
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { offlineQueue } from '../store/offlineStore';

const apiClient = axios.create({
  baseURL: process.env.API_URL,
  timeout: 10000,
});

// Request interceptor: Add auth token
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: Handle token refresh, offline queueing
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Token expired → refresh
    if (error.response?.status === 401) {
      await refreshToken();
      return apiClient.request(error.config);
    }
    
    // Network error → queue for offline sync
    if (!error.response) {
      offlineQueue.add(error.config);
      throw new OfflineError('Request queued for sync');
    }
    
    throw error;
  }
);
```

**Data Fetching Strategy**:

- **Server State**: Use React Query for API data (automatic caching, background refetch, optimistic updates)
- **Local State**: Use Zustand for auth state, offline queue (lightweight, no boilerplate)
- **Form State**: Use React Hook Form (minimal re-renders, built-in validation)

```typescript
// features/today/hooks/useTodaySessions.ts
import { useQuery } from '@tanstack/react-query';
import { todayApi } from '../api/todayApi';

export function useTodaySessions() {
  return useQuery({
    queryKey: ['today-sessions'],
    queryFn: todayApi.fetchToday,
    staleTime: 60 * 1000, // 1 minute
    cacheTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  });
}
```

**Validation Strategy**:

- **Frontend**: Zod schemas for form validation (type-safe, composable)
- **Backend**: class-validator decorators on DTOs (automatic validation in NestJS)
- **Shared Types**: Generate Zod schemas from Prisma schema or backend DTOs (single source of truth)

```typescript
// Shared validation schema
import { z } from 'zod';

export const createPlanSchema = z.object({
  athleteId: z.string().uuid(),
  weekStartDate: z.string().datetime(),
  sessions: z.array(z.object({
    date: z.string().datetime(),
    type: z.enum(['strength', 'endurance']),
    // ...
  })),
});

export type CreatePlanDto = z.infer<typeof createPlanSchema>;
```

---

## Data & Persistence

### High-Level Data Model

**Core Entities and Relationships**:

```
┌─────────────┐
│   User      │
│─────────────│
│ id          │
│ email       │
│ passwordHash│
│ role        │ ─┐
│ createdAt   │  │
└─────────────┘  │
                 │ (role-based views)
        ┌────────┴─────────┐
        │                  │
┌───────▼──────┐  ┌────────▼──────┐
│   Coach      │  │   Athlete     │
│──────────────│  │───────────────│
│ id (FK)      │  │ id (FK)       │
│ name         │  │ name          │
│              │  │ coachId (FK)  │──┐
└───────┬──────┘  └───────┬───────┘  │
        │                 │          │
        │ creates         │ owns     │
        │                 │          │
        │        ┌────────▼──────────▼─┐
        │        │  TrainingPlan       │
        │        │─────────────────────│
        │        │ id                  │
        │        │ athleteId (FK)      │
        │        │ coachId (FK)        │
        │        │ weekStartDate       │
        │        │ status              │
        │        │ version             │
        │        │ createdAt           │
        │        └──────────┬──────────┘
        │                   │ contains
        │                   │
        │         ┌─────────▼──────────┐
        │         │ TrainingSession    │
        │         │────────────────────│
        │         │ id                 │
        │         │ planId (FK)        │
        │         │ date               │
        │         │ type (enum)        │
        │         │ prescription (JSON)│
        │         │ completionStatus   │
        │         └──────────┬─────────┘
        │                    │ executed as
        │                    │
        │          ┌─────────▼─────────┐
        │          │  WorkoutLog       │
        │          │───────────────────│
        │          │ id                │
        │          │ sessionId (FK)    │
        │          │ athleteId (FK)    │
        │          │ completedAt       │
        │          │ actualData (JSON) │
        │          │ rpe               │
        │          │ notes             │
        │          │ syncStatus        │
        │          └───────────────────┘
        │
        └──────────┐
                   │
         ┌─────────▼─────────┐
         │  Exercise         │
         │───────────────────│
         │ id                │
         │ name              │
         │ category          │
         │ createdBy (FK)    │ (coach-created or system)
         └───────────────────┘

┌───────────────────┐
│ BenchmarkMetric   │
│───────────────────│
│ id                │
│ athleteId (FK)    │
│ metricType (enum) │ (1RM_squat, FTP, HR_zone_2, etc.)
│ value             │
│ unit              │
│ establishedAt     │
└───────────────────┘

┌───────────────────┐
│ AIWeeklySummary   │
│───────────────────│
│ id                │
│ athleteId (FK)    │
│ planId (FK)       │
│ weekEndDate       │
│ adherenceRate     │
│ insights (JSON)   │ (patterns, suggestions, explanations)
│ generatedAt       │
└───────────────────┘
```

**Key Design Decisions**:

1. **User Role Model**: Single `users` table with `role` enum (coach/athlete); separate `coaches` and `athletes` tables for role-specific data (1:1 relationship)
   - **Rationale**: Simplifies authentication; role-specific data is normalized
   - **Trade-off**: Slight complexity vs. denormalization, but enforces clear separation

2. **JSONB for Variable Structures**:
   - `TrainingSession.prescription`: Differs for strength (exercises, sets, reps, %1RM) vs. endurance (modality, zones, duration)
   - `WorkoutLog.actualData`: Mirrors prescription structure with actual values
   - `AIWeeklySummary.insights`: Flexible structure for patterns, suggestions, explanations
   - **Rationale**: Avoids EAV anti-pattern; allows schema evolution without migrations; Prisma/PostgreSQL support JSONB queries
   - **Trade-off**: Less type-safe at DB level (mitigated by Zod validation at application layer)

3. **Immutable Workout Logs**: No `UPDATE` on `workout_logs` after creation; edits create new version with reference
   - **Rationale**: Audit trail; domain principle "Explicit Over Implicit"
   - **Implementation**: `original_log_id` FK for edits (deferred to post-MVP if not needed)

4. **Training Plan Versioning**: `version` field on `training_plans`; updates create new version, old versions marked `archived`
   - **Rationale**: Preserves historical context for AI analysis; allows rollback
   - **Implementation**: Soft delete (status='archived') vs. hard delete

5. **Athlete-Coach Relationship**: `athletes.coach_id` FK (1:many); coaches can have multiple athletes, athletes have one coach
   - **MVP Constraint**: Single coach per athlete; multi-coach support deferred

---

### Migrations Strategy

**Tool**: **Prisma Migrate**

**Workflow**:

1. **Development**: `prisma migrate dev` → generates and applies migration, updates Prisma Client
2. **Staging/Production**: `prisma migrate deploy` → applies pending migrations only (no schema drift detection)
3. **Schema First**: Define schema in `prisma/schema.prisma`, generate migrations, review SQL before applying

**Best Practices**:
- Never edit migrations manually in production (use `prisma migrate resolve` for failures)
- Always test migrations against production-like dataset in staging
- Use `@@index` directives in schema for frequently queried fields
- Include rollback SQL in migration comments (Prisma doesn't auto-generate down migrations)

**Example Migration**:

```prisma
// prisma/schema.prisma
model TrainingSession {
  id            String   @id @default(uuid())
  planId        String
  plan          TrainingPlan @relation(fields: [planId], references: [id])
  date          DateTime
  type          SessionType
  prescription  Json
  
  @@index([planId, date])
  @@index([date]) // for daily queries (REQ-5: today view)
}
```

**Generated Migration**:

```sql
-- CreateTable
CREATE TABLE "training_sessions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "plan_id" UUID NOT NULL,
  "date" TIMESTAMP NOT NULL,
  "type" TEXT NOT NULL,
  "prescription" JSONB NOT NULL,
  CONSTRAINT "fk_plan" FOREIGN KEY ("plan_id") REFERENCES "training_plans"("id")
);

-- CreateIndex
CREATE INDEX "idx_session_plan_date" ON "training_sessions"("plan_id", "date");
CREATE INDEX "idx_session_date" ON "training_sessions"("date");
```

---

### Query Strategy

**Preference**: **Prisma ORM with type-safe queries**

**Rationale**:
- **Type Safety**: Prisma Client generates types from schema; compile-time query validation
- **Developer Experience**: Autocomplete, inline documentation, zero boilerplate
- **Migration Management**: Schema-first workflow with automatic migrations
- **Performance**: Prisma optimizes queries; supports eager/lazy loading, batching

**Example Queries**:

```typescript
// Simple query with relations
const today = await prisma.trainingSession.findMany({
  where: {
    plan: { athleteId: athleteId },
    date: {
      gte: startOfDay(new Date()),
      lt: endOfDay(new Date()),
    },
  },
  include: {
    workoutLog: true, // eager load logs
  },
});

// Aggregation for weekly volume
const volume = await prisma.workoutLog.aggregate({
  where: {
    athleteId: athleteId,
    completedAt: {
      gte: weekStart,
      lt: weekEnd,
    },
  },
  _sum: {
    totalVolume: true, // calculated field in domain logic, stored for querying
  },
});
```

**When to Use Raw SQL**:
- Complex reporting queries with multiple joins and aggregations (e.g., cross-modal volume analysis)
- Performance-critical queries where Prisma's generated SQL is suboptimal (measure first)
- Use Prisma's `$queryRaw` with tagged templates for type safety

```typescript
// Complex reporting query (only if Prisma query builder is insufficient)
const adherence = await prisma.$queryRaw<AdherenceResult[]>`
  SELECT 
    athlete_id,
    COUNT(DISTINCT ts.id) as planned_sessions,
    COUNT(DISTINCT wl.id) as completed_sessions,
    (COUNT(DISTINCT wl.id)::float / NULLIF(COUNT(DISTINCT ts.id), 0)) * 100 as adherence_rate
  FROM training_sessions ts
  LEFT JOIN workout_logs wl ON wl.session_id = ts.id
  WHERE ts.date >= ${weekStart} AND ts.date < ${weekEnd}
  GROUP BY athlete_id
`;
```

---

### Performance Considerations for Reporting

**Challenge**: Weekly adherence and volume calculations must return in <5 seconds (Success Criterion #9)

**Strategies**:

1. **Materialized Views** (Deferred to Post-MVP):
   - Create `weekly_summaries` table updated via trigger or cron
   - Precompute adherence, volume for fast lookups
   - **Trade-off**: Adds complexity; likely not needed for MVP user volumes

2. **Indexed Queries**:
   - Index on `workout_logs.completed_at`, `training_sessions.date`, `athlete_id`
   - Prisma generates indexes from `@@index` directives
   - Measure query times in staging with realistic data volume

3. **Caching**:
   - Cache weekly summaries in Redis (TTL: 1 hour)
   - Invalidate on new workout log
   - **Trade-off**: Slightly stale data (acceptable for weekly view)

4. **Pagination**:
   - Coach dashboard: Load athlete summaries lazily (infinite scroll or pagination)
   - **Trade-off**: Slightly slower UX, but avoids loading all athletes upfront

**MVP Approach**: **Indexed queries + optional Redis caching**. Defer materialized views until performance testing reveals need.

---

## Authentication & Authorization

### Authentication Approach

**Decision**: **JWT-based authentication with refresh tokens**

**Rationale**:
- **Stateless**: JWTs enable horizontal scaling (no session affinity required)
- **Mobile-Friendly**: Tokens stored locally; no cookies (avoids CSRF complexity)
- **Refresh Tokens**: Short-lived access tokens (15 min) + long-lived refresh tokens (7 days) balance security and UX
- **Future-Proof**: Easy to extend with OAuth2 for third-party login (Google, Apple) post-MVP

**Trade-offs**:
- ✅ **Pros**: Scalable, mobile-friendly, widely understood, extensible
- ❌ **Cons**: Token revocation requires server-side state (refresh tokens in Redis); slightly more complex than session-based
- **Alternatives Considered**:
  - **Session-Based (Cookies)**: Simpler for MVP, but requires sticky sessions or shared session store; CSRF protection needed; less mobile-friendly
  - **Magic Links (Passwordless)**: Excellent UX, but requires email delivery infrastructure; deferred to post-MVP

**Flow**:

```
1. User submits email + password
2. Backend validates credentials
3. Backend generates:
   - Access token (JWT, exp: 15 min, payload: userId, role)
   - Refresh token (random string, exp: 7 days, stored in Redis)
4. Backend returns both tokens
5. Mobile app stores tokens in secure storage (Keychain/Keystore)
6. Subsequent requests include access token in `Authorization: Bearer <token>`
7. When access token expires (401), app uses refresh token to get new access token
8. Refresh token rotates on use (new refresh token issued)
```

**Token Payload (Access Token)**:

```json
{
  "sub": "user-uuid",
  "email": "athlete@example.com",
  "role": "athlete",
  "iat": 1735000000,
  "exp": 1735000900
}
```

**Refresh Token Storage (Redis)**:

```
Key: `refresh_token:{token_id}`
Value: { userId, tokenFamily, issuedAt }
TTL: 7 days
```

---

### Session/Token Strategy

**Access Token**:
- **Lifetime**: 15 minutes
- **Storage**: Mobile app secure storage (React Native Keychain)
- **Revocation**: Not revocable (short expiry mitigates risk)

**Refresh Token**:
- **Lifetime**: 7 days
- **Storage**: Redis (server-side) + mobile app secure storage (client-side)
- **Rotation**: On each use, issue new refresh token and invalidate old one
- **Revocation**: Delete from Redis (logout, suspicious activity)

**Token Rotation Strategy** (Mitigates Refresh Token Theft):

```typescript
async refreshAccessToken(oldRefreshToken: string): Promise<Tokens> {
  // 1. Validate refresh token exists in Redis
  const tokenData = await redis.get(`refresh_token:${oldRefreshToken}`);
  if (!tokenData) throw new UnauthorizedException('Invalid refresh token');
  
  // 2. Generate new access token
  const accessToken = this.jwtService.sign({ sub: tokenData.userId, role: tokenData.role });
  
  // 3. Generate new refresh token
  const newRefreshToken = generateRandomToken();
  
  // 4. Store new refresh token in Redis
  await redis.set(`refresh_token:${newRefreshToken}`, tokenData, 'EX', 7 * 24 * 60 * 60);
  
  // 5. Delete old refresh token (single-use)
  await redis.del(`refresh_token:${oldRefreshToken}`);
  
  return { accessToken, refreshToken: newRefreshToken };
}
```

---

### Authorization Model

**Roles**: `coach`, `athlete`

**RBAC Rules**:

| Action                     | Athlete | Coach |
|----------------------------|---------|-------|
| View own training plan     | ✅       | ✅     |
| Log workout                | ✅       | ❌     |
| View own workout logs      | ✅       | ✅     |
| Create training plan       | ❌       | ✅     |
| Edit training plan         | ❌       | ✅     |
| View athlete progress      | ❌       | ✅     |
| View AI summary (own)      | ✅       | ✅     |
| View AI summary (athlete)  | ❌       | ✅     |

**Ownership Checks**:
- **Athletes**: Can only access their own data (`athleteId === token.sub`)
- **Coaches**: Can only access data for athletes they coach (`athlete.coachId === token.sub`)

**Implementation** (NestJS Guards):

```typescript
// guards/roles.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.includes(user.role);
  }
}

// Usage in controller
@Post('training-plans')
@Roles('coach')
@UseGuards(JwtAuthGuard, RolesGuard)
async createPlan(@Body() dto: CreatePlanDto) { /* ... */ }
```

**Ownership Check** (Service Layer):

```typescript
// services/training-plan.service.ts
async getAthleteWeek(athleteId: string, userId: string, userRole: string): Promise<Plan> {
  // Verify ownership
  if (userRole === 'athlete' && athleteId !== userId) {
    throw new ForbiddenException('Cannot access another athlete\'s plan');
  }
  
  if (userRole === 'coach') {
    const athlete = await this.athleteRepo.findById(athleteId);
    if (athlete.coachId !== userId) {
      throw new ForbiddenException('Cannot access athlete not assigned to you');
    }
  }
  
  return this.planRepo.findCurrentWeek(athleteId);
}
```

---

### Audit Logging

**Scope**: Log sensitive operations for security and compliance

**Events to Log**:
- User authentication (login, logout, failed attempts)
- Training plan creation/updates (coach edits athlete plans)
- Role changes (if admin role added post-MVP)
- Data exports (if GDPR export requested)

**Storage**: PostgreSQL `audit_logs` table

```prisma
model AuditLog {
  id         String   @id @default(uuid())
  userId     String
  action     String   // 'login', 'create_plan', 'update_plan'
  entityType String?  // 'training_plan', 'athlete'
  entityId   String?
  metadata   Json?    // Additional context (IP, user agent)
  createdAt  DateTime @default(now())
  
  @@index([userId, createdAt])
  @@index([entityType, entityId])
}
```

**Implementation**:

```typescript
// Decorator for automatic audit logging
export function AuditLog(action: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      const result = await originalMethod.apply(this, args);
      // Log after success
      await this.auditService.log({ action, userId: this.currentUser.id, /* ... */ });
      return result;
    };
  };
}

// Usage
@AuditLog('create_plan')
async createPlan(dto: CreatePlanDto) { /* ... */ }
```

---

## Security Hardening Baseline

### Password Hashing Policy

**Decision**: **Argon2id**

**Rationale**:
- **OWASP Recommendation**: Argon2 is the winner of the Password Hashing Competition (2015)
- **Resistance**: Defends against GPU/ASIC attacks (memory-hard), side-channel attacks
- **Parameters**: Configurable time/memory cost for future-proofing

**Configuration**:

```typescript
import * as argon2 from 'argon2';

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,  // 64 MB
    timeCost: 3,
    parallelism: 4,
  });
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password);
}
```

**Trade-offs**:
- ✅ **Pros**: State-of-the-art security, future-proof, tunable parameters
- ❌ **Cons**: Slightly slower than bcrypt (acceptable for login/register operations)
- **Alternative**: bcrypt (simpler, widely deployed, but less resistant to modern attacks)

---

### Input Validation and Output Encoding

**Input Validation**:

1. **All API Endpoints**: Automatic validation via class-validator DTOs in NestJS
2. **Schema Validation**: Zod schemas at API boundary for complex nested objects
3. **Type Coercion**: Strictly enforce types (no implicit string-to-number conversion)
4. **Whitelist Approach**: Reject unknown properties in request bodies

```typescript
// DTO with validation
import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;
  
  @IsString()
  @MinLength(12)
  password: string;
  
  @IsEnum(UserRole)
  role: UserRole;
}
```

**Output Encoding**:

1. **JSON Responses**: Automatic escaping by JSON.stringify (XSS-safe)
2. **JSONB Data**: Sanitize user-generated content (notes, AI explanations) before rendering in frontend
3. **Frontend Rendering**: React Native Text components auto-escape; use caution with `dangerouslySetInnerHTML` (avoid in MVP)

**SQL Injection Prevention**:

- **Prisma ORM**: Parameterized queries by default (SQL injection impossible)
- **Raw Queries**: Use Prisma's tagged templates (`$queryRaw`) for automatic escaping

---

### Rate Limiting, Brute-Force Protection, Lockouts

**Rate Limiting** (Throttling):

- **Global**: 100 requests/minute per IP (prevents DDoS)
- **Authentication Endpoints**: 5 login attempts/5 minutes per IP + per email
- **API Endpoints**: 1000 requests/hour per authenticated user

**Implementation** (NestJS + Redis):

```typescript
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from 'nestjs-throttler-storage-redis';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      storage: new ThrottlerStorageRedisService(redisClient),
      ttl: 60,
      limit: 100,
    }),
  ],
})
```

**Brute-Force Protection** (Login):

```typescript
// After 5 failed login attempts, lock account for 15 minutes
async login(email: string, password: string) {
  const attempts = await redis.get(`login_attempts:${email}`);
  if (attempts >= 5) {
    throw new TooManyRequestsException('Account temporarily locked. Try again in 15 minutes.');
  }
  
  const user = await this.userRepo.findByEmail(email);
  const valid = await verifyPassword(user.passwordHash, password);
  
  if (!valid) {
    await redis.incr(`login_attempts:${email}`);
    await redis.expire(`login_attempts:${email}`, 15 * 60);
    throw new UnauthorizedException('Invalid credentials');
  }
  
  // Success: Clear attempts
  await redis.del(`login_attempts:${email}`);
  return this.generateTokens(user);
}
```

---

### CORS Policy, CSP, Security Headers

**CORS Policy**:

```typescript
// main.ts
app.enableCors({
  origin: [
    'https://app.hybridpeaks.com',    // Production web app
    'hybridpeaks://*',                 // Mobile deep links
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
```

**Security Headers** (Helmet.js):

```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // React Native styles
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://api.hybridpeaks.com'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
}));
```

---

### CSRF Strategy

**Decision**: **Not applicable for JWT-based mobile API**

**Rationale**:
- CSRF attacks require cookies with automatic inclusion in cross-origin requests
- JWTs are manually attached to requests (`Authorization` header) → no automatic inclusion → no CSRF risk
- **If cookies used** (e.g., future web app with session cookies): Implement CSRF tokens (SameSite=Strict cookies + CSRF token validation)

---

### Secure Error Handling

**Principle**: **Fail visibly (per constitution), but do not leak secrets**

**Implementation**:

1. **User-Facing Errors**: Generic messages for security failures
   - ❌ Bad: "User 'athlete@example.com' not found"
   - ✅ Good: "Invalid credentials"

2. **Logging**: Detailed errors logged server-side for debugging
   - Include stack traces, request context in logs
   - **Never log**: Passwords, tokens, PII

3. **HTTP Status Codes**: Use standard codes (401, 403, 404, 500)
   - 401: Authentication failed (invalid token, expired session)
   - 403: Authorization failed (insufficient permissions)
   - 404: Resource not found (do not reveal if resource exists for unauthorized users)
   - 500: Internal error (generic message, details in logs)

**Example**:

```typescript
// Exception filter for global error handling
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    
    // Log detailed error server-side
    logger.error('Request failed', {
      error: exception,
      stack: exception.stack,
      url: request.url,
      method: request.method,
      userId: request.user?.id,
    });
    
    // Return generic error to client
    const status = exception.status || 500;
    response.status(status).json({
      statusCode: status,
      message: status === 500 ? 'Internal server error' : exception.message,
      timestamp: new Date().toISOString(),
    });
  }
}
```

---

### Secrets Management

**Policy**: **No hardcoded secrets; environment-based configuration**

**Implementation**:

1. **`.env` Files**: Development secrets in `.env` (excluded from git via `.gitignore`)
2. **Environment Variables**: Production secrets injected via hosting platform (Railway, Render, AWS Secrets Manager)
3. **Secrets Rotation**: JWT secret rotated quarterly; database credentials rotated annually

**`.env.example`** (committed to repo):

```bash
# Application
NODE_ENV=development
PORT=3000
API_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/hybridpeaks

# JWT
JWT_SECRET=<generate-with-openssl-rand-base64-32>
JWT_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d

# Redis
REDIS_URL=redis://localhost:6379

# AI Service
AI_SERVICE_URL=https://api.openai.com
AI_API_KEY=<secret>
```

**Loading Secrets** (NestJS):

```typescript
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV}`,
      validationSchema: Joi.object({
        DATABASE_URL: Joi.string().required(),
        JWT_SECRET: Joi.string().min(32).required(),
        // Validate all required secrets at startup
      }),
    }),
  ],
})
```

---

### Dependency Management and Vulnerability Scanning

**Tools**:

1. **npm audit**: Run on every CI build; fail build on high/critical vulnerabilities
2. **Dependabot** (GitHub): Automated PRs for dependency updates
3. **Snyk**: Continuous monitoring for vulnerabilities in dependencies

**Policy**:

- **Critical vulnerabilities**: Patch within 24 hours
- **High vulnerabilities**: Patch within 7 days
- **Low/Medium vulnerabilities**: Patch in next release cycle

**CI Integration**:

```yaml
# .github/workflows/security.yml
name: Security Audit
on: [push, pull_request]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm audit --audit-level=high
      - run: npx snyk test --severity-threshold=high
```

---

### Basic Threat Model (OWASP Top 10)

**Top Risks and Mitigations**:

1. **Broken Access Control**
   - **Risk**: Athlete accesses another athlete's data; coach accesses unassigned athlete
   - **Mitigation**: Ownership checks in every service method; RBAC guards on controllers

2. **Cryptographic Failures**
   - **Risk**: Passwords stored in plaintext; tokens transmitted over HTTP
   - **Mitigation**: Argon2 password hashing; HTTPS/TLS enforced; tokens in secure storage

3. **Injection**
   - **Risk**: SQL injection in raw queries
   - **Mitigation**: Prisma ORM (parameterized queries); input validation; no `eval()` or dynamic code execution

4. **Insecure Design**
   - **Risk**: AI assistant provides medical advice; training data lost during offline sync
   - **Mitigation**: AI disclaimer on every output; offline queue with automatic retry

5. **Security Misconfiguration**
   - **Risk**: Exposed debug endpoints; default credentials
   - **Mitigation**: Helmet.js security headers; no debug endpoints in production; secrets rotated

6. **Vulnerable and Outdated Components**
   - **Risk**: Unpatched dependencies with known exploits
   - **Mitigation**: npm audit + Snyk in CI; Dependabot auto-updates

7. **Identification and Authentication Failures**
   - **Risk**: Weak passwords; session hijacking
   - **Mitigation**: Password strength validation (min 12 chars); JWT expiry + refresh token rotation

8. **Software and Data Integrity Failures**
   - **Risk**: Tampered workout logs; unsigned deployments
   - **Mitigation**: Immutable logs; audit trail; signed Docker images (post-MVP)

9. **Security Logging and Monitoring Failures**
   - **Risk**: Undetected breaches; no incident response
   - **Mitigation**: Audit logs for sensitive operations; structured logging; alerting on anomalies (post-MVP)

10. **Server-Side Request Forgery (SSRF)**
    - **Risk**: AI service URL manipulation
    - **Mitigation**: Whitelist AI service domain; no user-supplied URLs in backend requests

---

## Offline & Sync Strategy

### What Works Offline

**MVP Offline Capabilities**:

1. **View Today's Training** (REQ-5):
   - Last-fetched training plan cached locally (WatermelonDB)
   - Stale data indicator if cache >24 hours old

2. **Log Workouts** (REQ-6, REQ-7, REQ-9):
   - Full workout logging (strength + endurance) with local storage
   - Logs queued for sync when online

3. **View Weekly Summary** (REQ-10):
   - Cached previous week's summary
   - "Calculating..." state for current week if offline

**Not Available Offline**:
- Creating new training plans (coach-only, requires server)
- AI weekly summary generation (requires backend processing)
- Real-time updates (e.g., coach modifies plan while athlete offline)

---

### Sync Strategy

**Architecture**:

```
┌────────────────────────┐
│  Mobile App            │
│  ┌──────────────────┐  │
│  │ UI Layer         │  │
│  └────────┬─────────┘  │
│           │             │
│  ┌────────▼─────────┐  │
│  │ WatermelonDB     │  │  Local SQLite database
│  │ (Local Cache)    │  │  - training_sessions
│  └────────┬─────────┘  │  - workout_logs (pending sync)
│           │             │
│  ┌────────▼─────────┐  │
│  │ Sync Queue       │  │  Pending writes
│  │ (Zustand Store)  │  │  - POST /workout-logs
│  └────────┬─────────┘  │  - PUT /sessions/:id
│           │             │
└───────────┼─────────────┘
            │
            │ (when online)
            │
┌───────────▼─────────────┐
│  Backend API            │
│  ┌──────────────────┐   │
│  │ Sync Endpoint    │   │  POST /sync/workout-logs (batch)
│  │ /sync/*          │   │  Idempotent processing
│  └────────┬─────────┘   │
│           │              │
│  ┌────────▼─────────┐   │
│  │ PostgreSQL       │   │
│  └──────────────────┘   │
└─────────────────────────┘
```

**Sync Triggers**:

1. **On Connectivity Restored**: App detects network available → sync queue processes
2. **On App Foreground**: App returns from background → check for pending sync
3. **Manual Sync**: User pulls to refresh (optional, not required by spec)

**Sync Implementation** (React Native):

```typescript
// hooks/useOfflineSync.ts
import NetInfo from '@react-native-community/netinfo';
import { useEffect } from 'react';
import { useSyncQueue } from '../store/syncQueue';

export function useOfflineSync() {
  const { queue, syncAll } = useSyncQueue();
  
  useEffect(() => {
    // Listen for connectivity changes
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected && queue.length > 0) {
        syncAll(); // Process pending requests
      }
    });
    
    return unsubscribe;
  }, [queue, syncAll]);
}

// store/syncQueue.ts
import create from 'zustand';
import { persist } from 'zustand/middleware';

interface SyncItem {
  id: string;
  method: 'POST' | 'PUT' | 'DELETE';
  url: string;
  data: any;
  retries: number;
  timestamp: number;
}

export const useSyncQueue = create(
  persist(
    (set, get) => ({
      queue: [] as SyncItem[],
      
      add: (item: Omit<SyncItem, 'id' | 'retries' | 'timestamp'>) => {
        set((state) => ({
          queue: [...state.queue, {
            ...item,
            id: generateId(),
            retries: 0,
            timestamp: Date.now(),
          }],
        }));
      },
      
      syncAll: async () => {
        const { queue } = get();
        for (const item of queue) {
          try {
            await apiClient.request({
              method: item.method,
              url: item.url,
              data: item.data,
            });
            // Success: Remove from queue
            set((state) => ({
              queue: state.queue.filter((i) => i.id !== item.id),
            }));
          } catch (error) {
            // Retry logic
            if (item.retries < 3) {
              set((state) => ({
                queue: state.queue.map((i) =>
                  i.id === item.id ? { ...i, retries: i.retries + 1 } : i
                ),
              }));
            } else {
              // Max retries: Log error, remove from queue
              logger.error('Sync failed after 3 retries', { item, error });
              set((state) => ({
                queue: state.queue.filter((i) => i.id !== item.id),
              }));
            }
          }
        }
      },
    }),
    { name: 'sync-queue' } // Persists to AsyncStorage
  )
);
```

---

### Conflict Handling Approach

**MVP Strategy**: **Last-Write-Wins (Simple, Predictable)**

**Rationale**:
- Conflicts are rare in MVP (athletes log offline, coaches plan online; minimal overlap)
- Complex CRDTs or operational transforms are overkill for MVP
- Athletes own their workout logs; coaches own training plans (low conflict risk)

**Conflict Scenarios and Resolutions**:

1. **Athlete Logs Workout Offline, Coach Modifies Session Online**:
   - **Resolution**: Athlete's log wins (actual data takes precedence over prescription)
   - **Implementation**: Workout log references session by ID; session edits do not invalidate existing logs

2. **Athlete Logs Same Workout Twice (Duplicate)**:
   - **Resolution**: Backend deduplication by `session_id + athlete_id + completed_at` (idempotency key)
   - **Implementation**: Unique constraint on `(session_id, athlete_id)`; second attempt returns existing log

3. **Multiple Devices Log Same Workout**:
   - **Resolution**: First sync wins; second sync returns 409 Conflict with existing log ID
   - **Implementation**: App merges conflict (keeps synced log, discards local duplicate)

**Post-MVP Enhancements** (Deferred):
- Versioning with conflict resolution UI (show both versions, let user choose)
- Operational transforms for collaborative editing (if multi-coach support added)

---

### Explicit Limitations (Avoided Complexity)

**Not Implementing for MVP**:

1. **Conflict-Free Replicated Data Types (CRDTs)**: Overkill for single-athlete, single-coach model
2. **Real-Time Sync (WebSockets)**: Polling + background sync sufficient; real-time updates deferred
3. **Partial Sync**: Full sync of training week on connectivity restore (acceptable data volume)
4. **Differential Sync**: No delta updates; full payload sync (simpler implementation)

**Trade-offs**:
- ✅ **Pros**: Simpler implementation; fewer edge cases; faster MVP delivery
- ❌ **Cons**: Slightly higher bandwidth usage (mitigated by small payload size); potential data overwrites (rare)

---

## AI Assistant Architecture

### Inputs

**Data Sources**:

1. **Planned Training** (from `training_plans`, `training_sessions`):
   - Weekly session count, type (strength/endurance), prescribed intensity (%1RM, zones)

2. **Executed Training** (from `workout_logs`):
   - Completed sessions, actual loads/durations, RPE, completion status (met/exceeded/missed)

3. **Athlete Benchmarks** (from `benchmark_metrics`):
   - 1RM values, FTP, HR zones (context for intensity analysis)

4. **Perceived Fatigue** (from `workout_logs.rpe`, `workout_logs.notes`):
   - Session-level RPE (1-10), free-text notes

5. **Historical Context** (previous weeks):
   - Prior adherence trends, volume progression (optional for MVP; enhances insights)

**Input Format** (API Request to AI Service):

```json
{
  "athleteId": "uuid",
  "weekEndDate": "2025-12-28",
  "plannedSessions": [
    {
      "date": "2025-12-22",
      "type": "strength",
      "exercises": ["Squat", "Bench Press"],
      "prescribedIntensity": "75% 1RM"
    },
    { /* ... */ }
  ],
  "executedSessions": [
    {
      "date": "2025-12-22",
      "type": "strength",
      "actualLoads": { "Squat": "100kg x 5 x 5", "Bench Press": "80kg x 5 x 5" },
      "rpe": 9,
      "notes": "Felt very fatigued"
    },
    { /* ... */ }
  ],
  "benchmarks": {
    "squatOneRM": 140,
    "ftp": 250
  },
  "previousWeekAdherence": 0.85
}
```

---

### Processing

**When/Where It Runs**:

- **Timing**: Sunday evening (end of training week), triggered by cron job
- **Execution**: Async job (BullMQ queue) to avoid blocking API requests
- **Retries**: Up to 3 attempts with exponential backoff (1m, 5m, 15m delays)
- **Timeout**: 30 seconds per AI service call (fail gracefully if exceeded)

**AI Service Integration**:

**Decision**: **OpenAI GPT-4 (or similar LLM) for MVP**

**Rationale**:
- **Speed to Market**: Avoid training custom model; leverage pre-trained LLM
- **Explainability**: LLMs can generate human-readable explanations
- **Flexibility**: Prompt engineering allows rapid iteration on insights
- **Cost**: Pay-per-use pricing (acceptable for MVP; optimize later)

**Trade-offs**:
- ✅ **Pros**: Fast MVP delivery; excellent text generation; no ML expertise required
- ❌ **Cons**: External dependency; API costs; limited customization (mitigated by prompt tuning)
- **Alternatives**: Custom ML model (too slow for MVP), rule-based system (less flexible)

**Prompt Engineering** (Structured Output):

```typescript
const prompt = `
You are an AI training assistant for hybrid athletes (strength + endurance).

Analyze the following week's training data and provide:
1. Adherence rate (percentage of planned sessions completed)
2. Total training volume (strength: sets x reps x load; endurance: duration)
3. Perceived fatigue trends (average RPE, patterns)
4. Identified patterns (e.g., "3 of 4 strength sessions RPE 9+")
5. Actionable suggestions (e.g., "reduce intensity", "add rest day")

For each suggestion, provide:
- The suggestion (1 sentence)
- Reasoning (2-3 sentences explaining WHY based on data)

Data:
${JSON.stringify(inputData)}

Output format (JSON):
{
  "adherenceRate": 0.85,
  "totalVolume": { "strength": "1500kg", "endurance": "300min" },
  "fatigueAnalysis": "Average RPE was 8.5, indicating high perceived effort.",
  "patterns": ["3 of 4 strength sessions logged RPE 9+", "Missed 2 endurance sessions"],
  "suggestions": [
    {
      "suggestion": "Reduce intensity in next week's lower body sessions",
      "reasoning": "Consistently high RPE (9+) in strength sessions suggests insufficient recovery. Lowering intensity will allow adaptation while maintaining volume."
    }
  ]
}
`;

const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'system', content: prompt }],
  temperature: 0.3, // Low temperature for consistent, factual output
  response_format: { type: 'json_object' },
});

const aiSummary = JSON.parse(response.choices[0].message.content);
```

**Processing Flow**:

1. **Cron Job** triggers at Sunday 9:00 PM (week end)
2. **Job Processor** fetches athletes with active plans for the week
3. For each athlete:
   - Aggregate planned vs. executed sessions
   - Calculate adherence, volume, RPE trends
   - Send to AI service (OpenAI API)
   - Parse JSON response
   - Store in `ai_weekly_summaries` table
4. **Notification** (optional): Push notification to athlete + coach (post-MVP)

---

### Outputs

**Weekly Summary Format**:

```json
{
  "id": "uuid",
  "athleteId": "uuid",
  "weekEndDate": "2025-12-28",
  "adherenceRate": 0.75,
  "totalVolume": {
    "strength": "1200kg",
    "endurance": "240min"
  },
  "fatigueAnalysis": "Average RPE was 8.2, slightly above optimal training range.",
  "patterns": [
    "Completed 6 of 8 planned sessions",
    "Missed both endurance sessions on Thursday and Saturday",
    "Strength sessions consistently logged RPE 8-9"
  ],
  "suggestions": [
    {
      "suggestion": "Add a rest day mid-week to improve recovery",
      "reasoning": "High RPE in strength sessions indicates accumulated fatigue. An additional rest day between Tuesday and Thursday sessions will enhance recovery and maintain training quality."
    },
    {
      "suggestion": "Prioritize endurance sessions early in the week",
      "reasoning": "Both missed sessions occurred late in the week when fatigue was likely highest. Scheduling endurance work earlier (Monday/Tuesday) may improve adherence."
    }
  ],
  "disclaimer": "This is training guidance, not medical advice. Consult a healthcare professional for injury or health concerns.",
  "generatedAt": "2025-12-28T21:05:00Z"
}
```

**UI Display** (Mobile App):

- Card view with summary metrics (adherence, volume)
- Expandable sections for patterns and suggestions
- Each suggestion shows reasoning inline (collapsible for brevity)
- Disclaimer at bottom of card (per REQ-16)

---

### Guardrails

**1. User Control** (REQ-15, REQ-17):
- Summaries are read-only; never auto-apply changes to training plans
- Athletes and coaches can dismiss or ignore suggestions without consequence
- No modal dialogs or blocking UI; summaries appear in "Progress" tab

**2. Explainability** (REQ-14):
- Every suggestion includes "reasoning" field (mandatory in prompt)
- Frontend displays reasoning by default (not hidden behind "Learn More" link)

**3. Non-Medical Advice** (REQ-16):
- Disclaimer appended to every AI-generated summary (backend enforces)
- No language suggesting diagnosis, treatment, or medical recommendations
- Prompt instructs LLM to avoid medical terminology

**4. Graceful Failure** (REQ-15):
- If AI service fails, display: "Weekly summary is being generated and will appear shortly"
- Retry job automatically (up to 3 attempts)
- If all retries fail, log error and skip (do not block app functionality)

**5. Privacy** (Observability):
- Do not log full AI inputs/outputs (contains PII: names, notes)
- Log only: `{ athleteId, weekEndDate, success: true/false, latency: 2.3s }`
- Aggregate metrics: AI call success rate, average latency

---

### Observability

**Metrics to Track**:

1. **AI Service Performance**:
   - Call success rate (%)
   - Average latency (seconds)
   - Timeout rate (%)

2. **User Engagement**:
   - Weekly summaries viewed (% of generated summaries)
   - Suggestions dismissed vs. acknowledged (optional feedback button)
   - Average time spent on summary screen

3. **Business Metrics**:
   - Percentage of athletes receiving summaries (need ≥1 week of logs)
   - Coach engagement with athlete summaries

**Implementation**:

```typescript
// Log AI service call
logger.info('AI summary generated', {
  athleteId,
  weekEndDate,
  success: true,
  latency: 2300, // ms
  suggestionsCount: 2,
});

// Aggregate in analytics dashboard (post-MVP: Grafana, Datadog)
metrics.increment('ai.summary.generated');
metrics.timing('ai.summary.latency', latency);
```

**No Sensitive Content in Logs**:
- ❌ Do not log: athlete names, workout notes, AI suggestions text
- ✅ Log only: IDs, timestamps, success/failure, latency

---

## Delivery Plan

### Milestones

**Milestone 0.1: Authentication & Core Infrastructure** (Week 1-2)

**Goals**:
- Users can register, login, and authenticate
- Backend API scaffolding with database connections
- Mobile app navigation structure

**Deliverables**:
1. Backend: User registration, login, JWT auth (REQ-18)
2. Database: Prisma schema with users, coaches, athletes tables
3. Mobile: React Native project setup, navigation, auth screens
4. Infrastructure: PostgreSQL + Redis deployed (staging environment)

**Acceptance**:
- Coach and athlete can register and login
- Access token expires after 15 minutes; refresh token works
- Mobile app stores tokens securely (Keychain)

---

**Milestone 0.2: Coach Planning & Athlete Today View** (Week 3-4)

**Goals**:
- Coaches can create weekly training plans
- Athletes can view today's training

**Deliverables**:
1. Backend: Training plan CRUD, session CRUD (REQ-1, REQ-2, REQ-3)
2. Database: `training_plans`, `training_sessions`, `exercises`, `benchmark_metrics` tables
3. Mobile (Coach): Weekly calendar, session editor forms
4. Mobile (Athlete): Today screen with session cards (REQ-5)

**Acceptance**:
- Coach creates a weekly plan with 2 strength + 2 endurance sessions
- Athlete opens app and sees today's sessions immediately (<2s)

---

**Milestone 0.3: Workout Logging (Offline-Capable)** (Week 5-6)

**Goals**:
- Athletes can log strength and endurance workouts
- Logging works offline with automatic sync

**Deliverables**:
1. Backend: Workout log CRUD, sync endpoint (REQ-6, REQ-7, REQ-8)
2. Database: `workout_logs` table
3. Mobile: Strength logging screen, endurance logging screen, offline queue
4. Mobile: WatermelonDB integration for local storage (REQ-9)

**Acceptance**:
- Athlete logs a strength workout (5 exercises, 3 sets each) in <2 minutes
- Athlete logs workout offline; data syncs automatically when connectivity restored
- Workout log includes RPE and notes (optional fields)

---

**Milestone 0.4: Progress Visualization & Weekly Summary** (Week 7-8)

**Goals**:
- Athletes and coaches can view weekly summaries
- Basic adherence and volume calculations

**Deliverables**:
1. Backend: Weekly summary queries (REQ-10, REQ-11, REQ-12)
2. Mobile: Weekly summary screen, adherence chart, volume display
3. Database: Indexed queries for reporting performance

**Acceptance**:
- Athlete views weekly summary showing 6/8 sessions completed (75% adherence)
- Summary displays total strength volume (1500kg) and endurance volume (240min)
- Summary loads in <5 seconds

---

**Milestone 0.5: AI Weekly Assistant** (Week 9-10)

**Goals**:
- AI assistant generates weekly summaries with suggestions
- Summaries are explainable and dismissible

**Deliverables**:
1. Backend: AI service integration (OpenAI API), job queue (BullMQ) (REQ-13, REQ-14)
2. Database: `ai_weekly_summaries` table
3. Backend: Cron job to trigger weekly summary generation
4. Mobile: AI insights card in weekly summary screen (REQ-15, REQ-16, REQ-17)

**Acceptance**:
- AI summary generates Sunday evening for athletes with ≥1 logged session
- Summary includes adherence, patterns, suggestions with reasoning
- Disclaimer displayed: "This is training guidance, not medical advice"
- Suggestions are read-only; no auto-apply to plans

---

**Milestone 0.6: Security Hardening & Polish** (Week 11-12)

**Goals**:
- Production-ready security baseline
- UX polish and bug fixes

**Deliverables**:
1. Backend: Rate limiting, brute-force protection, audit logging
2. Backend: Security headers (Helmet.js), CORS policy, error handling
3. Mobile: Loading states, error messages, accessibility audit (WCAG 2.1 AA)
4. Testing: Integration test suite, security audit

**Acceptance**:
- Login rate limiting works (5 attempts/5 min)
- Invalid credentials show generic error (no email enumeration)
- Mobile app passes accessibility audit (contrast, touch targets, screen readers)
- All security headers present in HTTP responses

---

### Testing Strategy

**Unit Tests**:

- **Backend**: Jest for service layer, domain logic (business rules, calculations)
  - Example: Test adherence calculation, volume aggregation, training plan validation
  - Target: 70%+ coverage for services and domain logic

- **Frontend**: Jest + React Native Testing Library for components, hooks
  - Example: Test workout logging form, RPE picker, today view data fetching
  - Target: 60%+ coverage for feature modules

**Integration Tests**:

- **Backend**: Supertest for API endpoints (E2E request/response)
  - Example: Test full auth flow (register → login → refresh token), plan creation, workout logging
  - Target: All critical user flows covered (6 primary scenarios from spec)

- **Frontend**: Detox for E2E mobile testing (optional for MVP, deferred if time-constrained)
  - Example: Test full workout logging flow on iOS/Android simulators
  - Target: Smoke tests for critical flows (login, today view, log workout)

**Contract Tests** (Optional, Recommended):

- **Pact**: Consumer-driven contracts between mobile app and backend API
  - Example: Mobile app defines expected response format for `GET /today`; backend validates against contract
  - Benefit: Catches API breaking changes before deployment

**Security Testing**:

- **OWASP ZAP**: Automated vulnerability scan (SQL injection, XSS, security headers)
- **Manual Penetration Testing**: Optional for MVP; deferred to pre-production

**Performance Testing**:

- **Load Testing**: Apache JMeter or k6 to validate success criteria
  - Example: Simulate 100 concurrent users logging workouts; measure API response times
  - Target: Today view <2s, logging <200ms, weekly summary <5s

---

### Deployment Approach

**Hosting Platform**: **Railway or Render (PaaS)**

**Rationale**:
- **Simplicity**: Zero DevOps overhead; automatic SSL, scaling, deployments
- **Cost**: Free tier for MVP; pay-as-you-grow pricing
- **Speed**: Deploys from GitHub in minutes
- **PostgreSQL + Redis**: Managed add-ons (no manual setup)

**Trade-offs**:
- ✅ **Pros**: Fast MVP deployment; no Kubernetes complexity; automatic HTTPS
- ❌ **Cons**: Less control vs. AWS/GCP; vendor lock-in (mitigated by Docker containers)
- **Alternative**: AWS (ECS + RDS + ElastiCache) → overkill for MVP; complex setup

**Deployment Flow**:

```
1. Developer pushes to `main` branch
2. GitHub Actions runs:
   - Lint, type-check, test (unit + integration)
   - Security audit (npm audit, Snyk)
   - Build Docker image
3. If all checks pass, deploy to staging (Railway)
4. Run smoke tests against staging API
5. Manual approval gate for production
6. Deploy to production (Railway)
7. Run health checks (POST /health returns 200)
```

**Environments**:

- **Development**: Local (`localhost:3000`)
- **Staging**: `https://api-staging.hybridpeaks.com` (automatic deploys from `develop` branch)
- **Production**: `https://api.hybridpeaks.com` (manual deploys from `main` branch)

**Rollback Strategy**:

- Railway supports one-click rollback to previous deployment
- Keep last 5 deployments available for instant rollback
- Database migrations are forward-only (no automatic rollback; requires manual intervention)

---

### Observability Basics

**Structured Logging**:

- **Format**: JSON logs with consistent fields (`timestamp`, `level`, `message`, `context`)
- **Tool**: Winston (Node.js) or Pino (faster)
- **Destination**: Railway logs (searchable via dashboard) or external (Logtail, Papertrail)

**Example Log Entry**:

```json
{
  "timestamp": "2025-12-28T21:15:00Z",
  "level": "info",
  "message": "Workout logged",
  "context": {
    "userId": "uuid",
    "sessionId": "uuid",
    "type": "strength",
    "duration": 45,
    "offline": false
  }
}
```

**Basic Metrics**:

- **Application**: Request latency (p50, p95, p99), error rate, active users
- **Infrastructure**: CPU, memory, database connections (Railway provides out-of-the-box)
- **Business**: Daily active users, sessions logged, weekly summaries generated

**Health Checks**:

```typescript
// Backend health endpoint
@Get('/health')
async health() {
  const dbHealth = await this.prisma.$queryRaw`SELECT 1`;
  const redisHealth = await redis.ping();
  
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      database: dbHealth ? 'up' : 'down',
      redis: redisHealth === 'PONG' ? 'up' : 'down',
    },
  };
}
```

**Alerting** (Deferred to Post-MVP):

- Set up alerts for critical failures (API downtime, database connection loss)
- Use Railway webhooks or external service (PagerDuty, Opsgenie)

---

## Constitution Check

### Alignment with HybridPeaks Constitution v1.0.0

**Product Principles**:

✅ **Clarity Over Features**: MVP scope is tightly focused (planning, today view, logging, weekly summary); advanced features deferred  
✅ **Execution-First Mindset**: Technical plan emphasizes shipping working software; incremental milestones (0.1-0.6)  
✅ **Progressive Disclosure**: Mobile UI designed with feature-based modules; advanced settings hidden  
✅ **Data in Service of Performance**: All metrics (adherence, volume, RPE) are actionable; AI explains significance  
✅ **Respect for Training Time**: Performance targets enforced (today view <2s, logging <2min, weekly summary <5s)

**Domain Principles**:

✅ **Strength and Endurance Are Complementary**: Data model tracks both modalities; weekly summary aggregates cross-modal load  
✅ **Progressive Overload Across Modalities**: Training plans support progressive loading; AI analyzes volume trends  
✅ **Individual Response Variability**: RPE inputs allow personalization; AI considers individual fatigue patterns  
✅ **Context-Dependent Programming**: AI assistant considers adherence, RPE, notes (not just physiological data)

**UX Principles**:

✅ **Mobile-First, Always**: React Native chosen for native mobile experience; all flows optimized for phones  
✅ **Default to Today**: Today screen is app default; navigation structure prioritizes daily execution  
✅ **Input Minimization**: Form validation with Zod; pre-fill fields where possible; RPE picker vs. free text  
✅ **Offline-First Reliability**: WatermelonDB + sync queue; core functions work without connectivity

**Engineering Principles**:

✅ **Simplicity as a Feature**: Clean architecture without over-engineering; deferred CRDTs, materialized views, advanced caching  
✅ **Evolvability Over Premature Optimization**: Layered architecture allows refactoring; Prisma ORM enables schema evolution  
✅ **Explicit Over Implicit**: NestJS dependency injection; typed DTOs; no magic middleware  
✅ **Fail Visibly**: Structured error handling; logs detailed errors; user-facing messages are generic but clear

**AI Principles**:

✅ **Explainability is Mandatory**: Every AI suggestion includes reasoning field; displayed by default in UI  
✅ **User Control Always Retained**: Summaries are read-only; no auto-apply; dismissible without consequence  
✅ **No Black Box Training Plans**: AI explains patterns and suggests adjustments; does not generate plans autonomously

**Non-Goals Alignment**:

✅ **Out of Scope Features Excluded**: No social features, nutrition tracking, video library, in-app messaging, wearable integration, payment processing in MVP

---

### Trade-offs and Deferred Decisions

**Deferred for Post-MVP** (Explicit Simplifications):

1. **Wearable Integration** (REQ-21): Manual entry only; auto-import adds complexity (OAuth flows, device APIs)
2. **Multi-Week Periodization** (REQ-26): Weekly planning only; mesocycle views require more complex UI and data model
3. **Real-Time Sync**: Polling + background sync sufficient; WebSockets add operational complexity
4. **Advanced Conflict Resolution**: Last-write-wins for MVP; CRDTs deferred until multi-coach support needed
5. **Materialized Views**: Indexed queries sufficient for MVP scale; defer until performance testing reveals bottlenecks
6. **Custom AI Model**: OpenAI API for MVP; custom model training requires ML expertise and infrastructure

**Justifications**:
- All deferrals align with "Evolvability Over Premature Optimization" principle
- MVP delivers core value (planning, execution, logging, AI insights) without these features
- Architecture supports future additions without major refactoring

---

## Summary

This technical implementation plan defines a **pragmatic, MVP-appropriate architecture** for HybridPeaks that:

1. **Delivers Core Value**: All 20 must-have requirements (REQ-1 to REQ-20) are addressed
2. **Maintains Simplicity**: Clean architecture without over-engineering; deferred complexity where justified
3. **Enforces Security**: Baseline hardening (Argon2, JWT rotation, rate limiting, audit logging, input validation)
4. **Enables Offline Use**: WatermelonDB + sync queue for reliable offline logging
5. **Integrates AI Responsibly**: Explainable, optional, non-blocking weekly summaries with clear disclaimers
6. **Aligns with Constitution**: Every technical decision references and upholds constitutional principles

**Technology Stack**:
- Frontend: React Native + TypeScript
- Backend: Node.js + NestJS + TypeScript
- Database: PostgreSQL 15+
- Cache/Queue: Redis
- AI: OpenAI GPT-4 API

**Delivery Timeline**: 12 weeks to production-ready MVP (Milestones 0.1-0.6)

**Next Steps**: Proceed to detailed data model design (`data-model.md`) and API contract generation (`contracts/`).

---

**Constitution Compliance**: ✅ **APPROVED**

This plan adheres to all 20 principles of the HybridPeaks Constitution v1.0.0 and respects the defined non-goals and scope guardrails.

