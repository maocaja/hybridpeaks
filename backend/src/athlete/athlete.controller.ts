import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Param,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, User } from '@prisma/client';
import { AthleteService } from './athlete.service';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { BenchmarksService } from '../benchmarks/benchmarks.service';
import { UpdateSessionStatusDto } from './dto/update-session-status.dto';
import { CreateWorkoutLogDto } from './dto/create-workout-log.dto';
import { QueryWeeklyPlanDto } from '../weekly-plans/dto/query-weekly-plan.dto';
import { QuerySessionsDto } from './dto/query-sessions.dto';

interface AuthenticatedRequest extends Request {
  user: User;
}

@Controller('athlete')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ATHLETE)
export class AthleteController {
  constructor(
    private athleteService: AthleteService,
    private benchmarksService: BenchmarksService,
  ) {}

  @Post('invitations/accept')
  @HttpCode(HttpStatus.OK)
  async acceptInvitation(
    @Request() req: AuthenticatedRequest,
    @Body() acceptDto: AcceptInvitationDto,
  ) {
    return this.athleteService.acceptInvitation(req.user.id, acceptDto.token);
  }

  @Get('benchmarks')
  @HttpCode(HttpStatus.OK)
  async listOwnBenchmarks(@Request() req: AuthenticatedRequest) {
    return this.benchmarksService.listOwnBenchmarks(req.user.id);
  }

  @Patch('sessions/:sessionId/status')
  @HttpCode(HttpStatus.OK)
  async updateSessionStatus(
    @Request() req: AuthenticatedRequest,
    @Param('sessionId') sessionId: string,
    @Body() updateDto: UpdateSessionStatusDto,
  ) {
    return this.athleteService.updateSessionStatus(
      req.user.id,
      sessionId,
      updateDto,
    );
  }

  @Post('sessions/:sessionId/log')
  @HttpCode(HttpStatus.OK)
  async upsertWorkoutLog(
    @Request() req: AuthenticatedRequest,
    @Param('sessionId') sessionId: string,
    @Body() createDto: CreateWorkoutLogDto,
  ) {
    return this.athleteService.upsertWorkoutLog(
      req.user.id,
      sessionId,
      createDto,
    );
  }

  @Get('sessions/:sessionId/log')
  @HttpCode(HttpStatus.OK)
  async getWorkoutLog(
    @Request() req: AuthenticatedRequest,
    @Param('sessionId') sessionId: string,
  ) {
    return this.athleteService.getWorkoutLog(req.user.id, sessionId);
  }

  @Get('week-summary')
  @HttpCode(HttpStatus.OK)
  async getWeekSummary(
    @Request() req: AuthenticatedRequest,
    @Query() query: QueryWeeklyPlanDto,
  ) {
    return this.athleteService.getWeekSummary(req.user.id, query.weekStart);
  }

  @Get('sessions')
  @HttpCode(HttpStatus.OK)
  async getSessionsInRange(
    @Request() req: AuthenticatedRequest,
    @Query() query: QuerySessionsDto,
  ) {
    return this.athleteService.getSessionsInRange(
      req.user.id,
      query.from,
      query.to,
    );
  }
}
