import { IsObject } from 'class-validator';

export class CreateWorkoutLogDto {
  @IsObject()
  summary!: Record<string, unknown>;
}
