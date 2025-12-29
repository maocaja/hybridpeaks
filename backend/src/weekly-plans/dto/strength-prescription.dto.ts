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

export enum TargetLoadType {
  PERCENT_1RM = 'PERCENT_1RM',
  RPE = 'RPE',
  ABS = 'ABS', // Absolute weight
}

export class StrengthExerciseItemDto {
  @IsString()
  @IsNotEmpty()
  exerciseId!: string;

  @IsString()
  @IsNotEmpty()
  exerciseNameSnapshot!: string; // Snapshot to preserve name if exercise is deleted

  @IsNumber()
  @Min(1)
  sets!: number;

  @IsNumber()
  @Min(1)
  reps!: number;

  @IsEnum(TargetLoadType)
  @IsNotEmpty()
  targetLoadType!: TargetLoadType;

  @IsNumber()
  @IsNotEmpty()
  targetValue!: number; // e.g., 80 for 80% 1RM, or 7 for RPE 7, or 100 for 100kg

  @IsNumber()
  @IsOptional()
  restSeconds?: number;

  @IsString()
  @IsOptional()
  tempo?: string; // e.g., "3-1-1-0"

  @IsString()
  @IsOptional()
  videoUrlSnapshot?: string;
}

export class StrengthPrescriptionDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StrengthExerciseItemDto)
  items!: StrengthExerciseItemDto[];
}
