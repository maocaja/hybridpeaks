import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeviceOAuthService } from './device-oauth.service';
import { PrismaService } from '../../prisma/prisma.service';

// Mock fetch globally
global.fetch = jest.fn();

type DeviceProvider = 'GARMIN' | 'WAHOO';
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
}

function buildService(
  prismaOverrides: Partial<PrismaService> = {},
  configOverrides: Partial<ConfigService> = {},
) {
  const prisma = {
    athleteProfile: {
      findUnique: jest.fn<Promise<AthleteProfileRecord | null>, [unknown]>(),
    },
    deviceConnection: {
      findFirst: jest.fn<Promise<DeviceConnectionRecord | null>, [unknown]>(),
      upsert: jest.fn<Promise<DeviceConnectionRecord>, [unknown]>(),
      update: jest.fn<Promise<DeviceConnectionRecord>, [unknown]>(),
    },
    ...prismaOverrides,
  } as unknown as PrismaService;

  const config = {
    get: jest.fn(),
    ...configOverrides,
  } as unknown as ConfigService;

  return {
    prisma,
    config,
    service: new DeviceOAuthService(prisma, config),
  };
}

describe('DeviceOAuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  describe('generateAuthUrl', () => {
    it('returns correct OAuth URL with state for Garmin', () => {
      const { config, service } = buildService();

      (config.get as jest.Mock).mockImplementation((key: string) => {
        const configMap: Record<string, string> = {
          'app.garmin.clientId': 'garmin-client-id',
          'app.garmin.clientSecret': 'garmin-secret',
          'app.garmin.redirectUri': 'http://localhost:5174/callback',
          'app.garmin.authUrl': 'https://connect.garmin.com/oauthConfirm',
          'app.garmin.tokenUrl': 'https://connectapi.garmin.com/oauth/token',
          'app.garmin.apiBaseUrl': 'https://connectapi.garmin.com',
          'app.garmin.tokenEncryptionKey':
            '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        };
        return configMap[key];
      });

      const state = 'test-state-123';
      const url = service.generateAuthUrl('GARMIN', state);

      expect(url).toContain('https://connect.garmin.com/oauthConfirm');
      expect(url).toContain('client_id=garmin-client-id');
      expect(url).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A5174%2Fcallback');
      expect(url).toContain('response_type=code');
      expect(url).toContain('scope=workout%3Awrite');
      expect(url).toContain(`state=${state}`);
    });

    it('returns correct OAuth URL with state for Wahoo', () => {
      const { config, service } = buildService();

      (config.get as jest.Mock).mockImplementation((key: string) => {
        const configMap: Record<string, string> = {
          'app.wahoo.clientId': 'wahoo-client-id',
          'app.wahoo.clientSecret': 'wahoo-secret',
          'app.wahoo.redirectUri': 'http://localhost:5174/callback',
          'app.wahoo.authUrl': 'https://api.wahoo.com/oauth/authorize',
          'app.wahoo.tokenUrl': 'https://api.wahoo.com/oauth/token',
          'app.wahoo.apiBaseUrl': 'https://api.wahoo.com',
          'app.wahoo.tokenEncryptionKey':
            '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        };
        return configMap[key];
      });

      const state = 'wahoo-state-456';
      const url = service.generateAuthUrl('WAHOO', state);

      expect(url).toContain('https://api.wahoo.com/oauth/authorize');
      expect(url).toContain('client_id=wahoo-client-id');
      expect(url).toContain(`state=${state}`);
    });

    it('throws error if configuration is incomplete', () => {
      const { config, service } = buildService();

      (config.get as jest.Mock).mockImplementation((key: string) => {
        // Missing some required config
        if (key === 'app.garmin.tokenEncryptionKey') {
          return undefined;
        }
        return 'some-value';
      });

      expect(() => {
        service.generateAuthUrl('GARMIN', 'test-state');
      }).toThrow('GARMIN OAuth configuration is incomplete');
    });
  });

  describe('exchangeCodeForTokens', () => {
    it('stores encrypted tokens after successful exchange', async () => {
      const { prisma, config, service } = buildService();

      // Mock config
      (config.get as jest.Mock).mockImplementation((key: string) => {
        const configMap: Record<string, string> = {
          'app.garmin.clientId': 'garmin-client-id',
          'app.garmin.clientSecret': 'garmin-secret',
          'app.garmin.redirectUri': 'http://localhost:5174/callback',
          'app.garmin.authUrl': 'https://connect.garmin.com/oauthConfirm',
          'app.garmin.tokenUrl': 'https://connectapi.garmin.com/oauth/token',
          'app.garmin.apiBaseUrl': 'https://connectapi.garmin.com',
          'app.garmin.tokenEncryptionKey':
            '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        };
        return configMap[key];
      });

      // Mock athlete profile
      (prisma.athleteProfile.findUnique as jest.Mock).mockResolvedValue({
        id: 'athlete-profile-1',
        userId: 'athlete-user-1',
      });

      // Mock token exchange response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'test-access-token',
          refresh_token: 'test-refresh-token',
          expires_in: 3600,
        }),
      });

      // Mock upsert
      (prisma.deviceConnection.upsert as jest.Mock).mockResolvedValue({
        id: 'connection-1',
        athleteProfileId: 'athlete-profile-1',
        provider: 'GARMIN',
        accessToken: 'encrypted-access',
        refreshToken: 'encrypted-refresh',
        expiresAt: new Date(),
        status: 'CONNECTED',
        connectedAt: new Date(),
        isPrimary: false,
      });

      await service.exchangeCodeForTokens('GARMIN', 'auth-code-123', 'athlete-user-1');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://connectapi.garmin.com/oauth/token',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }),
      );

      expect(prisma.deviceConnection.upsert).toHaveBeenCalled();
      const upsertCall = (prisma.deviceConnection.upsert as jest.Mock).mock.calls[0][0];
      expect(upsertCall.create.status).toBe('CONNECTED');
      expect(upsertCall.create.accessToken).not.toBe('test-access-token'); // Should be encrypted
      expect(upsertCall.create.refreshToken).not.toBe('test-refresh-token'); // Should be encrypted
    });

    it('throws error if token exchange fails', async () => {
      const { config, service } = buildService();

      (config.get as jest.Mock).mockImplementation((key: string) => {
        const configMap: Record<string, string> = {
          'app.garmin.clientId': 'garmin-client-id',
          'app.garmin.clientSecret': 'garmin-secret',
          'app.garmin.redirectUri': 'http://localhost:5174/callback',
          'app.garmin.authUrl': 'https://connect.garmin.com/oauthConfirm',
          'app.garmin.tokenUrl': 'https://connectapi.garmin.com/oauth/token',
          'app.garmin.apiBaseUrl': 'https://connectapi.garmin.com',
          'app.garmin.tokenEncryptionKey':
            '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        };
        return configMap[key];
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Invalid authorization code',
      });

      await expect(
        service.exchangeCodeForTokens('GARMIN', 'invalid-code', 'athlete-user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getConnection', () => {
    it('returns connection if found', async () => {
      const { prisma, config, service } = buildService();

      (config.get as jest.Mock).mockReturnValue('some-value');

      (prisma.athleteProfile.findUnique as jest.Mock).mockResolvedValue({
        id: 'athlete-profile-1',
        userId: 'athlete-user-1',
      });

      const mockConnection: DeviceConnectionRecord = {
        id: 'connection-1',
        athleteProfileId: 'athlete-profile-1',
        provider: 'GARMIN',
        accessToken: 'encrypted-access',
        refreshToken: 'encrypted-refresh',
        expiresAt: new Date(Date.now() + 3600000),
        status: 'CONNECTED',
        connectedAt: new Date(),
        isPrimary: false,
      };

      (prisma.deviceConnection.findFirst as jest.Mock).mockResolvedValue(mockConnection);

      const connection = await service.getConnection('GARMIN', 'athlete-user-1');

      expect(connection).toEqual(mockConnection);
      expect(prisma.deviceConnection.findFirst).toHaveBeenCalledWith({
        where: {
          athleteProfileId: 'athlete-profile-1',
          provider: 'GARMIN',
        },
      });
    });

    it('returns null if athlete profile not found', async () => {
      const { prisma, service } = buildService();

      (prisma.athleteProfile.findUnique as jest.Mock).mockResolvedValue(null);

      const connection = await service.getConnection('GARMIN', 'non-existent-user');

      expect(connection).toBeNull();
      expect(prisma.deviceConnection.findFirst).not.toHaveBeenCalled();
    });

    it('returns null if connection not found', async () => {
      const { prisma, config, service } = buildService();

      (config.get as jest.Mock).mockReturnValue('some-value');

      (prisma.athleteProfile.findUnique as jest.Mock).mockResolvedValue({
        id: 'athlete-profile-1',
        userId: 'athlete-user-1',
      });

      (prisma.deviceConnection.findFirst as jest.Mock).mockResolvedValue(null);

      const connection = await service.getConnection('GARMIN', 'athlete-user-1');

      expect(connection).toBeNull();
    });
  });

  describe('refreshAccessTokenIfNeeded', () => {
    it('returns existing token if not expired', async () => {
      const { prisma, config, service } = buildService();

      const encryptionKey =
        '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

      (config.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'app.garmin.tokenEncryptionKey') {
          return encryptionKey;
        }
        return 'some-value';
      });

      (prisma.athleteProfile.findUnique as jest.Mock).mockResolvedValue({
        id: 'athlete-profile-1',
        userId: 'athlete-user-1',
      });

      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1); // 1 hour from now

      // Create a properly encrypted token format: IV:AuthTag:EncryptedData
      // We'll use a simple mock format that matches the expected structure
      const crypto = require('crypto');
      const iv = crypto.randomBytes(16);
      const key = Buffer.from(encryptionKey, 'hex');
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
      const originalToken = 'test-access-token';
      let encrypted = cipher.update(originalToken, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag();
      const encryptedToken = `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;

      const mockConnection: DeviceConnectionRecord = {
        id: 'connection-1',
        athleteProfileId: 'athlete-profile-1',
        provider: 'GARMIN',
        accessToken: encryptedToken,
        refreshToken: 'encrypted-refresh',
        expiresAt: futureDate,
        status: 'CONNECTED',
        connectedAt: new Date(),
        isPrimary: false,
      };

      (prisma.deviceConnection.findFirst as jest.Mock).mockResolvedValue(mockConnection);

      const token = await service.refreshAccessTokenIfNeeded('GARMIN', 'athlete-user-1');

      // Token should be decrypted
      expect(token).toBe('test-access-token');
      expect(global.fetch).not.toHaveBeenCalled(); // Should not refresh
    });

    it('refreshes token if expired', async () => {
      const { prisma, config, service } = buildService();

      const encryptionKey =
        '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

      (config.get as jest.Mock).mockImplementation((key: string) => {
        const configMap: Record<string, string> = {
          'app.garmin.clientId': 'garmin-client-id',
          'app.garmin.clientSecret': 'garmin-secret',
          'app.garmin.tokenUrl': 'https://connectapi.garmin.com/oauth/token',
          'app.garmin.tokenEncryptionKey': encryptionKey,
        };
        return configMap[key] || 'some-value';
      });

      (prisma.athleteProfile.findUnique as jest.Mock).mockResolvedValue({
        id: 'athlete-profile-1',
        userId: 'athlete-user-1',
      });

      const pastDate = new Date();
      pastDate.setHours(pastDate.getHours() - 1); // 1 hour ago

      // Create a properly encrypted refresh token
      const crypto = require('crypto');
      const iv = crypto.randomBytes(16);
      const key = Buffer.from(encryptionKey, 'hex');
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
      const originalRefreshToken = 'old-refresh-token';
      let encrypted = cipher.update(originalRefreshToken, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag();
      const encryptedRefreshToken = `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;

      const mockConnection: DeviceConnectionRecord = {
        id: 'connection-1',
        athleteProfileId: 'athlete-profile-1',
        provider: 'GARMIN',
        accessToken: 'encrypted-access',
        refreshToken: encryptedRefreshToken,
        expiresAt: pastDate,
        status: 'CONNECTED',
        connectedAt: new Date(),
        isPrimary: false,
      };

      (prisma.deviceConnection.findFirst as jest.Mock).mockResolvedValue(mockConnection);

      // Mock refresh token response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          expires_in: 3600,
        }),
      });

      (prisma.deviceConnection.upsert as jest.Mock).mockResolvedValue({
        ...mockConnection,
        accessToken: 'new-encrypted-access',
        refreshToken: 'new-encrypted-refresh',
      });

      const token = await service.refreshAccessTokenIfNeeded('GARMIN', 'athlete-user-1');

      expect(global.fetch).toHaveBeenCalled();
      expect(prisma.deviceConnection.upsert).toHaveBeenCalled();
      expect(token).toBe('new-access-token');
    });
  });

  describe('token encryption/decryption', () => {
    it('encrypts and decrypts tokens correctly', async () => {
      const { prisma, config, service } = buildService();

      const encryptionKey =
        '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

      (config.get as jest.Mock).mockImplementation((key: string) => {
        if (key.includes('tokenEncryptionKey')) {
          return encryptionKey;
        }
        return 'some-value';
      });

      (prisma.athleteProfile.findUnique as jest.Mock).mockResolvedValue({
        id: 'athlete-profile-1',
        userId: 'athlete-user-1',
      });

      // Mock token exchange
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'original-access-token',
          refresh_token: 'original-refresh-token',
          expires_in: 3600,
        }),
      });

      let storedAccessToken = '';
      let storedRefreshToken = '';

      (prisma.deviceConnection.upsert as jest.Mock).mockImplementation((args) => {
        storedAccessToken = args.create.accessToken;
        storedRefreshToken = args.create.refreshToken;
        return Promise.resolve({
          id: 'connection-1',
          athleteProfileId: 'athlete-profile-1',
          provider: 'GARMIN',
          accessToken: storedAccessToken,
          refreshToken: storedRefreshToken,
          expiresAt: new Date(),
          status: 'CONNECTED',
          connectedAt: new Date(),
          isPrimary: false,
        });
      });

      await service.exchangeCodeForTokens('GARMIN', 'code-123', 'athlete-user-1');

      // Verify tokens are encrypted (not original values)
      expect(storedAccessToken).not.toBe('original-access-token');
      expect(storedRefreshToken).not.toBe('original-refresh-token');
      expect(storedAccessToken).toContain(':'); // Encrypted format: IV:AuthTag:Data
      expect(storedRefreshToken).toContain(':');
    });
  });

  describe('updateConnectionStatus', () => {
    it('updates connection status', async () => {
      const { prisma, config, service } = buildService();

      (config.get as jest.Mock).mockReturnValue('some-value');

      (prisma.athleteProfile.findUnique as jest.Mock).mockResolvedValue({
        id: 'athlete-profile-1',
        userId: 'athlete-user-1',
      });

      const mockConnection: DeviceConnectionRecord = {
        id: 'connection-1',
        athleteProfileId: 'athlete-profile-1',
        provider: 'GARMIN',
        accessToken: 'encrypted-access',
        refreshToken: 'encrypted-refresh',
        expiresAt: new Date(),
        status: 'CONNECTED',
        connectedAt: new Date(),
        isPrimary: false,
      };

      (prisma.deviceConnection.findFirst as jest.Mock).mockResolvedValue(mockConnection);
      (prisma.deviceConnection.update as jest.Mock).mockResolvedValue({
        ...mockConnection,
        status: 'EXPIRED',
      });

      await service.updateConnectionStatus('GARMIN', 'athlete-user-1', 'EXPIRED');

      expect(prisma.deviceConnection.update).toHaveBeenCalledWith({
        where: { id: 'connection-1' },
        data: { status: 'EXPIRED' },
      });
    });

    it('does nothing if connection not found', async () => {
      const { prisma, config, service } = buildService();

      (config.get as jest.Mock).mockReturnValue('some-value');

      (prisma.athleteProfile.findUnique as jest.Mock).mockResolvedValue({
        id: 'athlete-profile-1',
        userId: 'athlete-user-1',
      });

      (prisma.deviceConnection.findFirst as jest.Mock).mockResolvedValue(null);

      await service.updateConnectionStatus('GARMIN', 'athlete-user-1', 'EXPIRED');

      expect(prisma.deviceConnection.update).not.toHaveBeenCalled();
    });
  });
});

