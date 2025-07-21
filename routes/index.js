import { Router } from 'express';

const router = Router();
import usersRouter from './users.js';
import categoriesRouter from './categories.js';
import rssFeedsRouter from './rssFeeds.js';
import articlesRouter from './articles.js';
import aiSummaryRouter from './aiSummary.js';

// User related routes
router.use('/users', usersRouter);

// Category related routes
router.use('/categories', categoriesRouter);

// RSS feeds related routes
router.use('/rss-feeds', rssFeedsRouter);

// Articles related routes
router.use('/articles', articlesRouter);

// AI Summary related routes
router.use('/ai-summary', aiSummaryRouter);

export default router;
