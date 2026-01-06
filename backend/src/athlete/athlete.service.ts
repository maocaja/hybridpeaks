import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  InvitationStatus,
  SessionStatus,
  SessionType,
  Prisma,
} from '@prisma/client';
import { createHash } from 'crypto';
import { CreateWorkoutLogDto } from './dto/create-workout-log.dto';
import { UpdateSessionStatusDto } from './dto/update-session-status.dto';
import {
  EnduranceSummaryDto,
  StrengthSummaryDto,
} from './dto/workout-log-summary.dto';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { calculateWeekSummary } from '../metrics/week-summary';
import { EnduranceExportService } from '../integrations/endurance/endurance-export.service';

// Use enum values directly since Prisma enums are not exported as types
type DeviceProvider = 'GARMIN' | 'WAHOO';
type ConnectionStatus = 'CONNECTED' | 'EXPIRED' | 'REVOKED' | 'ERROR';

@Injectable()
export class AthleteService {
  constructor(
    private prisma: PrismaService,
    private enduranceExportService: EnduranceExportService,
  ) {}

  async acceptInvitation(athleteUserId: string, token: string) {
    // Hash the provided token
    const tokenHash = createHash('sha256').update(token).digest('hex');

    // Find invitation by token hash
    const invitation = await this.prisma.invitation.findUnique({
      where: { tokenHash },
      include: {
        coachProfile: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invalid invitation token');
    }

    // Verify invitation is pending
    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('Invitation has already been processed');
    }

    // Verify invitation is not expired
    if (invitation.expiresAt < new Date()) {
      // Mark as expired
      await this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.EXPIRED },
      });
      throw new BadRequestException('Invitation has expired');
    }

    // Get athlete user
    const athleteUser = await this.prisma.user.findUnique({
      where: { id: athleteUserId },
    });

    if (!athleteUser) {
      throw new UnauthorizedException('Athlete user not found');
    }

    // Verify email matches
    if (athleteUser.email !== invitation.invitedEmail) {
      throw new BadRequestException(
        'Invitation email does not match your account',
      );
    }

    // Ensure athlete profile exists
    let athleteProfile = await this.prisma.athleteProfile.findUnique({
      where: { userId: athleteUserId },
    });

    if (!athleteProfile) {
      athleteProfile = await this.prisma.athleteProfile.create({
        data: {
          userId: athleteUserId,
        },
      });
    }

    // Check if already linked
    const existingLink = await this.prisma.coachAthlete.findUnique({
      where: {
        coachProfileId_athleteProfileId: {
          coachProfileId: invitation.coachProfileId,
          athleteProfileId: athleteProfile.id,
        },
      },
    });

    if (existingLink) {
      throw new ConflictException('You are already linked to this coach');
    }

    // Create coach-athlete link
    await this.prisma.coachAthlete.create({
      data: {
        coachProfileId: invitation.coachProfileId,
        athleteProfileId: athleteProfile.id,
      },
    });

    // Mark invitation as accepted
    await this.prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: InvitationStatus.ACCEPTED },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        coachProfileId: invitation.coachProfileId,
        athleteUserId: athleteUser.id,
        invitationId: invitation.id,
        action: 'INVITATION_ACCEPTED',
        metadata: {
          athleteEmail: athleteUser.email,
        },
      },
    });

    return {
      message: 'Successfully accepted invitation',
      coachEmail: invitation.coachProfile.user.email,
    };
  }

  private async getSessionForAthlete(sessionId: string, athleteUserId: string) {
    const session = await this.prisma.trainingSession.findUnique({
      where: { id: sessionId },
      include: {
        weeklyPlan: {
          select: { athleteUserId: true },
        },
      },
    });

    if (!session || session.weeklyPlan.athleteUserId !== athleteUserId) {
      throw new NotFoundException('Session not found');
    }

    return session;
  }

  private validateSummary(type: SessionType, summary: unknown) {
    const dto =
      type === SessionType.STRENGTH
        ? plainToInstance(StrengthSummaryDto, summary)
        : plainToInstance(EnduranceSummaryDto, summary);

    const errors = validateSync(dto);
    if (errors.length > 0) {
      throw new BadRequestException(
        `Invalid ${type.toLowerCase()} summary: ${errors
          .map((e) => Object.values(e.constraints || {}).join(', '))
          .join('; ')}`,
      );
    }
  }

  async updateSessionStatus(
    athleteUserId: string,
    sessionId: string,
    dto: UpdateSessionStatusDto,
  ) {
    if (dto.status === SessionStatus.PLANNED) {
      throw new BadRequestException(
        'Status must be COMPLETED, MISSED, or MODIFIED',
      );
    }

    await this.getSessionForAthlete(sessionId, athleteUserId);

    const completedAt =
      dto.status === SessionStatus.COMPLETED
        ? dto.completedAt
          ? new Date(dto.completedAt)
          : new Date()
        : null;

    return this.prisma.trainingSession.update({
      where: { id: sessionId },
      data: {
        status: dto.status,
        completedAt,
      },
    });
  }

  async upsertWorkoutLog(
    athleteUserId: string,
    sessionId: string,
    dto: CreateWorkoutLogDto,
  ) {
    const session = await this.getSessionForAthlete(sessionId, athleteUserId);

    this.validateSummary(session.type, dto.summary);

    const existingLog = await this.prisma.workoutLog.findUnique({
      where: { sessionId },
    });

    if (existingLog && existingLog.athleteUserId !== athleteUserId) {
      throw new NotFoundException('Session not found');
    }

    // Create or update workout log
    const log = await this.prisma.workoutLog.upsert({
      where: { sessionId },
      update: {
        summary: dto.summary as Prisma.InputJsonValue,
      },
      create: {
        sessionId,
        athleteUserId,
        type: session.type,
        summary: dto.summary as Prisma.InputJsonValue,
      },
    });

    // Automatically update session status to COMPLETED when log is created/updated
    // Only if session is still PLANNED (don't override MISSED or MODIFIED)
    if (session.status === 'PLANNED') {
      await this.prisma.trainingSession.update({
        where: { id: sessionId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });
    }

    return log;
  }

  async getWorkoutLog(athleteUserId: string, sessionId: string) {
    await this.getSessionForAthlete(sessionId, athleteUserId);

    const log = await this.prisma.workoutLog.findUnique({
      where: { sessionId },
    });

    if (!log) {
      throw new NotFoundException('Workout log not found');
    }

    return log;
  }

  async getWeekSummary(athleteUserId: string, weekStart: string) {
    const startDate = new Date(`${weekStart}T00:00:00.000Z`);

    if (Number.isNaN(startDate.getTime())) {
      throw new BadRequestException('Invalid weekStart date');
    }

    const endDate = new Date(startDate);
    endDate.setUTCDate(startDate.getUTCDate() + 6);

    const sessions = await this.prisma.trainingSession.findMany({
      where: {
        weeklyPlan: { athleteUserId },
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        status: true,
        type: true,
      },
    });

    return calculateWeekSummary(sessions);
  }

  async getSessionsInRange(athleteUserId: string, from: string, to: string) {
    const fromDate = new Date(`${from}T00:00:00.000Z`);
    const toDate = new Date(`${to}T00:00:00.000Z`);

    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      throw new BadRequestException('Invalid date range');
    }

    if (fromDate > toDate) {
      throw new BadRequestException('from must be before to');
    }

    const sessions = await this.prisma.trainingSession.findMany({
      where: {
        weeklyPlan: {
          athleteUserId,
        },
        date: {
          gte: fromDate,
          lte: toDate,
        },
      },
      select: {
        id: true,
        date: true,
        type: true,
        title: true,
        status: true,
        completedAt: true,
        workoutLog: {
          select: { id: true },
        },
      },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    });

    return sessions.map((session) => ({
      id: session.id,
      date: session.date,
      type: session.type,
      title: session.title,
      status: session.status,
      completedAt: session.completedAt,
      hasLog: Boolean(session.workoutLog),
    }));
  }

  /**
   * Get all device connections for an athlete
   */
  async getConnections(athleteUserId: string) {
    const athleteProfile = await this.prisma.athleteProfile.findUnique({
      where: { userId: athleteUserId },
    });

    if (!athleteProfile) {
      return [];
    }

    const connections = await this.prisma.deviceConnection.findMany({
      where: {
        athleteProfileId: athleteProfile.id,
      },
      orderBy: [
        { isPrimary: 'desc' },
        { connectedAt: 'desc' },
      ],
    });

    return connections.map((conn) => ({
      provider: conn.provider,
      status: conn.status,
      connectedAt: conn.connectedAt,
      isPrimary: conn.isPrimary,
    }));
  }

  /**
   * Set primary provider for an athlete
   */
  async setPrimaryProvider(
    athleteUserId: string,
    provider: DeviceProvider,
  ) {
    const athleteProfile = await this.prisma.athleteProfile.findUnique({
      where: { userId: athleteUserId },
    });

    if (!athleteProfile) {
      throw new NotFoundException('Athlete profile not found');
    }

    // Verify the provider is connected
    const connection = await this.prisma.deviceConnection.findFirst({
      where: {
        athleteProfileId: athleteProfile.id,
        provider,
        status: 'CONNECTED',
      },
    });

    if (!connection) {
      throw new BadRequestException(
        `Cannot set ${provider} as primary: connection not found or not connected`,
      );
    }

    // Unset all other primary providers
    await this.prisma.deviceConnection.updateMany({
      where: {
        athleteProfileId: athleteProfile.id,
        isPrimary: true,
      },
      data: {
        isPrimary: false,
      },
    });

    // Set the selected provider as primary
    await this.prisma.deviceConnection.update({
      where: { id: connection.id },
      data: { isPrimary: true },
    });

    return {
      message: `${provider} set as primary provider`,
      provider,
    };
  }

  /**
   * Retry export for a failed endurance workout
   */
  async retryExport(athleteUserId: string, sessionId: string) {
    // Get session and verify ownership
    const session = await this.prisma.trainingSession.findUnique({
      where: { id: sessionId },
      include: {
        weeklyPlan: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Training session not found');
    }

    // Verify session belongs to athlete
    if (session.weeklyPlan.athleteUserId !== athleteUserId) {
      throw new UnauthorizedException(
        'Training session does not belong to athlete',
      );
    }

    // Verify session is ENDURANCE
    if (session.type !== SessionType.ENDURANCE) {
      throw new BadRequestException(
        'Only ENDURANCE sessions can be retried',
      );
    }

    // Verify session has failed export
    if (session.exportStatus !== 'FAILED') {
      throw new BadRequestException(
        `Cannot retry export: session status is ${session.exportStatus || 'NOT_SET'}. Only FAILED exports can be retried.`,
      );
    }

    // Get provider (use existing or select new)
    const provider =
      session.exportProvider ||
      (await this.enduranceExportService.selectProvider(athleteUserId));

    if (!provider) {
      throw new BadRequestException(
        'No device connection found. Please connect a device first.',
      );
    }

    // Retry export (async, don't wait)
    this.enduranceExportService
      .exportWorkoutToProvider(sessionId, athleteUserId, provider)
      .catch((error) => {
        // Error is already logged in exportWorkoutToProvider
        console.error(`Retry export failed for session ${sessionId}:`, error);
      });

    return {
      message: 'Export retry initiated',
      sessionId,
      provider,
    };
  }
}
