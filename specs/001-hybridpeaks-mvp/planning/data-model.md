# Data Model: HybridPeaks MVP

**Feature**: 001-hybridpeaks-mvp  
**Last Updated**: 2025-12-28  
**Status**: Final

---

## Overview

This document defines the complete data model for HybridPeaks MVP, including entities, relationships, validation rules, and state transitions. The model is designed for PostgreSQL with Prisma ORM.

---

## Entity Relationship Diagram

```
┌──────────────┐
│    User      │
│──────────────│
│ id (PK)      │
│ email        │
│ passwordHash │
│ role         │───┐
│ createdAt    │   │ polymorphic (role-based)
│ updatedAt    │   │
└──────────────┘   │
                   │
      ┌────────────┴──────────────┐
      │                           │
┌─────▼─────┐           ┌─────────▼──────┐
│  Coach    │           │   Athlete      │
│───────────│           │────────────────│
│ id (PK,FK)│           │ id (PK,FK)     │
│ name      │           │ name           │
│ createdAt │           │ coachId (FK)   │───┐
│ updatedAt │           │ createdAt      │   │
└───────────┘           │ updatedAt      │   │
      │                 └────────────────┘   │
      │                          │           │
      │                          │           │
      │ creates       ┌──────────▼───────────▼────┐
      │               │    TrainingPlan           │
      │               │───────────────────────────│
      │               │ id (PK)                   │
      │               │ athleteId (FK)            │
      │               │ coachId (FK)              │
      │               │ weekStartDate             │
      │               │ status                    │
      │               │ version                   │
      │               │ createdAt                 │
      │               │ updatedAt                 │
      │               └───────────┬───────────────┘
      │                           │
      │                           │ contains
      │                           │
      │                  ┌────────▼────────────┐
      │                  │  TrainingSession    │
      │                  │─────────────────────│
      │                  │ id (PK)             │
      │                  │ planId (FK)         │
      │                  │ date                │
      │                  │ type                │
      │                  │ prescription (JSON) │
      │                  │ focus               │
      │                  │ estimatedDuration   │
      │                  │ createdAt           │
      │                  │ updatedAt           │
      │                  └──────────┬──────────┘
      │                             │
      │                             │ executed as
      │                             │
      │                    ┌────────▼──────────┐
      │                    │   WorkoutLog      │
      │                    │───────────────────│
      │                    │ id (PK)           │
      │                    │ sessionId (FK)    │
      │                    │ athleteId (FK)    │
      │                    │ completedAt       │
      │                    │ actualData (JSON) │
      │                    │ rpe               │
      │                    │ notes             │
      │                    │ syncStatus        │
      │                    │ createdAt         │
      │                    │ updatedAt         │
      │                    └───────────────────┘
      │
      │ creates
      │
┌─────▼──────────┐
│   Exercise     │
│────────────────│
│ id (PK)        │
│ name           │
│ category       │
│ muscleGroups   │
│ createdBy (FK) │ (nullable: system or coach)
│ isPublic       │
│ createdAt      │
│ updatedAt      │
└────────────────┘

┌─────────────────────┐
│  BenchmarkMetric    │
│─────────────────────│
│ id (PK)             │
│ athleteId (FK)      │
│ metricType          │ (enum: 1RM_squat, FTP, HR_zone_2, etc.)
│ value               │
│ unit                │
│ exerciseId (FK)     │ (nullable: for 1RM metrics)
│ establishedAt       │
│ createdAt           │
│ updatedAt           │
└─────────────────────┘

┌─────────────────────┐
│  AIWeeklySummary    │
│─────────────────────│
│ id (PK)             │
│ athleteId (FK)      │
│ planId (FK)         │
│ weekEndDate         │
│ adherenceRate       │
│ totalVolume (JSON)  │ { strength: "1200kg", endurance: "240min" }
│ fatigueAnalysis     │
│ patterns (JSON)     │ ["pattern1", "pattern2"]
│ suggestions (JSON)  │ [{ suggestion, reasoning }]
│ disclaimer          │
│ generatedAt         │
│ createdAt           │
└─────────────────────┘

┌─────────────────────┐
│    AuditLog         │
│─────────────────────│
│ id (PK)             │
│ userId (FK)         │
│ action              │
│ entityType          │
│ entityId            │
│ metadata (JSON)     │
│ ipAddress           │
│ userAgent           │
│ createdAt           │
└─────────────────────┘
```

