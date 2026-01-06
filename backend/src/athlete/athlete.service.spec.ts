import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AthleteService } from './athlete.service';
import { PrismaService } from '../prisma/prisma.service';

type DeviceProvider = 'GARMIN' | 'WAHOO';
type ConnectionStatus = 'CONNECTED' | 'EXPIRED' | 'REVOKED' | 'ERROR';

interface DeviceConnectionRecord {
  id: string;
  athleteProfileId: string;
  provider: DeviceProvider;
  status: ConnectionStatus;
  connectedAt: Date;
  isPrimary: boolean;
}

interface AthleteProfileRecord {
  id: string;
  userId: string;
}

function buildService(prismaOverrides: Partial<PrismaService> = {}) {
  const prisma = {
    athleteProfile: {
      findUnique: jest.fn<Promise<AthleteProfileRecord | null>, [unknown]>(),
    },
    deviceConnection: {
      findMany: jest.fn<Promise<DeviceConnectionRecord[]>, [unknown]>(),
      findFirst: jest.fn<Promise<DeviceConnectionRecord | null>, [unknown]>(),
      updateMany: jest.fn<Promise<{ count: number }>, [unknown]>(),
      update: jest.fn<Promise<DeviceConnectionRecord>, [unknown]>(),
    },
    ...prismaOverrides,
  } as unknown as PrismaService;

  return {
    prisma,
    service: new AthleteService(prisma),
  };
}

describe('AthleteService - Connection Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getConnections', () => {
    it('returns all connections with status', async () => {
      const { prisma, service } = buildService();

      (prisma.athleteProfile.findUnique as jest.Mock).mockResolvedValue({
        id: 'athlete-profile-1',
        userId: 'athlete-user-1',
      });

      const mockConnections: DeviceConnectionRecord[] = [
        {
          id: 'connection-1',
          athleteProfileId: 'athlete-profile-1',
          provider: 'GARMIN',
          status: 'CONNECTED',
          connectedAt: new Date('2025-01-01'),
          isPrimary: true,
        },
        {
          id: 'connection-2',
          athleteProfileId: 'athlete-profile-1',
          provider: 'WAHOO',
          status: 'CONNECTED',
          connectedAt: new Date('2025-01-02'),
          isPrimary: false,
        },
      ];

      (prisma.deviceConnection.findMany as jest.Mock).mockResolvedValue(
        mockConnections,
      );

      const connections = await service.getConnections('athlete-user-1');

      expect(connections).toHaveLength(2);
      expect(connections[0]).toEqual({
        provider: 'GARMIN',
        status: 'CONNECTED',
        connectedAt: mockConnections[0].connectedAt,
        isPrimary: true,
      });
      expect(connections[1]).toEqual({
        provider: 'WAHOO',
        status: 'CONNECTED',
        connectedAt: mockConnections[1].connectedAt,
        isPrimary: false,
      });

      expect(prisma.deviceConnection.findMany).toHaveBeenCalledWith({
        where: {
          athleteProfileId: 'athlete-profile-1',
        },
        orderBy: [
          { isPrimary: 'desc' },
          { connectedAt: 'desc' },
        ],
      });
    });

    it('returns empty array if athlete profile not found', async () => {
      const { prisma, service } = buildService();

      (prisma.athleteProfile.findUnique as jest.Mock).mockResolvedValue(null);

      const connections = await service.getConnections('non-existent-user');

      expect(connections).toEqual([]);
      expect(prisma.deviceConnection.findMany).not.toHaveBeenCalled();
    });

    it('returns empty array if no connections exist', async () => {
      const { prisma, service } = buildService();

      (prisma.athleteProfile.findUnique as jest.Mock).mockResolvedValue({
        id: 'athlete-profile-1',
        userId: 'athlete-user-1',
      });

      (prisma.deviceConnection.findMany as jest.Mock).mockResolvedValue([]);

      const connections = await service.getConnections('athlete-user-1');

      expect(connections).toEqual([]);
    });
  });

  describe('setPrimaryProvider', () => {
    it('sets one provider as primary and unsets others', async () => {
      const { prisma, service } = buildService();

      (prisma.athleteProfile.findUnique as jest.Mock).mockResolvedValue({
        id: 'athlete-profile-1',
        userId: 'athlete-user-1',
      });

      const wahooConnection: DeviceConnectionRecord = {
        id: 'connection-2',
        athleteProfileId: 'athlete-profile-1',
        provider: 'WAHOO',
        status: 'CONNECTED',
        connectedAt: new Date(),
        isPrimary: false,
      };

      (prisma.deviceConnection.findFirst as jest.Mock).mockResolvedValue(
        wahooConnection,
      );
      (prisma.deviceConnection.updateMany as jest.Mock).mockResolvedValue({
        count: 1,
      });
      (prisma.deviceConnection.update as jest.Mock).mockResolvedValue({
        ...wahooConnection,
        isPrimary: true,
      });

      const result = await service.setPrimaryProvider('athlete-user-1', 'WAHOO');

      expect(result).toEqual({
        message: 'WAHOO set as primary provider',
        provider: 'WAHOO',
      });

      // Verify all other primary providers were unset
      expect(prisma.deviceConnection.updateMany).toHaveBeenCalledWith({
        where: {
          athleteProfileId: 'athlete-profile-1',
          isPrimary: true,
        },
        data: {
          isPrimary: false,
        },
      });

      // Verify the selected provider was set as primary
      expect(prisma.deviceConnection.update).toHaveBeenCalledWith({
        where: { id: 'connection-2' },
        data: { isPrimary: true },
      });
    });

    it('validates provider is connected before setting as primary', async () => {
      const { prisma, service } = buildService();

      (prisma.athleteProfile.findUnique as jest.Mock).mockResolvedValue({
        id: 'athlete-profile-1',
        userId: 'athlete-user-1',
      });

      // Provider not found
      (prisma.deviceConnection.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.setPrimaryProvider('athlete-user-1', 'GARMIN'),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.deviceConnection.updateMany).not.toHaveBeenCalled();
      expect(prisma.deviceConnection.update).not.toHaveBeenCalled();
    });

    it('validates provider status is CONNECTED', async () => {
      const { prisma, service } = buildService();

      (prisma.athleteProfile.findUnique as jest.Mock).mockResolvedValue({
        id: 'athlete-profile-1',
        userId: 'athlete-user-1',
      });

      // Provider exists but is EXPIRED
      const expiredConnection: DeviceConnectionRecord = {
        id: 'connection-1',
        athleteProfileId: 'athlete-profile-1',
        provider: 'GARMIN',
        status: 'EXPIRED',
        connectedAt: new Date(),
        isPrimary: false,
      };

      // findFirst with status: 'CONNECTED' will return null
      (prisma.deviceConnection.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.setPrimaryProvider('athlete-user-1', 'GARMIN'),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.deviceConnection.updateMany).not.toHaveBeenCalled();
      expect(prisma.deviceConnection.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException if athlete profile not found', async () => {
      const { prisma, service } = buildService();

      (prisma.athleteProfile.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.setPrimaryProvider('non-existent-user', 'GARMIN'),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.deviceConnection.findFirst).not.toHaveBeenCalled();
    });
  });
});


