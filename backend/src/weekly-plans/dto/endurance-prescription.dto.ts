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

export enum TargetType {
  POWER = 'POWER', // Watts or %FTP
  PACE = 'PACE', // min/km or min/mile
  HR = 'HR', // bpm or %HR_MAX
}

export class IntervalDto {
  @IsNumber()
  @Min(1)
  durationSeconds!: number;

  @IsEnum(TargetType)
  @IsNotEmpty()
  targetType!: TargetType;

  @IsString()
  @IsNotEmpty()
  targetZoneOrValue!: string; // e.g., "Z2", "80% FTP", "160 bpm"
}

export class EndurancePrescriptionDto {
  @IsEnum(Modality)
  @IsNotEmpty()
  modality!: Modality;

  @IsString()
  @IsOptional()
  warmup?: string; // Free-text description for MVP

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IntervalDto)
  @IsOptional()
  intervals?: IntervalDto[];

  @IsString()
  @IsOptional()
  cooldown?: string; // Free-text description for MVP
}
