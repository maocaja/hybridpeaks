# HybridPeaks

Training platform for hybrid athletes (strength + endurance).

## Project Structure

This is a monorepo containing three applications:

```
hybridpeaks/
├── backend/          # NestJS TypeScript API
├── coach-web/        # Vite React TypeScript (Coach Web App)
├── athlete-pwa/      # Vite React TypeScript + PWA (Athlete Mobile-First Web App)
├── specs/            # Product specifications and technical plans
└── .specify/         # Project templates and documentation
```

## Prerequisites

- Node.js 20.x LTS
- npm 10.x
- PostgreSQL 15+ (for backend)
- Redis 7.x (for backend)

## Quick Start

### 1. Backend (NestJS API)

**📖 See full setup guide**: [`backend/GUIA-COMPLETA.md`](./backend/GUIA-COMPLETA.md)

**Quick Start**:
```bash
# Start PostgreSQL
docker-compose up -d

# Setup backend
cd backend
npm install
cp .env.example .env  # Edit with your values
npx prisma migrate deploy
npx prisma generate

# Run
npm run start:dev
```

The API will start on `http://localhost:3000`

**Available commands:**
- `npm run start` - Start in production mode
- `npm run start:dev` - Start in watch mode (development)
- `npm run start:debug` - Start in debug mode
- `npm run build` - Build for production
- `npm run test` - Run unit tests
- `npm run test:e2e` - Run end-to-end tests

### 2. Coach Web App (Vite React)

```bash
cd coach-web
npm run dev
```

The coach app will start on `http://localhost:5173`

**Available commands:**
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### 3. Athlete PWA (Vite React + PWA)

```bash
cd athlete-pwa
npm run dev
```

The athlete PWA will start on `http://localhost:5174`

**Available commands:**
- `npm run dev` - Start development server
- `npm run build` - Build for production (generates PWA assets)
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Testing & Test Data

### Setting Up Test Data

To quickly set up test users, exercises, benchmarks, and training plans:

```bash
./setup-test-data.sh
```

This script creates:
- Coach user: `coach@test.com` / `password123`
- Athlete user: `athlete@test.com` / `password123`
- Sample exercises (Back Squat, Deadlift, Zone 2 Bike, Zone 2 Run)
- Benchmarks (FTP, HR Max, HR Rest, 1RM values)
- A weekly training plan with 4 sessions

**Note**: If users already exist, clean them first:
```bash
cd backend && npx prisma studio
# Delete: coach@test.com and athlete@test.com
```

See [`TESTING.md`](./TESTING.md) for complete testing guide and API examples.

## Development Workflow

### Running All Apps Simultaneously

**Option 1: Use the dev script (Recommended)**

From the repo root, run:
```bash
./dev.sh
```

This will:
- Start all three services (backend, coach-web, athlete-pwa)
- Install dependencies if needed
- Show service URLs and log file locations
- Handle cleanup on Ctrl+C

**Option 2: Manual (Three Terminal Windows)**

**Terminal 1 - Backend:**
```bash
cd backend && npm run start:dev
```

**Terminal 2 - Coach Web:**
```bash
cd coach-web && npm run dev
```

**Terminal 3 - Athlete PWA:**
```bash
cd athlete-pwa && npm run dev
```

### Environment Variables

Each app requires environment configuration. Copy `.env.example` to `.env` in each directory:

```bash
# Backend
cp backend/.env.example backend/.env

# Coach Web
cp coach-web/.env.example coach-web/.env

# Athlete PWA
cp athlete-pwa/.env.example athlete-pwa/.env
```

Then edit each `.env` file with your local configuration.

## Architecture

- **Backend**: NestJS TypeScript REST API with Prisma ORM (PostgreSQL)
  - **Endurance Prescription Model**: Step-based schema with repeat blocks, primary targets (power/HR/pace), and cadence targets (bike-only). Supports legacy format normalization.
  - **Integration System**: Pure endurance workout normalizer and exporter framework (Garmin stub included) for third-party platform integration.
- **Coach Web**: React TypeScript for coaches to plan training
  - Weekly plan builder with step-based endurance prescriptions
  - Athlete roster management and invitation system
  - Weekly adherence summary and session overview
- **Athlete PWA**: React TypeScript PWA for athletes to execute and log training (mobile-first, offline-capable)
  - Offline queue with IndexedDB for status updates and workout logs
  - Automatic token refresh and session management
  - Weekly session overview with optimistic UI

## Documentation

- [Feature Specification](./specs/001-hybridpeaks-mvp/spec.md) - Product requirements
- [Technical Plan](./specs/001-hybridpeaks-mvp/plan.md) - Architecture and tech stack decisions
- [Implementation Tasks](./specs/001-hybridpeaks-mvp/tasks.md) - Development roadmap
- [API Contracts](./specs/001-hybridpeaks-mvp/contracts/openapi.yaml) - OpenAPI specification
- [Developer Quickstart](./specs/001-hybridpeaks-mvp/quickstart.md) - Detailed setup guide

## Project Status

**Current Milestone**: 0.1 - Core Infrastructure & Authentication (Week 1-2)

**Recent Updates**:
- ✅ Step-based endurance prescription model with legacy support
- ✅ Endurance workout normalizer and exporter framework (Garmin stub)
- ✅ Coach Web: Weekly plan builder, athlete management, adherence summary
- ✅ Athlete PWA: Offline queue, token refresh, weekly overview
- ✅ Comprehensive test coverage for endurance normalization

See [tasks.md](./specs/001-hybridpeaks-mvp/tasks.md) for detailed implementation plan.

## License

Proprietary - All rights reserved

