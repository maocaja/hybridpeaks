import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

// Mock fetch globally
global.fetch = jest.fn();

describe('DeviceOAuthController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let configService: ConfigService;
  let athleteAccessToken: string;
  let athleteUserId: string;

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
    configService = moduleFixture.get<ConfigService>(ConfigService);

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
      where: { email: 'athlete-oauth@test.com' },
    });

    // Create test athlete user
    const athleteUser = await prisma.user.create({
      data: {
        email: 'athlete-oauth@test.com',
        passwordHash,
        role: 'ATHLETE',
        athleteProfile: {
          create: {},
        },
      },
    });

    athleteUserId = athleteUser.id;

    // Login to get access token
    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'athlete-oauth@test.com',
        password: 'test123456',
      });

    athleteAccessToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    // Cleanup - delete in correct order due to foreign keys
    if (athleteUserId) {
      const athleteProfile = await prisma.athleteProfile.findUnique({
        where: { userId: athleteUserId },
      });

      if (athleteProfile) {
        await prisma.deviceConnection.deleteMany({
          where: {
            athleteProfileId: athleteProfile.id,
          },
        });

        await prisma.athleteProfile.delete({
          where: { id: athleteProfile.id },
        });
      }

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

  describe('GET /api/athlete/garmin/connect', () => {
    it('redirects to Garmin OAuth URL', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/athlete/garmin/connect')
        .set('Authorization', `Bearer ${athleteAccessToken}`)
        .expect(302); // Redirect

      expect(response.headers.location).toContain('https://connect.garmin.com/oauthConfirm');
      expect(response.headers.location).toContain('client_id=test-garmin-client-id');
      expect(response.headers.location).toContain('response_type=code');
      expect(response.headers.location).toContain('scope=workout%3Awrite');
      expect(response.headers.location).toContain('state=');
    });

    it('returns 401 for unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .get('/api/athlete/garmin/connect')
        .expect(401);
    });
  });

  describe('GET /api/athlete/wahoo/connect', () => {
    it('redirects to Wahoo OAuth URL', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/athlete/wahoo/connect')
        .set('Authorization', `Bearer ${athleteAccessToken}`)
        .expect(302); // Redirect

      expect(response.headers.location).toContain('https://api.wahoo.com/oauth/authorize');
      expect(response.headers.location).toContain('client_id=test-wahoo-client-id');
      expect(response.headers.location).toContain('response_type=code');
      expect(response.headers.location).toContain('state=');
    });

    it('returns 401 for unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .get('/api/athlete/wahoo/connect')
        .expect(401);
    });
  });

  describe('GET /api/athlete/garmin/callback', () => {
    it('exchanges code and stores tokens', async () => {
      // First, initiate OAuth to get a valid state
      const connectResponse = await request(app.getHttpServer())
        .get('/api/athlete/garmin/connect')
        .set('Authorization', `Bearer ${athleteAccessToken}`)
        .expect(302);

      // Extract state from redirect URL
      const redirectUrl = new URL(connectResponse.headers.location);
      const state = redirectUrl.searchParams.get('state');

      // Mock token exchange
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'test-access-token',
          refresh_token: 'test-refresh-token',
          expires_in: 3600,
        }),
      });

      const callbackResponse = await request(app.getHttpServer())
        .get('/api/athlete/garmin/callback')
        .query({
          code: 'test-auth-code',
          state: state || 'invalid-state',
        })
        .set('Authorization', `Bearer ${athleteAccessToken}`)
        .expect(302); // Redirect to success page

      expect(global.fetch).toHaveBeenCalledWith(
        'https://connectapi.garmin.com/oauth/token',
        expect.objectContaining({
          method: 'POST',
        }),
      );

      // Verify connection was stored
      const connection = await prisma.deviceConnection.findFirst({
        where: {
          athleteProfile: {
            userId: athleteUserId,
          },
          provider: 'GARMIN',
        },
      });

      expect(connection).toBeTruthy();
      expect(connection?.status).toBe('CONNECTED');
    });

    it('returns 400 for invalid state parameter', async () => {
      await request(app.getHttpServer())
        .get('/api/athlete/garmin/callback')
        .query({
          code: 'test-auth-code',
          state: 'invalid-state-123',
        })
        .set('Authorization', `Bearer ${athleteAccessToken}`)
        .expect(302); // Redirects to error page

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('returns 400 for missing code parameter', async () => {
      await request(app.getHttpServer())
        .get('/api/athlete/garmin/callback')
        .query({
          state: 'some-state',
        })
        .set('Authorization', `Bearer ${athleteAccessToken}`)
        .expect(400); // Validation error
    });

    it('returns 401 for unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .get('/api/athlete/garmin/callback')
        .query({
          code: 'test-code',
          state: 'test-state',
        })
        .expect(401);
    });
  });

  describe('GET /api/athlete/wahoo/callback', () => {
    it('exchanges code and stores tokens', async () => {
      // First, initiate OAuth to get a valid state
      const connectResponse = await request(app.getHttpServer())
        .get('/api/athlete/wahoo/connect')
        .set('Authorization', `Bearer ${athleteAccessToken}`)
        .expect(302);

      // Extract state from redirect URL
      const redirectUrl = new URL(connectResponse.headers.location);
      const state = redirectUrl.searchParams.get('state');

      // Mock token exchange
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'test-wahoo-access-token',
          refresh_token: 'test-wahoo-refresh-token',
          expires_in: 3600,
        }),
      });

      const callbackResponse = await request(app.getHttpServer())
        .get('/api/athlete/wahoo/callback')
        .query({
          code: 'test-wahoo-auth-code',
          state: state || 'invalid-state',
        })
        .set('Authorization', `Bearer ${athleteAccessToken}`)
        .expect(302); // Redirect to success page

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.wahoo.com/oauth/token',
        expect.objectContaining({
          method: 'POST',
        }),
      );

      // Verify connection was stored
      const connection = await prisma.deviceConnection.findFirst({
        where: {
          athleteProfile: {
            userId: athleteUserId,
          },
          provider: 'WAHOO',
        },
      });

      expect(connection).toBeTruthy();
      expect(connection?.status).toBe('CONNECTED');
    });

    it('returns 400 for invalid state parameter', async () => {
      await request(app.getHttpServer())
        .get('/api/athlete/wahoo/callback')
        .query({
          code: 'test-auth-code',
          state: 'invalid-state-456',
        })
        .set('Authorization', `Bearer ${athleteAccessToken}`)
        .expect(302); // Redirects to error page

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});

