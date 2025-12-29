import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InvitationStatus } from '@prisma/client';
import { createHash } from 'crypto';

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
}
