# RSS Feed Processing System

A comprehensive RSS feed integration system that automatically fetches, processes, and stores news articles from RSS feeds into your Jarayid application.

## 🚀 Features

- **Automatic RSS Processing**: Fetch and parse RSS feeds in JSON format
- **Article Extraction**: Extract titles, content, images, and metadata
- **Duplicate Prevention**: Automatically skip articles that already exist
- **Image Processing**: Download and upload images to Cloudinary
- **Content Cleaning**: Clean HTML tags and normalize text content
- **Auto-Categorization**: Articles inherit categories from their RSS feeds
- **Batch Processing**: Process multiple RSS feeds simultaneously
- **Error Handling**: Comprehensive error handling and logging
- **Statistics**: Detailed processing statistics and monitoring

## 📋 System Requirements

- Node.js 16+
- PostgreSQL database
- Cloudinary account for image storage
- RSS feeds in JSON format (JSON Feed v1.1 specification)

## 🛠️ Setup

### 1. Database Setup
The system uses your existing Article and RSS Feed models. Ensure your database is up to date:

```bash
npx prisma migrate dev
npx prisma db push
```

### 2. Environment Variables
Ensure your `.env` file includes Cloudinary configuration:

```env
CLOUD_NAME=your_cloudinary_name
CLOUD_API_KEY=your_cloudinary_api_key
CLOUD_SECRET=your_cloudinary_secret
CLOUD_FOLDER=jarayid
```

### 3. System User
The RSS processor automatically creates a system user for RSS articles:
- Email: `system@jarayid.com`
- Role: `ADMIN`
- Name: `System / النظام`

## 📖 Usage

### Via API Endpoints

#### Process Single RSS Feed
```http
POST /api/rss-feeds/{feedId}/process
Authorization: Bearer {admin_token}
```

#### Process All RSS Feeds
```http
POST /api/rss-feeds/process/all
Authorization: Bearer {admin_token}
```

#### Get Processing Statistics
```http
GET /api/rss-feeds/stats/processing
Authorization: Bearer {admin_token}
```

### Via Code

```javascript
import { rssProcessor } from '../services/index.js';

// Process single RSS feed
const result = await rssProcessor.processRSSFeed('rss-feed-id');

// Process all published RSS feeds
const batchResult = await rssProcessor.processAllRSSFeeds();
```

### Testing

Run the test script to verify functionality:

```bash
# Test RSS processing with your database
node scripts/testRSSProcessing.js

# Test RSS feed fetching only
node scripts/testRSSProcessing.js --fetch-test
```

## 🔄 RSS Feed Format

The system supports RSS feeds in JSON Feed format. Example structure:

```json
{
  "version": "https://jsonfeed.org/version/1.1",
  "title": "News Feed Title",
  "home_page_url": "https://example.com",
  "feed_url": "https://example.com/feed.json",
  "description": "Feed description",
  "language": "en",
  "items": [
    {
      "id": "unique-article-id",
      "url": "https://example.com/article/123",
      "title": "Article Title",
      "content_text": "Article content in plain text",
      "content_html": "<p>Article content in HTML</p>",
      "image": "https://example.com/image.jpg",
      "date_published": "2025-07-15T10:00:00.000Z",
      "authors": [
        { "name": "Author Name" }
      ]
    }
  ]
}
```

## 📊 Processing Flow

1. **Feed Validation**: Check if RSS feed exists and is published
2. **Content Fetching**: Download RSS feed content from URL
3. **Article Processing**: For each article item:
   - Check for duplicates by URL
   - Extract and clean content
   - Download and upload images to Cloudinary
   - Generate English summary
   - Map to article schema
   - Save to database
4. **Statistics**: Compile processing results and statistics

## 🎯 Article Mapping

RSS feed data is mapped to your Article schema as follows:

| RSS Field | Article Field | Processing |
|-----------|---------------|------------|
| `title` | `title` | Cleaned and truncated to 500 chars |
| `url` | `url` | Direct mapping |
| `content_text/html` | `originalContent` | JSON object with metadata |
| `image` | `image/imageKey` | Downloaded and uploaded to Cloudinary |
| `date_published` | `publishedAt` | Parsed to DateTime |
| `authors` | `originalContent.authors` | Stored in metadata |
| Feed source | `source` | RSS feed title or name |
| Feed category | `categoryId` | Inherited from RSS feed |
| Auto-generated | `summaryEnglish` | First 300 characters |
| System user | `userId` | Auto-assigned system user |

## 🔧 Configuration

### Image Processing
- **Upload Path**: `articles/rss/`
- **Max Size**: Handled by Cloudinary
- **Formats**: Auto-converted by Cloudinary
- **Optimization**: Quality auto, format auto

### Content Processing
- **HTML Cleaning**: Removes all HTML tags and entities
- **Text Normalization**: Normalizes whitespace
- **Summary Generation**: First 300 characters with sentence completion
- **Duplicate Detection**: Based on article URL

### Error Handling
- **Network Timeouts**: 15 seconds for feed fetch, 10 seconds for images
- **Invalid Data**: Graceful handling with detailed logging
- **Partial Failures**: Continues processing other articles
- **Cloudinary Errors**: Non-blocking, logs warnings

## 📈 Monitoring

### Processing Statistics
- Total RSS feeds vs published feeds
- Articles created vs duplicates vs errors
- Recent RSS articles (last 24 hours)
- Feed-by-feed processing results

### Logging
- Feed processing start/completion
- Article creation success/failure
- Image upload success/failure
- Error details with context

## 🔮 Future Enhancements

### Planned Features
- **Bull Queue Integration**: Background job processing with Redis
- **Cron Scheduling**: Automatic periodic RSS processing
- **AI Summarization**: Advanced content summarization
- **Arabic Translation**: Auto-translate summaries to Arabic
- **Content Deduplication**: Advanced duplicate detection beyond URL
- **XML RSS Support**: Support traditional XML RSS feeds
- **Feed Health Monitoring**: Track feed availability and performance
- **Rate Limiting**: Respect RSS feed rate limits

### Bull Queue Integration (Next Step)
```javascript
// Coming next: Background job processing
import Queue from 'bull';

const rssQueue = new Queue('RSS Processing', redis_config);

rssQueue.process('process-feed', async (job) => {
  const { feedId } = job.data;
  return await rssProcessor.processRSSFeed(feedId);
});

// Schedule periodic processing
rssQueue.add('process-all-feeds', {}, {
  repeat: { cron: '0 */6 * * *' } // Every 6 hours
});
```

## 🐛 Troubleshooting

### Common Issues

1. **"No items found in RSS feed"**
   - Check RSS feed URL is accessible
   - Verify feed format is JSON Feed specification
   - Check feed status is PUBLISH

2. **"Failed to upload image"**
   - Verify Cloudinary configuration
   - Check image URL accessibility
   - Review network connectivity

3. **"System user not found"**
   - System user is auto-created on first run
   - Check database connectivity
   - Verify user table schema

4. **"Article creation failed"**
   - Check article schema validation
   - Verify required fields are present
   - Review database constraints

### Debug Mode
Enable detailed logging by setting environment variable:
```bash
NODE_ENV=development
```

## 📚 API Documentation

Full API documentation is available via Swagger UI at `/api-docs` when the server is running.

## 🤝 Contributing

When extending the RSS processing system:

1. Follow existing error handling patterns
2. Add comprehensive logging
3. Update tests and documentation
4. Consider performance implications
5. Maintain backward compatibility
