import { Router } from 'express';

const router = Router();
import usersRouter from './users.js';
import categoriesRouter from './categories.js';
import rssFeedsRouter from './rssFeeds.js';
import articlesRouter from './articles.js';
import aiSummaryRouter from './aiSummary.js';
import youtubeContentRouter from './youtubeContent.js';

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

// YouTube Content related routes
router.use('/youtube-content', youtubeContentRouter);

export default router;
