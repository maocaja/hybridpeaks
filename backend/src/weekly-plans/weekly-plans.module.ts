import { Module } from '@nestjs/common';
import { WeeklyPlansController } from './weekly-plans.controller';
import { WeeklyPlansService } from './weekly-plans.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [WeeklyPlansController],
  providers: [WeeklyPlansService],
  exports: [WeeklyPlansService],
})
export class WeeklyPlansModule {}