---

## Entity Definitions

### User

**Purpose**: Authentication and base user information

**Fields**:

| Field        | Type      | Constraints           | Description                          |
|--------------|-----------|-----------------------|--------------------------------------|
| id           | UUID      | PK, Default gen       | Unique identifier                    |
| email        | String    | Unique, NotNull       | User email (login credential)        |
| passwordHash | String    | NotNull               | Argon2id hash of password            |
| role         | Enum      | NotNull               | 'coach' or 'athlete'                 |
| createdAt    | Timestamp | Default now()         | Account creation timestamp           |
| updatedAt    | Timestamp | Auto-update           | Last modification timestamp          |

**Validation Rules**:
- Email: Valid email format, max 255 chars, lowercase
- Password (before hashing): Min 12 chars, must include uppercase, lowercase, digit
- Role: Must be 'coach' or 'athlete'

**Relationships**:
- 1:1 with Coach (if role = 'coach')
- 1:1 with Athlete (if role = 'athlete')

**Indexes**:
- `idx_user_email` on `email` (unique, for login lookups)

---

### Coach

**Purpose**: Role-specific data for coach users

**Fields**:

| Field     | Type      | Constraints     | Description                     |
|-----------|-----------|-----------------|---------------------------------|
| id        | UUID      | PK, FK(User.id) | References user.id              |
| name      | String    | NotNull         | Display name                    |
| createdAt | Timestamp | Default now()   | Profile creation timestamp      |
| updatedAt | Timestamp | Auto-update     | Last modification timestamp     |

**Validation Rules**:
- Name: Min 2 chars, max 100 chars

**Relationships**:
- 1:many with Athletes (coach.id → athlete.coachId)
- 1:many with TrainingPlans (coach.id → plan.coachId)
- 1:many with Exercises (coach.id → exercise.createdBy)

**Indexes**:
- `idx_coach_id` on `id` (for athlete roster queries)

---

### Athlete

**Purpose**: Role-specific data for athlete users

**Fields**:

| Field     | Type      | Constraints        | Description                     |
|-----------|-----------|--------------------|----------------------------------|
| id        | UUID      | PK, FK(User.id)    | References user.id              |
| name      | String    | NotNull            | Display name                    |
| coachId   | UUID      | FK(Coach.id)       | Assigned coach                  |
| createdAt | Timestamp | Default now()      | Profile creation timestamp      |
| updatedAt | Timestamp | Auto-update        | Last modification timestamp     |

**Validation Rules**:
- Name: Min 2 chars, max 100 chars
- CoachId: Must reference existing coach

**Relationships**:
- many:1 with Coach (athlete.coachId → coach.id)
- 1:many with TrainingPlans (athlete.id → plan.athleteId)
- 1:many with WorkoutLogs (athlete.id → log.athleteId)
- 1:many with BenchmarkMetrics (athlete.id → metric.athleteId)
- 1:many with AIWeeklySummaries (athlete.id → summary.athleteId)

**Indexes**:
- `idx_athlete_coach` on `coachId` (for coach dashboard queries)

---

### TrainingPlan

**Purpose**: Weekly training program for an athlete

**Fields**:

| Field         | Type      | Constraints           | Description                                  |
|---------------|-----------|-----------------------|----------------------------------------------|
| id            | UUID      | PK, Default gen       | Unique identifier                            |
| athleteId     | UUID      | FK(Athlete.id)        | Athlete this plan is for                     |
| coachId       | UUID      | FK(Coach.id)          | Coach who created the plan                   |
| weekStartDate | Date      | NotNull               | Monday of the training week                  |
| status        | Enum      | NotNull, Default      | 'active', 'completed', 'archived'            |
| version       | Integer   | NotNull, Default 1    | Plan version (for revisions)                 |
| createdAt     | Timestamp | Default now()         | Plan creation timestamp                      |
| updatedAt     | Timestamp | Auto-update           | Last modification timestamp                  |

**Validation Rules**:
- weekStartDate: Must be a Monday
- status: Must be 'active', 'completed', or 'archived'
- version: Auto-incremented on plan edits

