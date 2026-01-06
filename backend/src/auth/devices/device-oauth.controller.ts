import {
  Controller,
  Get,
  Query,
  Res,
  UseGuards,
  BadRequestException,
  Logger,
  Request,
  Headers,
  Inject,
  forwardRef,
} from '@nestjs/common';
import type { Response } from 'express';
import { DeviceOAuthService } from './device-oauth.service';
import { DeviceCallbackDto } from './dto/device-callback.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { User } from '@prisma/client';
import * as crypto from 'crypto';
import { EnduranceExportService } from '../../integrations/endurance/endurance-export.service';

interface AuthenticatedRequest extends Request {
  user: User;
}

// Use enum values directly since Prisma enums are not exported as types
const DeviceProvider = {
  GARMIN: 'GARMIN' as const,
  WAHOO: 'WAHOO' as const,
};

type DeviceProviderType = 'GARMIN' | 'WAHOO';

@Controller('athlete')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ATHLETE')
export class DeviceOAuthController {
  private readonly logger = new Logger(DeviceOAuthController.name);
  // In-memory state storage (in production, use Redis or database)
  private readonly stateStore = new Map<
    string,
    { provider: DeviceProviderType; athleteUserId: string; expiresAt: Date }
  >();

  constructor(
    private deviceOAuthService: DeviceOAuthService,
    @Inject(forwardRef(() => EnduranceExportService))
    private enduranceExportService: EnduranceExportService,
  ) {
    // Clean up expired states every 10 minutes
    setInterval(() => {
      const now = new Date();
      for (const [state, data] of this.stateStore.entries()) {
        if (data.expiresAt < now) {
          this.stateStore.delete(state);
        }
      }
    }, 10 * 60 * 1000);
  }

  /**
   * Initiate Garmin OAuth flow
   */
  @Get('garmin/connect')
  async connectGarmin(
    @Request() req: AuthenticatedRequest,
    @Res() res: Response,
    @Headers('accept') acceptHeader?: string,
  ) {
    return this.initiateOAuth(DeviceProvider.GARMIN, req.user.id, res, acceptHeader);
  }

  /**
   * Initiate Wahoo OAuth flow
   */
  @Get('wahoo/connect')
  async connectWahoo(
    @Request() req: AuthenticatedRequest,
    @Res() res: Response,
    @Headers('accept') acceptHeader?: string,
  ) {
    return this.initiateOAuth(DeviceProvider.WAHOO, req.user.id, res, acceptHeader);
  }

  /**
   * Handle Garmin OAuth callback
   */
  @Get('garmin/callback')
  async garminCallback(
    @Query() query: DeviceCallbackDto,
    @Request() req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    return this.handleCallback(DeviceProvider.GARMIN, query, req.user.id, res);
  }

  /**
   * Handle Wahoo OAuth callback
   */
  @Get('wahoo/callback')
  async wahooCallback(
    @Query() query: DeviceCallbackDto,
    @Request() req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    return this.handleCallback(DeviceProvider.WAHOO, query, req.user.id, res);
  }

  /**
   * Initiate OAuth flow for a provider
   */
  private async initiateOAuth(
    provider: DeviceProviderType,
    athleteUserId: string,
    res: Response,
    acceptHeader?: string,
  ) {
    try {
      // Generate state parameter for CSRF protection
      const state = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minute expiry

      // Store state with provider and athlete info
      this.stateStore.set(state, {
        provider: provider as DeviceProviderType,
        athleteUserId,
        expiresAt,
      });

      // Generate OAuth URL
      const authUrl = this.deviceOAuthService.generateAuthUrl(provider, state);

      // If request accepts JSON (AJAX/fetch), return URL instead of redirecting
      const acceptsJson = acceptHeader?.includes('application/json') || false;
      if (acceptsJson) {
        return res.json({ url: authUrl });
      }

      // Otherwise, redirect to provider OAuth page
      return res.redirect(authUrl);
    } catch (error) {
      this.logger.error(`Error initiating ${provider} OAuth: ${error}`);
      throw new BadRequestException(
        `Failed to initiate ${provider} connection`,
      );
    }
  }

  /**
   * Handle OAuth callback from provider
   */
  private async handleCallback(
    provider: DeviceProviderType,
    query: DeviceCallbackDto,
    athleteUserId: string,
    res: Response,
  ) {
    try {
      // Verify state parameter
      const stateData = this.stateStore.get(query.state);
      if (!stateData) {
        throw new BadRequestException('Invalid or expired state parameter');
      }

      // Verify state matches provider and athlete
      if (
        stateData.provider !== provider ||
        stateData.athleteUserId !== athleteUserId
      ) {
        throw new BadRequestException('State parameter mismatch');
      }

      // Remove state from store (one-time use)
      this.stateStore.delete(query.state);

      // Exchange code for tokens
      await this.deviceOAuthService.exchangeCodeForTokens(
        provider,
        query.code,
        athleteUserId,
      );

      // Push pending workouts for this athlete (async, don't wait)
      this.enduranceExportService
        .pushPendingWorkouts(athleteUserId, provider)
        .catch((error) => {
          this.logger.error(
            `Failed to push pending workouts after ${provider} connection: ${error}`,
          );
        });

      // Redirect to success page (frontend will handle this)
      return res.redirect(
        `${process.env.ATHLETE_PWA_URL || 'http://localhost:5174'}/today?success=${provider.toLowerCase()}`,
      );
    } catch (error) {
      this.logger.error(`Error handling ${provider} callback: ${error}`);
      // Redirect to error page
      return res.redirect(
        `${process.env.ATHLETE_PWA_URL || 'http://localhost:5174'}/today?error=${provider.toLowerCase()}`,
      );
    }
  }
}

