import { Router } from 'express';

import userSchema from '../schemas/index.js';
import createValidationMiddleware from '../middleware/validate.js';
import { signup ,login} from '../controllers/index.js';

const router = Router();
const validation = createValidationMiddleware(userSchema);

// routes/users.js
/**
 * @swagger
 * /users/signup:
 *   post:
 *     summary: Register (local / social)
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name,email]
 *             properties:
 *               name:  { type: string }
 *               email: { type: string, format: email }
 *               loginType: { type: string, enum: [local, google, github] }
 *               password: { type: string }
 *     responses:
 *       200: { description: User registered }
 *       400: { description: Validation error }
 */
router.post('/signup', validation.user.create, signup);

/**
 * @swagger
 * /users/login:
 *   post:
 *     summary: Login (local / social)
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *               loginType: { type: string, enum: [local, google, github] }
 *               password: { type: string }
 *     responses:
 *       200: { description: Logged in }
 *       401: { description: Invalid credentials }
 */
router.post('/login', validation.user.login, login);
export default router;
