import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// Use enum values directly since Prisma enums are not exported as types
type DeviceProvider = 'GARMIN' | 'WAHOO';
import { ExportPayload } from '../../integrations/endurance/exporters/exporter';

@Injectable()
export class DeviceApiService {
  private readonly logger = new Logger(DeviceApiService.name);

  constructor(private configService: ConfigService) {}

  /**
   * Get provider API base URL
   */
  private getApiBaseUrl(provider: DeviceProvider): string {
    const apiBaseUrl = this.configService.get<string>(
      `app.${provider.toLowerCase()}.apiBaseUrl`,
    );

    if (!apiBaseUrl) {
      throw new Error(
        `${provider} API base URL is not configured. Please check environment variables.`,
      );
    }

    return apiBaseUrl;
  }

  /**
   * Create a workout in provider (Garmin/Wahoo)
   * @param provider Device provider (GARMIN or WAHOO)
   * @param accessToken Provider access token
   * @param workout Normalized workout in provider format
   * @returns Provider workout ID
   */
  async createWorkout(
    provider: DeviceProvider,
    accessToken: string,
    workout: ExportPayload,
  ): Promise<string> {
    const apiBaseUrl = this.getApiBaseUrl(provider);
    const url = `${apiBaseUrl}/workouts`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...workout,
          status: 'draft', // Create as draft
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `Failed to create workout in ${provider}: ${response.status} ${errorText}`,
        );

        if (response.status === 401) {
          throw new BadRequestException(
            `${provider} authentication failed. Please reconnect your account.`,
          );
        }

        if (response.status === 403) {
          throw new BadRequestException(
            `${provider} access denied. Please check your permissions.`,
          );
        }

        if (response.status === 400) {
          throw new BadRequestException(
            `Invalid workout format for ${provider}: ${errorText}`,
          );
        }

        throw new BadRequestException(
          `Failed to create workout in ${provider}: ${response.status}`,
        );
      }

      const data = (await response.json()) as { id: string };
      return data.id;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error creating workout in ${provider}: ${error}`);
      throw new BadRequestException(
        `Failed to create workout in ${provider}`,
      );
    }
  }

  /**
   * Refresh access token using refresh token
   * @param provider Device provider
   * @param refreshToken Provider refresh token
   * @returns New access token and expiration
   */
  async refreshToken(
    provider: DeviceProvider,
    refreshToken: string,
  ): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresIn: number;
  }> {
    const tokenUrl = this.configService.get<string>(
      `app.${provider.toLowerCase()}.tokenUrl`,
    );
    const clientId = this.configService.get<string>(
      `app.${provider.toLowerCase()}.clientId`,
    );
    const clientSecret = this.configService.get<string>(
      `app.${provider.toLowerCase()}.clientSecret`,
    );

    if (!tokenUrl || !clientId || !clientSecret) {
      throw new Error(
        `${provider} OAuth configuration is incomplete. Please check environment variables.`,
      );
    }

    try {
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `Failed to refresh ${provider} token: ${response.status} ${errorText}`,
        );
        throw new BadRequestException(
          `Failed to refresh ${provider} access token`,
        );
      }

      const data = (await response.json()) as {
        access_token: string;
        refresh_token?: string;
        expires_in: number;
      };

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error refreshing ${provider} token: ${error}`);
      throw new BadRequestException(`Failed to refresh ${provider} access token`);
    }
  }
}

