import { Router } from 'express';

const router = Router();
import usersRouter from './users.js';
import categoriesRouter from './categories.js';
import rssFeedsRouter from './rssFeeds.js';
import articlesRouter from './articles.js';
import commentsRouter from './comments.js';
import aiSummaryRouter from './aiSummary.js';
import youtubeContentRouter from './youtubeContent.js';
import staticPagesRouter from './staticPages.js';
import contactUsRoutes from "./contact.js";
import subscriptionsRouter from './subscriptions.js';


// User related routes
router.use('/users', usersRouter);

// Category related routes
router.use('/categories', categoriesRouter);

// RSS feeds related routes
router.use('/rss-feeds', rssFeedsRouter);

// Articles related routes
router.use('/articles', articlesRouter);

// Comments related routes
router.use('/comments', commentsRouter);

// AI Summary related routes
router.use('/ai-summary', aiSummaryRouter);

// YouTube Content related routes
router.use('/youtube-content', youtubeContentRouter);

// Static pages related routes
router.use("/static-pages", staticPagesRouter);

// Subscriptions related routes
router.use('/subscriptions', subscriptionsRouter);

// Contact Us related routes
router.use("/contact-us", contactUsRoutes);

export default router;
