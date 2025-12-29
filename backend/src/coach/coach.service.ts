import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InvitationStatus } from '@prisma/client';
import { randomBytes, createHash } from 'crypto';

@Injectable()
export class CoachService {
  constructor(private prisma: PrismaService) {}

  async inviteAthlete(coachUserId: string, invitedEmail: string) {
    // Ensure coach profile exists
    const coachProfile = await this.ensureCoachProfile(coachUserId);

    // Check if there's already a pending invitation for this email
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
      throw new ConflictException(
        'An active invitation for this email already exists',
      );
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
}
