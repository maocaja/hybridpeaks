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

@Injectable()
export class AthleteService {
  constructor(private prisma: PrismaService) {}

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

    return this.prisma.workoutLog.upsert({
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
}