**State Transitions**:
```
active → completed (when week ends)
active → archived (when replaced by new version)
completed → archived (manual archival)
```

**Relationships**:
- many:1 with Athlete (plan.athleteId → athlete.id)
- many:1 with Coach (plan.coachId → coach.id)
- 1:many with TrainingSessions (plan.id → session.planId)
- 1:many with AIWeeklySummaries (plan.id → summary.planId)

**Indexes**:
- `idx_plan_athlete_date` on `(athleteId, weekStartDate)` (unique per athlete per week)
- `idx_plan_status` on `status` (for active plan queries)

**Business Rules**:
- Only one active plan per athlete per week
- weekStartDate must not overlap with existing active plans for same athlete

---

### TrainingSession

**Purpose**: A single workout (strength or endurance) scheduled for a date

**Fields**:

| Field             | Type      | Constraints       | Description                                |
|-------------------|-----------|-------------------|--------------------------------------------|
| id                | UUID      | PK, Default gen   | Unique identifier                          |
| planId            | UUID      | FK(Plan.id)       | Training plan this session belongs to      |
| date              | Date      | NotNull           | Scheduled date for session                 |
| type              | Enum      | NotNull           | 'strength' or 'endurance'                  |
| prescription      | JSONB     | NotNull           | Workout details (type-dependent structure) |
| focus             | String    | Nullable          | Session focus (e.g., "Lower Body Power")   |
| estimatedDuration | Integer   | Nullable          | Estimated minutes to complete              |
| createdAt         | Timestamp | Default now()     | Session creation timestamp                 |
| updatedAt         | Timestamp | Auto-update       | Last modification timestamp                |

**Validation Rules**:
- type: Must be 'strength' or 'endurance'
- prescription: Must conform to type-specific schema (see below)
- estimatedDuration: 1-300 minutes if provided

**Prescription Schema** (JSONB):

**Strength Session**:
```json
{
  "exercises": [
    {
      "exerciseId": "uuid",
      "sets": 5,
      "reps": 5,
      "intensity": { "type": "percent_1rm", "value": 75 },
      "restSeconds": 180,
      "tempo": "3010" // optional
    }
  ]
}
```

**Endurance Session**:
```json
{
  "modality": "run", // run, bike, row, swim
  "duration": { "value": 60, "unit": "minutes" },
  "distance": { "value": 10, "unit": "km" }, // optional
  "intensity": {
    "type": "heart_rate_zone", // or "ftp_percent", "pace_zone"
    "zone": 2
  }
}
```

**Relationships**:
- many:1 with TrainingPlan (session.planId → plan.id)
- 1:1 with WorkoutLog (session.id → log.sessionId, optional)

**Indexes**:
- `idx_session_plan` on `planId` (for plan detail queries)
- `idx_session_date` on `date` (for "today" queries)
- `idx_session_plan_date` on `(planId, date)` (composite for weekly views)

---

### WorkoutLog

**Purpose**: Record of an athlete's actual execution of a training session

**Fields**:

| Field       | Type      | Constraints       | Description                                |
|-------------|-----------|-------------------|--------------------------------------------|
| id          | UUID      | PK, Default gen   | Unique identifier                          |
| sessionId   | UUID      | FK(Session.id)    | Training session this log corresponds to   |
| athleteId   | UUID      | FK(Athlete.id)    | Athlete who performed the workout          |
| completedAt | Timestamp | NotNull           | When workout was completed                 |
| actualData  | JSONB     | NotNull           | Actual work performed (mirrors prescription) |
| rpe         | Integer   | Nullable          | Rate of Perceived Exertion (1-10)          |
| notes       | Text      | Nullable          | Free-text athlete notes                    |
| syncStatus  | Enum      | Default 'synced'  | 'pending', 'synced', 'error'               |
| createdAt   | Timestamp | Default now()     | Log creation timestamp (local device time) |
| updatedAt   | Timestamp | Auto-update       | Last modification timestamp                |

**Validation Rules**:
- rpe: Must be 1-10 if provided
- notes: Max 1000 chars
- syncStatus: Must be 'pending', 'synced', or 'error'
- Unique: (sessionId, athleteId) to prevent duplicate logs

