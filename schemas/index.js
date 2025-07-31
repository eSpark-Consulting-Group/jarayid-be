import categorySchema from './category.js';
import userSchema from './user.js';
import rssFeedSchema from './rssFeed.js';
import staticPageSchema from './staticPage.js';
import articleSchema from './article.js';
import commentSchema from './comment.js';
import youtubeContentSchema from './youtubeContent.js';
import contactUsSchema from './contact.js';
import externalLinkSchema from './externalLink.js';
import sponsorAccountSchema from './sponsorAccount.js';
import subscriptionSchema from './subscription.js';
import cookieSchema from './cookie.js';
import visualAdPlacementSchema from './visualAdPlacement.js';
import socialMediaLinkSchema from './socialMediaLink.js';


export default {
    category: categorySchema,
    user: userSchema,
    rssFeed: rssFeedSchema,
    staticPage: staticPageSchema,
    article: articleSchema,
    comment: commentSchema,
    youtubeContent: youtubeContentSchema,
    contactUs: contactUsSchema,
    sponsorAccount: sponsorAccountSchema,
    externalLink: externalLinkSchema,
    subscription: subscriptionSchema,
    cookie: cookieSchema,
    visualAdPlacement: visualAdPlacementSchema,
    socialMediaLink: socialMediaLinkSchema
};
