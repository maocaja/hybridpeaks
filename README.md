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

## Development Workflow

### Running All Apps Simultaneously

Open three terminal windows:

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
- **Coach Web**: React TypeScript for coaches to plan training
- **Athlete PWA**: React TypeScript PWA for athletes to execute and log training (mobile-first, offline-capable)

## Documentation

- [Feature Specification](./specs/001-hybridpeaks-mvp/spec.md) - Product requirements
- [Technical Plan](./specs/001-hybridpeaks-mvp/plan.md) - Architecture and tech stack decisions
- [Implementation Tasks](./specs/001-hybridpeaks-mvp/tasks.md) - Development roadmap
- [API Contracts](./specs/001-hybridpeaks-mvp/contracts/openapi.yaml) - OpenAPI specification
- [Developer Quickstart](./specs/001-hybridpeaks-mvp/quickstart.md) - Detailed setup guide

## Project Status

**Current Milestone**: 0.1 - Core Infrastructure & Authentication (Week 1-2)

See [tasks.md](./specs/001-hybridpeaks-mvp/tasks.md) for detailed implementation plan.

## License

Proprietary - All rights reserved

