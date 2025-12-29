import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateSessionDto } from './create-session.dto';

export class CreateWeeklyPlanDto {
  @IsDateString()
  @IsNotEmpty()
  weekStart!: string; // YYYY-MM-DD (must be Monday, validated in service)

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSessionDto)
  sessions!: CreateSessionDto[];
}
