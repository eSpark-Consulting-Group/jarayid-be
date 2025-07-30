// Centralised export for all controllers
import UserController from './userController.js';
import CategoryController from './categoryController.js';
import RSSFeedController from './rssFeedController.js';
import ArticleController from './articleController.js';
import CommentController from './commentController.js';
import AISummaryController from './aiSummaryController.js';
import YouTubeContentController from './youtubeContentController.js';
import StaticPageController from './staticPageController.js';
import ContactController from './contactController.js';
import SponsorAccountController from './sponsorAccountController.js';
import ExternalLinkController from './externalLinkController.js';
import CookieController from './cookieController.js';

export { 
    UserController, 
    CategoryController, 
    RSSFeedController, 
    ArticleController, 
    CommentController,
    AISummaryController,
    YouTubeContentController,
    StaticPageController,
    ContactController,
    SponsorAccountController,
    ExternalLinkController,
    CookieController
};
export default UserController;
