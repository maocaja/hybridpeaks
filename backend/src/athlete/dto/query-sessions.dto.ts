import { IsDateString } from 'class-validator';

export class QuerySessionsDto {
  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;
}
