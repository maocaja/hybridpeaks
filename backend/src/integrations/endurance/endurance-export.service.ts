import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DeviceOAuthService } from '../../auth/devices/device-oauth.service';
import { DeviceApiService } from '../../auth/devices/device-api.service';
import {
  normalizeEnduranceWorkout,
  EndurancePrescription,
  NormalizedWorkout,
} from './endurance-normalizer';
import { GarminExporterStub } from './exporters/garmin-exporter.stub';
import { WahooExporterStub } from './exporters/wahoo-exporter.stub';
import { ExportPayload } from './exporters/exporter';
import { DeviceProvider, ExportStatus } from '@prisma/client';

@Injectable()
export class EnduranceExportService {
  private readonly logger = new Logger(EnduranceExportService.name);

  constructor(
    private prisma: PrismaService,
    private deviceOAuthService: DeviceOAuthService,
    private deviceApiService: DeviceApiService,
  ) {}

  /**
   * Select provider for athlete (primary or only connected)
   */
  async selectProvider(athleteUserId: string): Promise<DeviceProvider | null> {
    const athleteProfile = await this.prisma.athleteProfile.findUnique({
      where: { userId: athleteUserId },
      include: {
        deviceConnections: {
          where: {
            status: 'CONNECTED',
          },
          orderBy: [
            { isPrimary: 'desc' },
            { connectedAt: 'desc' },
          ],
        },
      },
    });

    if (!athleteProfile || athleteProfile.deviceConnections.length === 0) {
      return null;
    }

    // Use primary provider if set, otherwise use first connected
    const primary = athleteProfile.deviceConnections.find((c) => c.isPrimary);
    if (primary) {
      return primary.provider;
    }

    return athleteProfile.deviceConnections[0].provider;
  }

  /**
   * Validate normalized workout before export
   */
  validateNormalizedWorkout(workout: NormalizedWorkout): void {
    // Must have at least one step
    if (!workout.steps || workout.steps.length === 0) {
      throw new BadRequestException(
        'Workout must have at least one step',
      );
    }

    // All steps must have valid duration
    for (const step of workout.steps) {
      const durationSeconds = step.duration.seconds;
      const durationMeters = step.duration.meters;

      if (!durationSeconds && !durationMeters) {
        throw new BadRequestException(
          `Step "${step.type}" must have duration (seconds or meters)`,
        );
      }

      if (durationSeconds && durationSeconds <= 0) {
        throw new BadRequestException(
          `Step "${step.type}" duration must be greater than 0`,
        );
      }

      if (durationMeters && durationMeters <= 0) {
        throw new BadRequestException(
          `Step "${step.type}" duration must be greater than 0`,
        );
      }

      // Primary target validation
      if (step.primaryTarget) {
        const hasZone = step.primaryTarget.zone !== undefined;
        const hasRange =
          step.primaryTarget.min !== undefined &&
          step.primaryTarget.max !== undefined;

        if (!hasZone && !hasRange) {
          throw new BadRequestException(
            `Step "${step.type}" primary target must have zone OR min/max range`,
          );
        }
      }

      // Cadence target only for BIKE
      if (step.cadenceTarget && workout.sport !== 'BIKE') {
        throw new BadRequestException(
          'Cadence target is only allowed for BIKE workouts',
        );
      }
    }
  }

  /**
   * Convert normalized workout to provider format
   */
  convertToProviderFormat(
    workout: NormalizedWorkout,
    provider: DeviceProvider,
  ): ExportPayload {
    if (provider === 'GARMIN') {
      const exporter = new GarminExporterStub();
      return exporter.build(workout);
    } else if (provider === 'WAHOO') {
      const exporter = new WahooExporterStub();
      return exporter.build(workout);
    }

    throw new BadRequestException(`Unsupported provider: ${provider}`);
  }

