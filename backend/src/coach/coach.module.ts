import { Module } from '@nestjs/common';
import { CoachController } from './coach.controller';
import { CoachService } from './coach.service';
import { BenchmarksModule } from '../benchmarks/benchmarks.module';

@Module({
  imports: [BenchmarksModule],
  controllers: [CoachController],
  providers: [CoachService],
  exports: [CoachService],
})
export class CoachModule {}
