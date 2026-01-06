# Implementation Plan: Athlete Device Connections (Garmin/Wahoo OAuth)

**Branch**: `004-athlete-device-connections` | **Date**: 2025-01-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-garmin-oauth/spec.md`

## Summary

Enable athletes to connect their Garmin or Wahoo accounts to HybridPeaks via OAuth 2.0. Athletes authorize HybridPeaks once per provider, and the platform stores encrypted tokens securely. Athletes can manage multiple connections (Garmin + Wahoo) and set a primary provider for automatic workout delivery. Connection status is visible in Athlete PWA, and expired/revoked tokens can be reconnected.

**⚠️ MVP Scope Clarification**: This feature enables OAuth connections for **exporting workouts TO devices only**. MVP does NOT import activities, analyze streams, or provide execution analysis. Athletes execute workouts on their devices, and coaches see adherence via manual workout logs in HybridPeaks.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20.x LTS  
**Primary Dependencies**: NestJS, Prisma ORM, OAuth 2.0 (Garmin/Wahoo APIs), crypto (AES-256-GCM encryption)  
**Storage**: PostgreSQL (DeviceConnection model linked to AthleteProfile)  
**Testing**: Jest (unit tests for services, integration tests for OAuth flow)  
**Target Platform**: NestJS REST API (backend) + React PWA (frontend)  
**Project Type**: Web application (backend + frontend)  
**Performance Goals**: < 2s for OAuth token exchange, < 100ms for connection status checks  
**Constraints**: Tokens must be encrypted at rest, OAuth state parameter for CSRF protection, automatic token refresh  
**Scale/Scope**: Two OAuth providers (Garmin + Wahoo), one connection per provider per athlete, primary provider selection

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

✅ **Guardrail 21 (No Temporary Workarounds)**: Uses standard OAuth 2.0 flow, no workarounds  
✅ **Guardrail 22 (Strict Type Safety)**: All inputs/outputs use DTOs with strict typing  
✅ **Guardrail 23 (Controllers Must Be Thin)**: Controllers delegate to services, services handle OAuth logic  
✅ **Guardrail 24 (DTO/Schema Validation)**: OAuth callback params validated via DTOs  
✅ **Guardrail 25 (Migrations Required)**: New DeviceConnection model requires migration  
✅ **Guardrail 26 (No New Documentation)**: Only updating existing API contracts if needed

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
│   │   └── devices/              # NEW: Device OAuth module
│   │       ├── device-oauth.service.ts      # OAuth flow, token management
│   │       ├── device-oauth.controller.ts   # OAuth endpoints (connect, callback)
│   │       ├── device-api.service.ts        # Provider API client (Garmin/Wahoo)
│   │       ├── device-oauth.module.ts       # NestJS module
│   │       └── dto/
│   │           └── device-callback.dto.ts   # OAuth callback validation
│   ├── athlete/
│   │   ├── athlete.controller.ts            # Add GET /connections endpoint
│   │   └── athlete.service.ts              # Add connection management methods
│   └── prisma/
│       └── schema.prisma                    # Add DeviceConnection model
└── tests/
    └── auth/
        └── devices/
            └── device-oauth.e2e-spec.ts     # Integration tests

athlete-pwa/
├── src/
│   ├── App.tsx                              # Add Profile → Connections UI
│   └── components/
│       └── Connections.tsx                  # NEW: Connections management component
```

**Structure Decision**: This feature creates a new `devices` module under `auth/` to handle OAuth for both Garmin and Wahoo. The module is provider-agnostic and can be extended for future providers. Athlete module is extended with connection management endpoints. Frontend adds Connections UI in Profile section.

## Implementation Approach

### Phase 0: Research & Design

**Existing Infrastructure:**
- ✅ JWT authentication exists (`JwtAuthGuard`, `RolesGuard`)
- ✅ Athlete authentication flow exists
- ✅ Prisma schema and migrations framework exists
- ✅ Config service exists for environment variables
- ✅ Garmin/Wahoo exporter stubs exist (Features 002-003)

**Design Decisions:**

