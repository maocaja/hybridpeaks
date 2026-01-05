import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { SessionType } from '@prisma/client';
import * as argon2 from 'argon2';

describe('Coach Export Normalized Endpoint (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let coachToken: string;
  let coachId: string;
  let athleteId: string;
  let sessionId: string;
  let otherCoachToken: string;
  let otherCoachId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    await app.init();

    // Create test coach
    const coachPasswordHash = await argon2.hash('password123');
    const coach = await prisma.user.create({
      data: {
        email: 'coach-export-test@test.com',
        passwordHash: coachPasswordHash,
        role: 'COACH',
        coachProfile: {
          create: {},
        },
      },
    });
    coachId = coach.id;

    // Create test athlete
    const athletePasswordHash = await argon2.hash('password123');
    const athlete = await prisma.user.create({
      data: {
        email: 'athlete-export-test@test.com',
        passwordHash: athletePasswordHash,
        role: 'ATHLETE',
        athleteProfile: {
          create: {},
        },
      },
    });
    athleteId = athlete.id;

    // Link coach and athlete
    const coachProfile = await prisma.coachProfile.findUnique({
      where: { userId: coachId },
    });
    const athleteProfile = await prisma.athleteProfile.findUnique({
      where: { userId: athleteId },
    });

    if (coachProfile && athleteProfile) {
      await prisma.coachAthlete.create({
        data: {
          coachProfileId: coachProfile.id,
          athleteProfileId: athleteProfile.id,
        },
      });
    }

    // Login as coach to get token
    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'coach-export-test@test.com',
        password: 'password123',
      });

    coachToken = loginResponse.body.accessToken;

    // Create a weekly plan with an endurance session
    const weekStart = new Date('2025-01-06T00:00:00.000Z'); // Monday
    const weeklyPlan = await prisma.weeklyPlan.create({
      data: {
        coachId: coachId,
        athleteUserId: athleteId,
        weekStart,
        sessions: {
          create: {
            date: new Date('2025-01-06T00:00:00.000Z'),
            type: SessionType.ENDURANCE,
            title: 'Bike Intervals',
            prescription: {
              sport: 'BIKE',
              steps: [
                {
                  type: 'WARMUP',
                  duration: { type: 'TIME', value: 600 },
                  primaryTarget: {
                    kind: 'POWER',
                    unit: 'WATTS',
                    zone: 1,
                  },
                },
                {
                  type: 'WORK',
                  duration: { type: 'TIME', value: 1800 },
                  primaryTarget: {
                    kind: 'POWER',
                    unit: 'WATTS',
                    zone: 3,
                  },
                },
              ],
            },
          },
        },
      },
      include: {
        sessions: true,
      },
    });

    sessionId = weeklyPlan.sessions[0].id;

    // Create another coach (for unauthorized test)
    const otherCoachPasswordHash = await argon2.hash('password123');
    const otherCoach = await prisma.user.create({
      data: {
        email: 'other-coach-export-test@test.com',
        passwordHash: otherCoachPasswordHash,
        role: 'COACH',
        coachProfile: {
          create: {},
        },
      },
    });
    otherCoachId = otherCoach.id;

    const otherLoginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'other-coach-export-test@test.com',
        password: 'password123',
      });

    otherCoachToken = otherLoginResponse.body.accessToken;
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.trainingSession.deleteMany({
      where: {
        weeklyPlan: {
          athleteUserId: athleteId,
        },
      },
    });
    await prisma.weeklyPlan.deleteMany({
      where: {
        athleteUserId: athleteId,
      },
    });
    await prisma.coachAthlete.deleteMany({
      where: {
        coachProfile: {
          userId: coachId,
        },
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'coach-export-test@test.com',
            'athlete-export-test@test.com',
            'other-coach-export-test@test.com',
          ],
        },
      },
    });
    await app.close();
  });

  describe('GET /api/coach/athletes/sessions/:sessionId/export/normalized', () => {
    it('returns 200 with normalized workout for valid endurance session', () => {
      return request(app.getHttpServer())
        .get(`/api/coach/athletes/sessions/${sessionId}/export/normalized`)
        .set('Authorization', `Bearer ${coachToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('sport', 'BIKE');
          expect(res.body).toHaveProperty('steps');
          expect(Array.isArray(res.body.steps)).toBe(true);
          expect(res.body.steps.length).toBeGreaterThan(0);
          expect(res.body.steps[0]).toHaveProperty('type');
          expect(res.body.steps[0]).toHaveProperty('duration');
          expect(res.body.steps[0].duration).toHaveProperty('seconds');
        });
    });

    it('returns 404 for non-existent session', () => {
      return request(app.getHttpServer())
        .get('/api/coach/athletes/sessions/non-existent-id/export/normalized')
        .set('Authorization', `Bearer ${coachToken}`)
        .expect(404)
        .expect((res) => {
          expect(res.body.message).toContain('Training session not found');
        });
    });

    it('returns 403 for unauthorized coach', () => {
      return request(app.getHttpServer())
        .get(`/api/coach/athletes/sessions/${sessionId}/export/normalized`)
        .set('Authorization', `Bearer ${otherCoachToken}`)
        .expect(403)
        .expect((res) => {
          expect(res.body.message).toContain('permission');
        });
    });

    it('returns 400 for strength session', async () => {
      // Create a strength session
      const strengthPlan = await prisma.weeklyPlan.create({
        data: {
          coachId: coachId,
          athleteUserId: athleteId,
          weekStart: new Date('2025-01-13T00:00:00.000Z'),
          sessions: {
            create: {
              date: new Date('2025-01-13T00:00:00.000Z'),
              type: SessionType.STRENGTH,
              title: 'Strength Workout',
              prescription: {
                items: [],
              },
            },
          },
        },
        include: {
          sessions: true,
        },
      });

      const strengthSessionId = strengthPlan.sessions[0].id;

      return request(app.getHttpServer())
        .get(`/api/coach/athletes/sessions/${strengthSessionId}/export/normalized`)
        .set('Authorization', `Bearer ${coachToken}`)
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('endurance');
        })
        .then(async () => {
          // Cleanup
          await prisma.trainingSession.delete({
            where: { id: strengthSessionId },
          });
          await prisma.weeklyPlan.delete({
            where: { id: strengthPlan.id },
          });
        });
    });

    it('response structure matches NormalizedWorkout type', () => {
      return request(app.getHttpServer())
        .get(`/api/coach/athletes/sessions/${sessionId}/export/normalized`)
        .set('Authorization', `Bearer ${coachToken}`)
        .expect(200)
        .expect((res) => {
          const workout = res.body;
          // Check top-level structure
          expect(workout).toHaveProperty('sport');
          expect(['BIKE', 'RUN', 'SWIM']).toContain(workout.sport);
          expect(workout).toHaveProperty('steps');
          expect(Array.isArray(workout.steps)).toBe(true);

          // Check step structure
          if (workout.steps.length > 0) {
            const step = workout.steps[0];
            expect(step).toHaveProperty('type');
            expect(step).toHaveProperty('duration');
            expect(step.duration).toHaveProperty('seconds');
            // Optional fields
            if (step.primaryTarget) {
              expect(step.primaryTarget).toHaveProperty('kind');
              expect(step.primaryTarget).toHaveProperty('unit');
            }
          }
        });
    });
  });
});

