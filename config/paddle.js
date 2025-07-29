import { Paddle, Environment } from '@paddle/paddle-node-sdk';

// Paddle Configuration
const paddleConfig = {
    apiKey: process.env.PADDLE_API_KEY,
    environment: process.env.NODE_ENV === 'production' ? Environment.production : Environment.sandbox,
    webhookSecret: process.env.PADDLE_WEBHOOK_SECRET
};

// Initialize Paddle instance
const paddle = new Paddle(paddleConfig);

export {
    paddle,
    paddleConfig
};
