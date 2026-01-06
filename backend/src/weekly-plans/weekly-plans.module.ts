import { Module } from '@nestjs/common';
import { WeeklyPlansController } from './weekly-plans.controller';
import { WeeklyPlansService } from './weekly-plans.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { EnduranceExportModule } from '../integrations/endurance/endurance-export.module';

@Module({
  imports: [PrismaModule, AuthModule, EnduranceExportModule],
  controllers: [WeeklyPlansController],
  providers: [WeeklyPlansService],
  exports: [WeeklyPlansService],
})
export class WeeklyPlansModule {}
