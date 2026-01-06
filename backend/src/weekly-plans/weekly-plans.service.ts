import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  SessionType,
  ExerciseType,
  Prisma,
  Modality,
  SessionStatus,
} from '@prisma/client';
import { EnduranceExportService } from '../integrations/endurance/endurance-export.service';
import { CreateWeeklyPlanDto } from './dto/create-weekly-plan.dto';
import { UpdateWeeklyPlanDto } from './dto/update-weekly-plan.dto';
import { validateSync } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { StrengthPrescriptionDto } from './dto/strength-prescription.dto';
import {
  EndurancePrescriptionDto,
  EnduranceLegacyPrescriptionDto,
  EnduranceSport,
  EnduranceStepDto,
  EnduranceRepeatBlockDto,
  StepType,
  DurationType,
  PrimaryTargetKind,
  PrimaryTargetUnit,
  CadenceTargetKind,
  CadenceTargetUnit,
  LegacyTargetType,
} from './dto/endurance-prescription.dto';

type EndurancePrimaryTarget =
  | {
      kind: PrimaryTargetKind.POWER;
      unit: PrimaryTargetUnit.WATTS;
      zone?: number;
      minWatts?: number;
      maxWatts?: number;
    }
  | {
      kind: PrimaryTargetKind.HEART_RATE;
      unit: PrimaryTargetUnit.BPM;
      zone?: number;
      minBpm?: number;
      maxBpm?: number;
    }
  | {
      kind: PrimaryTargetKind.PACE;
      unit: PrimaryTargetUnit.SEC_PER_KM;
      zone?: number;
      minSecPerKm?: number;
      maxSecPerKm?: number;
    };

interface EnduranceStep {
  type: StepType;
  duration: {
    type: DurationType;
    value: number;
  };
  primaryTarget?: EndurancePrimaryTarget;
  cadenceTarget?: EnduranceCadenceTarget;
  note?: string;
}

interface EnduranceRepeatBlock {
  repeat: number;
  steps: EnduranceStep[];
}

interface EnduranceCadenceTarget {
  kind: 'CADENCE';
  unit: CadenceTargetUnit;
  minRpm: number;
  maxRpm: number;
}

interface LegacyTargetParse {
  zone?: number;
  min?: number;
  max?: number;
  unit?: string;
}

@Injectable()
export class WeeklyPlansService {
  constructor(
    private prisma: PrismaService,
    private enduranceExportService: EnduranceExportService,
  ) {}

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
  private normalizePrescription(
    type: SessionType,
    prescription: unknown,
  ): Prisma.InputJsonValue {
    if (type === SessionType.STRENGTH) {
      const dto = plainToInstance(StrengthPrescriptionDto, prescription);
      const errors = validateSync(dto);
      if (errors.length > 0) {
        throw new BadRequestException(
          `Invalid strength prescription: ${errors.map((e) => Object.values(e.constraints || {}).join(', ')).join('; ')}`,
        );
      }
      return prescription as Prisma.InputJsonValue;
    } else if (type === SessionType.ENDURANCE) {
      return this.normalizeEndurancePrescription(prescription);
    }
    throw new BadRequestException('Unsupported session type');
  }

  private normalizeEndurancePrescription(
    prescription: unknown,
  ): Prisma.InputJsonValue {
    if (this.isNewEndurancePrescription(prescription)) {
      return this.validateNewEndurancePrescription(prescription);
    }

    if (this.isLegacyEndurancePrescription(prescription)) {
      return this.normalizeLegacyEndurancePrescription(prescription);
    }

    throw new BadRequestException('Invalid endurance prescription');
  }

  private isNewEndurancePrescription(
    prescription: unknown,
  ): prescription is { sport: EnduranceSport; steps: unknown[] } {
    if (!this.isRecord(prescription)) return false;
    return 'sport' in prescription && 'steps' in prescription;
  }

  private isLegacyEndurancePrescription(
    prescription: unknown,
  ): prescription is { modality: string } {
    if (!this.isRecord(prescription)) return false;
    return 'modality' in prescription;
  }

