import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CoachModule } from './coach/coach.module';
import { AthleteModule } from './athlete/athlete.module';
import { ExercisesModule } from './exercises/exercises.module';
import { BenchmarksModule } from './benchmarks/benchmarks.module';
import { WeeklyPlansModule } from './weekly-plans/weekly-plans.module';
import appConfig from './config/app.config';
import { validationSchema } from './config/validation.schema';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      validationSchema,
      validationOptions: {
        abortEarly: true,
      },
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 10, // 10 requests per minute for auth endpoints
      },
    ]),
    PrismaModule,
    AuthModule,
    CoachModule,
    AthleteModule,
    ExercisesModule,
    BenchmarksModule,
    WeeklyPlansModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
