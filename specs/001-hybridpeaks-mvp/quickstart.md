# HybridPeaks MVP: Developer Quickstart

**Feature**: 001-hybridpeaks-mvp  
**Last Updated**: 2025-12-28  
**Audience**: Developers joining the project

---

## Welcome

This guide will get you up and running with HybridPeaks MVP in under 30 minutes. We'll cover:

1. Prerequisites and setup
2. Backend development environment
3. Frontend (mobile) development environment
4. Running the full stack locally
5. Key development workflows
6. Testing strategy
7. Deployment process

---

## Prerequisites

### Required Software

| Tool            | Version  | Purpose                          |
|-----------------|----------|----------------------------------|
| Node.js         | 20.x LTS | Backend runtime + frontend tools |
| npm             | 10.x     | Package manager                  |
| PostgreSQL      | 15+      | Primary database                 |
| Redis           | 7.x      | Session storage + job queue      |
| Git             | 2.x      | Version control                  |

### Optional but Recommended

| Tool            | Version | Purpose                          |
|-----------------|---------|----------------------------------|
| Docker Desktop  | Latest  | Containerized dependencies       |
| VS Code         | Latest  | Recommended IDE                  |
| Postman/Insomnia| Latest  | API testing                      |
| Xcode           | 15+     | iOS development (macOS only)     |
| Android Studio  | Latest  | Android development              |

### Mobile Development (React Native)

**iOS (macOS only)**:
- Xcode 15+ (from App Store)
- Xcode Command Line Tools: `xcode-select --install`
- CocoaPods: `sudo gem install cocoapods`

**Android**:
- Android Studio (includes Android SDK)
- Java Development Kit (JDK) 17+
- Configure `ANDROID_HOME` environment variable

---

## Quick Setup (5 Minutes)

### 1. Clone Repository

```bash
git clone https://github.com/yourorg/hybridpeaks.git
cd hybridpeaks
```

### 2. Install Dependencies

**Backend:**

```bash
cd backend
npm install
```

**Frontend:**

```bash
cd ../mobile
npm install
```

**iOS (macOS only):**

```bash
cd ios
pod install
cd ..
```

### 3. Start Dependencies (Docker)

```bash
# From project root
docker-compose up -d
```

This starts PostgreSQL and Redis in containers.

**Docker Compose Configuration** (`docker-compose.yml`):

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: hybridpeaks
      POSTGRES_PASSWORD: dev_password
      POSTGRES_DB: hybridpeaks_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### 4. Configure Environment

**Backend** (`backend/.env`):

```bash
# Copy example and edit
cp .env.example .env

# Edit .env with your values
NODE_ENV=development
PORT=3000
API_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://hybridpeaks:dev_password@localhost:5432/hybridpeaks_dev

# JWT
JWT_SECRET=<generate-with: openssl rand -base64 32>
JWT_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d

# Redis
REDIS_URL=redis://localhost:6379

# AI Service
AI_SERVICE_URL=https://api.openai.com/v1
AI_API_KEY=<your-openai-key>
```

**Frontend** (`mobile/.env`):

```bash
cp .env.example .env

# Edit .env
API_URL=http://localhost:3000/v1
ENV=development
```

### 5. Run Database Migrations

```bash
cd backend
npx prisma migrate dev
npx prisma db seed  # Optional: Load sample data
```

### 6. Start Development Servers

**Terminal 1 - Backend:**