  private validateNewEndurancePrescription(prescription: {
    sport: EnduranceSport;
    steps: unknown[];
    objective?: string;
    notes?: string;
  }): Prisma.InputJsonValue {
    const dto = plainToInstance(EndurancePrescriptionDto, prescription);
    const errors = validateSync(dto);
    if (errors.length > 0) {
      throw new BadRequestException(
        `Invalid endurance prescription: ${errors.map((e) => Object.values(e.constraints || {}).join(', ')).join('; ')}`,
      );
    }

    if (!Array.isArray(prescription.steps)) {
      throw new BadRequestException('Endurance steps must be an array');
    }

    const normalizedSteps = prescription.steps.map((step) =>
      this.normalizeEnduranceStepOrBlock(step, dto.sport),
    );

    return {
      sport: dto.sport,
      steps: normalizedSteps,
      ...(dto.objective && { objective: dto.objective }),
      ...(dto.notes && { notes: dto.notes }),
    } as unknown as Prisma.InputJsonValue;
  }

  private normalizeEnduranceStepOrBlock(
    step: unknown,
    sport: EnduranceSport,
  ): EnduranceStep | EnduranceRepeatBlock {
    if (this.isRepeatBlock(step)) {
      return this.normalizeRepeatBlock(step, sport);
    }
    return this.normalizeStep(step, sport);
  }

  private normalizeStep(step: unknown, sport: EnduranceSport): EnduranceStep {
    const dto = plainToInstance(EnduranceStepDto, step);
    const errors = validateSync(dto);
    if (errors.length > 0) {
      throw new BadRequestException(
        `Invalid endurance step: ${errors.map((e) => Object.values(e.constraints || {}).join(', ')).join('; ')}`,
      );
    }

    const normalizedTarget = dto.primaryTarget
      ? this.normalizePrimaryTarget(dto.primaryTarget)
      : undefined;

    if (dto.cadenceTarget) {
      if (sport !== EnduranceSport.BIKE) {
        throw new BadRequestException(
          'Cadence target is only allowed for BIKE workouts',
        );
      }
      if (dto.cadenceTarget.maxRpm < dto.cadenceTarget.minRpm) {
        throw new BadRequestException(
          'Cadence maxRpm must be greater than or equal to minRpm',
        );
      }
      if (dto.cadenceTarget.kind !== CadenceTargetKind.CADENCE) {
        throw new BadRequestException('Cadence target kind must be CADENCE');
      }
      if (dto.cadenceTarget.unit !== CadenceTargetUnit.RPM) {
        throw new BadRequestException('Cadence unit must be RPM');
      }
    }

    return {
      type: dto.type,
      duration: {
        type: dto.duration.type,
        value: dto.duration.value,
      },
      ...(normalizedTarget && { primaryTarget: normalizedTarget }),
      ...(dto.cadenceTarget && {
        cadenceTarget: {
          kind: 'CADENCE',
          unit: dto.cadenceTarget.unit,
          minRpm: dto.cadenceTarget.minRpm,
          maxRpm: dto.cadenceTarget.maxRpm,
        },
      }),
      ...(dto.note && { note: dto.note }),
    };
  }

  private normalizeRepeatBlock(
    step: unknown,
    sport: EnduranceSport,
  ): EnduranceRepeatBlock {
    const dto = plainToInstance(EnduranceRepeatBlockDto, step);
    const errors = validateSync(dto);
    if (errors.length > 0) {
      throw new BadRequestException(
        `Invalid endurance repeat block: ${errors.map((e) => Object.values(e.constraints || {}).join(', ')).join('; ')}`,
      );
    }

    return {
      repeat: dto.repeat,
      steps: dto.steps.map((inner) => this.normalizeStep(inner, sport)),
    };
  }