**Actual Data Schema** (JSONB):

**Strength Workout**:
```json
{
  "exercises": [
    {
      "exerciseId": "uuid",
      "sets": [
        { "weight": 100, "reps": 5, "rpe": 8 },
        { "weight": 100, "reps": 5, "rpe": 9 }
      ],
      "modified": false // true if substituted or skipped
    }
  ]
}
```

**Endurance Workout**:
```json
{
  "modality": "run",
  "duration": { "value": 62, "unit": "minutes" },
  "distance": { "value": 10.5, "unit": "km" },
  "avgHeartRate": 145,
  "avgPower": null,
  "completed": true
}
```

**Relationships**:
- many:1 with TrainingSession (log.sessionId → session.id)
- many:1 with Athlete (log.athleteId → athlete.id)

**Indexes**:
- `idx_log_session` on `sessionId` (unique with athleteId)
- `idx_log_athlete_date` on `(athleteId, completedAt)` (for athlete history)
- `idx_log_sync_status` on `syncStatus` (for sync queue queries)

**Business Rules**:
- One log per session per athlete (enforce via unique constraint)
- completedAt must be within ±7 days of session.date (prevent future logs)
- Logs are immutable after creation (edits create new version with reference to original)

---

### Exercise

**Purpose**: Strength training movement catalog

**Fields**:

| Field        | Type      | Constraints       | Description                             |
|--------------|-----------|-------------------|-----------------------------------------|
| id           | UUID      | PK, Default gen   | Unique identifier                       |
| name         | String    | NotNull, Unique   | Exercise name (e.g., "Back Squat")      |
| category     | Enum      | NotNull           | 'squat', 'hinge', 'press', 'pull', etc. |
| muscleGroups | JSONB     | NotNull           | Array of muscle groups (e.g., ["quads", "glutes"]) |
| createdBy    | UUID      | FK(Coach.id)      | Coach who created (null = system)       |
| isPublic     | Boolean   | Default false     | Available to all coaches                |
| createdAt    | Timestamp | Default now()     | Exercise creation timestamp             |
| updatedAt    | Timestamp | Auto-update       | Last modification timestamp             |

**Validation Rules**:
- name: Min 2 chars, max 100 chars
- category: Must be 'squat', 'hinge', 'press', 'pull', 'accessory', 'core', 'plyometric'
- muscleGroups: Must be array of valid muscle group enums

**Relationships**:
- many:1 with Coach (exercise.createdBy → coach.id, nullable)
- Referenced in TrainingSession.prescription and WorkoutLog.actualData (JSONB)

