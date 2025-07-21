import { config as loadEnv } from 'dotenv';
import { NODE_ENVS } from '../constants/index.js';

loadEnv();

const getEnv = (key) => {
    if (!process.env[key]) throw new Error(`${key} NOT FOUND IN ENV`);
    return process.env[key];
};

export const configs = {
    NODE_ENV: process.env.NODE_ENV ?? NODE_ENVS.DEVELOPMENT,
    PORT: Number(getEnv('PORT')),

    // Database
    DATABASE_URL: getEnv('DATABASE_URL'),

    // JWT Configs
    JWT_SECRET_KEY: getEnv('JWT_SECRET'),
    EXPIRES_IN: getEnv('EXPIRES_IN'),
};



export const bcryptConfig = {
    salt: Number(getEnv('SALT'))
};

export const CLOUD_CONFIG = {
  apiKey: getEnv("CLOUD_API_KEY"),
  apiSecret: getEnv("CLOUD_SECRET"),
  cloudName: getEnv("CLOUD_NAME"),
  folder: getEnv("CLOUD_FOLDER"),
};

export const PASSWORD_RESET_CONFIG = {
  secret: getEnv("PASSWORD_RESET_SECRET"),
  expirationTime: getEnv("PASSWORD_RESET_EXPIRATION") || "1h", // 1 hour default
  frontendUrl: getEnv("FRONTEND_URL") || "http://localhost:3000",
};

export const MAILER_CONFIG = {
  host: getEnv("SMTP_HOST"),
  port: Number(getEnv("SMTP_PORT")),
  secure: Boolean(getEnv("SMTP_SECURE")),
  service: getEnv("SMTP_SERVICE"),
  pass: getEnv("SMTP_PASS"),
  from: getEnv("SMTP_FROM"),
};

export const REDIS_CONFIG = {
  host: getEnv("REDIS_HOST"),
  port: Number(getEnv("REDIS_PORT")),
  password: getEnv("REDIS_PASSWORD"),
  retryDelayOnFailover: 100,
  // Bull requires these specific settings for bclient/subscriber
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
};

export const RSS_PROCESSING_CONFIG = {
  concurrency: Number(process.env.RSS_CONCURRENCY || "3"),
  batchSize: Number(process.env.RSS_BATCH_SIZE || "5"),
  cronSchedule: process.env.RSS_CRON_SCHEDULE || "*/10 * * * *", // Every 10 minutes for testing
  jobTimeout: Number(process.env.RSS_JOB_TIMEOUT || "300000"), // 5 minutes
  retryAttempts: Number(process.env.RSS_RETRY_ATTEMPTS || "3"),
  retryDelay: Number(process.env.RSS_RETRY_DELAY || "60000"), // 1 minute
};

// OpenAI Configuration for Article Summarization
export const OPENAI_CONFIG = {
  apiKey: process.env.OPENAI_API_KEY,
  model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
  maxTokens: Number(process.env.OPENAI_MAX_TOKENS || "150"),
  temperature: Number(process.env.OPENAI_TEMPERATURE || "0.7"),
  enabled: process.env.OPENAI_ENABLED === 'true',
  timeout: Number(process.env.OPENAI_TIMEOUT || "30000"), // 30 seconds
};



