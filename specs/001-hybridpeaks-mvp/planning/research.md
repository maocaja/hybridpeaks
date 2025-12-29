# Technology Research & Decisions

**Feature**: HybridPeaks MVP  
**Date**: 2025-12-28  
**Status**: Final

---

## Overview

This document consolidates the research and rationale behind all major technology decisions for the HybridPeaks MVP implementation. Each decision includes alternatives considered, trade-offs, and alignment with project principles.

---

## Frontend Framework

### Decision: React Native with TypeScript

**Why Chosen**:
- **Mobile-First Mandate**: React Native provides true native mobile apps (iOS + Android) from a single codebase
- **Cross-Platform Efficiency**: ~90% code sharing reduces development time by 50% vs. native Swift/Kotlin
- **TypeScript Safety**: Compile-time type checking prevents entire classes of bugs; improves IDE support
- **Ecosystem Maturity**: Rich libraries for offline storage (WatermelonDB), navigation (React Navigation), forms (React Hook Form)
- **Web Compatibility**: Future web version can reuse business logic, utilities, and state management

**Alternatives Considered**:

1. **Flutter**
   - ✅ Pros: Excellent performance, beautiful UI, growing ecosystem
   - ❌ Cons: Dart language less familiar; fewer offline sync libraries; smaller talent pool
   - **Verdict**: TypeScript familiarity and ecosystem maturity outweigh Flutter's performance edge

2. **Native (Swift + Kotlin)**
   - ✅ Pros: Best performance, access to all platform APIs, superior UX
   - ❌ Cons: 2x development effort, separate codebases, overkill for MVP
   - **Verdict**: Not justified for MVP; React Native performance sufficient for use case

3. **Progressive Web App (PWA)**
   - ✅ Pros: Single codebase for all platforms, no app store approvals
   - ❌ Cons: Inferior offline support, no push notifications (iOS), slower performance, limited access to device features
   - **Verdict**: Mobile-first principle requires native apps; PWA insufficient

**Trade-offs**:
- ✅ Faster MVP delivery, single team, easier maintenance
- ❌ Slightly lower performance than fully native (negligible for this use case)

**Key Libraries**:
- UI: React Native Paper (Material Design for accessibility)
- Navigation: React Navigation v6
- State: Zustand (global) + React Query (server state)
- Offline: WatermelonDB (SQLite-based, sync-optimized)
- Forms: React Hook Form + Zod

---

## Backend Framework

### Decision: Node.js with NestJS and TypeScript

**Why Chosen**:
- **Full-Stack TypeScript**: Shared types between frontend and backend reduce integration errors
- **NestJS Architecture**: Built-in support for clean architecture (modules, DI, layering)
- **Async Performance**: Event loop handles concurrent I/O well (multiple athletes logging simultaneously)
- **Ecosystem**: Excellent ORM (Prisma), validation (class-validator), auth (Passport.js)
- **Developer Velocity**: Team can work across stack with minimal context switching

**Alternatives Considered**:

1. **Python (FastAPI/Django)**
   - ✅ Pros: Better for ML/AI integration, mature ecosystem, excellent async support (FastAPI)
   - ❌ Cons: Loses full-stack TypeScript advantage, slower prototyping for MVP
   - **Verdict**: TypeScript cohesion more valuable than Python's AI advantage (using external AI API)

2. **Go**
   - ✅ Pros: Superior performance and concurrency, small binary size, type safety
   - ❌ Cons: Smaller ecosystem for rapid prototyping, steeper learning curve, verbose error handling
   - **Verdict**: Go's performance edge not needed for MVP; Node.js ecosystem wins

3. **Ruby on Rails**
   - ✅ Pros: Fastest prototyping, convention over configuration, mature ecosystem
   - ❌ Cons: Declining ecosystem, less modern, not ideal for mobile APIs, slower runtime
   - **Verdict**: TypeScript + NestJS offers better long-term maintainability

**Trade-offs**:
- ✅ Fast prototyping, excellent tooling, large talent pool
- ❌ Single-threaded (mitigated by clustering), less performant for CPU-intensive tasks (AI delegated to external service)

**Key Libraries**:
- Framework: NestJS v10
- ORM: Prisma (type-safe, schema-first)
- Validation: class-validator + class-transformer
- Auth: Passport.js (JWT strategy)
- Jobs: BullMQ (Redis-based queue)

