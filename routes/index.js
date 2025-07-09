import { Router } from 'express';

const router = Router();
import usersRouter from './users.js';
// User related routes
router.use('/users', usersRouter);

export default router;
