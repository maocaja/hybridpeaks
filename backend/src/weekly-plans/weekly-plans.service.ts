import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SessionType, ExerciseType, Prisma } from '@prisma/client';
import { CreateWeeklyPlanDto } from './dto/create-weekly-plan.dto';
import { UpdateWeeklyPlanDto } from './dto/update-weekly-plan.dto';
import { validateSync } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { StrengthPrescriptionDto } from './dto/strength-prescription.dto';
import { EndurancePrescriptionDto } from './dto/endurance-prescription.dto';

@Injectable()
export class WeeklyPlansService {
  constructor(private prisma: PrismaService) {}

  /**
   * Verify that coach has the athlete in their roster
   */
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

  /**
   * Normalize date string to Monday of that week
   * If input is not Monday, find the Monday of that week
   */
  private normalizeToMonday(dateString: string): Date {
    const date = new Date(dateString + 'T00:00:00.000Z');
    const dayOfWeek = date.getUTCDay(); // 0 = Sunday, 1 = Monday, ...

    if (dayOfWeek === 1) {
      // Already Monday
      return date;
    }

    // Calculate days to subtract to get to Monday
    // If Sunday (0), go back 6 days; if Tuesday (2), go back 1 day, etc.
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(date);
    monday.setUTCDate(date.getUTCDate() - daysToSubtract);

    return monday;
  }

  /**
   * Validate prescription based on session type
   */
  private validatePrescription(type: SessionType, prescription: unknown): void {
    if (type === SessionType.STRENGTH) {
      const dto = plainToInstance(StrengthPrescriptionDto, prescription);
      const errors = validateSync(dto);
      if (errors.length > 0) {
        throw new BadRequestException(
          `Invalid strength prescription: ${errors.map((e) => Object.values(e.constraints || {}).join(', ')).join('; ')}`,
        );
      }
    } else if (type === SessionType.ENDURANCE) {
      const dto = plainToInstance(EndurancePrescriptionDto, prescription);
      const errors = validateSync(dto);
      if (errors.length > 0) {
        throw new BadRequestException(
          `Invalid endurance prescription: ${errors.map((e) => Object.values(e.constraints || {}).join(', ')).join('; ')}`,
        );
      }
    }
  }

  /**
   * Validate that exerciseId references a STRENGTH exercise
   */
  private async validateStrengthExercises(
    prescription: unknown,
  ): Promise<void> {
    const strengthPrescription = prescription as {
      items: Array<{ exerciseId: string }>;
    };

    for (const item of strengthPrescription.items) {
      const exercise = await this.prisma.exercise.findUnique({
        where: { id: item.exerciseId },
      });

      if (!exercise) {
        throw new BadRequestException(
          `Exercise with ID ${item.exerciseId} not found`,
        );
      }

      if (exercise.type !== ExerciseType.STRENGTH) {
        throw new BadRequestException(
          `Exercise ${exercise.name} is not a STRENGTH exercise`,
        );
      }
    }
  }

  /**
   * Create a weekly plan for an athlete
   */
  async createWeeklyPlan(
    coachUserId: string,
    athleteUserId: string,
    dto: CreateWeeklyPlanDto,
  ) {
    // Verify coach-athlete relationship
    await this.verifyCoachAthleteRelationship(coachUserId, athleteUserId);

    // Verify athlete exists
    const athlete = await this.prisma.user.findUnique({
      where: { id: athleteUserId },
    });

    if (!athlete) {
      throw new NotFoundException('Athlete not found');
    }

    // Normalize weekStart to Monday
    const normalizedWeekStart = this.normalizeToMonday(dto.weekStart);

    // Check for existing plan for this athlete and week
    const existingPlan = await this.prisma.weeklyPlan.findUnique({
      where: {
        athleteUserId_weekStart: {
          athleteUserId,
          weekStart: normalizedWeekStart,
        },
      },
    });

    if (existingPlan) {
      throw new BadRequestException(
        `A weekly plan already exists for this athlete starting on ${normalizedWeekStart.toISOString().split('T')[0]}`,
      );
    }

    // Validate each session prescription
    for (const session of dto.sessions) {
      this.validatePrescription(session.type, session.prescription);

      // Additional validation for strength exercises
      if (session.type === SessionType.STRENGTH) {
        await this.validateStrengthExercises(session.prescription);
      }
    }

    // Create the weekly plan with sessions
    const weeklyPlan = await this.prisma.weeklyPlan.create({
      data: {
        coachId: coachUserId,
        athleteUserId,
        weekStart: normalizedWeekStart,
        notes: dto.notes,
        sessions: {
          create: dto.sessions.map((session) => ({
            date: new Date(session.date + 'T00:00:00.000Z'),
            type: session.type,
            title: session.title,
            prescription: session.prescription as Prisma.InputJsonValue,
          })),
        },
      },
      include: {
        sessions: {
          orderBy: { date: 'asc' },
        },
      },
    });

    return weeklyPlan;
  }

