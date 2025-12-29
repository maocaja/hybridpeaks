import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsOptional,
  IsDateString,
} from 'class-validator';
import { BenchmarkKey } from '@prisma/client';

export class CreateBenchmarkDto {
  @IsEnum(BenchmarkKey)
  @IsNotEmpty()
  key!: BenchmarkKey;

  @IsString()
  @IsOptional()
  context?: string;

  @IsNumber()
  @IsNotEmpty()
  value!: number;

  @IsString()
  @IsNotEmpty()
  unit!: string;

  @IsDateString()
  @IsOptional()
  measuredAt?: string;
}