  private normalizeLegacyEndurancePrescription(
    prescription: unknown,
  ): Prisma.InputJsonValue {
    const dto = plainToInstance(EnduranceLegacyPrescriptionDto, prescription);
    const errors = validateSync(dto);
    if (errors.length > 0) {
      throw new BadRequestException(
        `Invalid endurance prescription: ${errors.map((e) => Object.values(e.constraints || {}).join(', ')).join('; ')}`,
      );
    }

    const sport = this.mapLegacyModalityToSport(dto.modality);
    const steps: Array<EnduranceStep | EnduranceRepeatBlock> = [];
    const intervals = dto.intervals ?? [];

    if (intervals.length === 0) {
      steps.push({
        type: StepType.WORK,
        duration: {
          type: DurationType.TIME,
          value: 60,
        },
        note: this.buildLegacyNote(dto.warmup, dto.cooldown),
      });
      this.logLegacyDurationWarning(dto.modality, undefined);
    } else {
      intervals.forEach((interval, index) => {
        const { primaryTarget, note } = this.mapLegacyTarget(interval);
        const stepNote = this.mergeLegacyNotes(
          note,
          index === 0 ? dto.warmup : undefined,
          index === intervals.length - 1 ? dto.cooldown : undefined,
        );
        const durationValue =
          typeof interval.durationSeconds === 'number' &&
          interval.durationSeconds > 0
            ? interval.durationSeconds
            : 60;
        const durationNote =
          durationValue === 60 && interval.durationSeconds !== 60
            ? `Legacy duration: ${String(interval.durationSeconds)}`
            : undefined;
        const combinedNote = this.mergeLegacyNotes(stepNote, durationNote);
        if (durationNote) {
          this.logLegacyDurationWarning(dto.modality, interval.durationSeconds);
        }
        steps.push({
          type: StepType.WORK,
          duration: {
            type: DurationType.TIME,
            value: durationValue,
          },
          ...(primaryTarget && { primaryTarget }),
          ...(combinedNote && { note: combinedNote }),
        });
      });
    }

    return {
      sport,
      steps,
      ...(dto.warmup || dto.cooldown
        ? { notes: this.buildLegacyNote(dto.warmup, dto.cooldown) }
        : {}),
    } as unknown as Prisma.InputJsonValue;
  }

  private mapLegacyModalityToSport(modality: Modality): EnduranceSport {
    if (modality === Modality.BIKE) return EnduranceSport.BIKE;
    if (modality === Modality.SWIM) return EnduranceSport.SWIM;
    return EnduranceSport.RUN;
  }

  private mapLegacyTarget(interval: {
    targetType: LegacyTargetType;
    targetZoneOrValue: string;
  }): { primaryTarget?: EndurancePrimaryTarget; note?: string } {
    const targetKind = this.mapLegacyTargetKind(interval.targetType);
    const parsed = this.parseLegacyTargetValue(interval.targetZoneOrValue);
    if (!parsed) {
      return {
        note: `Legacy target: ${interval.targetZoneOrValue}`,
      };
    }

    if (targetKind === PrimaryTargetKind.POWER) {
      return {
        primaryTarget: {
          kind: PrimaryTargetKind.POWER,
          unit: PrimaryTargetUnit.WATTS,
          ...(parsed.zone !== undefined && { zone: parsed.zone }),
          ...(this.buildLegacyPrimaryRange(
            targetKind,
            parsed.min,
            parsed.max,
          ) ?? {}),
        },
      };
    }
    if (targetKind === PrimaryTargetKind.HEART_RATE) {
      return {
        primaryTarget: {
          kind: PrimaryTargetKind.HEART_RATE,
          unit: PrimaryTargetUnit.BPM,
          ...(parsed.zone !== undefined && { zone: parsed.zone }),
          ...(this.buildLegacyPrimaryRange(
            targetKind,
            parsed.min,
            parsed.max,
          ) ?? {}),
        },
      };
    }
    return {
      primaryTarget: {
        kind: PrimaryTargetKind.PACE,
        unit: PrimaryTargetUnit.SEC_PER_KM,
        ...(parsed.zone !== undefined && { zone: parsed.zone }),
        ...(this.buildLegacyPrimaryRange(targetKind, parsed.min, parsed.max) ??
          {}),
      },
    };
  }

  private mapLegacyTargetKind(targetType: LegacyTargetType): PrimaryTargetKind {
    if (targetType === LegacyTargetType.POWER) return PrimaryTargetKind.POWER;
    if (targetType === LegacyTargetType.HR) return PrimaryTargetKind.HEART_RATE;
    return PrimaryTargetKind.PACE;
  }

  private mapLegacyTargetUnit(kind: PrimaryTargetKind): PrimaryTargetUnit {
    if (kind === PrimaryTargetKind.POWER) return PrimaryTargetUnit.WATTS;
    if (kind === PrimaryTargetKind.HEART_RATE) return PrimaryTargetUnit.BPM;
    return PrimaryTargetUnit.SEC_PER_KM;
  }

