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



