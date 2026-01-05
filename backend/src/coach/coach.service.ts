import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InvitationStatus } from '@prisma/client';
import { randomBytes, createHash } from 'crypto';
import { QuerySessionsDto } from './dto/query-sessions.dto';
import { calculateWeekSummary } from '../metrics/week-summary';
import {
  normalizeEnduranceWorkout,
  type EndurancePrescription,
  type NormalizedWorkout,
} from '../integrations/endurance/endurance-normalizer';

@Injectable()
export class CoachService {
  constructor(private prisma: PrismaService) {}

  async inviteAthlete(coachUserId: string, invitedEmail: string) {
    // Ensure coach profile exists
    const coachProfile = await this.ensureCoachProfile(coachUserId);

    // Revoke any existing pending invitation before creating a new one
    const existingPendingInvitation = await this.prisma.invitation.findFirst({
      where: {
        coachProfileId: coachProfile.id,
        invitedEmail,
        status: InvitationStatus.PENDING,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (existingPendingInvitation) {
      await this.prisma.invitation.update({
        where: { id: existingPendingInvitation.id },
        data: { status: InvitationStatus.REVOKED },
      });
    }

    // Check if athlete is already in roster
    const existingAthlete = await this.prisma.user.findUnique({
      where: { email: invitedEmail },
      include: {
        athleteProfile: {
          include: {
            coaches: {
              where: {
                coachProfileId: coachProfile.id,
              },
            },
          },
        },
      },
    });

    if (existingAthlete?.athleteProfile?.coaches.length) {
      throw new ConflictException('Athlete is already in your roster');
    }

    // Generate high-entropy token
    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');

    // Create invitation (expires in 7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = await this.prisma.invitation.create({
      data: {
        coachProfileId: coachProfile.id,
        invitedEmail,
        tokenHash,
        expiresAt,
      },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        coachProfileId: coachProfile.id,
        invitationId: invitation.id,
        action: 'INVITATION_CREATED',
        metadata: {
          invitedEmail,
        },
      },
    });

    return {
      invitationId: invitation.id,
      token,
    };
  }

  async listAthletes(coachUserId: string) {
    const coachProfile = await this.ensureCoachProfile(coachUserId);

    const coachAthletes = await this.prisma.coachAthlete.findMany({
      where: {
        coachProfileId: coachProfile.id,
      },
      include: {
        athleteProfile: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                createdAt: true,
              },
            },
          },
        },
      },
      orderBy: {
        linkedAt: 'desc',
      },
    });

    return coachAthletes.map((ca) => ({
      id: ca.athleteProfile.user.id,
      email: ca.athleteProfile.user.email,
      linkedAt: ca.linkedAt,
    }));
  }

  async getAthleteSessions(
    coachUserId: string,
    athleteUserId: string,
    query: QuerySessionsDto,
  ) {
    await this.verifyCoachAthleteRelationship(coachUserId, athleteUserId);

    const fromDate = new Date(`${query.from}T00:00:00.000Z`);
    const toDate = new Date(`${query.to}T00:00:00.000Z`);

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
      include: {
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

  async getAthleteSessionLog(
    coachUserId: string,
    athleteUserId: string,
    sessionId: string,
  ) {
    await this.verifyCoachAthleteRelationship(coachUserId, athleteUserId);

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

    const log = await this.prisma.workoutLog.findUnique({
      where: { sessionId },
    });

    if (!log) {
      throw new NotFoundException('Workout log not found');
    }

    return log;
  }

  async getAthleteWeekSummary(
    coachUserId: string,
    athleteUserId: string,
    weekStart: string,
  ) {
    await this.verifyCoachAthleteRelationship(coachUserId, athleteUserId);

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

  private async ensureCoachProfile(userId: string) {
    let coachProfile = await this.prisma.coachProfile.findUnique({
      where: { userId },
    });

    if (!coachProfile) {
      // Create coach profile if it doesn't exist
      coachProfile = await this.prisma.coachProfile.create({
        data: {
          userId,
        },
      });
    }

    return coachProfile;
  }

  private async verifyCoachAthleteRelationship(
    coachUserId: string,
    athleteUserId: string,
  ): Promise<void> {
    const coachProfile = await this.prisma.coachProfile.findUnique({
      where: { userId: coachUserId },
      include: {
        athletes: {
          where: {
            athleteProfile: {
              userId: athleteUserId,
            },
          },
        },
      },
    });

    if (!coachProfile) {
      throw new NotFoundException('Coach profile not found');
    }

    if (coachProfile.athletes.length === 0) {
      throw new ForbiddenException(
        'Coach does not have permission to manage this athlete',
      );
    }
  }

  async getNormalizedWorkout(
    coachUserId: string,
    sessionId: string,
  ): Promise<NormalizedWorkout> {
    // Fetch session with weeklyPlan relation
    const session = await this.prisma.trainingSession.findUnique({
      where: { id: sessionId },
      include: {
        weeklyPlan: {
          select: {
            athleteUserId: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Training session not found');
    }

    // Verify coach has access to athlete
    await this.verifyCoachAthleteRelationship(
      coachUserId,
      session.weeklyPlan.athleteUserId,
    );

    // Validate session type is ENDURANCE
    if (session.type !== 'ENDURANCE') {
      throw new BadRequestException(
        'This endpoint only supports endurance sessions',
      );
    }

    // Use the imported normalizer

    // Convert prescription from DB format to EndurancePrescription format
    // The prescription in DB is already normalized by weekly-plans.service.ts
    // but may need conversion to match the exact format expected by the normalizer
    const dbPrescription = session.prescription as {
      sport: string;
      steps: Array<
        | {
            type: string;
            duration: { type: string; value: number };
            primaryTarget?: {
              kind: string;
              unit: string;
              zone?: number;
              minWatts?: number;
              maxWatts?: number;
              minBpm?: number;
              maxBpm?: number;
              minSecPerKm?: number;
              maxSecPerKm?: number;
            };
            cadenceTarget?: {
              kind: string;
              unit: string;
              minRpm: number;
              maxRpm: number;
            };
            note?: string;
          }
        | {
            repeat: number;
            steps: Array<{
              type: string;
              duration: { type: string; value: number };
              primaryTarget?: {
                kind: string;
                unit: string;
                zone?: number;
                minWatts?: number;
                maxWatts?: number;
                minBpm?: number;
                maxBpm?: number;
                minSecPerKm?: number;
                maxSecPerKm?: number;
              };
              cadenceTarget?: {
                kind: string;
                unit: string;
                minRpm: number;
                maxRpm: number;
              };
              note?: string;
            }>;
          }
      >;
      objective?: string;
      notes?: string;
    };

    if (
      !dbPrescription ||
      !dbPrescription.sport ||
      !Array.isArray(dbPrescription.steps)
    ) {
      throw new BadRequestException('Invalid endurance prescription format');
    }

    // The prescription in DB is already normalized by weekly-plans.service.ts
    // It should be in a format compatible with the normalizer
    // We cast it to EndurancePrescription (the normalizer will handle validation)
    const prescriptionForNormalizer =
      dbPrescription as unknown as EndurancePrescription;

    try {
      const normalized = normalizeEnduranceWorkout(prescriptionForNormalizer);
      return normalized;
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(
          `Failed to normalize workout: ${error.message}`,
        );
      }
      throw new BadRequestException('Failed to normalize workout');
    }
  }
}