  /**
   * Export workout to provider
   */
  async exportWorkoutToProvider(
    sessionId: string,
    athleteUserId: string,
    provider: DeviceProvider,
  ): Promise<void> {
    // Get session
    const session = await this.prisma.trainingSession.findUnique({
      where: { id: sessionId },
      include: {
        weeklyPlan: true,
      },
    });

    if (!session) {
      throw new BadRequestException('Training session not found');
    }

    // Verify session belongs to athlete
    if (session.weeklyPlan.athleteUserId !== athleteUserId) {
      throw new BadRequestException(
        'Training session does not belong to athlete',
      );
    }

    // Verify session is ENDURANCE
    if (session.type !== 'ENDURANCE') {
      throw new BadRequestException(
        'Only ENDURANCE sessions can be exported',
      );
    }

    // Set status to PENDING
    await this.prisma.trainingSession.update({
      where: { id: sessionId },
      data: {
        exportStatus: 'PENDING',
        exportProvider: provider,
      },
    });

    try {
      // Normalize workout
      const prescription = session.prescription as EndurancePrescription;
      const normalized = normalizeEnduranceWorkout(prescription);

      // Validate normalized workout
      this.validateNormalizedWorkout(normalized);

      // Convert to provider format
      const exportPayload = this.convertToProviderFormat(normalized, provider);

      // Get access token (refresh if needed)
      const accessToken =
        await this.deviceOAuthService.refreshAccessTokenIfNeeded(
          provider,
          athleteUserId,
        );

      if (!accessToken) {
        throw new BadRequestException(
          `No valid ${provider} connection found. Please reconnect your device.`,
        );
      }

      // Create workout in provider
      const externalWorkoutId = await this.deviceApiService.createWorkout(
        provider,
        accessToken,
        exportPayload,
      );

      // Update session: SENT
      await this.prisma.trainingSession.update({
        where: { id: sessionId },
        data: {
          exportStatus: 'SENT',
          exportProvider: provider,
          exportedAt: new Date(),
          externalWorkoutId,
          lastExportError: null,
        },
      });

      this.logger.log(
        `Successfully exported workout ${sessionId} to ${provider} (external ID: ${externalWorkoutId})`,
      );
    } catch (error) {
      // Update session: FAILED
      const errorMessage =
        error instanceof BadRequestException
          ? error.message
          : `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`;

      await this.prisma.trainingSession.update({
        where: { id: sessionId },
        data: {
          exportStatus: 'FAILED',
          exportProvider: provider,
          lastExportError: errorMessage,
        },
      });

      this.logger.error(
        `Failed to export workout ${sessionId} to ${provider}: ${errorMessage}`,
      );

      // Re-throw if it's a BadRequestException (validation errors)
      if (error instanceof BadRequestException) {
        throw error;
      }

      // Otherwise, wrap in BadRequestException
      throw new BadRequestException(errorMessage);
    }
  }

  /**
   * Auto-push endurance workout (called when coach creates/updates session)
   */
  async autoPushEnduranceWorkout(
    sessionId: string,
    athleteUserId: string,
  ): Promise<void> {
    try {
      // Select provider
      const provider = await this.selectProvider(athleteUserId);

      if (!provider) {
        // No connection - set status to NOT_CONNECTED
        await this.prisma.trainingSession.update({
          where: { id: sessionId },
          data: {
            exportStatus: 'NOT_CONNECTED',
            exportProvider: null,
            lastExportError: null,
          },
        });
        return;
      }

      // Export to provider (async, don't wait)
      this.exportWorkoutToProvider(sessionId, athleteUserId, provider).catch(
        (error) => {
          this.logger.error(
            `Background export failed for session ${sessionId}: ${error}`,
          );
        },
      );
    } catch (error) {
      this.logger.error(
        `Auto-push failed for session ${sessionId}: ${error}`,
      );
      // Don't throw - auto-push failures shouldn't block plan save
    }
  }

  /**
   * Push all pending workouts for athlete (when they connect device)
   */
  async pushPendingWorkouts(
    athleteUserId: string,
    provider: DeviceProvider,
  ): Promise<void> {
    // Find all NOT_CONNECTED ENDURANCE sessions for this athlete
    const athleteProfile = await this.prisma.athleteProfile.findUnique({
      where: { userId: athleteUserId },
    });

    if (!athleteProfile) {
      return;
    }

    const weeklyPlans = await this.prisma.weeklyPlan.findMany({
      where: { athleteUserId },
      include: {
        sessions: {
          where: {
            type: 'ENDURANCE',
            exportStatus: 'NOT_CONNECTED',
          },
        },
      },
    });

    const pendingSessions = weeklyPlans.flatMap((plan) => plan.sessions);

    this.logger.log(
      `Found ${pendingSessions.length} pending workouts for athlete ${athleteUserId}`,
    );

    // Push each session (async, don't wait)
    for (const session of pendingSessions) {
      this.exportWorkoutToProvider(session.id, athleteUserId, provider).catch(
        (error) => {
          this.logger.error(
            `Failed to push pending workout ${session.id}: ${error}`,
          );
        },
      );
    }
  }
}

