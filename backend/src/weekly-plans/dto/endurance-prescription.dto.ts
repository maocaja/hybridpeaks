import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Modality } from '@prisma/client';

export enum EnduranceSport {
  BIKE = 'BIKE',
  RUN = 'RUN',
  SWIM = 'SWIM',
}

export enum StepType {
  WARMUP = 'WARMUP',
  WORK = 'WORK',
  RECOVERY = 'RECOVERY',
  COOLDOWN = 'COOLDOWN',
}

export enum DurationType {
  TIME = 'TIME',
  DISTANCE = 'DISTANCE',
}

export enum PrimaryTargetKind {
  POWER = 'POWER',
  HEART_RATE = 'HEART_RATE',
  PACE = 'PACE',
}

export enum PrimaryTargetUnit {
  WATTS = 'WATTS',
  BPM = 'BPM',
  SEC_PER_KM = 'SEC_PER_KM',
}

export enum CadenceTargetUnit {
  RPM = 'RPM',
}

export enum CadenceTargetKind {
  CADENCE = 'CADENCE',
}

export class StepDurationDto {
  @IsEnum(DurationType)
  @IsNotEmpty()
  type!: DurationType;

  @IsNumber()
  @Min(1)
  value!: number;
}

export class PrimaryTargetDto {
  @IsEnum(PrimaryTargetKind)
  @IsNotEmpty()
  kind!: PrimaryTargetKind;

  @IsEnum(PrimaryTargetUnit)
  @IsNotEmpty()
  unit!: PrimaryTargetUnit;

  @IsOptional()
  @IsNumber()
  @Min(1)
  zone?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  minWatts?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxWatts?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  minBpm?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxBpm?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  minSecPerKm?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxSecPerKm?: number;
}

export class CadenceTargetDto {
  @IsEnum(CadenceTargetKind)
  @IsNotEmpty()
  kind!: CadenceTargetKind;

  @IsEnum(CadenceTargetUnit)
  @IsNotEmpty()
  unit!: CadenceTargetUnit;

  @IsNumber()
  @Min(1)
  minRpm!: number;

  @IsNumber()
  @Min(1)
  maxRpm!: number;
}

export class EnduranceStepDto {
  @IsEnum(StepType)
  @IsNotEmpty()
  type!: StepType;

  @ValidateNested()
  @Type(() => StepDurationDto)
  duration!: StepDurationDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => PrimaryTargetDto)
  primaryTarget?: PrimaryTargetDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CadenceTargetDto)
  cadenceTarget?: CadenceTargetDto;

  @IsOptional()
  @IsString()
  note?: string;
}

export class EnduranceRepeatBlockDto {
  @IsNumber()
  @Min(2)
  repeat!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EnduranceStepDto)
  steps!: EnduranceStepDto[];
}

export class EndurancePrescriptionDto {
  @IsEnum(EnduranceSport)
  @IsNotEmpty()
  sport!: EnduranceSport;

  @IsArray()
  steps!: Array<Record<string, unknown>>;

  @IsOptional()
  @IsString()
  objective?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

// Legacy schema (MVP v0.3)
export enum LegacyTargetType {
  POWER = 'POWER',
  PACE = 'PACE',
  HR = 'HR',
}

export class LegacyIntervalDto {
  @IsNumber()
  @Min(0)
  durationSeconds!: number;

  @IsEnum(LegacyTargetType)
  @IsNotEmpty()
  targetType!: LegacyTargetType;

  @IsString()
  @IsNotEmpty()
  targetZoneOrValue!: string;
}

export class EnduranceLegacyPrescriptionDto {
  @IsEnum(Modality)
  @IsNotEmpty()
  modality!: Modality;

  @IsString()
  @IsOptional()
  warmup?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LegacyIntervalDto)
  @IsOptional()
  intervals?: LegacyIntervalDto[];

  @IsString()
  @IsOptional()
  cooldown?: string;
}