1. **Database Model**: `DeviceConnection`
   - Links to `AthleteProfile` (not `CoachProfile`)
   - Fields: `id`, `athleteProfileId`, `provider` (GARMIN | WAHOO), `accessToken` (encrypted), `refreshToken` (encrypted), `expiresAt`, `status` (CONNECTED | EXPIRED | REVOKED | ERROR), `connectedAt`, `isPrimary`
   - Unique constraint: `(athleteProfileId, provider)` - one connection per provider per athlete

2. **OAuth Flow**:
   - Initiate: `GET /api/athlete/garmin/connect` or `/api/athlete/wahoo/connect`
   - Callback: `GET /api/athlete/garmin/callback` or `/api/athlete/wahoo/callback`
   - State parameter for CSRF protection (stored temporarily, 10min expiry)

3. **Token Encryption**:
   - Application-level encryption using AES-256-GCM
   - Encryption key from environment variable (`GARMIN_TOKEN_ENCRYPTION_KEY`, `WAHOO_TOKEN_ENCRYPTION_KEY`)
   - Format: `IV:AuthTag:EncryptedData` (hex encoded)

4. **Provider Abstraction**:
   - `DeviceOAuthService` handles OAuth flow generically
   - Provider-specific config (clientId, clientSecret, URLs) from environment
   - `DeviceApiService` handles provider API calls (can be extended per provider)

5. **Primary Provider**:
   - Athlete can set one provider as primary
   - Only one primary per athlete (enforced by unique constraint or application logic)
   - Used by auto-push feature (Feature 005) to select which provider to use

### Phase 1: Implementation

**Files to Create/Modify:**

1. **Database Schema** (`backend/prisma/schema.prisma`)
   - Add `DeviceConnection` model
   - Add relationship to `AthleteProfile`
   - Create migration

2. **Device OAuth Service** (`backend/src/auth/devices/device-oauth.service.ts`)
   - `generateAuthUrl(provider, state)`: Generate OAuth URL for provider
   - `exchangeCodeForTokens(provider, code, athleteUserId)`: Exchange code for tokens
   - `refreshAccessTokenIfNeeded(provider, athleteUserId)`: Auto-refresh expired tokens
   - `getConnection(provider, athleteUserId)`: Get connection status
   - `storeConnection(provider, athleteUserId, tokens)`: Store encrypted tokens
   - `encryptToken(token)`: Encrypt token before storage
   - `decryptToken(encryptedToken)`: Decrypt token after retrieval

3. **Device API Service** (`backend/src/auth/devices/device-api.service.ts`)
   - `createWorkout(provider, accessToken, workout)`: Create workout in provider
   - `refreshToken(provider, refreshToken)`: Exchange refresh token for new access token
   - Provider-specific API client (Garmin/Wahoo)

4. **Device OAuth Controller** (`backend/src/auth/devices/device-oauth.controller.ts`)
   - `GET /athlete/garmin/connect`: Redirect to Garmin OAuth
   - `GET /athlete/garmin/callback`: Handle Garmin OAuth callback
   - `GET /athlete/wahoo/connect`: Redirect to Wahoo OAuth
   - `GET /athlete/wahoo/callback`: Handle Wahoo OAuth callback
   - State parameter validation and storage

5. **Athlete Service** (`backend/src/athlete/athlete.service.ts`)
   - `getConnections(athleteUserId)`: Get all connections with status
   - `setPrimaryProvider(athleteUserId, provider)`: Set primary provider

6. **Athlete Controller** (`backend/src/athlete/athlete.controller.ts`)
   - `GET /connections`: Get athlete's connections
   - `PUT /connections/primary`: Set primary provider

7. **Frontend** (`athlete-pwa/src/`)
   - Profile → Connections UI
   - Connect buttons for Garmin/Wahoo
   - Connection status display
   - Primary provider selector
   - Reconnect button for expired/revoked

### Phase 2: Validation

- Manual OAuth flow testing with Garmin/Wahoo
- Token encryption/decryption verification
- Connection status accuracy
- Primary provider selection
- Token refresh automation
- Error handling (expired, revoked, network errors)

## Complexity Tracking

> **No violations** - This feature follows OAuth 2.0 standards and existing authentication patterns.
