import { Module } from '@nestjs/common';
import { AthleteController } from './athlete.controller';
import { AthleteService } from './athlete.service';
import { BenchmarksModule } from '../benchmarks/benchmarks.module';

@Module({
  imports: [BenchmarksModule],
  controllers: [AthleteController],
  providers: [AthleteService],
  exports: [AthleteService],
})
export class AthleteModule {}
