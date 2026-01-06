import { BadRequestException } from '@nestjs/common';
import { EnduranceExportService } from './endurance-export.service';
import { PrismaService } from '../../prisma/prisma.service';
import { DeviceOAuthService } from '../../auth/devices/device-oauth.service';
import { DeviceApiService } from '../../auth/devices/device-api.service';
import { NormalizedWorkout } from './endurance-normalizer';
import { DeviceProvider } from '@prisma/client';

// Mock fetch globally
global.fetch = jest.fn();

type ConnectionStatus = 'CONNECTED' | 'EXPIRED' | 'REVOKED' | 'ERROR';

interface DeviceConnectionRecord {
  id: string;
  athleteProfileId: string;
  provider: DeviceProvider;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  status: ConnectionStatus;
  connectedAt: Date;
  isPrimary: boolean;
}

interface AthleteProfileRecord {
  id: string;
  userId: string;
  deviceConnections: DeviceConnectionRecord[];
}

interface TrainingSessionRecord {
  id: string;
  weeklyPlanId: string;
  type: 'ENDURANCE';
  exportStatus: string | null;
  exportProvider: DeviceProvider | null;
  weeklyPlan: {
    athleteUserId: string;
  };
}

function buildService(
  prismaOverrides: Partial<PrismaService> = {},
  deviceOAuthOverrides: Partial<DeviceOAuthService> = {},
  deviceApiOverrides: Partial<DeviceApiService> = {},
) {
  const prisma = {
    athleteProfile: {
      findUnique: jest.fn<Promise<AthleteProfileRecord | null>, [unknown]>(),
    },
    trainingSession: {
      findUnique: jest.fn<Promise<TrainingSessionRecord | null>, [unknown]>(),
      update: jest.fn<Promise<TrainingSessionRecord>, [unknown]>(),
    },
    weeklyPlan: {
      findMany: jest.fn(),
    },
    ...prismaOverrides,
  } as unknown as PrismaService;

  const deviceOAuth = {
    refreshAccessTokenIfNeeded: jest.fn<Promise<string | null>, [DeviceProvider, string]>(),
    ...deviceOAuthOverrides,
  } as unknown as DeviceOAuthService;

  const deviceApi = {
    createWorkout: jest.fn<Promise<string>, [DeviceProvider, string, unknown]>(),
    ...deviceApiOverrides,
  } as unknown as DeviceApiService;

  return {
    service: new EnduranceExportService(prisma, deviceOAuth, deviceApi),
    prisma,
    deviceOAuth,
    deviceApi,
  };
}

