import { Router } from 'express';

const router = Router();
import usersRouter from './users.js';
import categoriesRouter from './categories.js';

// User related routes
router.use('/users', usersRouter);

// Category related routes
router.use('/categories', categoriesRouter);

export default router;
