import categorySchema from './category.js';
import userSchema from './user.js';
import rssFeedSchema from './rssFeed.js';
import articleSchema from './article.js';
import commentSchema from './comment.js';
import youtubeContentSchema from './youtubeContent.js';

export default {
    category: categorySchema,
    user: userSchema,
    rssFeed: rssFeedSchema,
    article: articleSchema,
    comment: commentSchema,
    youtubeContent: youtubeContentSchema
};