describe('EnduranceExportService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('selectProvider', () => {
    it('returns primary provider if set', async () => {
      const { service, prisma } = buildService();

      (prisma.athleteProfile.findUnique as jest.Mock).mockResolvedValue({
        id: 'profile-1',
        userId: 'athlete-1',
        deviceConnections: [
          {
            id: 'conn-1',
            provider: 'WAHOO',
            isPrimary: false,
            status: 'CONNECTED',
            connectedAt: new Date(),
          },
          {
            id: 'conn-2',
            provider: 'GARMIN',
            isPrimary: true,
            status: 'CONNECTED',
            connectedAt: new Date(),
          },
        ],
      });

      const provider = await service.selectProvider('athlete-1');

      expect(provider).toBe('GARMIN');
    });

    it('returns first connected provider if no primary set', async () => {
      const { service, prisma } = buildService();

      (prisma.athleteProfile.findUnique as jest.Mock).mockResolvedValue({
        id: 'profile-1',
        userId: 'athlete-1',
        deviceConnections: [
          {
            id: 'conn-1',
            provider: 'WAHOO',
            isPrimary: false,
            status: 'CONNECTED',
            connectedAt: new Date(),
          },
        ],
      });

      const provider = await service.selectProvider('athlete-1');

      expect(provider).toBe('WAHOO');
    });

    it('returns null if no connections', async () => {
      const { service, prisma } = buildService();

      (prisma.athleteProfile.findUnique as jest.Mock).mockResolvedValue({
        id: 'profile-1',
        userId: 'athlete-1',
        deviceConnections: [],
      });

      const provider = await service.selectProvider('athlete-1');

      expect(provider).toBeNull();
    });

    it('returns null if athlete profile not found', async () => {
      const { service, prisma } = buildService();

      (prisma.athleteProfile.findUnique as jest.Mock).mockResolvedValue(null);

      const provider = await service.selectProvider('athlete-1');

      expect(provider).toBeNull();
    });
  });

  describe('validateNormalizedWorkout', () => {
    it('validates workout with valid steps', () => {
      const { service } = buildService();

      const workout: NormalizedWorkout = {
        sport: 'BIKE',
        steps: [
          {
            type: 'WARMUP',
            duration: { seconds: 600 },
            primaryTarget: { kind: 'POWER', unit: 'WATTS', zone: 1 },
          },
        ],
      };

      expect(() => service.validateNormalizedWorkout(workout)).not.toThrow();
    });

    it('throws if workout has no steps', () => {
      const { service } = buildService();

      const workout: NormalizedWorkout = {
        sport: 'BIKE',
        steps: [],
      };

      expect(() => service.validateNormalizedWorkout(workout)).toThrow(
        BadRequestException,
      );
      expect(() => service.validateNormalizedWorkout(workout)).toThrow(
        'Workout must have at least one step',
      );
    });

    it('throws if step has no duration', () => {
      const { service } = buildService();

      const workout: NormalizedWorkout = {
        sport: 'BIKE',
        steps: [
          {
            type: 'WARMUP',
            duration: {},
          },
        ],
      };

      expect(() => service.validateNormalizedWorkout(workout)).toThrow(
        BadRequestException,
      );
    });

    it('throws if step duration is zero or negative', () => {
      const { service } = buildService();

      const workout: NormalizedWorkout = {
        sport: 'BIKE',
        steps: [
          {
            type: 'WARMUP',
            duration: { seconds: 0 },
          },
        ],
      };

      expect(() => service.validateNormalizedWorkout(workout)).toThrow(
        BadRequestException,
      );
    });

    it('throws if primary target has neither zone nor range', () => {
      const { service } = buildService();

      const workout: NormalizedWorkout = {
        sport: 'BIKE',
        steps: [
          {
            type: 'WORK',
            duration: { seconds: 600 },
            primaryTarget: { kind: 'POWER', unit: 'WATTS' },
          },
        ],
      };

      expect(() => service.validateNormalizedWorkout(workout)).toThrow(
        BadRequestException,
      );
    });

    it('throws if cadence target is not for BIKE', () => {
      const { service } = buildService();

      const workout: NormalizedWorkout = {
        sport: 'RUN',
        steps: [
          {
            type: 'WORK',
            duration: { seconds: 600 },
            cadenceTarget: { minRpm: 80, maxRpm: 100 },
          },
        ],
      };

      expect(() => service.validateNormalizedWorkout(workout)).toThrow(
        BadRequestException,
      );
      expect(() => service.validateNormalizedWorkout(workout)).toThrow(
        'Cadence target is only allowed for BIKE workouts',
      );
    });
  });

  describe('convertToProviderFormat', () => {
    it('converts to Garmin format', () => {
      const { service } = buildService();

      const workout: NormalizedWorkout = {
        sport: 'BIKE',
        objective: 'Test Workout',
        steps: [
          {
            type: 'WARMUP',
            duration: { seconds: 600 },
            primaryTarget: { kind: 'POWER', unit: 'WATTS', zone: 1 },
          },
        ],
      };

      const result = service.convertToProviderFormat(workout, 'GARMIN');

      expect(result.platform).toBe('GARMIN');
      expect(result.sport).toBe('BIKE');
      expect(result.objective).toBe('Test Workout');
      expect(result.steps).toHaveLength(1);
    });

    it('converts to Wahoo format', () => {
      const { service } = buildService();

      const workout: NormalizedWorkout = {
        sport: 'RUN',
        objective: 'Test Run',
        steps: [
          {
            type: 'WORK',
            duration: { seconds: 1200 },
            primaryTarget: { kind: 'PACE', unit: 'SEC_PER_KM', zone: 4 },
          },
        ],
      };

      const result = service.convertToProviderFormat(workout, 'WAHOO');

      expect(result.platform).toBe('WAHOO');
      expect(result.sport).toBe('RUN');
      expect(result.workoutName).toBe('Test Run');
    });

    it('throws for unsupported provider', () => {
      const { service } = buildService();

      const workout: NormalizedWorkout = {
        sport: 'BIKE',
        steps: [{ type: 'WARMUP', duration: { seconds: 600 } }],
      };

      expect(() =>
        service.convertToProviderFormat(workout, 'UNKNOWN' as DeviceProvider),
      ).toThrow(BadRequestException);
    });
  });

  describe('exportWorkoutToProvider', () => {
    const mockSession: TrainingSessionRecord = {
      id: 'session-1',
      weeklyPlanId: 'plan-1',
      type: 'ENDURANCE',
      exportStatus: null,
      exportProvider: null,
      weeklyPlan: {
        athleteUserId: 'athlete-1',
      },
    };

    const mockPrescription = {
      sport: 'BIKE',
      steps: [
        {
          type: 'WARMUP',
          duration: { type: 'TIME', value: 600 },
          primaryTarget: { kind: 'POWER', unit: 'WATTS', zone: 1 },
        },
      ],
    };

    it('successfully exports workout', async () => {
      const { service, prisma, deviceOAuth, deviceApi } = buildService();

      (prisma.trainingSession.findUnique as jest.Mock).mockResolvedValue({
        ...mockSession,
        prescription: mockPrescription,
      });
      (prisma.trainingSession.update as jest.Mock).mockResolvedValue({
        ...mockSession,
        exportStatus: 'SENT',
      });
      (deviceOAuth.refreshAccessTokenIfNeeded as jest.Mock).mockResolvedValue(
        'mock-access-token',
      );
      (deviceApi.createWorkout as jest.Mock).mockResolvedValue('external-id-123');

      await service.exportWorkoutToProvider(
        'session-1',
        'athlete-1',
        'GARMIN',
      );

      expect(prisma.trainingSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'session-1' },
          data: expect.objectContaining({
            exportStatus: 'PENDING',
            exportProvider: 'GARMIN',
          }),
        }),
      );

      expect(deviceOAuth.refreshAccessTokenIfNeeded).toHaveBeenCalledWith(
        'GARMIN',
        'athlete-1',
      );
      expect(deviceApi.createWorkout).toHaveBeenCalled();
    });

    it('sets status to FAILED on validation error', async () => {
      const { service, prisma } = buildService();

      (prisma.trainingSession.findUnique as jest.Mock).mockResolvedValue({
        ...mockSession,
        prescription: {
          sport: 'BIKE',
          steps: [], // Invalid: no steps
        },
      });
      (prisma.trainingSession.update as jest.Mock).mockResolvedValue({
        ...mockSession,
        exportStatus: 'FAILED',
      });

      await expect(
        service.exportWorkoutToProvider('session-1', 'athlete-1', 'GARMIN'),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.trainingSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'session-1' },
          data: expect.objectContaining({
            exportStatus: 'FAILED',
            exportProvider: 'GARMIN',
            lastExportError: expect.stringContaining('Workout must have at least one step'),
          }),
        }),
      );
    });

    it('throws if session not found', async () => {
      const { service, prisma } = buildService();

      (prisma.trainingSession.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.exportWorkoutToProvider('session-1', 'athlete-1', 'GARMIN'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.exportWorkoutToProvider('session-1', 'athlete-1', 'GARMIN'),
      ).rejects.toThrow('Training session not found');
    });

    it('throws if session does not belong to athlete', async () => {
      const { service, prisma } = buildService();

      (prisma.trainingSession.findUnique as jest.Mock).mockResolvedValue({
        ...mockSession,
        weeklyPlan: {
          athleteUserId: 'different-athlete',
        },
      });

      await expect(
        service.exportWorkoutToProvider('session-1', 'athlete-1', 'GARMIN'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.exportWorkoutToProvider('session-1', 'athlete-1', 'GARMIN'),
      ).rejects.toThrow('Training session does not belong to athlete');
    });

    it('throws if session is not ENDURANCE', async () => {
      const { service, prisma } = buildService();

      (prisma.trainingSession.findUnique as jest.Mock).mockResolvedValue({
        ...mockSession,
        type: 'STRENGTH' as any,
      });

      await expect(
        service.exportWorkoutToProvider('session-1', 'athlete-1', 'GARMIN'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.exportWorkoutToProvider('session-1', 'athlete-1', 'GARMIN'),
      ).rejects.toThrow('Only ENDURANCE sessions can be exported');
    });
  });

  describe('autoPushEnduranceWorkout', () => {
    it('sets NOT_CONNECTED if no provider available', async () => {
      const { service, prisma } = buildService();

      (prisma.athleteProfile.findUnique as jest.Mock).mockResolvedValue({
        id: 'profile-1',
        userId: 'athlete-1',
        deviceConnections: [],
      });
      (prisma.trainingSession.update as jest.Mock).mockResolvedValue({
        id: 'session-1',
        exportStatus: 'NOT_CONNECTED',
      });

      await service.autoPushEnduranceWorkout('session-1', 'athlete-1');

      expect(prisma.trainingSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'session-1' },
          data: {
            exportStatus: 'NOT_CONNECTED',
            exportProvider: null,
            lastExportError: null,
          },
        }),
      );
    });
  });
});