  private buildLegacyPrimaryRange(
    kind: PrimaryTargetKind,
    min?: number,
    max?: number,
  ): Record<string, number> | null {
    if (typeof min !== 'number' || typeof max !== 'number') return null;
    if (kind === PrimaryTargetKind.POWER) {
      return { minWatts: min, maxWatts: max };
    }
    if (kind === PrimaryTargetKind.HEART_RATE) {
      return { minBpm: min, maxBpm: max };
    }
    return { minSecPerKm: min, maxSecPerKm: max };
  }

  private parseLegacyTargetValue(value: string): LegacyTargetParse | null {
    const trimmed = value.trim();
    const zoneMatch = trimmed.match(/^z(\d+)$/i);
    if (zoneMatch) {
      return { zone: Number(zoneMatch[1]) };
    }

    const rangeMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/);
    if (rangeMatch) {
      return {
        min: Number(rangeMatch[1]),
        max: Number(rangeMatch[2]),
        unit: this.extractUnit(trimmed),
      };
    }

    const numberMatch = trimmed.match(/^(\d+(?:\.\d+)?)/);
    if (numberMatch) {
      const numberValue = Number(numberMatch[1]);
      return {
        min: numberValue,
        max: numberValue,
        unit: this.extractUnit(trimmed),
      };
    }