---

## Database

### Decision: PostgreSQL 15+

**Why Chosen**:
- **Relational Model Fit**: Training plans, sessions, logs naturally relational (clear entities and foreign keys)
- **ACID Guarantees**: Strong consistency for training data integrity (immutable logs, versioned plans)
- **JSON Support**: JSONB columns for flexible data (exercise parameters, AI insights) without sacrificing relational benefits
- **Performance**: Excellent query performance for reporting (weekly adherence, volume calculations)
- **Ecosystem**: First-class Prisma support, robust backup/replication, widely deployed

**Alternatives Considered**:

1. **MongoDB**
   - ✅ Pros: Flexible schema, easy to start, good for evolving data models
   - ❌ Cons: Eventual consistency risks for training data, less suitable for complex reporting, no true transactions (until v4)
   - **Verdict**: Relational model too valuable; JSONB provides flexibility where needed

2. **SQLite**
   - ✅ Pros: Zero-config, simple for MVP, embedded
   - ❌ Cons: No concurrent writes (not suitable for multi-athlete logging), limited scalability
   - **Verdict**: Insufficient for multi-user application

3. **MySQL**
   - ✅ Pros: Mature, widely deployed, good performance
   - ❌ Cons: Weaker JSON support vs. PostgreSQL, less advanced features (no JSONB indexing)
   - **Verdict**: PostgreSQL's JSONB and advanced features provide better fit

**Trade-offs**:
- ✅ Strong consistency, flexible schema (JSONB), excellent tooling
- ❌ Slightly more complex than NoSQL (mitigated by Prisma migrations)

**Schema Principles**:
- Normalize for integrity (separate tables for athletes, coaches, exercises)
- Use JSONB for variable structures (exercise parameters differ by type)
- Index foreign keys and frequently queried fields
- Defer partitioning until scale requires

---

## Cache & Job Queue

### Decision: Redis (Single Instance)

**Why Chosen**:
- **Session Storage**: Fast JWT refresh token lookups and revocation
- **Job Queue**: BullMQ requires Redis for reliable async processing (AI summaries)
- **Rate Limiting**: In-memory counters for login attempts, API throttling
- **Minimal Complexity**: Single instance sufficient for MVP; no clustering needed

**Alternatives Considered**:

1. **No Cache (PostgreSQL Only)**
   - ✅ Pros: Simpler architecture, one less dependency
   - ❌ Cons: No job queue solution, slower session lookups, adds load to primary DB
   - **Verdict**: Redis justifies its complexity for job queue and performance

2. **Memcached**
   - ✅ Pros: Simpler than Redis, faster for pure caching
   - ❌ Cons: No job queue, no data structures (lists, sets), no persistence
   - **Verdict**: Redis's versatility (cache + queue + rate limiting) wins

**Trade-offs**:
- ✅ Offloads session storage from DB, enables background jobs, fast in-memory ops
- ❌ Adds operational dependency (mitigated by managed services: Redis Cloud, ElastiCache)

**Use Cases**:
1. JWT refresh token storage (TTL expiration)
2. AI summary job queue (BullMQ)
3. Rate limiting counters
4. Optional: Weekly summary caching (1-hour TTL)

---

## Authentication Strategy

### Decision: JWT-based with Refresh Tokens

**Why Chosen**:
- **Stateless**: JWTs enable horizontal scaling (no session affinity required)
- **Mobile-Friendly**: Tokens stored locally; no cookies (avoids CSRF complexity)
- **Security Balance**: Short-lived access tokens (15 min) + long-lived refresh tokens (7 days)
- **Extensible**: Easy to add OAuth2 (Google, Apple) post-MVP

**Alternatives Considered**:

1. **Session-Based (Cookies)**
   - ✅ Pros: Simpler for MVP, server-side revocation, no token expiry management
   - ❌ Cons: Requires sticky sessions or shared session store, CSRF protection needed, less mobile-friendly
   - **Verdict**: JWT's scalability and mobile-first fit outweigh simplicity

2. **Magic Links (Passwordless)**
   - ✅ Pros: Excellent UX, no password management, inherently secure
   - ❌ Cons: Requires email delivery infrastructure, slower login flow, user education needed
   - **Verdict**: Deferred to post-MVP; password auth is familiar and faster to implement

