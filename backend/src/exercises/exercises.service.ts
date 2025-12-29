import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { QueryExercisesDto } from './dto/query-exercises.dto';
import { ExerciseType } from '@prisma/client';

@Injectable()
export class ExercisesService {
  constructor(private prisma: PrismaService) {}

  async createExercise(dto: CreateExerciseDto) {
    // Validate modality requirement for ENDURANCE exercises
    if (dto.type === ExerciseType.ENDURANCE && !dto.modality) {
      throw new BadRequestException(
        'Modality is required for ENDURANCE exercises',
      );
    }

    const exercise = await this.prisma.exercise.create({
      data: {
        name: dto.name,
        type: dto.type,
        modality: dto.modality,
        description: dto.description,
        videoUrl: dto.videoUrl,
        primaryMuscles: dto.primaryMuscles || [],
      },
    });

    return exercise;
  }

  async listExercises(query: QueryExercisesDto) {
    const where = {
      ...(query.type && { type: query.type }),
      ...(query.modality && { modality: query.modality }),
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' as const } },
          {
            description: {
              contains: query.search,
              mode: 'insensitive' as const,
            },
          },
        ],
      }),
    };

    const exercises = await this.prisma.exercise.findMany({
      where,
      orderBy: {
        name: 'asc',
      },
    });

    return exercises;
  }

  async getExerciseById(exerciseId: string) {
    return this.prisma.exercise.findUnique({
      where: { id: exerciseId },
    });
  }
}
