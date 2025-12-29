import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBenchmarkDto } from './dto/create-benchmark.dto';
import { BenchmarkKey } from '@prisma/client';

@Injectable()
export class BenchmarksService {
  constructor(private prisma: PrismaService) {}

  async createBenchmarkForAthlete(
    coachUserId: string,
    athleteUserId: string,
    dto: CreateBenchmarkDto,
  ) {
    // Verify coach-athlete relationship
    await this.verifyCoachAthleteRelationship(coachUserId, athleteUserId);

    // Verify athlete exists
    const athlete = await this.prisma.user.findUnique({
      where: { id: athleteUserId },
    });

    if (!athlete) {
      throw new NotFoundException('Athlete not found');
    }

    // For FTP, deactivate previous entries by deleting them (keep only latest)
    if (dto.key === BenchmarkKey.FTP) {
      await this.prisma.athleteBenchmark.deleteMany({
        where: {
          athleteUserId,
          key: BenchmarkKey.FTP,
        },
      });
    }

    const benchmark = await this.prisma.athleteBenchmark.create({
      data: {
        athleteUserId,
        key: dto.key,
        context: dto.context,
        value: dto.value,
        unit: dto.unit,
        measuredAt: dto.measuredAt ? new Date(dto.measuredAt) : new Date(),
      },
    });

    return benchmark;
  }

  async listBenchmarksForAthlete(coachUserId: string, athleteUserId: string) {
    // Verify coach-athlete relationship
    await this.verifyCoachAthleteRelationship(coachUserId, athleteUserId);

    const benchmarks = await this.prisma.athleteBenchmark.findMany({
      where: {
        athleteUserId,
      },
      orderBy: {
        measuredAt: 'desc',
      },
    });

    return benchmarks;
  }

  async listOwnBenchmarks(athleteUserId: string) {
    const benchmarks = await this.prisma.athleteBenchmark.findMany({
      where: {
        athleteUserId,
      },
      orderBy: {
        measuredAt: 'desc',
      },
    });

    return benchmarks;
  }

  private async verifyCoachAthleteRelationship(
    coachUserId: string,
    athleteUserId: string,
  ): Promise<void> {
    const coachProfile = await this.prisma.coachProfile.findUnique({
      where: { userId: coachUserId },
      include: {
        athletes: {
          where: {
            athleteProfile: {
              userId: athleteUserId,
            },
          },
        },
      },
    });

    if (!coachProfile || coachProfile.athletes.length === 0) {
      throw new ForbiddenException(
        'You can only manage benchmarks for athletes in your roster',
      );
    }
  }
}
