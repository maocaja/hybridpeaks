import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { WeeklyPlansService } from '../../../src/weekly-plans/weekly-plans.service';
import { EnduranceExportService } from '../../../src/integrations/endurance/endurance-export.service';

describe('Auto-Push Endurance Workouts (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let weeklyPlansService: WeeklyPlansService;
  let enduranceExportService: EnduranceExportService;

  let coachToken: string;
  let athleteToken: string;
  let coachUserId: string;
  let athleteUserId: string;
  let athleteProfileId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    weeklyPlansService = moduleFixture.get<WeeklyPlansService>(
      WeeklyPlansService,
    );
    enduranceExportService = moduleFixture.get<EnduranceExportService>(
      EnduranceExportService,
    );

    // Create test users
    const coachResponse = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'coach-auto-push@test.com',
        password: 'test123456',
        role: 'COACH',
      });

    coachToken = coachResponse.body.accessToken;
    coachUserId = coachResponse.body.user.id;

    const athleteResponse = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'athlete-auto-push@test.com',
        password: 'test123456',
        role: 'ATHLETE',
      });

    athleteToken = athleteResponse.body.accessToken;
    athleteUserId = athleteResponse.body.user.id;

    const athleteProfile = await prisma.athleteProfile.findUnique({
      where: { userId: athleteUserId },
    });
    athleteProfileId = athleteProfile!.id;
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.trainingSession.deleteMany({
      where: {
        weeklyPlan: {
          athleteUserId,
        },
      },
    });
    await prisma.weeklyPlan.deleteMany({
      where: { athleteUserId },
    });
    await prisma.deviceConnection.deleteMany({
      where: { athleteProfileId },
    });
    await prisma.user.deleteMany({
      where: {
        id: { in: [coachUserId, athleteUserId] },
      },
    });

    await app.close();
  });

  describe('Auto-push on session creation', () => {
    it('sets NOT_CONNECTED when athlete has no device connection', async () => {
      const weekStart = '2025-01-06'; // Monday

      const response = await request(app.getHttpServer())
        .post('/api/coach/weekly-plans')
        .set('Authorization', `Bearer ${coachToken}`)
        .send({
          athleteUserId,
          weekStart,
          sessions: [
            {
              date: '2025-01-06',
              type: 'ENDURANCE',
              title: 'Test Endurance Workout',
              prescription: {
                sport: 'BIKE',
                steps: [
                  {
                    type: 'WARMUP',
                    duration: { type: 'TIME', value: 600 },
                    primaryTarget: { kind: 'POWER', unit: 'WATTS', zone: 1 },
                  },
                ],
              },
            },
          ],
        });

      expect(response.status).toBe(201);
      const session = response.body.sessions[0];

      // Wait a bit for async export to complete
      await new Promise((resolve) => setTimeout(resolve, 500));

      const updatedSession = await prisma.trainingSession.findUnique({
        where: { id: session.id },
      });

      expect(updatedSession?.exportStatus).toBe('NOT_CONNECTED');
      expect(updatedSession?.exportProvider).toBeNull();
    });

    it('triggers export when athlete has device connection', async () => {
      // Create device connection
      await prisma.deviceConnection.create({
        data: {
          athleteProfileId,
          provider: 'GARMIN',
          accessToken: 'encrypted-token',
          refreshToken: 'encrypted-refresh',
          expiresAt: new Date(Date.now() + 3600000),
          status: 'CONNECTED',
          isPrimary: true,
        },
      });

      const weekStart = '2025-01-13'; // Next Monday

      const response = await request(app.getHttpServer())
        .post('/api/coach/weekly-plans')
        .set('Authorization', `Bearer ${coachToken}`)
        .send({
          athleteUserId,
          weekStart,
          sessions: [
            {
              date: '2025-01-13',
              type: 'ENDURANCE',
              title: 'Test Endurance with Connection',
              prescription: {
                sport: 'RUN',
                steps: [
                  {
                    type: 'WORK',
                    duration: { type: 'TIME', value: 1800 },
                    primaryTarget: {
                      kind: 'HEART_RATE',
                      unit: 'BPM',
                      zone: 2,
                    },
                  },
                ],
              },
            },
          ],
        });

      expect(response.status).toBe(201);
      const session = response.body.sessions[0];

      // Wait a bit for async export to complete
      await new Promise((resolve) => setTimeout(resolve, 500));

      const updatedSession = await prisma.trainingSession.findUnique({
        where: { id: session.id },
      });

      // In dev mode, export should be attempted (may fail if mock API not available)
      expect(updatedSession?.exportStatus).toBeTruthy();
      expect(['PENDING', 'SENT', 'FAILED']).toContain(
        updatedSession?.exportStatus,
      );
    });
  });

  describe('Auto-push on session update', () => {
    it('triggers export when updating ENDURANCE session', async () => {
      const weekStart = '2025-01-20';

      // Create plan
      const createResponse = await request(app.getHttpServer())
        .post('/api/coach/weekly-plans')
        .set('Authorization', `Bearer ${coachToken}`)
        .send({
          athleteUserId,
          weekStart,
          sessions: [
            {
              date: '2025-01-20',
              type: 'ENDURANCE',
              title: 'Original Workout',
              prescription: {
                sport: 'BIKE',
                steps: [
                  {
                    type: 'WARMUP',
                    duration: { type: 'TIME', value: 300 },
                  },
                ],
              },
            },
          ],
        });

      const planId = createResponse.body.id;
      const sessionId = createResponse.body.sessions[0].id;

      // Wait for initial export
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Update session
      const updateResponse = await request(app.getHttpServer())
        .put(`/api/coach/weekly-plans/${planId}`)
        .set('Authorization', `Bearer ${coachToken}`)
        .send({
          sessions: [
            {
              date: '2025-01-20',
              type: 'ENDURANCE',
              title: 'Updated Workout',
              prescription: {
                sport: 'BIKE',
                steps: [
                  {
                    type: 'WORK',
                    duration: { type: 'TIME', value: 1800 },
                    primaryTarget: { kind: 'POWER', unit: 'WATTS', zone: 3 },
                  },
                ],
              },
            },
          ],
        });

      expect(updateResponse.status).toBe(200);
      const updatedSession = updateResponse.body.sessions[0];

      // Wait for export
      await new Promise((resolve) => setTimeout(resolve, 500));

      const session = await prisma.trainingSession.findUnique({
        where: { id: updatedSession.id },
      });

      expect(session?.exportStatus).toBeTruthy();
    });
  });

  describe('Push pending workouts on connection', () => {
    it('pushes NOT_CONNECTED sessions when athlete connects device', async () => {
      // Create a session with NOT_CONNECTED status
      const weekStart = '2025-01-27';
      const createResponse = await request(app.getHttpServer())
        .post('/api/coach/weekly-plans')
        .set('Authorization', `Bearer ${coachToken}`)
        .send({
          athleteUserId,
          weekStart,
          sessions: [
            {
              date: '2025-01-27',
              type: 'ENDURANCE',
              title: 'Pending Workout',
              prescription: {
                sport: 'SWIM',
                steps: [
                  {
                    type: 'WORK',
                    duration: { type: 'TIME', value: 1200 },
                  },
                ],
              },
            },
          ],
        });

      const sessionId = createResponse.body.sessions[0].id;

      // Wait for initial status
      await new Promise((resolve) => setTimeout(resolve, 500));

      const beforeConnection = await prisma.trainingSession.findUnique({
        where: { id: sessionId },
      });
      expect(beforeConnection?.exportStatus).toBe('NOT_CONNECTED');

      // Simulate connection (create device connection)
      await prisma.deviceConnection.create({
        data: {
          athleteProfileId,
          provider: 'WAHOO',
          accessToken: 'encrypted-token-2',
          refreshToken: 'encrypted-refresh-2',
          expiresAt: new Date(Date.now() + 3600000),
          status: 'CONNECTED',
          isPrimary: false,
        },
      });

      // Trigger push pending (simulate what happens in controller)
      await enduranceExportService.pushPendingWorkouts(athleteUserId, 'WAHOO');

      // Wait for export
      await new Promise((resolve) => setTimeout(resolve, 500));

      const afterConnection = await prisma.trainingSession.findUnique({
        where: { id: sessionId },
      });

      // Status should have changed from NOT_CONNECTED
      expect(afterConnection?.exportStatus).not.toBe('NOT_CONNECTED');
      expect(['PENDING', 'SENT', 'FAILED']).toContain(
        afterConnection?.exportStatus,
      );
    });
  });
});

