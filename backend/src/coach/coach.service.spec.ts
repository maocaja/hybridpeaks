import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { CoachService } from './coach.service';
import { PrismaService } from '../prisma/prisma.service';
import { SessionType } from '@prisma/client';
import { normalizeEnduranceWorkout } from '../integrations/endurance/endurance-normalizer';
import type { NormalizedWorkout } from '../integrations/endurance/endurance-normalizer';

// Mock the normalizer
jest.mock('../integrations/endurance/endurance-normalizer', () => ({
  normalizeEnduranceWorkout: jest.fn(),
}));

type TrainingSessionRecord = {
  id: string;
  weeklyPlanId: string;
  date: Date;
  type: SessionType;
  title: string;
  prescription: Record<string, unknown>;
  status: string;
  weeklyPlan: {
    athleteUserId: string;
  };
};

function buildService(prismaOverrides: Partial<PrismaService> = {}) {
  const prisma = {
    coachProfile: {
      findUnique: jest.fn(),
    },
    trainingSession: {
      findUnique: jest.fn<Promise<TrainingSessionRecord | null>, [unknown]>(),
    },
    ...prismaOverrides,
  } as unknown as PrismaService;

  return { prisma, service: new CoachService(prisma) };
}

describe('CoachService.getNormalizedWorkout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns normalized workout for valid endurance session', async () => {
    const { prisma, service } = buildService();

    const mockSession: TrainingSessionRecord = {
      id: 'session-1',
      weeklyPlanId: 'plan-1',
      date: new Date('2025-01-06'),
      type: SessionType.ENDURANCE,
      title: 'Bike Workout',
      prescription: {
        sport: 'BIKE',
        steps: [
          {
            type: 'WARMUP',
            duration: { type: 'TIME', value: 600 },
            primaryTarget: { kind: 'POWER', unit: 'WATTS', zone: 1 },
          },
        ],
      },
      status: 'PLANNED',
      weeklyPlan: {
        athleteUserId: 'athlete-1',
      },
    };

    const mockNormalized: NormalizedWorkout = {
      sport: 'BIKE',
      steps: [
        {
          type: 'WARMUP',
          duration: { seconds: 600 },
          primaryTarget: {
            kind: 'POWER',
            unit: 'WATTS',
            zone: 1,
          },
        },
      ],
    };

    prisma.trainingSession.findUnique = jest
      .fn()
      .mockResolvedValue(mockSession);
    prisma.coachProfile.findUnique = jest.fn().mockResolvedValue({
      id: 'coach-profile',
      athletes: [{ athleteProfile: { userId: 'athlete-1' } }],
    });

    (normalizeEnduranceWorkout as jest.Mock).mockReturnValue(mockNormalized);

    const result = await service.getNormalizedWorkout('coach-1', 'session-1');

    expect(result).toEqual(mockNormalized);
    expect(normalizeEnduranceWorkout).toHaveBeenCalledWith({
      sport: 'BIKE',
      steps: [
        {
          type: 'WARMUP',
          duration: { type: 'TIME', value: 600 },
          primaryTarget: { kind: 'POWER', unit: 'WATTS', zone: 1 },
        },
      ],
    });
  });

  it('throws 404 when session not found', async () => {
    const { prisma, service } = buildService();

    prisma.trainingSession.findUnique = jest.fn().mockResolvedValue(null);

    await expect(
      service.getNormalizedWorkout('coach-1', 'non-existent'),
    ).rejects.toThrow(NotFoundException);
    expect(normalizeEnduranceWorkout).not.toHaveBeenCalled();
  });

  it('throws 403 when coach does not have roster access', async () => {
    const { prisma, service } = buildService();

    const mockSession: TrainingSessionRecord = {
      id: 'session-1',
      weeklyPlanId: 'plan-1',
      date: new Date('2025-01-06'),
      type: SessionType.ENDURANCE,
      title: 'Bike Workout',
      prescription: { sport: 'BIKE', steps: [] },
      status: 'PLANNED',
      weeklyPlan: {
        athleteUserId: 'athlete-1',
      },
    };

    prisma.trainingSession.findUnique = jest
      .fn()
      .mockResolvedValue(mockSession);
    prisma.coachProfile.findUnique = jest.fn().mockResolvedValue({
      id: 'coach-profile',
      athletes: [], // No athletes in roster
    });

    await expect(
      service.getNormalizedWorkout('coach-1', 'session-1'),
    ).rejects.toThrow(ForbiddenException);
    expect(normalizeEnduranceWorkout).not.toHaveBeenCalled();
  });

  it('throws 400 when session is not endurance type', async () => {
    const { prisma, service } = buildService();

    const mockSession: TrainingSessionRecord = {
      id: 'session-1',
      weeklyPlanId: 'plan-1',
      date: new Date('2025-01-06'),
      type: SessionType.STRENGTH,
      title: 'Strength Workout',
      prescription: { exercises: [] },
      status: 'PLANNED',
      weeklyPlan: {
        athleteUserId: 'athlete-1',
      },
    };

    prisma.trainingSession.findUnique = jest
      .fn()
      .mockResolvedValue(mockSession);
    prisma.coachProfile.findUnique = jest.fn().mockResolvedValue({
      id: 'coach-profile',
      athletes: [{ athleteProfile: { userId: 'athlete-1' } }],
    });

    await expect(
      service.getNormalizedWorkout('coach-1', 'session-1'),
    ).rejects.toThrow(BadRequestException);
    expect(normalizeEnduranceWorkout).not.toHaveBeenCalled();
  });

  it('handles legacy prescription format correctly', async () => {
    const { prisma, service } = buildService();

    // Note: In the DB, legacy prescriptions are already normalized by weekly-plans.service.ts
    // So the prescription in DB will have the new format (sport + steps) even if originally legacy
    const mockSession: TrainingSessionRecord = {
      id: 'session-1',
      weeklyPlanId: 'plan-1',
      date: new Date('2025-01-06'),
      type: SessionType.ENDURANCE,
      title: 'Legacy Run (normalized)',
      prescription: {
        sport: 'RUN',
        steps: [
          {
            type: 'WORK',
            duration: { type: 'TIME', value: 600 },
            primaryTarget: {
              kind: 'PACE',
              unit: 'SEC_PER_KM',
              zone: 2,
            },
            note: 'Legacy duration: 0', // Note indicating it was converted from legacy
          },
        ],
      },
      status: 'PLANNED',
      weeklyPlan: {
        athleteUserId: 'athlete-1',
      },
    };

    const mockNormalized: NormalizedWorkout = {
      sport: 'RUN',
      steps: [
        {
          type: 'WORK',
          duration: { seconds: 600 },
          primaryTarget: {
            kind: 'PACE',
            unit: 'SEC_PER_KM',
            zone: 2,
          },
          note: 'Legacy duration: 0',
        },
      ],
    };

    prisma.trainingSession.findUnique = jest
      .fn()
      .mockResolvedValue(mockSession);
    prisma.coachProfile.findUnique = jest.fn().mockResolvedValue({
      id: 'coach-profile',
      athletes: [{ athleteProfile: { userId: 'athlete-1' } }],
    });

    (normalizeEnduranceWorkout as jest.Mock).mockReturnValue(mockNormalized);

    const result = await service.getNormalizedWorkout('coach-1', 'session-1');

    expect(result).toEqual(mockNormalized);
    // The prescription in DB is already normalized, so it's passed directly to the normalizer
  });

  it('handles new step-based prescription format correctly', async () => {
    const { prisma, service } = buildService();

    const mockSession: TrainingSessionRecord = {
      id: 'session-1',
      weeklyPlanId: 'plan-1',
      date: new Date('2025-01-06'),
      type: SessionType.ENDURANCE,
      title: 'Bike Workout',
      prescription: {
        sport: 'BIKE',
        steps: [
          {
            type: 'WARMUP',
            duration: { type: 'TIME', value: 600 },
            primaryTarget: { kind: 'POWER', unit: 'WATTS', zone: 1 },
          },
          {
            type: 'WORK',
            duration: { type: 'TIME', value: 1800 },
            primaryTarget: { kind: 'POWER', unit: 'WATTS', zone: 3 },
          },
        ],
      },
      status: 'PLANNED',
      weeklyPlan: {
        athleteUserId: 'athlete-1',
      },
    };

    const mockNormalized: NormalizedWorkout = {
      sport: 'BIKE',
      steps: [
        {
          type: 'WARMUP',
          duration: { seconds: 600 },
          primaryTarget: {
            kind: 'POWER',
            unit: 'WATTS',
            zone: 1,
          },
        },
        {
          type: 'WORK',
          duration: { seconds: 1800 },
          primaryTarget: {
            kind: 'POWER',
            unit: 'WATTS',
            zone: 3,
          },
        },
      ],
    };

    prisma.trainingSession.findUnique = jest
      .fn()
      .mockResolvedValue(mockSession);
    prisma.coachProfile.findUnique = jest.fn().mockResolvedValue({
      id: 'coach-profile',
      athletes: [{ athleteProfile: { userId: 'athlete-1' } }],
    });

    (normalizeEnduranceWorkout as jest.Mock).mockReturnValue(mockNormalized);

    const result = await service.getNormalizedWorkout('coach-1', 'session-1');

    expect(result).toEqual(mockNormalized);

    expect(normalizeEnduranceWorkout).toHaveBeenCalledWith(
      expect.objectContaining({
        sport: 'BIKE',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        steps: expect.arrayContaining([]),
      }),
    );
  });

  it('expands repeat blocks correctly', async () => {
    const { prisma, service } = buildService();

    const mockSession: TrainingSessionRecord = {
      id: 'session-1',
      weeklyPlanId: 'plan-1',
      date: new Date('2025-01-06'),
      type: SessionType.ENDURANCE,
      title: 'Interval Run',
      prescription: {
        sport: 'RUN',
        steps: [
          {
            repeat: 4,
            steps: [
              {
                type: 'WORK',
                duration: { type: 'TIME', value: 120 },
                primaryTarget: { kind: 'PACE', unit: 'SEC_PER_KM', zone: 4 },
              },
              {
                type: 'RECOVERY',
                duration: { type: 'TIME', value: 60 },
              },
            ],
          },
        ],
      },
      status: 'PLANNED',
      weeklyPlan: {
        athleteUserId: 'athlete-1',
      },
    };

    const mockNormalized: NormalizedWorkout = {
      sport: 'RUN',
      steps: [
        { type: 'WORK', duration: { seconds: 120 } },
        { type: 'RECOVERY', duration: { seconds: 60 } },
        { type: 'WORK', duration: { seconds: 120 } },
        { type: 'RECOVERY', duration: { seconds: 60 } },
        { type: 'WORK', duration: { seconds: 120 } },
        { type: 'RECOVERY', duration: { seconds: 60 } },
        { type: 'WORK', duration: { seconds: 120 } },
        { type: 'RECOVERY', duration: { seconds: 60 } },
      ],
    };

    prisma.trainingSession.findUnique = jest
      .fn()
      .mockResolvedValue(mockSession);
    prisma.coachProfile.findUnique = jest.fn().mockResolvedValue({
      id: 'coach-profile',
      athletes: [{ athleteProfile: { userId: 'athlete-1' } }],
    });

    (normalizeEnduranceWorkout as jest.Mock).mockReturnValue(mockNormalized);

    const result = await service.getNormalizedWorkout('coach-1', 'session-1');

    expect(result.steps).toHaveLength(8); // 4 repeats × 2 steps each

    expect(normalizeEnduranceWorkout).toHaveBeenCalledWith(
      expect.objectContaining({
        sport: 'RUN',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        steps: expect.arrayContaining([]),
      }),
    );
  });
});
