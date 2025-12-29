import {
  Controller,
  Post,
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

interface AuthenticatedRequest extends Request {
  user: User;
}

@Controller('athlete/invitations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ATHLETE)
export class AthleteController {
  constructor(private athleteService: AthleteService) {}

  @Post('accept')
  @HttpCode(HttpStatus.OK)
  async acceptInvitation(
    @Request() req: AuthenticatedRequest,
    @Body() acceptDto: AcceptInvitationDto,
  ) {
    return this.athleteService.acceptInvitation(req.user.id, acceptDto.token);
  }
}
