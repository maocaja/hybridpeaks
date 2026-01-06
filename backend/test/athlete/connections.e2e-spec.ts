import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';

// Mock fetch globally
global.fetch = jest.fn();

describe('Athlete Connections (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let athleteAccessToken: string;
  let athleteUserId: string;
  let athleteProfileId: string;

  beforeAll(async () => {
    // Set environment variables for OAuth (required for service initialization)
    process.env.GARMIN_CLIENT_ID = 'test-garmin-client-id';
    process.env.GARMIN_CLIENT_SECRET = 'test-garmin-secret';
    process.env.GARMIN_REDIRECT_URI = 'http://localhost:3000/api/athlete/garmin/callback';
    process.env.GARMIN_AUTH_URL = 'https://connect.garmin.com/oauthConfirm';
    process.env.GARMIN_TOKEN_URL = 'https://connectapi.garmin.com/oauth/token';
    process.env.GARMIN_API_BASE_URL = 'https://connectapi.garmin.com';
    process.env.GARMIN_TOKEN_ENCRYPTION_KEY =
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

    process.env.WAHOO_CLIENT_ID = 'test-wahoo-client-id';
    process.env.WAHOO_CLIENT_SECRET = 'test-wahoo-secret';
    process.env.WAHOO_REDIRECT_URI = 'http://localhost:3000/api/athlete/wahoo/callback';
    process.env.WAHOO_AUTH_URL = 'https://api.wahoo.com/oauth/authorize';
    process.env.WAHOO_TOKEN_URL = 'https://api.wahoo.com/oauth/token';
    process.env.WAHOO_API_BASE_URL = 'https://api.wahoo.com';
    process.env.WAHOO_TOKEN_ENCRYPTION_KEY =
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    prisma = moduleFixture.get<PrismaService>(PrismaService);

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    // Create user with hashed password
    const argon2 = require('argon2');
    const passwordHash = await argon2.hash('test123456');

    // Delete existing user if exists
    await prisma.user.deleteMany({
      where: { email: 'athlete-connections@test.com' },
    });

    // Create test athlete user
    const athleteUser = await prisma.user.create({
      data: {
        email: 'athlete-connections@test.com',
        passwordHash,
        role: 'ATHLETE',
        athleteProfile: {
          create: {},
        },
      },
    });

    athleteUserId = athleteUser.id;

    const athleteProfile = await prisma.athleteProfile.findUnique({
      where: { userId: athleteUserId },
    });
    athleteProfileId = athleteProfile!.id;

    // Login to get access token
    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'athlete-connections@test.com',
        password: 'test123456',
      });

    athleteAccessToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    // Cleanup - delete in correct order due to foreign keys
    if (athleteProfileId) {
      await prisma.deviceConnection.deleteMany({
        where: {
          athleteProfileId,
        },
      });

      await prisma.athleteProfile.delete({
        where: { id: athleteProfileId },
      });
    }

    if (athleteUserId) {
      await prisma.user.delete({
        where: { id: athleteUserId },
      });
    }

    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  describe('GET /api/athlete/connections', () => {
    it('returns connections array', async () => {
      // Create test connections
      await prisma.deviceConnection.createMany({
        data: [
          {
            athleteProfileId,
            provider: 'GARMIN',
            accessToken: 'encrypted-token-1',
            refreshToken: 'encrypted-refresh-1',
            expiresAt: new Date(Date.now() + 3600000),
            status: 'CONNECTED',
            isPrimary: true,
          },
          {
            athleteProfileId,
            provider: 'WAHOO',
            accessToken: 'encrypted-token-2',
            refreshToken: 'encrypted-refresh-2',
            expiresAt: new Date(Date.now() + 3600000),
            status: 'CONNECTED',
            isPrimary: false,
          },
        ],
      });

      const response = await request(app.getHttpServer())
        .get('/api/athlete/connections')
        .set('Authorization', `Bearer ${athleteAccessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);

      const garminConnection = response.body.find(
        (conn: { provider: string }) => conn.provider === 'GARMIN',
      );
      const wahooConnection = response.body.find(
        (conn: { provider: string }) => conn.provider === 'WAHOO',
      );

      expect(garminConnection).toBeTruthy();
      expect(garminConnection.status).toBe('CONNECTED');
      expect(garminConnection.isPrimary).toBe(true);

      expect(wahooConnection).toBeTruthy();
      expect(wahooConnection.status).toBe('CONNECTED');
      expect(wahooConnection.isPrimary).toBe(false);

      // Verify primary connection is first
      expect(response.body[0].isPrimary).toBe(true);
    });

    it('returns empty array if no connections exist', async () => {
      // Clean up existing connections
      await prisma.deviceConnection.deleteMany({
        where: { athleteProfileId },
      });

      const response = await request(app.getHttpServer())
        .get('/api/athlete/connections')
        .set('Authorization', `Bearer ${athleteAccessToken}`)
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('returns 401 for unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .get('/api/athlete/connections')
        .expect(401);
    });
  });

  describe('PUT /api/athlete/connections/primary', () => {
    beforeEach(async () => {
      // Clean up and create fresh connections for each test
      await prisma.deviceConnection.deleteMany({
        where: { athleteProfileId },
      });

      await prisma.deviceConnection.createMany({
        data: [
          {
            athleteProfileId,
            provider: 'GARMIN',
            accessToken: 'encrypted-token-1',
            refreshToken: 'encrypted-refresh-1',
            expiresAt: new Date(Date.now() + 3600000),
            status: 'CONNECTED',
            isPrimary: true,
          },
          {
            athleteProfileId,
            provider: 'WAHOO',
            accessToken: 'encrypted-token-2',
            refreshToken: 'encrypted-refresh-2',
            expiresAt: new Date(Date.now() + 3600000),
            status: 'CONNECTED',
            isPrimary: false,
          },
        ],
      });
    });

    it('sets primary provider', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/athlete/connections/primary')
        .set('Authorization', `Bearer ${athleteAccessToken}`)
        .send({ provider: 'WAHOO' })
        .expect(200);

      expect(response.body.message).toContain('WAHOO set as primary provider');
      expect(response.body.provider).toBe('WAHOO');

      // Verify WAHOO is now primary
      const connections = await prisma.deviceConnection.findMany({
        where: { athleteProfileId },
      });

      const wahooConnection = connections.find((c) => c.provider === 'WAHOO');
      const garminConnection = connections.find((c) => c.provider === 'GARMIN');

      expect(wahooConnection?.isPrimary).toBe(true);
      expect(garminConnection?.isPrimary).toBe(false);
    });

    it('returns 400 for invalid provider', async () => {
      await request(app.getHttpServer())
        .put('/api/athlete/connections/primary')
        .set('Authorization', `Bearer ${athleteAccessToken}`)
        .send({ provider: 'INVALID_PROVIDER' })
        .expect(400);
    });

    it('returns 400 for unconnected provider', async () => {
      // Delete WAHOO connection
      await prisma.deviceConnection.deleteMany({
        where: {
          athleteProfileId,
          provider: 'WAHOO',
        },
      });

      await request(app.getHttpServer())
        .put('/api/athlete/connections/primary')
        .set('Authorization', `Bearer ${athleteAccessToken}`)
        .send({ provider: 'WAHOO' })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('connection not found or not connected');
        });
    });

    it('returns 400 for provider with non-CONNECTED status', async () => {
      // Update WAHOO to EXPIRED
      await prisma.deviceConnection.updateMany({
        where: {
          athleteProfileId,
          provider: 'WAHOO',
        },
        data: {
          status: 'EXPIRED',
        },
      });

      await request(app.getHttpServer())
        .put('/api/athlete/connections/primary')
        .set('Authorization', `Bearer ${athleteAccessToken}`)
        .send({ provider: 'WAHOO' })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('connection not found or not connected');
        });
    });

    it('returns 401 for unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .put('/api/athlete/connections/primary')
        .send({ provider: 'GARMIN' })
        .expect(401);
    });
  });
});


