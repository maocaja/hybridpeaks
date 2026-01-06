import { Module } from '@nestjs/common';
import { AthleteController } from './athlete.controller';
import { AthleteService } from './athlete.service';
import { BenchmarksModule } from '../benchmarks/benchmarks.module';
import { EnduranceExportModule } from '../integrations/endurance/endurance-export.module';

@Module({
  imports: [BenchmarksModule, EnduranceExportModule],
  controllers: [AthleteController],
  providers: [AthleteService],
  exports: [AthleteService],
})
export class AthleteModule {}