```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**

```bash
cd mobile
npm start
```

**Terminal 3 - iOS Simulator (macOS):**

```bash
npm run ios
```

**OR Android Emulator:**

```bash
npm run android
```

---

## Project Structure

### Backend (`/backend`)

```
backend/
├── src/
│   ├── auth/                    # Authentication module
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── dto/
│   │   ├── guards/
│   │   └── strategies/
│   │
│   ├── training-plans/          # Planning module (coaches)
│   │   ├── plans.controller.ts
│   │   ├── plans.service.ts
│   │   ├── sessions.controller.ts
│   │   ├── sessions.service.ts
│   │   ├── dto/
│   │   └── entities/
│   │
│   ├── workout-logs/            # Logging module (athletes)
│   │   ├── logs.controller.ts
│   │   ├── logs.service.ts
│   │   ├── dto/
│   │   └── entities/
│   │
│   ├── progress/                # Weekly summaries, adherence
│   │   ├── progress.controller.ts
│   │   ├── progress.service.ts
│   │   └── dto/
│   │
│   ├── ai-assistant/            # AI summary generation
│   │   ├── ai.service.ts
│   │   ├── ai.processor.ts      # BullMQ job processor
│   │   └── prompts/
│   │
│   ├── benchmarks/              # Athlete metrics
│   │   ├── benchmarks.controller.ts
│   │   ├── benchmarks.service.ts
│   │   └── dto/
│   │
│   ├── exercises/               # Exercise catalog
│   │   ├── exercises.controller.ts
│   │   ├── exercises.service.ts
│   │   └── dto/
│   │
│   ├── common/                  # Shared utilities
│   │   ├── decorators/
│   │   ├── filters/
│   │   ├── guards/
│   │   ├── interceptors/
│   │   └── pipes/
│   │
│   ├── config/                  # Configuration
│   │   └── configuration.ts
│   │
│   ├── prisma/                  # Prisma ORM
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed.ts
│   │
│   ├── app.module.ts
│   └── main.ts
│
├── test/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── .env.example
├── .gitignore
├── nest-cli.json
├── package.json
├── tsconfig.json
└── README.md
```

### Frontend (`/mobile`)

```
mobile/
├── src/
│   ├── features/
│   │   ├── auth/
│   │   │   ├── screens/
│   │   │   ├── hooks/
│   │   │   └── api/
│   │   │
│   │   ├── today/               # Today view (REQ-5)
│   │   │   ├── screens/
│   │   │   │   └── TodayScreen.tsx
│   │   │   ├── components/
│   │   │   │   ├── SessionCard.tsx
│   │   │   │   └── StartWorkoutButton.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useTodaySessions.ts
│   │   │   └── api/
│   │   │
│   │   ├── workout-logging/     # Logging (REQ-6, REQ-7)
│   │   │   ├── screens/
│   │   │   ├── components/
│   │   │   └── hooks/
│   │   │
│   │   ├── planning/            # Coach planning
│   │   │   ├── screens/
│   │   │   ├── components/
│   │   │   └── hooks/
│   │   │
│   │   └── progress/            # Weekly summary, AI insights
│   │       ├── screens/
│   │       ├── components/
│   │       └── hooks/
│   │
│   ├── shared/
│   │   ├── components/          # UI library
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   └── Card.tsx
│   │   ├── hooks/
│   │   ├── utils/
│   │   ├── api/
│   │   │   ├── client.ts        # Axios wrapper
│   │   │   └── types.ts
│   │   └── store/
│   │       ├── authStore.ts     # Zustand
│   │       └── offlineStore.ts  # Sync queue
│   │
│   ├── navigation/
│   │   └── AppNavigator.tsx     # React Navigation
│   │
│   └── App.tsx
│
├── android/
├── ios/
├── .env.example
├── .gitignore
├── app.json
├── babel.config.js
├── metro.config.js
├── package.json
└── tsconfig.json
```

---

## Key Development Workflows

### 1. Adding a New API Endpoint

**Backend:**

```typescript
// 1. Define DTO (Data Transfer Object)
// src/training-plans/dto/create-plan.dto.ts
import { IsUUID, IsDateString } from 'class-validator';

export class CreatePlanDto {
  @IsUUID()
  athleteId: string;

  @IsDateString()
  weekStartDate: string;
}

// 2. Add method to service
// src/training-plans/plans.service.ts
@Injectable()
export class PlansService {
  constructor(private prisma: PrismaService) {}

