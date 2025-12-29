import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ExerciseType, Modality } from '@prisma/client';

export class QueryExercisesDto {
  @IsEnum(ExerciseType)
  @IsOptional()
  type?: ExerciseType;

  @IsEnum(Modality)
  @IsOptional()
  modality?: Modality;

  @IsString()
  @IsOptional()
  search?: string;
}
