import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { ExercisesService } from './exercises.service';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { QueryExercisesDto } from './dto/query-exercises.dto';

@Controller('exercises')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExercisesController {
  constructor(private exercisesService: ExercisesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.COACH)
  async createExercise(@Body() createDto: CreateExerciseDto) {
    return this.exercisesService.createExercise(createDto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.COACH, UserRole.ATHLETE)
  async listExercises(@Query() query: QueryExercisesDto) {
    return this.exercisesService.listExercises(query);
  }
}
