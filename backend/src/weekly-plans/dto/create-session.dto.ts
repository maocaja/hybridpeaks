import { IsString, IsNotEmpty, IsEnum, IsDateString } from 'class-validator';
import { SessionType } from '@prisma/client';

export class CreateSessionDto {
  @IsDateString()
  @IsNotEmpty()
  date!: string; // YYYY-MM-DD

  @IsEnum(SessionType)
  @IsNotEmpty()
  type!: SessionType;

  @IsString()
  @IsNotEmpty()
  title!: string;

  // Prescription validated dynamically based on type in service layer
  @IsNotEmpty()
  prescription!: Record<string, unknown>;
}
