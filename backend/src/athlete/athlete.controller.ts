import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, User } from '@prisma/client';
import { AthleteService } from './athlete.service';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { BenchmarksService } from '../benchmarks/benchmarks.service';

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
}
