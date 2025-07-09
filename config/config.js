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