**Trade-offs**:
- ✅ Scalable, mobile-friendly, widely understood
- ❌ Token revocation requires server-side state (refresh tokens in Redis)

**Token Strategy**:
- Access token: 15 min expiry, stateless, not revocable
- Refresh token: 7 days, stored in Redis, rotates on use
- Mobile storage: React Native Keychain (secure)

---

## Password Hashing

### Decision: Argon2id

**Why Chosen**:
- **OWASP Recommendation**: Winner of Password Hashing Competition (2015)
- **Resistance**: Defends against GPU/ASIC attacks (memory-hard), side-channel attacks
- **Future-Proof**: Configurable time/memory cost parameters

**Alternatives Considered**:

1. **bcrypt**
   - ✅ Pros: Widely deployed, simpler, well-understood
   - ❌ Cons: Less resistant to GPU attacks vs. Argon2, fixed memory cost
   - **Verdict**: Argon2's superior security justifies minimal added complexity

2. **scrypt**
   - ✅ Pros: Memory-hard, good resistance
   - ❌ Cons: Less configurable than Argon2, smaller ecosystem
   - **Verdict**: Argon2 is industry standard as of 2025

**Trade-offs**:
- ✅ State-of-the-art security, tunable parameters
- ❌ Slightly slower than bcrypt (acceptable for login/register)

**Configuration**:
- Memory cost: 64 MB
- Time cost: 3 iterations
- Parallelism: 4 threads

---

## Offline Storage (Mobile)

### Decision: WatermelonDB (SQLite-based)

**Why Chosen**:
- **React Native Optimized**: Built specifically for React Native performance
- **Sync Support**: Built-in sync primitives for offline-first apps
- **SQLite Foundation**: Reliable, battle-tested local storage
- **Type Safety**: TypeScript support with schema definitions

**Alternatives Considered**:

1. **AsyncStorage**
   - ✅ Pros: Built into React Native, simple key-value store
   - ❌ Cons: No relational queries, poor performance for large datasets, no sync primitives
   - **Verdict**: Insufficient for complex training data

2. **Realm**
   - ✅ Pros: Excellent performance, mature ecosystem, reactive queries
   - ❌ Cons: Proprietary database format, more complex sync setup, MongoDB acquisition creates uncertainty
   - **Verdict**: WatermelonDB's SQLite foundation and React Native focus wins

3. **Custom SQLite Implementation**
   - ✅ Pros: Full control, no abstraction overhead
   - ❌ Cons: Significant development effort, need to build sync logic from scratch
   - **Verdict**: WatermelonDB provides 80% solution out-of-the-box

**Trade-offs**:
- ✅ Optimized for React Native, built-in sync, good documentation
- ❌ Slightly less mature than Realm (acceptable for MVP)

---

## AI Service

### Decision: OpenAI GPT-4 API

**Why Chosen**:
- **Speed to Market**: No custom model training required
- **Explainability**: LLMs generate human-readable explanations naturally
- **Flexibility**: Prompt engineering allows rapid iteration on insights
- **Cost**: Pay-per-use acceptable for MVP scale

**Alternatives Considered**:

1. **Custom ML Model**
   - ✅ Pros: Full control, no API costs, proprietary IP
   - ❌ Cons: Requires ML expertise, training infrastructure, labeled data, months of development
   - **Verdict**: Too slow for MVP; external API enables faster validation

2. **Rule-Based System**
   - ✅ Pros: Simple, deterministic, no external dependency
   - ❌ Cons: Brittle, requires extensive manual rules, less adaptable, no natural language output
   - **Verdict**: Insufficient for "explainability" requirement; LLM's natural language wins

3. **Open-Source LLM (Llama 2, Mistral)**
   - ✅ Pros: No API costs, data privacy (self-hosted)
   - ❌ Cons: Requires GPU infrastructure, model serving complexity, lower quality than GPT-4
   - **Verdict**: Infrastructure complexity outweighs API cost savings for MVP

**Trade-offs**:
- ✅ Fast MVP delivery, excellent text generation, no ML expertise required
- ❌ External dependency, API costs (~$0.03/summary), limited customization

**Prompt Strategy**:
- Structured output (JSON format) for parsing
- Low temperature (0.3) for consistent, factual output
- Explicit instructions to avoid medical advice
- Mandatory "reasoning" field for explainability

