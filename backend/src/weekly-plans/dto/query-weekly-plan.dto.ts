import { IsDateString, IsNotEmpty } from 'class-validator';

export class QueryWeeklyPlanDto {
  @IsDateString()
  @IsNotEmpty()
  weekStart!: string; // YYYY-MM-DD
}
