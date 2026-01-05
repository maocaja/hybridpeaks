import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { WeeklyPlansService } from './weekly-plans.service';
import { PrismaService } from '../prisma/prisma.service';
import { SessionType, Modality } from '@prisma/client';
import { CreateWeeklyPlanDto } from './dto/create-weekly-plan.dto';

type CoachProfileRecord = {
  id: string;
  athletes: Array<{ athleteProfile: { userId: string } }>;
};

type WeeklyPlanRecord = {
  id: string;
  coachId: string;
  athleteUserId: string;
  weekStart: Date;
  notes: string | null;
  sessions: Array<{
    id: string;
    weeklyPlanId: string;
    date: Date;
    type: SessionType;
    title: string;
    prescription: Record<string, unknown>;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
};

function buildService(prismaOverrides: Partial<PrismaService> = {}) {
  type WeeklyPlanCreate = PrismaService['weeklyPlan']['create'];
  const weeklyPlanCreate = jest.fn<
    ReturnType<WeeklyPlanCreate>,
    Parameters<WeeklyPlanCreate>
  >();
  const prisma = {
    coachProfile: {
      findUnique: jest.fn<Promise<CoachProfileRecord | null>, [unknown]>(),
    },
    user: {
      findUnique: jest.fn<Promise<{ id: string } | null>, [unknown]>(),
    },
    weeklyPlan: {
      findUnique: jest.fn<Promise<WeeklyPlanRecord | null>, [unknown]>(),
      create: weeklyPlanCreate,
    },
    exercise: {
      findUnique: jest.fn<
        Promise<{ id: string; type: string } | null>,
        [unknown]
      >(),
    },
    ...prismaOverrides,
  } as unknown as PrismaService;

  return { prisma, service: new WeeklyPlansService(prisma), weeklyPlanCreate };
}

describe('WeeklyPlansService endurance normalization', () => {
  it('normalizes legacy endurance intervals with invalid duration to 60s and note', async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    const { prisma, service, weeklyPlanCreate } = buildService();

    prisma.coachProfile.findUnique = jest.fn().mockResolvedValue({
      id: 'coach-profile',
      athletes: [{ athleteProfile: { userId: 'athlete-1' } }],
    });
    prisma.user.findUnique = jest.fn().mockResolvedValue({ id: 'athlete-1' });
    prisma.weeklyPlan.findUnique = jest.fn().mockResolvedValue(null);
    weeklyPlanCreate.mockResolvedValue({
      id: 'plan-1',
      coachId: 'coach-1',
      athleteUserId: 'athlete-1',
      weekStart: new Date('2025-01-06T00:00:00.000Z'),
      notes: null,
      sessions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    } as WeeklyPlanRecord);

    const dto: CreateWeeklyPlanDto = {
      weekStart: '2025-01-06',
      sessions: [
        {
          date: '2025-01-06',
          type: SessionType.ENDURANCE,
          title: 'Legacy Run',
          prescription: {
            modality: Modality.RUN,
            intervals: [
              {
                durationSeconds: 0,
                targetType: 'POWER',
                targetZoneOrValue: 'Z2',
              },
            ],
            warmup: 'Easy jog',
            cooldown: 'Walk',
          },
        },
      ],
    };

    await service.createWeeklyPlan('coach-1', 'athlete-1', dto);

    const createArgs = weeklyPlanCreate.mock.calls[0]?.[0];
    if (!createArgs) {
      throw new Error('Expected weeklyPlan.create to be called');
    }
    const sessionsCreate = createArgs.data.sessions?.create;
    if (!sessionsCreate) {
      throw new Error('Expected weeklyPlan.create to include sessions');
    }
    const createdSession = Array.isArray(sessionsCreate)
      ? sessionsCreate[0]
      : sessionsCreate;
    const prescription = createdSession.prescription as {
      sport: string;
      steps: Array<{
        duration: { value: number };
        note?: string;
        primaryTarget?: { kind: string };
      }>;
    };

    expect(prescription.sport).toBe('RUN');
    expect(prescription.steps[0].duration.value).toBe(60);
    expect(prescription.steps[0].note).toContain('Legacy duration: 0');
    expect(prescription.steps[0].primaryTarget?.kind).toBe('POWER');
    consoleWarnSpy.mockRestore();
  });

  it('rejects cadence target for non-bike sport', async () => {
    const { prisma, service } = buildService();

    prisma.coachProfile.findUnique = jest.fn().mockResolvedValue({
      id: 'coach-profile',
      athletes: [{ athleteProfile: { userId: 'athlete-1' } }],
    });
    prisma.user.findUnique = jest.fn().mockResolvedValue({ id: 'athlete-1' });
    prisma.weeklyPlan.findUnique = jest.fn().mockResolvedValue(null);
    prisma.weeklyPlan.create = jest.fn().mockResolvedValue({
      id: 'plan-1',
      coachId: 'coach-1',
      athleteUserId: 'athlete-1',
      weekStart: new Date('2025-01-06T00:00:00.000Z'),
      notes: null,
      sessions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    } as WeeklyPlanRecord);

    const dto: CreateWeeklyPlanDto = {
      weekStart: '2025-01-06',
      sessions: [
        {
          date: '2025-01-06',
          type: SessionType.ENDURANCE,
          title: 'Run with cadence',
          prescription: {
            sport: 'RUN',
            steps: [
              {
                type: 'WORK',
                duration: { type: 'TIME', value: 300 },
                cadenceTarget: {
                  kind: 'CADENCE',
                  unit: 'RPM',
                  minRpm: 80,
                  maxRpm: 90,
                },
              },
            ],
          },
        },
      ],
    };

    await expect(
      service.createWeeklyPlan('coach-1', 'athlete-1', dto),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects primary target with only min or max', async () => {
    const { prisma, service } = buildService();

    prisma.coachProfile.findUnique = jest.fn().mockResolvedValue({
      id: 'coach-profile',
      athletes: [{ athleteProfile: { userId: 'athlete-1' } }],
    });
    prisma.user.findUnique = jest.fn().mockResolvedValue({ id: 'athlete-1' });
    prisma.weeklyPlan.findUnique = jest.fn().mockResolvedValue(null);
    prisma.weeklyPlan.create = jest.fn().mockResolvedValue({
      id: 'plan-1',
      coachId: 'coach-1',
      athleteUserId: 'athlete-1',
      weekStart: new Date('2025-01-06T00:00:00.000Z'),
      notes: null,
      sessions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    } as WeeklyPlanRecord);

    const dto: CreateWeeklyPlanDto = {
      weekStart: '2025-01-06',
      sessions: [
        {
          date: '2025-01-06',
          type: SessionType.ENDURANCE,
          title: 'Invalid target',
          prescription: {
            sport: 'BIKE',
            steps: [
              {
                type: 'WORK',
                duration: { type: 'TIME', value: 300 },
                primaryTarget: {
                  kind: 'POWER',
                  unit: 'WATTS',
                  minWatts: 200,
                },
              },
            ],
          },
        },
      ],
    };

    await expect(
      service.createWeeklyPlan('coach-1', 'athlete-1', dto),
    ).rejects.toThrow(BadRequestException);
  });

  it('normalizes legacy prescriptions on read', async () => {
    const { prisma, service } = buildService();

    prisma.coachProfile.findUnique = jest.fn().mockResolvedValue({
      id: 'coach-profile',
      athletes: [{ athleteProfile: { userId: 'athlete-1' } }],
    });
    prisma.weeklyPlan.findUnique = jest.fn().mockResolvedValue({
      id: 'plan-1',
      coachId: 'coach-1',
      athleteUserId: 'athlete-1',
      weekStart: new Date('2025-01-06T00:00:00.000Z'),
      notes: null,
      sessions: [
        {
          id: 'session-1',
          weeklyPlanId: 'plan-1',
          date: new Date('2025-01-06T00:00:00.000Z'),
          type: SessionType.ENDURANCE,
          title: 'Legacy bike',
          prescription: {
            modality: Modality.BIKE,
            intervals: [
              {
                durationSeconds: 120,
                targetType: 'POWER',
                targetZoneOrValue: 'Z2',
              },
            ],
          },
          status: 'PLANNED',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    } as WeeklyPlanRecord);

    const plan = await service.getWeeklyPlan(
      'coach-1',
      'athlete-1',
      '2025-01-06',
    );

    const prescription = plan.sessions[0].prescription as {
      sport: string;
      steps: Array<{ duration: { value: number } }>;
    };
    expect(prescription.sport).toBe('BIKE');
    expect(prescription.steps[0].duration.value).toBe(120);
  });

  it('throws when coach-athlete relationship is missing', async () => {
    const { prisma, service } = buildService();
    prisma.coachProfile.findUnique = jest.fn().mockResolvedValue({
      id: 'coach-profile',
      athletes: [],
    });
    await expect(
      service.getWeeklyPlan('coach-1', 'athlete-1', '2025-01-06'),
    ).rejects.toThrow(ForbiddenException);
  });
});
