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
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, User } from '@prisma/client';
import { CoachService } from './coach.service';
import { InviteAthleteDto } from './dto/invite-athlete.dto';

interface AuthenticatedRequest extends Request {
  user: User;
}

@Controller('coach/athletes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.COACH)
export class CoachController {
  constructor(private coachService: CoachService) {}

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
}
