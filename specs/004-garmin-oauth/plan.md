# Implementation Plan: Garmin OAuth Integration

**Branch**: `004-garmin-oauth` | **Date**: 2025-12-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-garmin-oauth/spec.md`

## Summary

Implement Garmin OAuth 2.0 integration to enable coaches to connect their Garmin accounts and export endurance workouts directly to Garmin Connect. This includes OAuth flow (connect/callback endpoints), secure token storage, automatic token refresh, workout export with validation, and Garmin API integration. The export flow normalizes workouts, validates them, converts to Garmin format, and creates drafts in Garmin Connect.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20.x LTS  
**Primary Dependencies**: NestJS, Passport (for OAuth), Prisma ORM, axios/fetch (for Garmin API calls), crypto (for state/token encryption)  
**Storage**: PostgreSQL (GarminConnection table for tokens)  
**Testing**: Jest (unit tests for services, integration tests for endpoints)  
**Target Platform**: NestJS REST API (backend only)  
**Project Type**: Web application (backend module)  
**Performance Goals**: OAuth redirect < 100ms, token exchange < 2s, export < 3s  
**Constraints**: Secure token storage (encrypted), OAuth state CSRF protection, automatic token refresh, configurable Garmin endpoints  
**Scale/Scope**: Single OAuth provider (Garmin), one connection per coach, export single workouts

## Constitution Check

✅ **Guardrail 21 (No Temporary Workarounds)**: No workarounds - proper OAuth implementation  
✅ **Guardrail 22 (Strict Type Safety)**: All OAuth flows and API calls will use strict types  
✅ **Guardrail 23 (Controllers Must Be Thin)**: Controllers delegate to services for OAuth and export logic  
✅ **Guardrail 24 (DTO/Schema Validation)**: OAuth callbacks and export requests validated with DTOs  
✅ **Guardrail 25 (Migrations Required)**: New GarminConnection table requires Prisma migration  
✅ **Guardrail 26 (No New Documentation)**: Only code, no new docs

## Project Structure

### Documentation (this feature)

```text
specs/004-garmin-oauth/
├── plan.md              # This file
├── spec.md              # Feature specification
└── tasks.md             # Task breakdown (to be created)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── auth/
│   │   └── garmin/
│   │       ├── garmin-oauth.controller.ts    # OAuth endpoints (connect, callback)
│   │       ├── garmin-oauth.service.ts      # OAuth flow logic
│   │       ├── garmin-api.service.ts        # Garmin API client
│   │       └── dto/
│   │           └── garmin-callback.dto.ts   # OAuth callback validation
│   ├── coach/
│   │   ├── coach.controller.ts              # Add export endpoint
│   │   └── coach.service.ts                # Add export method with validation
│   ├── integrations/
│   │   └── endurance/
│   │       └── exporters/
│   │           └── garmin-exporter.stub.ts  # May need updates for real API
│   └── prisma/
│       └── migrations/                      # New migration for GarminConnection
└── tests/
    ├── auth/
    │   └── garmin/
    │       └── garmin-oauth.integration.spec.ts
    └── coach/
        └── export-garmin.integration.spec.ts
```

**Structure Decision**: New `auth/garmin/` module for OAuth logic, extends `coach` module for export endpoint. GarminConnection model added to Prisma schema.

## Implementation Approach

### Phase 0: Research & Design

**Configuration Requirements:**
- OAuth auth URL, token URL, and API base URL must be provided via environment
- Token encryption uses application-level encryption with a server-side key

**Design Decisions:**
1. **OAuth Flow**: Standard OAuth 2.0 authorization code flow
   - `/auth/garmin/connect` → redirects to Garmin with state parameter
   - `/auth/garmin/callback` → exchanges code for tokens, stores in DB

2. **Token Storage**: GarminConnection table
   - Fields: coachUserId, accessToken (encrypted), refreshToken (encrypted), expiresAt, connectedAt
   - One-to-one with User (coach only)

3. **Export Flow**: 
   - Normalize workout → Validate → Convert to Garmin format → Call Garmin API
   - Validation happens before API call (defensive checks)
   - Request draft status when supported by Garmin API

4. **Token Refresh**: Automatic refresh when access token expires
   - Check expiresAt before API calls
   - Use refresh token to get new access token
   - Update stored tokens

5. **Validation Logic**: Can live in exporter or service layer
   - Validate: steps ≥ 1, duration > 0, valid targets, cadence only for BIKE
   - Return clear error messages

6. **Connection Status Endpoint**:
   - Add GET `/coach/garmin/status` for UI connection checks
   - Returns `{ connected: boolean, connectedAt?: string }`

### Phase 1: Database Schema

**Migration**: Add GarminConnection model to Prisma schema
- Fields: id, coachUserId (unique), accessToken, refreshToken, expiresAt, connectedAt, createdAt, updatedAt
- Relationship: One-to-one with User (coach)

### Phase 2: OAuth Implementation

**Files to Create:**
1. `garmin-oauth.controller.ts` - OAuth endpoints
2. `garmin-oauth.service.ts` - OAuth flow logic
3. `garmin-api.service.ts` - Garmin API client
4. DTOs for callback validation

### Phase 3: Export Implementation

**Files to Modify:**
1. `coach.controller.ts` - Add export endpoint
2. `coach.service.ts` - Add export method with validation
3. `garmin-exporter.stub.ts` - May need updates for real API format

### Phase 4: Validation

- Unit tests for services
- Integration tests for OAuth flow
- Integration tests for export flow
- Manual testing with Garmin sandbox/test account

## Complexity Tracking

> **No violations** - Standard OAuth implementation following NestJS patterns.
