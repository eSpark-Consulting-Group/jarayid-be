import jwt from 'jsonwebtoken';

/**
 * Generate a signed JWT token for the given payload.
 * @param {object} payload - Data to embed inside the token.
 * @param {string} [expiresIn='7d'] - Expiration duration.
 * @returns {string} JWT token string
 */
const generateToken = (payload, expiresIn = '7d') => {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};

export default generateToken;
