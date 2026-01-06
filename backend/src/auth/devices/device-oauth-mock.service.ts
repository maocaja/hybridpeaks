import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

// Use enum values directly since Prisma enums are not exported as types
type DeviceProvider = 'GARMIN' | 'WAHOO';
type ConnectionStatus = 'CONNECTED' | 'EXPIRED' | 'REVOKED' | 'ERROR';

interface DeviceTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
}

/**
 * Mock OAuth Service for Development Mode
 * Simulates OAuth flow without requiring real Garmin/Wahoo credentials
 */
@Injectable()
export class DeviceOAuthMockService {
  private readonly logger = new Logger(DeviceOAuthMockService.name);
  private readonly algorithm = 'aes-256-gcm';

  // In-memory mock token store (simulates provider's token endpoint)
  private readonly mockTokens = new Map<string, DeviceTokens>();

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  /**
   * Generate mock OAuth authorization URL
   * In dev mode, this redirects to a local mock page
   */
  generateAuthUrl(provider: DeviceProvider, state: string): string {
    const baseUrl =
      this.configService.get<string>('app.athletePwaUrl') ||
      'http://localhost:5174';
    // Mock OAuth page that simulates provider authorization
    return `${baseUrl}/mock-oauth?provider=${provider.toLowerCase()}&state=${state}`;
  }

  /**
   * Mock token exchange - simulates provider's token endpoint
   * In real OAuth, this would call the provider's API
   */
  async exchangeCodeForTokens(
    provider: DeviceProvider,
    code: string,
    athleteUserId: string,
  ): Promise<void> {
    this.logger.log(
      `[MOCK] Simulating ${provider} token exchange for athlete ${athleteUserId}`,
    );

    // Simulate token response (what provider would return)
    const mockTokens: DeviceTokens = {
      accessToken: `mock_${provider.toLowerCase()}_access_${crypto.randomBytes(16).toString('hex')}`,
      refreshToken: `mock_${provider.toLowerCase()}_refresh_${crypto.randomBytes(16).toString('hex')}`,
      expiresIn: 3600, // 1 hour
    };

    // Store mock tokens (for refresh simulation)
    this.mockTokens.set(`${provider}_${athleteUserId}`, mockTokens);

    // Store in database (same as real flow)
    await this.storeConnection(provider, athleteUserId, mockTokens);

    this.logger.log(
      `[MOCK] Successfully stored ${provider} connection for athlete ${athleteUserId}`,
    );
  }

  /**
   * Get device connection for an athlete
   */
  async getConnection(provider: DeviceProvider, athleteUserId: string) {
    const athleteProfile = await this.prisma.athleteProfile.findUnique({
      where: { userId: athleteUserId },
    });

    if (!athleteProfile) {
      return null;
    }

    return this.prisma.deviceConnection.findFirst({
      where: {
        athleteProfileId: athleteProfile.id,
        provider,
      },
    });
  }

  /**
   * Refresh access token if expired (mock implementation)
   */
  async refreshAccessTokenIfNeeded(
    provider: DeviceProvider,
    athleteUserId: string,
  ): Promise<string | null> {
    const connection = await this.getConnection(provider, athleteUserId);

    if (!connection) {
      return null;
    }

    // Check if token is expired (with 5 minute buffer)
    const now = new Date();
    const expiresAt = new Date(connection.expiresAt);
    const buffer = 5 * 60 * 1000; // 5 minutes in milliseconds

    if (now.getTime() < expiresAt.getTime() - buffer) {
      // Token is still valid
      const encryptionKey = this.getMockEncryptionKey(provider);
      return this.decryptToken(connection.accessToken, encryptionKey);
    }

    // Token is expired, refresh it (mock)
    return this.refreshAccessToken(provider, athleteUserId);
  }

  /**
   * Mock token refresh
   */
  private async refreshAccessToken(
    provider: DeviceProvider,
    athleteUserId: string,
  ): Promise<string> {
    this.logger.log(
      `[MOCK] Refreshing ${provider} token for athlete ${athleteUserId}`,
    );

    const connection = await this.getConnection(provider, athleteUserId);

    if (!connection) {
      throw new Error('No device connection found');
    }

    // Generate new mock tokens
    const mockTokens: DeviceTokens = {
      accessToken: `mock_${provider.toLowerCase()}_access_${crypto.randomBytes(16).toString('hex')}`,
      refreshToken: connection.refreshToken, // Keep same refresh token
      expiresIn: 3600, // 1 hour
    };

    await this.storeConnection(provider, athleteUserId, mockTokens);

    return mockTokens.accessToken;
  }

  /**
   * Store encrypted tokens in database
   */
  private async storeConnection(
    provider: DeviceProvider,
    athleteUserId: string,
    tokens: DeviceTokens,
  ): Promise<void> {
    const athleteProfile = await this.prisma.athleteProfile.findUnique({
      where: { userId: athleteUserId },
    });

    if (!athleteProfile) {
      throw new Error('Athlete profile not found');
    }

    const encryptionKey = this.getMockEncryptionKey(provider);
    const encryptedAccessToken = this.encryptToken(
      tokens.accessToken,
      encryptionKey,
    );
    const encryptedRefreshToken = this.encryptToken(
      tokens.refreshToken,
      encryptionKey,
    );

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + tokens.expiresIn);

    await this.prisma.deviceConnection.upsert({
      where: {
        athleteProfileId_provider: {
          athleteProfileId: athleteProfile.id,
          provider,
        },
      },
      create: {
        athleteProfileId: athleteProfile.id,
        provider,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt,
        status: 'CONNECTED' as ConnectionStatus,
      },
      update: {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt,
        status: 'CONNECTED' as ConnectionStatus,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Update connection status
   */
  async updateConnectionStatus(
    provider: DeviceProvider,
    athleteUserId: string,
    status: ConnectionStatus,
  ): Promise<void> {
    const connection = await this.getConnection(provider, athleteUserId);

    if (!connection) {
      return;
    }

    await this.prisma.deviceConnection.update({
      where: { id: connection.id },
      data: { status },
    });
  }

  /**
   * Get mock encryption key (for dev mode)
   */
  private getMockEncryptionKey(provider: DeviceProvider): string {
    // Use a consistent mock key for development
    // In production, this would come from environment variables
    const mockKey = `mock_${provider.toLowerCase()}_encryption_key_32bytes!!`;
    return Buffer.from(mockKey).toString('hex').slice(0, 64); // 32 bytes = 64 hex chars
  }

  /**
   * Encrypt token before storing
   */
  private encryptToken(token: string, encryptionKey: string): string {
    const key = Buffer.from(encryptionKey, 'hex');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);

    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Return IV + authTag + encrypted data
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt token after retrieving
   */
  private decryptToken(encryptedToken: string, encryptionKey: string): string {
    const parts = encryptedToken.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted token format');
    }

    const [ivHex, authTagHex, encrypted] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const key = Buffer.from(encryptionKey, 'hex');

    const decipher = crypto.createDecipheriv(this.algorithm, key, iv);

    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}