---

## Deployment Platform

### Decision: Railway (PaaS)

**Why Chosen**:
- **Zero DevOps**: Automatic SSL, scaling, deployments from GitHub
- **Managed Services**: PostgreSQL + Redis included (no manual setup)
- **Cost**: Free tier for MVP, pay-as-you-grow
- **Speed**: Deploy in minutes vs. hours/days on AWS

**Alternatives Considered**:

1. **AWS (ECS + RDS + ElastiCache)**
   - ✅ Pros: Maximum control, industry standard, unlimited scalability
   - ❌ Cons: Complex setup, requires DevOps expertise, high initial cost, slow MVP iteration
   - **Verdict**: Overkill for MVP; defer until scale requires

2. **Heroku**
   - ✅ Pros: Simple PaaS, similar to Railway
   - ❌ Cons: More expensive, slower cold starts, less modern tooling
   - **Verdict**: Railway has better pricing and modern DX

3. **DigitalOcean App Platform**
   - ✅ Pros: Simple, good pricing, managed databases
   - ❌ Cons: Less feature-rich than Railway, smaller ecosystem
   - **Verdict**: Railway's GitHub integration and ease of use wins

**Trade-offs**:
- ✅ Fast MVP deployment, no Kubernetes complexity, automatic HTTPS
- ❌ Less control vs. AWS, vendor lock-in (mitigated by Docker containers)

**Environments**:
- Development: Local (`localhost`)
- Staging: Auto-deploy from `develop` branch
- Production: Manual deploy from `main` branch

---

## Testing Frameworks

### Decisions

**Backend Unit/Integration**: **Jest + Supertest**
- Why: Industry standard for Node.js, excellent TypeScript support, built into NestJS

**Frontend Unit**: **Jest + React Native Testing Library**
- Why: Best practices for React testing, encourages accessible component design

**Frontend E2E**: **Detox** (Deferred to Post-MVP if Time-Constrained)
- Why: Built for React Native, reliable E2E testing
- Trade-off: Setup complexity; defer unless critical flows need coverage

**API Contract Tests**: **Pact** (Optional)
- Why: Consumer-driven contracts prevent breaking changes
- Trade-off: Additional setup; recommended but not mandatory for MVP

---

## Summary Table

| Decision Area          | Choice                          | Key Rationale                                  |
|------------------------|---------------------------------|------------------------------------------------|
| Frontend Framework     | React Native + TypeScript       | Mobile-first, cross-platform, type-safe        |
| Backend Framework      | Node.js + NestJS + TypeScript   | Full-stack TypeScript, clean architecture      |
| Database               | PostgreSQL 15+                  | Relational + JSONB flexibility, strong ACID    |
| Cache/Queue            | Redis                           | Session storage, job queue (BullMQ), rate limiting |
| Authentication         | JWT + Refresh Tokens            | Stateless, mobile-friendly, extensible         |
| Password Hashing       | Argon2id                        | OWASP-recommended, GPU-resistant               |
| Offline Storage        | WatermelonDB (SQLite)           | React Native-optimized, sync-ready             |
| AI Service             | OpenAI GPT-4 API                | Fast MVP, explainable, no custom ML needed     |
| Deployment             | Railway (PaaS)                  | Zero DevOps, managed services, fast iteration  |
| Testing (Backend)      | Jest + Supertest                | Industry standard, NestJS integration          |
| Testing (Frontend)     | Jest + RN Testing Library       | Best practices, accessibility-focused          |

---

## Deferred Decisions (Post-MVP)

1. **Custom AI Model**: Defer until API costs justify investment
2. **CDN**: No static assets in MVP; defer
3. **Advanced Monitoring (Datadog, New Relic)**: Structured logs + Railway metrics sufficient for MVP
4. **Object Storage (S3)**: No file uploads in MVP
5. **Search Engine (Elasticsearch)**: No full-text search required
6. **Multi-Region Deployment**: Single region sufficient for MVP
7. **Advanced Caching (CDN, Redis Cluster)**: Simple caching sufficient
8. **Container Orchestration (Kubernetes)**: PaaS sufficient for MVP scale

---

**Status**: ✅ **All Major Decisions Finalized**

This research document has resolved all technology choices required for implementation. Proceed to data modeling and API contract design.

