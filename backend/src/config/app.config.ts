import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL,
  jwt: {
    secret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    expiry: process.env.JWT_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL || '60000', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT || '10', 10),
  },
  garmin: {
    clientId: process.env.GARMIN_CLIENT_ID,
    clientSecret: process.env.GARMIN_CLIENT_SECRET,
    redirectUri: process.env.GARMIN_REDIRECT_URI,
    authUrl:
      process.env.GARMIN_AUTH_URL || 'https://connect.garmin.com/oauthConfirm',
    tokenUrl:
      process.env.GARMIN_TOKEN_URL ||
      'https://connectapi.garmin.com/oauth-service/oauth/token',
    apiBaseUrl:
      process.env.GARMIN_API_BASE_URL || 'https://connectapi.garmin.com',
    tokenEncryptionKey: process.env.GARMIN_TOKEN_ENCRYPTION_KEY,
  },
  wahoo: {
    clientId: process.env.WAHOO_CLIENT_ID,
    clientSecret: process.env.WAHOO_CLIENT_SECRET,
    redirectUri: process.env.WAHOO_REDIRECT_URI,
    authUrl: process.env.WAHOO_AUTH_URL,
    tokenUrl: process.env.WAHOO_TOKEN_URL,
    apiBaseUrl: process.env.WAHOO_API_BASE_URL,
    tokenEncryptionKey: process.env.WAHOO_TOKEN_ENCRYPTION_KEY,
  },
  // Development mode for OAuth (use mock when true)
  devModeOAuth: process.env.DEV_MODE_OAUTH === 'true',
  athletePwaUrl: process.env.ATHLETE_PWA_URL || 'http://localhost:5174',
}));
