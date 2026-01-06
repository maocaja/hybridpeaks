import * as Joi from 'joi';

export const validationSchema = Joi.object({
  PORT: Joi.number().default(3000),
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().required(),
  JWT_REFRESH_SECRET: Joi.string().required(),
  JWT_EXPIRY: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRY: Joi.string().default('7d'),
  THROTTLE_TTL: Joi.number().default(60000),
  THROTTLE_LIMIT: Joi.number().default(10),
  // Garmin OAuth configuration
  GARMIN_CLIENT_ID: Joi.string().optional(),
  GARMIN_CLIENT_SECRET: Joi.string().optional(),
  GARMIN_REDIRECT_URI: Joi.string().optional(),
  GARMIN_AUTH_URL: Joi.string().optional(),
  GARMIN_TOKEN_URL: Joi.string().optional(),
  GARMIN_API_BASE_URL: Joi.string().optional(),
  GARMIN_TOKEN_ENCRYPTION_KEY: Joi.string().optional(),
  // Wahoo OAuth configuration
  WAHOO_CLIENT_ID: Joi.string().optional(),
  WAHOO_CLIENT_SECRET: Joi.string().optional(),
  WAHOO_REDIRECT_URI: Joi.string().optional(),
  WAHOO_AUTH_URL: Joi.string().optional(),
  WAHOO_TOKEN_URL: Joi.string().optional(),
  WAHOO_API_BASE_URL: Joi.string().optional(),
  WAHOO_TOKEN_ENCRYPTION_KEY: Joi.string().optional(),
  // Development mode
  DEV_MODE_OAUTH: Joi.string().valid('true', 'false').optional(),
  ATHLETE_PWA_URL: Joi.string().uri().optional(),
});