**Indexes**:
- `idx_exercise_name` on `name` (unique, for search/autocomplete)
- `idx_exercise_category` on `category` (for filtered queries)
- `idx_exercise_creator` on `createdBy` (for coach's custom exercises)

**Business Rules**:
- System exercises (createdBy = null, isPublic = true) are read-only
- Coach-created exercises visible only to that coach unless isPublic = true

---

### BenchmarkMetric

**Purpose**: Athlete performance benchmarks for intensity prescription

**Fields**:

| Field         | Type      | Constraints       | Description                                |
|---------------|-----------|-------------------|--------------------------------------------|
| id            | UUID      | PK, Default gen   | Unique identifier                          |
| athleteId     | UUID      | FK(Athlete.id)    | Athlete this metric belongs to             |
| metricType    | Enum      | NotNull           | Type of metric (see enum below)            |
| value         | Decimal   | NotNull           | Numeric value                              |
| unit          | String    | NotNull           | Unit of measurement (e.g., "kg", "watts")  |
| exerciseId    | UUID      | FK(Exercise.id)   | For 1RM metrics, links to exercise         |
| establishedAt | Date      | NotNull           | Date metric was established                |
| createdAt     | Timestamp | Default now()     | Record creation timestamp                  |
| updatedAt     | Timestamp | Auto-update       | Last modification timestamp                |

**Validation Rules**:
- value: Must be > 0
- metricType: See enum below
- If metricType is 1RM variant, exerciseId is required

**MetricType Enum**:
- `1RM` (general one-rep max, requires exerciseId)
- `FTP` (Functional Threshold Power for cycling/running)
- `HR_zone_1`, `HR_zone_2`, ..., `HR_zone_5` (heart rate zones)
- `pace_5k`, `pace_10k`, `pace_half_marathon` (endurance pace benchmarks)

**Relationships**:
- many:1 with Athlete (metric.athleteId → athlete.id)
- many:1 with Exercise (metric.exerciseId → exercise.id, nullable)

**Indexes**:
- `idx_metric_athlete` on `athleteId` (for athlete benchmark queries)
- `idx_metric_type` on `(athleteId, metricType)` (for specific metric lookups)

**Business Rules**:
- Multiple metrics of same type allowed (track progression over time)
- Most recent metric (by establishedAt) is used for prescription calculations

---

### AIWeeklySummary

**Purpose**: AI-generated analysis of an athlete's training week

**Fields**:

| Field           | Type      | Constraints       | Description                                  |
|-----------------|-----------|-------------------|----------------------------------------------|
| id              | UUID      | PK, Default gen   | Unique identifier                            |
| athleteId       | UUID      | FK(Athlete.id)    | Athlete this summary is for                  |
| planId          | UUID      | FK(Plan.id)       | Training plan for this week                  |
| weekEndDate     | Date      | NotNull           | Sunday of the training week                  |
| adherenceRate   | Decimal   | NotNull           | 0.0-1.0 (percentage as decimal)              |
| totalVolume     | JSONB     | NotNull           | { strength: "1200kg", endurance: "240min" }  |
| fatigueAnalysis | Text      | NotNull           | AI-generated fatigue assessment              |
| patterns        | JSONB     | NotNull           | Array of identified patterns                 |
| suggestions     | JSONB     | NotNull           | Array of { suggestion, reasoning }           |
| disclaimer      | Text      | NotNull           | Medical advice disclaimer                    |
| generatedAt     | Timestamp | NotNull           | When AI generated this summary               |
| createdAt       | Timestamp | Default now()     | Record creation timestamp                    |

**Validation Rules**:
- adherenceRate: 0.0-1.0
- patterns: Array of strings
- suggestions: Array of objects with `suggestion` (string) and `reasoning` (string) fields

**Suggestions Schema** (JSONB):
```json
[
  {
    "suggestion": "Reduce intensity in next week's lower body sessions",
    "reasoning": "Consistently high RPE (9+) in strength sessions suggests insufficient recovery. Lowering intensity will allow adaptation while maintaining volume."
  }
]
```

**Relationships**:
- many:1 with Athlete (summary.athleteId → athlete.id)
- many:1 with TrainingPlan (summary.planId → plan.id)

**Indexes**:
- `idx_summary_athlete_week` on `(athleteId, weekEndDate)` (unique per athlete per week)
- `idx_summary_generated` on `generatedAt` (for recent summaries)

**Business Rules**:
- One summary per athlete per week
- Generated only after week end (Sunday evening)
- Requires at least one workout log for the week

---

### AuditLog

**Purpose**: Security and compliance audit trail

**Fields**:

| Field      | Type      | Constraints     | Description                             |
|------------|-----------|-----------------|-----------------------------------------|
| id         | UUID      | PK, Default gen | Unique identifier                       |
| userId     | UUID      | FK(User.id)     | User who performed the action           |
| action     | String    | NotNull         | Action type (e.g., 'login', 'create_plan') |
| entityType | String    | Nullable        | Type of entity affected (e.g., 'training_plan') |
| entityId   | UUID      | Nullable        | ID of affected entity                   |
| metadata   | JSONB     | Nullable        | Additional context (IP, changes, etc.)  |
| ipAddress  | String    | Nullable        | Client IP address                       |
| userAgent  | String    | Nullable        | Client user agent                       |
| createdAt  | Timestamp | Default now()   | When action occurred                    |

**Validation Rules**:
- action: Max 100 chars
- ipAddress: Valid IPv4 or IPv6 format

**Common Actions**:
- `login`, `logout`, `register`
- `create_plan`, `update_plan`, `delete_plan`
- `create_session`, `update_session`, `delete_session`
- `update_benchmark`
- `data_export` (GDPR compliance)

**Indexes**:
- `idx_audit_user` on `(userId, createdAt)` (for user activity history)
- `idx_audit_entity` on `(entityType, entityId)` (for entity change history)

**Business Rules**:
- Logs are append-only (no updates or deletes)
- Retention: 1 year minimum (configurable for compliance)

---

## Enums

### UserRole
- `coach`
- `athlete`

### SessionType
- `strength`
- `endurance`

### PlanStatus
- `active`
- `completed`
- `archived`

### SyncStatus
- `pending` (waiting to sync)
- `synced` (successfully synced)
- `error` (sync failed after retries)

### ExerciseCategory
- `squat`
- `hinge`
- `press`
- `pull`
- `accessory`
- `core`
- `plyometric`

### MetricType
- `1RM`
- `FTP`
- `HR_zone_1`, `HR_zone_2`, `HR_zone_3`, `HR_zone_4`, `HR_zone_5`
- `pace_5k`, `pace_10k`, `pace_half_marathon`

---

## State Transitions

### TrainingPlan Status

```
[Created]
    ↓
  active
    ↓
    ├──→ completed (week ends)
    │       ↓
    │    archived (manual)
    │
    └──→ archived (replaced by new version)
```

### WorkoutLog Sync Status

```
[Created Offline]
    ↓
  pending
    ↓
    ├──→ synced (successful sync)
    │
    └──→ error (sync failed 3x)
         ↓
      [Manual intervention or discard]
```

---

## Validation Rules Summary

### Cross-Entity Rules

1. **Athlete-Coach Assignment**:
   - Athlete.coachId must reference existing Coach
   - Cannot be null (athlete must have assigned coach)

2. **Training Plan Uniqueness**:
   - Only one active plan per athlete per week
   - weekStartDate + athleteId must be unique for active plans

3. **Workout Log Uniqueness**:
   - One log per session per athlete (sessionId + athleteId unique)

4. **Benchmark Metrics**:
   - If metricType = 1RM, exerciseId must be provided
   - Most recent metric (by establishedAt) used for calculations

5. **AI Weekly Summary**:
   - Requires at least one workout log for the week
   - Generated only after week end (Sunday evening)

### Data Integrity Rules

1. **Immutable Logs**:
   - WorkoutLog records are immutable after creation
   - Edits create new version (not implemented in MVP, documented for future)

2. **Soft Delete**:
   - TrainingPlan uses status='archived' instead of hard delete
   - Preserves historical data for AI analysis

3. **Cascade Behavior**:
   - Delete Athlete → cascade delete WorkoutLogs, BenchmarkMetrics, AIWeeklySummaries
   - Delete Coach → prevent if has assigned athletes (require reassignment first)
   - Delete TrainingPlan → cascade delete TrainingSessions
   - Delete TrainingSession → nullify WorkoutLog.sessionId (preserve log)

---

## Indexing Strategy

### Performance-Critical Indexes

1. **Today View** (REQ-5: <2s load):
   - `idx_session_date` on TrainingSession(date)
   - `idx_session_plan` on TrainingSession(planId)

2. **Weekly Summary** (REQ-9: <5s load):
   - `idx_log_athlete_date` on WorkoutLog(athleteId, completedAt)
   - `idx_plan_athlete_date` on TrainingPlan(athleteId, weekStartDate)

3. **Coach Dashboard**:
   - `idx_athlete_coach` on Athlete(coachId)
   - `idx_plan_status` on TrainingPlan(status)

4. **Authentication**:
   - `idx_user_email` on User(email) - unique

### Composite Indexes

- `(planId, date)` on TrainingSession → weekly plan detail queries
- `(athleteId, weekEndDate)` on AIWeeklySummary → unique constraint + fast lookup
- `(sessionId, athleteId)` on WorkoutLog → unique constraint + fast lookup

---

## JSON Schema Definitions

### TrainingSession.prescription (Strength)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["exercises"],
  "properties": {
    "exercises": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["exerciseId", "sets", "reps", "intensity"],
        "properties": {
          "exerciseId": { "type": "string", "format": "uuid" },
          "sets": { "type": "integer", "minimum": 1, "maximum": 20 },
          "reps": { "type": "integer", "minimum": 1, "maximum": 50 },
          "intensity": {
            "type": "object",
            "required": ["type", "value"],
            "properties": {
              "type": { "enum": ["percent_1rm", "rpe"] },
              "value": { "type": "number", "minimum": 0, "maximum": 100 }
            }
          },
          "restSeconds": { "type": "integer", "minimum": 0, "maximum": 600 },
          "tempo": { "type": "string", "pattern": "^[0-9]{4}$" }
        }
      }
    }
  }
}
```

### TrainingSession.prescription (Endurance)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["modality", "duration", "intensity"],
  "properties": {
    "modality": { "enum": ["run", "bike", "row", "swim"] },
    "duration": {
      "type": "object",
      "required": ["value", "unit"],
      "properties": {
        "value": { "type": "number", "minimum": 1 },
        "unit": { "enum": ["minutes", "hours"] }
      }
    },
    "distance": {
      "type": "object",
      "properties": {
        "value": { "type": "number", "minimum": 0.1 },
        "unit": { "enum": ["km", "miles", "meters"] }
      }
    },
    "intensity": {
      "type": "object",
      "required": ["type"],
      "properties": {
        "type": { "enum": ["heart_rate_zone", "ftp_percent", "pace_zone"] },
        "zone": { "type": "integer", "minimum": 1, "maximum": 5 }
      }
    }
  }
}
```

