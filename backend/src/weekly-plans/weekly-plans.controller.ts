import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, User } from '@prisma/client';
import { WeeklyPlansService } from './weekly-plans.service';
import { CreateWeeklyPlanDto } from './dto/create-weekly-plan.dto';
import { UpdateWeeklyPlanDto } from './dto/update-weekly-plan.dto';
import { QueryWeeklyPlanDto } from './dto/query-weekly-plan.dto';

interface AuthenticatedRequest extends Request {
  user: User;
}

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class WeeklyPlansController {
  constructor(private weeklyPlansService: WeeklyPlansService) {}

  // ===== COACH ENDPOINTS =====

  @Post('coach/athletes/:athleteId/weekly-plans')
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.COACH)
  async createWeeklyPlan(
    @Request() req: AuthenticatedRequest,
    @Param('athleteId') athleteId: string,
    @Body() createWeeklyPlanDto: CreateWeeklyPlanDto,
  ) {
    return this.weeklyPlansService.createWeeklyPlan(
      req.user.id,
      athleteId,
      createWeeklyPlanDto,
    );
  }

  @Get('coach/athletes/:athleteId/weekly-plans')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.COACH)
  async getWeeklyPlan(
    @Request() req: AuthenticatedRequest,
    @Param('athleteId') athleteId: string,
    @Query() query: QueryWeeklyPlanDto,
  ) {
    return this.weeklyPlansService.getWeeklyPlan(
      req.user.id,
      athleteId,
      query.weekStart,
    );
  }

  @Put('coach/weekly-plans/:planId')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.COACH)
  async updateWeeklyPlan(
    @Request() req: AuthenticatedRequest,
    @Param('planId') planId: string,
    @Body() updateWeeklyPlanDto: UpdateWeeklyPlanDto,
  ) {
    return this.weeklyPlansService.updateWeeklyPlan(
      req.user.id,
      planId,
      updateWeeklyPlanDto,
    );
  }

  // ===== ATHLETE ENDPOINTS =====

  @Get('athlete/today')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ATHLETE)
  async getTodaySessions(@Request() req: AuthenticatedRequest) {
    return this.weeklyPlansService.getTodaySessions(req.user.id);
  }
}