  /**
   * Get weekly plan(s) for an athlete by week start date
   */
  async getWeeklyPlan(
    coachUserId: string,
    athleteUserId: string,
    weekStart: string,
  ) {
    // Verify coach-athlete relationship
    await this.verifyCoachAthleteRelationship(coachUserId, athleteUserId);

    // Normalize weekStart to Monday
    const normalizedWeekStart = this.normalizeToMonday(weekStart);

    const weeklyPlan = await this.prisma.weeklyPlan.findUnique({
      where: {
        athleteUserId_weekStart: {
          athleteUserId,
          weekStart: normalizedWeekStart,
        },
      },
      include: {
        sessions: {
          orderBy: { date: 'asc' },
        },
      },
    });

    if (!weeklyPlan) {
      throw new NotFoundException(
        `No weekly plan found for week starting ${normalizedWeekStart.toISOString().split('T')[0]}`,
      );
    }

    return weeklyPlan;
  }

  /**
   * Update an existing weekly plan
   */
  async updateWeeklyPlan(
    coachUserId: string,
    planId: string,
    dto: UpdateWeeklyPlanDto,
  ) {
    // Fetch the plan and verify ownership
    const existingPlan = await this.prisma.weeklyPlan.findUnique({
      where: { id: planId },
    });

    if (!existingPlan) {
      throw new NotFoundException('Weekly plan not found');
    }

    if (existingPlan.coachId !== coachUserId) {
      throw new ForbiddenException(
        'Coach does not have permission to update this plan',
      );
    }

    // Validate session prescriptions if provided
    if (dto.sessions) {
      for (const session of dto.sessions) {
        this.validatePrescription(session.type, session.prescription);

        if (session.type === SessionType.STRENGTH) {
          await this.validateStrengthExercises(session.prescription);
        }
      }
    }

    // Update plan (replace sessions if provided)
    const updatedPlan = await this.prisma.weeklyPlan.update({
      where: { id: planId },
      data: {
        notes: dto.notes,
        ...(dto.sessions && {
          sessions: {
            deleteMany: {}, // Remove all existing sessions
            create: dto.sessions.map((session) => ({
              date: new Date(session.date + 'T00:00:00.000Z'),
              type: session.type,
              title: session.title,
              prescription: session.prescription as Prisma.InputJsonValue,
            })),
          },
        }),
      },
      include: {
        sessions: {
          orderBy: { date: 'asc' },
        },
      },
    });

    return updatedPlan;
  }

  /**
   * Get today's sessions for an athlete (read-only)
   */
  async getTodaySessions(athleteUserId: string) {
    // Get today's date (normalized to UTC date string)
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    const todayDate = new Date(todayString + 'T00:00:00.000Z');

    // Fetch all sessions for today
    const sessions = await this.prisma.trainingSession.findMany({
      where: {
        weeklyPlan: {
          athleteUserId,
        },
        date: todayDate,
      },
      include: {
        weeklyPlan: {
          select: {
            notes: true,
            weekStart: true,
          },
        },
      },
      orderBy: [{ type: 'asc' }, { createdAt: 'asc' }],
    });

    return sessions;
  }
}