---

## Migration Strategy

### Initial Schema Creation (Migration 001)

1. Create enums (UserRole, SessionType, etc.)
2. Create core tables (User, Coach, Athlete)
3. Create training tables (TrainingPlan, TrainingSession, WorkoutLog)
4. Create supporting tables (Exercise, BenchmarkMetric, AIWeeklySummary, AuditLog)
5. Create all foreign key constraints
6. Create all indexes

### Seed Data

**System Exercises** (create_exercises.sql):
- 50+ common exercises (squats, deadlifts, presses, rows)
- Category: all main categories
- createdBy: null (system)
- isPublic: true

**Sample Coaches & Athletes** (development only):
- 2 sample coaches
- 5 sample athletes
- 1-2 sample training plans with sessions

---

## Data Access Patterns

### High-Frequency Queries

1. **Today View** (athlete app launch):
   ```sql
   SELECT * FROM training_sessions
   WHERE plan_id IN (
     SELECT id FROM training_plans
     WHERE athlete_id = $1 AND status = 'active'
   ) AND date = CURRENT_DATE;
   ```

2. **Weekly Summary** (athlete/coach dashboard):
   ```sql
   SELECT
     COUNT(DISTINCT ts.id) as planned,
     COUNT(DISTINCT wl.id) as completed
   FROM training_sessions ts
   LEFT JOIN workout_logs wl ON wl.session_id = ts.id
   WHERE ts.plan_id = $1;
   ```