    return null;
  }

  private extractUnit(value: string): string | undefined {
    const unitMatch = value.match(/(bpm|%|w|watts|km\/h|min\/km|min\/mi)/i);
    return unitMatch ? unitMatch[0] : undefined;
  }

  private buildLegacyNote(
    warmup?: string,
    cooldown?: string,
  ): string | undefined {
    const parts = [
      warmup ? `Warmup: ${warmup}` : undefined,
      cooldown ? `Cooldown: ${cooldown}` : undefined,
    ].filter((part): part is string => Boolean(part));
    if (parts.length === 0) return undefined;
    return parts.join(' • ');
  }

  private mergeLegacyNotes(
    base?: string,
    warmup?: string,
    cooldown?: string,
  ): string | undefined {
    const parts = [
      base,
      warmup ? `Warmup: ${warmup}` : undefined,
      cooldown ? `Cooldown: ${cooldown}` : undefined,
    ].filter((part): part is string => Boolean(part));
    if (parts.length === 0) return undefined;
    return parts.join(' • ');
  }

  private normalizePrimaryTarget(
    target: EnduranceStepDto['primaryTarget'],
  ): EndurancePrimaryTarget {
    if (!target) {
      throw new BadRequestException('Primary target is required');
    }

    const hasZone = typeof target.zone === 'number';
    const { minValue, maxValue } = this.extractPrimaryRange(target);
    const hasMin = typeof minValue === 'number';
    const hasMax = typeof maxValue === 'number';

    if (hasZone && (hasMin || hasMax)) {
      throw new BadRequestException(
        'Primary target must use either zone or min/max values',
      );
    }

    if ((hasMin && !hasMax) || (!hasMin && hasMax)) {
      throw new BadRequestException(
        'Primary target requires both min and max values',
      );
    }

    if (!hasZone && !hasMin) {
      throw new BadRequestException(
        'Primary target must include zone or min/max values',
      );
    }

    this.assertNoMixedPrimaryFields(target);
    this.validatePrimaryTargetUnit(target.kind, target.unit);

    if (target.kind === PrimaryTargetKind.POWER) {
      return {
        kind: PrimaryTargetKind.POWER,
        unit: PrimaryTargetUnit.WATTS,
        ...(hasZone && { zone: target.zone }),
        ...(hasMin && hasMax
          ? this.buildPrimaryRangeFields(target.kind, minValue, maxValue)
          : {}),
      };
    }
    if (target.kind === PrimaryTargetKind.HEART_RATE) {
      return {
        kind: PrimaryTargetKind.HEART_RATE,
        unit: PrimaryTargetUnit.BPM,
        ...(hasZone && { zone: target.zone }),
        ...(hasMin && hasMax
          ? this.buildPrimaryRangeFields(target.kind, minValue, maxValue)
          : {}),
      };
    }
    return {
      kind: PrimaryTargetKind.PACE,
      unit: PrimaryTargetUnit.SEC_PER_KM,
      ...(hasZone && { zone: target.zone }),
      ...(hasMin && hasMax
        ? this.buildPrimaryRangeFields(target.kind, minValue, maxValue)
        : {}),
    };
  }

  private validatePrimaryTargetUnit(
    kind: PrimaryTargetKind,
    unit: PrimaryTargetUnit,
  ) {
    const expected =
      kind === PrimaryTargetKind.POWER
        ? PrimaryTargetUnit.WATTS
        : kind === PrimaryTargetKind.HEART_RATE
          ? PrimaryTargetUnit.BPM
          : PrimaryTargetUnit.SEC_PER_KM;
    if (unit !== expected) {
      throw new BadRequestException(
        `Primary target unit must be ${expected} for ${kind}`,
      );
    }
  }

  private assertNoMixedPrimaryFields(
    target: EnduranceStepDto['primaryTarget'],
  ) {
    if (!target) return;
    const hasPowerFields =
      typeof target.minWatts === 'number' ||
      typeof target.maxWatts === 'number';
    const hasHrFields =
      typeof target.minBpm === 'number' || typeof target.maxBpm === 'number';
    const hasPaceFields =
      typeof target.minSecPerKm === 'number' ||
      typeof target.maxSecPerKm === 'number';

    if (
      target.kind === PrimaryTargetKind.POWER &&
      (hasHrFields || hasPaceFields)
    ) {
      throw new BadRequestException(
        'Power target cannot include HR or pace ranges',
      );
    }
    if (
      target.kind === PrimaryTargetKind.HEART_RATE &&
      (hasPowerFields || hasPaceFields)
    ) {
      throw new BadRequestException(
        'Heart rate target cannot include power or pace ranges',
      );
    }
    if (
      target.kind === PrimaryTargetKind.PACE &&
      (hasPowerFields || hasHrFields)
    ) {
      throw new BadRequestException(
        'Pace target cannot include power or HR ranges',
      );
    }
  }

  private extractPrimaryRange(target: EnduranceStepDto['primaryTarget']): {
    minValue?: number;
    maxValue?: number;
  } {
    if (!target) return {};
    if (target.kind === PrimaryTargetKind.POWER) {
      const legacy = this.extractLegacyRange(target);
      return {
        minValue: target.minWatts ?? legacy.minValue,
        maxValue: target.maxWatts ?? legacy.maxValue,
      };
    }
    if (target.kind === PrimaryTargetKind.HEART_RATE) {
      const legacy = this.extractLegacyRange(target);
      return {
        minValue: target.minBpm ?? legacy.minValue,
        maxValue: target.maxBpm ?? legacy.maxValue,
      };
    }
    const legacy = this.extractLegacyRange(target);
    return {
      minValue: target.minSecPerKm ?? legacy.minValue,
      maxValue: target.maxSecPerKm ?? legacy.maxValue,
    };
  }

  private extractLegacyRange(target: EnduranceStepDto['primaryTarget']): {
    minValue?: number;
    maxValue?: number;
  } {
    if (!this.isRecord(target)) {
      return {};
    }
    const record = target as Record<string, unknown>;
    const minValue = typeof record.min === 'number' ? record.min : undefined;
    const maxValue = typeof record.max === 'number' ? record.max : undefined;
    return { minValue, maxValue };
  }

  private buildPrimaryRangeFields(
    kind: PrimaryTargetKind,
    minValue?: number,
    maxValue?: number,
  ) {
    if (typeof minValue !== 'number' || typeof maxValue !== 'number') {
      return {};
    }
    if (kind === PrimaryTargetKind.POWER) {
      return { minWatts: minValue, maxWatts: maxValue };
    }
    if (kind === PrimaryTargetKind.HEART_RATE) {
      return { minBpm: minValue, maxBpm: maxValue };
    }
    return { minSecPerKm: minValue, maxSecPerKm: maxValue };
  }

  private logLegacyDurationWarning(
    modality: Modality,
    durationSeconds?: number,
  ) {
    const message = `Legacy endurance duration missing/invalid for ${modality}. Defaulting to 60 seconds.`;
    if (durationSeconds === undefined) {
      console.warn(message);
    } else {
      console.warn(`${message} Received: ${durationSeconds.toString()}`);
    }
  }

  private isRepeatBlock(
    step: unknown,
  ): step is { repeat: number; steps: unknown[] } {
    if (!this.isRecord(step)) return false;
    return 'repeat' in step && 'steps' in step;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
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

    // Validate and normalize each session prescription
    const normalizedSessions = [];
    for (const session of dto.sessions) {
      const normalizedPrescription = this.normalizePrescription(
        session.type,
        session.prescription,
      );

      // Additional validation for strength exercises
      if (session.type === SessionType.STRENGTH) {
        await this.validateStrengthExercises(normalizedPrescription);
      }

      normalizedSessions.push({
        ...session,
        prescription: normalizedPrescription,
      });
    }

    // Create the weekly plan with sessions
    const weeklyPlan = await this.prisma.weeklyPlan.create({
      data: {
        coachId: coachUserId,
        athleteUserId,
        weekStart: normalizedWeekStart,
        notes: dto.notes,
        sessions: {
          create: normalizedSessions.map((session) => ({
            date: new Date(session.date + 'T00:00:00.000Z'),
            type: session.type,
            title: session.title,
            prescription: session.prescription,
          })),
        },
      },
      include: {
        sessions: {
          orderBy: { date: 'asc' },
        },
      },
    });

    // Auto-push ENDURANCE sessions to athlete's device (async, don't wait)
    for (const session of weeklyPlan.sessions) {
      if (session.type === 'ENDURANCE') {
        this.enduranceExportService
          .autoPushEnduranceWorkout(session.id, athleteUserId)
          .catch((error) => {
            // Log error but don't fail plan creation
            console.error(
              `Failed to auto-push endurance workout ${session.id}:`,
              error,
            );
          });
      }
    }

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

    return {
      ...weeklyPlan,
      sessions: weeklyPlan.sessions.map((session) =>
        this.normalizeSessionForResponse(session),
      ),
    };
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

    // Validate and normalize session prescriptions if provided
    const normalizedSessions: Array<{
      date: string;
      type: SessionType;
      title: string;
      prescription: Prisma.InputJsonValue;
    }> = [];
    if (dto.sessions) {
      for (const session of dto.sessions) {
        const normalizedPrescription = this.normalizePrescription(
          session.type,
          session.prescription,
        );

        if (session.type === SessionType.STRENGTH) {
          await this.validateStrengthExercises(normalizedPrescription);
        }

        normalizedSessions.push({
          ...session,
          prescription: normalizedPrescription,
        });
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
            create: normalizedSessions.map((session) => ({
              date: new Date(session.date + 'T00:00:00.000Z'),
              type: session.type,
              title: session.title,
              prescription: session.prescription,
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

    // Auto-push ENDURANCE sessions to athlete's device (async, don't wait)
    if (dto.sessions) {
      for (const session of updatedPlan.sessions) {
        if (session.type === 'ENDURANCE') {
          this.enduranceExportService
            .autoPushEnduranceWorkout(session.id, existingPlan.athleteUserId)
            .catch((error) => {
              // Log error but don't fail plan update
              console.error(
                `Failed to auto-push endurance workout ${session.id}:`,
                error,
              );
            });
        }
      }
    }

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

    return sessions.map((session) => this.normalizeSessionForResponse(session));
  }

  private normalizeSessionForResponse(session: {
    id: string;
    weeklyPlanId: string;
    date: Date;
    type: SessionType;
    title: string;
    prescription: Prisma.JsonValue;
    status: SessionStatus;
    completedAt?: Date | null;
    exportStatus?: string | null;
    exportProvider?: string | null;
    exportedAt?: Date | null;
    externalWorkoutId?: string | null;
    lastExportError?: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    const baseResponse = {
      ...session,
      date: session.date.toISOString().split('T')[0],
      completedAt: session.completedAt?.toISOString() || null,
      exportedAt: session.exportedAt?.toISOString() || null,
    };

    if (session.type !== SessionType.ENDURANCE) {
      return baseResponse;
    }

    const normalized = this.normalizeEndurancePrescription(
      session.prescription,
    );
    return {
      ...baseResponse,
      prescription: normalized,
    };
  }
}
