import { Paddle, Environment } from '@paddle/paddle-node-sdk';

// Paddle Configuration
const paddleConfig = {
    apiKey: process.env.PADDLE_API_KEY,
    environment: process.env.NODE_ENV === 'production' ? Environment.production : Environment.sandbox,
    webhookSecret: process.env.PADDLE_WEBHOOK_SECRET,
    // Frontend URLs for redirects
    successUrl: process.env.PADDLE_SUCCESS_URL || `${process.env.FRONTEND_URL}/subscription/success`,
    failureUrl: process.env.PADDLE_FAILURE_URL || `${process.env.FRONTEND_URL}/subscription/failed`,
    cancelUrl: process.env.PADDLE_CANCEL_URL || `${process.env.FRONTEND_URL}/subscription/cancelled`
};

// Initialize Paddle instance with correct parameters
const paddle = new Paddle(
    process.env.PADDLE_API_KEY,
    {
        environment: paddleConfig.environment
    }
);

export {
    paddle,
    paddleConfig
};
