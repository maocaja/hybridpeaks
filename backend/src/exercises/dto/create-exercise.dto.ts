import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsUrl,
  IsArray,
} from 'class-validator';
import { ExerciseType, Modality } from '@prisma/client';

export class CreateExerciseDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEnum(ExerciseType)
  @IsNotEmpty()
  type!: ExerciseType;

  @IsEnum(Modality)
  @IsOptional()
  modality?: Modality;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUrl()
  @IsOptional()
  videoUrl?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  primaryMuscles?: string[];
}