  async createPlan(dto: CreatePlanDto, coachId: string): Promise<TrainingPlan> {
    // Validate athleteId belongs to coach
    const athlete = await this.prisma.athlete.findUnique({
      where: { id: dto.athleteId },
    });

    if (athlete.coachId !== coachId) {
      throw new ForbiddenException('Athlete not assigned to you');
    }

    // Create plan
    return this.prisma.trainingPlan.create({
      data: {
        athleteId: dto.athleteId,
        coachId,
        weekStartDate: new Date(dto.weekStartDate),
        status: 'active',
      },
    });
  }
}

// 3. Add controller endpoint
// src/training-plans/plans.controller.ts
@Controller('training-plans')
export class PlansController {
  constructor(private plansService: PlansService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('coach')
  async create(@Body() dto: CreatePlanDto, @CurrentUser() user): Promise<TrainingPlan> {
    return this.plansService.createPlan(dto, user.id);
  }
}
```

**Frontend:**

```typescript
// 1. Define API function
// src/features/planning/api/planningApi.ts
import apiClient from '@/shared/api/client';

export const planningApi = {
  createPlan: async (data: CreatePlanRequest) => {
    const response = await apiClient.post('/training-plans', data);
    return response.data;
  },
};

// 2. Create hook
// src/features/planning/hooks/useCreatePlan.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { planningApi } from '../api/planningApi';

export function useCreatePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: planningApi.createPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-plans'] });
    },
  });
}

// 3. Use in component
// src/features/planning/screens/CreatePlanScreen.tsx
export function CreatePlanScreen() {
  const createPlan = useCreatePlan();

  const handleSubmit = (data) => {
    createPlan.mutate(data, {
      onSuccess: () => {
        navigation.navigate('PlanDetail', { planId: data.id });
      },
    });
  };

  return <Form onSubmit={handleSubmit} />;
}
```

### 2. Adding a Database Table

```bash
# 1. Edit Prisma schema
# backend/prisma/schema.prisma

