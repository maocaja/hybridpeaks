import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MaxLength,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

export class StrengthDetailedSetDto {
  @IsOptional()
  @IsUUID()
  exerciseId?: string;

  @IsInt()
  @Min(0)
  reps!: number;

  @IsNumber()
  @Min(0)
  weight!: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  rpe?: number;
}

export class StrengthSummaryDto {
  @IsBoolean()
  completed!: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  rpe?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Notes must be 1000 characters or less' })
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StrengthDetailedSetDto)
  detailedSets?: StrengthDetailedSetDto[];
}

export class EnduranceSummaryDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  durationSeconds?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  distanceMeters?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  avgHr?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  rpe?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Notes must be 1000 characters or less' })
  notes?: string;
}