3. **Coach Dashboard** (athlete roster):
   ```sql
   SELECT * FROM athletes
   WHERE coach_id = $1
   ORDER BY name;
   ```

### Reporting Queries

1. **Adherence Calculation**:
   ```sql
   SELECT
     (COUNT(DISTINCT wl.id)::float /
      NULLIF(COUNT(DISTINCT ts.id), 0)) * 100 as adherence_rate
   FROM training_sessions ts
   LEFT JOIN workout_logs wl ON wl.session_id = ts.id
   WHERE ts.plan_id = $1;
   ```

2. **Volume Aggregation** (strength):
   ```sql
   SELECT
     SUM((actual_data->'exercises'->0->'sets'->0->>'weight')::int *
         (actual_data->'exercises'->0->'sets'->0->>'reps')::int) as total_volume
   FROM workout_logs
   WHERE athlete_id = $1
     AND completed_at >= $2
     AND completed_at < $3;
   ```

---

## Summary

This data model provides:

1. ✅ **Clear Entity Separation**: User roles, training entities, supporting data
2. ✅ **Flexible JSON**: Prescription and actual data adapt to exercise types without schema changes
3. ✅ **Strong Validation**: Constraints, enums, and business rules enforce data integrity
4. ✅ **Performance**: Indexed for critical queries (today view, weekly summary)
5. ✅ **Auditability**: Immutable logs, versioned plans, audit trail
6. ✅ **Evolvability**: JSONB allows schema evolution without migrations for variable structures

**Status**: ✅ **Ready for Prisma Schema Implementation**

Next steps: Translate to `prisma/schema.prisma` and generate initial migration.

