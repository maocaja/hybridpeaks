import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, User } from '@prisma/client';
import { CoachService } from './coach.service';
import { InviteAthleteDto } from './dto/invite-athlete.dto';
import { BenchmarksService } from '../benchmarks/benchmarks.service';
import { CreateBenchmarkDto } from '../benchmarks/dto/create-benchmark.dto';

interface AuthenticatedRequest extends Request {
  user: User;
}

@Controller('coach/athletes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.COACH)
export class CoachController {
  constructor(
    private coachService: CoachService,
    private benchmarksService: BenchmarksService,
  ) {}

  @Post('invite')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 10, ttl: 3600000 } }) // 10 invites per hour
  async inviteAthlete(
    @Request() req: AuthenticatedRequest,
    @Body() inviteDto: InviteAthleteDto,
  ) {
    return this.coachService.inviteAthlete(req.user.id, inviteDto.email);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async listAthletes(@Request() req: AuthenticatedRequest) {
    return this.coachService.listAthletes(req.user.id);
  }

  @Post(':athleteId/benchmarks')
  @HttpCode(HttpStatus.CREATED)
  async createBenchmark(
    @Request() req: AuthenticatedRequest,
    @Param('athleteId') athleteId: string,
    @Body() createDto: CreateBenchmarkDto,
  ) {
    return this.benchmarksService.createBenchmarkForAthlete(
      req.user.id,
      athleteId,
      createDto,
    );
  }

  @Get(':athleteId/benchmarks')
  @HttpCode(HttpStatus.OK)
  async listBenchmarks(
    @Request() req: AuthenticatedRequest,
    @Param('athleteId') athleteId: string,
  ) {
    return this.benchmarksService.listBenchmarksForAthlete(
      req.user.id,
      athleteId,
    );
  }
}
