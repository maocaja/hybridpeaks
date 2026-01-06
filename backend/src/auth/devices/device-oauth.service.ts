import { Injectable, BadRequestException, Logger } from '@nestjs/common';
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

interface ProviderConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authUrl: string;
  tokenUrl: string;
  apiBaseUrl: string;
  tokenEncryptionKey: string;
}

@Injectable()
export class DeviceOAuthService {
  private readonly logger = new Logger(DeviceOAuthService.name);
  private readonly algorithm = 'aes-256-gcm';

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  /**
   * Check if dev mode is enabled
   */
  private isDevMode(): boolean {
    return this.configService.get<boolean>('app.devModeOAuth') === true;
  }

  /**
   * Get provider configuration from environment
   */
  private getProviderConfig(provider: DeviceProvider): ProviderConfig {
    // In dev mode, allow missing credentials (will use mock service)
    const isDev = this.isDevMode();

    const prefix = provider.toLowerCase();
    const clientId = this.configService.get<string>(`app.${prefix}.clientId`);
    const clientSecret = this.configService.get<string>(
      `app.${prefix}.clientSecret`,
    );
    const redirectUri = this.configService.get<string>(
      `app.${prefix}.redirectUri`,
    );
    const authUrl = this.configService.get<string>(`app.${prefix}.authUrl`);
    const tokenUrl = this.configService.get<string>(`app.${prefix}.tokenUrl`);
    const apiBaseUrl = this.configService.get<string>(
      `app.${prefix}.apiBaseUrl`,
    );
    const tokenEncryptionKey = this.configService.get<string>(
      `app.${prefix}.tokenEncryptionKey`,
    );

    // In dev mode, return mock values if credentials are missing
    if (isDev && (!clientId || !clientSecret || !tokenEncryptionKey)) {
      this.logger.warn(
        `[DEV MODE] ${provider} credentials missing, using mock values`,
      );
      return {
        clientId: `mock_${prefix}_client_id`,
        clientSecret: `mock_${prefix}_client_secret`,
        redirectUri: redirectUri || `http://localhost:3000/api/athlete/${prefix}/callback`,
        authUrl: authUrl || `https://mock.${prefix}.com/oauth`,
        tokenUrl: tokenUrl || `https://mock.${prefix}.com/token`,
        apiBaseUrl: apiBaseUrl || `https://mock.${prefix}.com/api`,
        tokenEncryptionKey: this.generateMockEncryptionKey(provider),
      };
    }

    if (
      !clientId ||
      !clientSecret ||
      !redirectUri ||
      !authUrl ||
      !tokenUrl ||
      !apiBaseUrl ||
      !tokenEncryptionKey
    ) {
      throw new Error(
        `${provider} OAuth configuration is incomplete. Please check environment variables. Set DEV_MODE_OAUTH=true to use mock mode.`,
      );
    }

    return {
      clientId,
      clientSecret,
      redirectUri,
      authUrl,
      tokenUrl,
      apiBaseUrl,
      tokenEncryptionKey,
    };
  }

  /**
   * Generate mock encryption key for dev mode
   */
  private generateMockEncryptionKey(provider: DeviceProvider): string {
    const mockKey = `mock_${provider.toLowerCase()}_encryption_key_32bytes!!`;
    return Buffer.from(mockKey).toString('hex').slice(0, 64); // 32 bytes = 64 hex chars
  }

