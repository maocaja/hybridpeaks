import { IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateSessionDto } from './create-session.dto';

export class UpdateWeeklyPlanDto {
  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSessionDto)
  @IsOptional()
  sessions?: CreateSessionDto[];
}
