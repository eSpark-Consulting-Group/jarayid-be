import bcrypt from 'bcryptjs';
import { bcryptConfig } from '../config/config.js';

/**
 * Generate a hashed password using bcrypt and the configured salt rounds
 * @param {string} password - Plain text password
 * @returns {Promise<string>} - Hashed password
 */
export async function generateHashedPassword(password) {
    const salt = await bcrypt.genSalt(bcryptConfig.salt);
    return bcrypt.hash(password, salt);
}