model NewEntity {
  id        String   @id @default(uuid())
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

# 2. Create migration
npx prisma migrate dev --name add_new_entity

# 3. Generate Prisma Client
npx prisma generate
```

### 3. Running Tests

**Backend:**

```bash
# Unit tests
npm run test

# Integration tests
npm run test:e2e

# Coverage
npm run test:cov

# Watch mode
npm run test:watch
```

**Frontend:**

```bash
# Unit tests
npm test

# Watch mode
npm test:watch

# E2E tests (Detox, if configured)
npm run test:e2e:ios
npm run test:e2e:android
```

### 4. Database Operations

```bash
# View database in Prisma Studio
npx prisma studio

# Reset database (DANGER: Deletes all data)
npx prisma migrate reset

# Apply migrations (production)
npx prisma migrate deploy

# Generate Prisma Client after schema changes
npx prisma generate
```

---

## Common Tasks

### Create a New Feature Module (Backend)

```bash
# NestJS CLI
nest generate module feature-name
nest generate controller feature-name
nest generate service feature-name
```

### Debug Mobile App

**VS Code Launch Configuration** (`.vscode/launch.json`):

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Attach to Packager (iOS)",
      "cwd": "${workspaceFolder}/mobile",
      "type": "reactnativedirect",
      "request": "attach",
      "port": 8081
    },
    {
      "name": "Attach to Packager (Android)",
      "cwd": "${workspaceFolder}/mobile",
      "type": "reactnativedirect",
      "request": "attach",
      "port": 8081
    }
  ]
}
```

### View Logs

**Backend:**

```bash
# Development (console output)
npm run dev

# Production-like structured logs
npm run start:prod
```

**Frontend:**

```bash
# iOS
npx react-native log-ios

# Android
npx react-native log-android
```

---

## Testing Strategy

### Backend Testing

**Unit Tests** (Jest):

```typescript
// Example: src/training-plans/plans.service.spec.ts
describe('PlansService', () => {
  let service: PlansService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PlansService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get(PlansService);
    prisma = module.get(PrismaService);
  });

  it('should create a plan', async () => {
    const dto = { athleteId: 'uuid', weekStartDate: '2025-12-29' };
    const result = await service.createPlan(dto, 'coach-uuid');
    expect(result).toHaveProperty('id');
  });
});
```

**Integration Tests** (Supertest):

```typescript
// Example: test/training-plans.e2e-spec.ts
describe('Training Plans (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    // Setup app and authenticate
    authToken = await getAuthToken();
  });

  it('/training-plans (POST)', () => {
    return request(app.getHttpServer())
      .post('/training-plans')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ athleteId: 'uuid', weekStartDate: '2025-12-29' })
      .expect(201)
      .expect((res) => {
        expect(res.body).toHaveProperty('id');
      });
  });
});
```

### Frontend Testing

**Component Tests** (React Native Testing Library):

```typescript
// Example: src/features/today/components/SessionCard.test.tsx
import { render, fireEvent } from '@testing-library/react-native';
import { SessionCard } from './SessionCard';

describe('SessionCard', () => {
  it('renders session details', () => {
    const session = { type: 'strength', focus: 'Lower Body' };
    const { getByText } = render(<SessionCard session={session} />);
    expect(getByText('Lower Body')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByText } = render(<SessionCard onPress={onPress} />);
    fireEvent.press(getByText('Start Workout'));
    expect(onPress).toHaveBeenCalled();
  });
});
```

---

## Deployment

### Staging Deployment (Automatic)

```bash
# Push to develop branch
git push origin develop

# GitHub Actions automatically deploys to Railway staging
```

### Production Deployment (Manual)

```bash
# 1. Merge to main
git checkout main
git merge develop
git push origin main

# 2. Approve deployment in Railway dashboard
# 3. Run smoke tests
npm run test:smoke:prod

# 4. Monitor logs
railway logs
```

### Environment Variables (Railway)

Set in Railway dashboard:

- `DATABASE_URL` (from Railway PostgreSQL add-on)
- `REDIS_URL` (from Railway Redis add-on)
- `JWT_SECRET` (generate securely)
- `AI_API_KEY` (OpenAI API key)

---

## Troubleshooting

### Backend Won't Start

**Issue**: Database connection error

**Solution**:

```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Check connection string in .env
psql $DATABASE_URL

# Run migrations
npx prisma migrate dev
```

### Frontend Build Errors

**Issue**: "Unable to resolve module"

**Solution**:

```bash
# Clear Metro bundler cache
npm start -- --reset-cache

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# iOS: Reinstall pods
cd ios && pod install && cd ..
```

### Tests Failing

**Issue**: Database state from previous tests

**Solution**:

```bash
# Reset test database
NODE_ENV=test npx prisma migrate reset

# Run tests in isolation
npm run test -- --runInBand
```

---

## Additional Resources

### Documentation

- [NestJS Documentation](https://docs.nestjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [React Navigation](https://reactnavigation.org/)
- [React Query](https://tanstack.com/query/latest)

### Internal Docs

- [Architecture Decision Records](../planning/research.md)
- [Data Model](../planning/data-model.md)
- [API Contracts](../contracts/openapi.yaml)
- [Technical Implementation Plan](../plan.md)

### Team Communication

- Slack: `#hybridpeaks-dev`
- Stand-ups: Daily at 10:00 AM
- Code reviews: GitHub Pull Requests

---

## Next Steps

1. ✅ Complete setup steps above
2. ✅ Run the app locally (backend + mobile)
3. ✅ Review architecture documents in `specs/001-hybridpeaks-mvp/`
4. ✅ Pick up a task from the current milestone (see project board)
5. ✅ Create a feature branch: `git checkout -b feature/your-feature-name`
6. ✅ Submit a pull request when ready

**Welcome to the team!** 🚀

If you encounter any issues, reach out in `#hybridpeaks-dev` on Slack.