  /**
   * Generate OAuth authorization URL with state parameter
   */
  generateAuthUrl(provider: DeviceProvider, state: string): string {
    // In dev mode, redirect to mock OAuth page
    if (this.isDevMode()) {
      const athletePwaUrl =
        this.configService.get<string>('app.athletePwaUrl') ||
        'http://localhost:5174';
      return `${athletePwaUrl}/mock-oauth?provider=${provider.toLowerCase()}&state=${state}`;
    }

    const config = this.getProviderConfig(provider);

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: this.getScopeForProvider(provider),
      state,
    });

    return `${config.authUrl}?${params.toString()}`;
  }

  /**
   * Get OAuth scope for provider
   */
  private getScopeForProvider(provider: DeviceProvider): string {
    switch (provider) {
      case 'GARMIN':
        return 'workout:write';
      case 'WAHOO':
        return 'workout:write'; // Adjust based on Wahoo API requirements
      default:
        return 'workout:write';
    }
  }

  /**
   * Exchange authorization code for access and refresh tokens
   */
  async exchangeCodeForTokens(
    provider: DeviceProvider,
    code: string,
    athleteUserId: string,
  ): Promise<void> {
    // In dev mode, simulate token exchange
    if (this.isDevMode()) {
      this.logger.log(
        `[DEV MODE] Simulating ${provider} token exchange for athlete ${athleteUserId}`,
      );

      const tokens: DeviceTokens = {
        accessToken: `mock_${provider.toLowerCase()}_access_${crypto.randomBytes(16).toString('hex')}`,
        refreshToken: `mock_${provider.toLowerCase()}_refresh_${crypto.randomBytes(16).toString('hex')}`,
        expiresIn: 3600, // 1 hour
      };

      await this.storeConnection(provider, athleteUserId, tokens);
      return;
    }

    const config = this.getProviderConfig(provider);

    try {
      // Exchange code for tokens
      const response = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: config.redirectUri,
          client_id: config.clientId,
          client_secret: config.clientSecret,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `Failed to exchange code for tokens: ${response.status} ${errorText}`,
        );
        throw new BadRequestException('Failed to exchange authorization code');
      }

      const data = (await response.json()) as {
        access_token: string;
        refresh_token: string;
        expires_in: number;
      };

      const tokens: DeviceTokens = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
      };

      // Store tokens in database
      await this.storeConnection(provider, athleteUserId, tokens);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error exchanging code for tokens: ${error}`);
      throw new BadRequestException('Failed to exchange authorization code');
    }
  }

  /**
   * Get device connection for an athlete
   */
  async getConnection(
    provider: DeviceProvider,
    athleteUserId: string,
  ) {
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
   * Refresh access token if expired
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
      const config = this.getProviderConfig(provider);
      return this.decryptToken(connection.accessToken, config.tokenEncryptionKey);
    }

    // Token is expired or about to expire, refresh it
    return this.refreshAccessToken(provider, athleteUserId);
  }

  /**
   * Refresh access token using refresh token
   */
  private async refreshAccessToken(
    provider: DeviceProvider,
    athleteUserId: string,
  ): Promise<string> {
    const connection = await this.getConnection(provider, athleteUserId);

    if (!connection) {
      throw new BadRequestException('No device connection found');
    }

    // In dev mode, simulate token refresh
    if (this.isDevMode()) {
      this.logger.log(
        `[DEV MODE] Simulating ${provider} token refresh for athlete ${athleteUserId}`,
      );

      const tokens: DeviceTokens = {
        accessToken: `mock_${provider.toLowerCase()}_access_${crypto.randomBytes(16).toString('hex')}`,
        refreshToken: connection.refreshToken, // Keep same refresh token
        expiresIn: 3600, // 1 hour
      };

      await this.storeConnection(provider, athleteUserId, tokens);
      return tokens.accessToken;
    }

    const config = this.getProviderConfig(provider);
    const refreshToken = this.decryptToken(
      connection.refreshToken,
      config.tokenEncryptionKey,
    );

    try {
      const response = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: config.clientId,
          client_secret: config.clientSecret,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `Failed to refresh token: ${response.status} ${errorText}`,
        );
        // Update status to EXPIRED if refresh fails
        await this.updateConnectionStatus(
          provider,
          athleteUserId,
          'EXPIRED' as ConnectionStatus,
        );
        throw new BadRequestException('Failed to refresh access token');
      }

      const data = (await response.json()) as {
        access_token: string;
        refresh_token?: string;
        expires_in: number;
      };

      const tokens: DeviceTokens = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken, // Use new refresh token if provided
        expiresIn: data.expires_in,
      };

      await this.storeConnection(provider, athleteUserId, tokens);

      return tokens.accessToken;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error refreshing token: ${error}`);
      throw new BadRequestException('Failed to refresh access token');
    }
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
      throw new BadRequestException('Athlete profile not found');
    }

    const config = this.getProviderConfig(provider);
    const encryptedAccessToken = this.encryptToken(
      tokens.accessToken,
      config.tokenEncryptionKey,
    );
    const encryptedRefreshToken = this.encryptToken(
      tokens.refreshToken,
      config.tokenEncryptionKey,
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

