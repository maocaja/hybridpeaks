import { IsEnum, IsOptional, IsDateString } from 'class-validator';
import { SessionStatus } from '@prisma/client';

export class UpdateSessionStatusDto {
  @IsEnum(SessionStatus)
  status!: SessionStatus;

  @IsOptional()
  @IsDateString()
  completedAt?: string;
}
