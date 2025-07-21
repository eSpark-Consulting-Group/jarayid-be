# RSS Processing with Bull + Redis Queue System

A production-ready background job processing system for automated RSS feed processing using Bull queues and Redis.

## 🚀 Features

- **Background Processing**: Non-blocking RSS feed processing
- **Scheduled Jobs**: Automatic RSS processing every 6 hours
- **Job Monitoring**: Real-time job status and progress tracking
- **Queue Management**: Pause, resume, and monitor queue operations
- **Error Handling**: Automatic retries with exponential backoff
- **Scalability**: Configurable concurrency and batch processing
- **Admin Dashboard**: Complete queue management via API endpoints

## 📋 System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Request   │───▶│   Bull Queue    │───▶│  RSS Processor  │
│                 │    │   (Redis)       │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │                         │
                              ▼                         ▼
                    ┌─────────────────┐    ┌─────────────────┐
                    │  Job Tracking   │    │   Articles      │
                    │   & Results     │    │   Database      │
                    └─────────────────┘    └─────────────────┘
```

## 🛠️ Setup & Configuration

### 1. Environment Variables

Add these settings to your `.env` file:

```env
# Redis Configuration
REDIS_HOST=ec2-54-162-117-48.compute-1.amazonaws.com
REDIS_PORT=5579
REDIS_PASSWORD=vIoc4ETiHMQ2kYV

# RSS Processing Configuration (Optional)
RSS_CONCURRENCY=3                    # Concurrent jobs
RSS_BATCH_SIZE=5                     # Feeds per batch
RSS_CRON_SCHEDULE=0 */6 * * *        # Every 6 hours
RSS_JOB_TIMEOUT=300000               # 5 minutes
RSS_RETRY_ATTEMPTS=3                 # Retry failed jobs
RSS_RETRY_DELAY=60000                # 1 minute delay
```

### 2. Dependencies

The system uses these packages (already installed):
- `bull` - Job queue system
- `redis` - Redis client
- `ioredis` - Advanced Redis client

### 3. Automatic Initialization

The RSS Queue Service initializes automatically when the server starts:

```javascript
// Automatically runs on server startup
await rssQueueService.initialize();
```

## 📋 Job Types

### 1. Single Feed Processing
Process one specific RSS feed:
```javascript
await rssQueueService.processSingleFeed(feedId, {
    source: 'manual',
    priority: 1
});
```

### 2. Batch Processing
Process all published RSS feeds:
```javascript
await rssQueueService.processAllFeeds({
    source: 'scheduled',
    priority: 0
});
```

### 3. Scheduled Processing
Automatic processing every 6 hours:
- Runs automatically in background
- Configurable via `RSS_CRON_SCHEDULE`
- High reliability with error handling

## 🔌 API Endpoints

### Queue Management

#### Queue Single RSS Feed
```http
POST /api/rss-feeds/{feedId}/queue-process
Authorization: Bearer {admin_token}
```

#### Queue All RSS Feeds
```http
POST /api/rss-feeds/queue-process/all
Authorization: Bearer {admin_token}
```

#### Get Queue Status
```http
GET /api/rss-feeds/queue/status
Authorization: Bearer {admin_token}
```

#### Get Job Status
```http
GET /api/rss-feeds/queue/jobs/{jobId}
Authorization: Bearer {admin_token}
```

#### List Jobs by Status
```http
GET /api/rss-feeds/queue/jobs?status=completed&limit=10
Authorization: Bearer {admin_token}
```

#### Pause/Resume Queue
```http
POST /api/rss-feeds/queue/pause
POST /api/rss-feeds/queue/resume
Authorization: Bearer {admin_token}
```

## 📊 Monitoring & Statistics

### Queue Statistics
```json
{
  "queueStats": {
    "waiting": 2,
    "active": 1,
    "completed": 15,
    "failed": 0,
    "delayed": 0,
    "total": 18
  },
  "healthStatus": {
    "status": "active",
    "redis": {
      "connected": true
    }
  }
}
```

### Job Details
```json
{
  "job": {
    "id": "123",
    "name": "process-single-feed",
    "status": "completed",
    "progress": 100,
    "createdAt": "2025-07-15T10:00:00Z",
    "finishedOn": "2025-07-15T10:02:30Z",
    "result": {
      "processed": 5,
      "duplicates": 2,
      "errors": 0
    }
  }
}
```

## 🔄 Processing Flow

### 1. Job Creation
```
API Request → Validate RSS Feed → Create Bull Job → Return Job ID
```

### 2. Background Processing
```
Job Picked Up → RSS Feed Fetch → Process Articles → Store Results → Job Complete
```

### 3. Error Handling
```
Job Fails → Retry (1, 2, 3) → Final Failure → Store Error Details
```

## ⚡ Performance Features

### Concurrency Control
- **Configurable Workers**: Process multiple feeds simultaneously
- **Resource Management**: Prevent system overload
- **Queue Throttling**: Control processing rate

### Batch Processing
- **Efficient Bulk Operations**: Process multiple feeds together
- **Resource Optimization**: Minimize database connections
- **Progress Tracking**: Monitor batch completion

### Memory Management
- **Job Cleanup**: Automatically remove old completed jobs
- **Result Storage**: Keep only essential job data
- **Redis Optimization**: Efficient memory usage

## 🧪 Testing

### Test Basic Queue Functionality
```bash
node scripts/testRSSQueue.js
```

### Test Scheduled Processing
```bash
node scripts/testRSSQueue.js --scheduled
```

### Test Queue Management
```bash
node scripts/testRSSQueue.js --management
```

## 🔧 Configuration Options

### Job Priorities
- **Manual Requests**: Priority 1-2 (higher)
- **Scheduled Jobs**: Priority 0 (normal)
- **Background Tasks**: Priority -1 (lower)

### Retry Strategy
- **Exponential Backoff**: Increasing delays between retries
- **Max Attempts**: Configurable retry limit
- **Dead Letter Queue**: Failed jobs stored for analysis

### Cleanup Policies
- **Completed Jobs**: Keep last 50
- **Failed Jobs**: Keep last 20
- **Job History**: 24-hour retention

## 📈 Monitoring Dashboard

The system provides comprehensive monitoring through API endpoints:

### Real-time Metrics
- Active job count
- Queue health status
- Processing throughput
- Error rates

### Historical Data
- Job completion history
- Processing statistics
- Performance trends
- Error analysis

## 🚨 Error Handling

### Automatic Recovery
- **Redis Disconnection**: Automatic reconnection
- **Job Failures**: Retry with backoff
- **System Overload**: Queue throttling

### Alerting & Logging
- **Comprehensive Logging**: All operations logged
- **Error Tracking**: Failed jobs tracked
- **Performance Monitoring**: Queue metrics logged

## 🎯 Production Deployment

### Redis Configuration
- **Memory Settings**: Adequate RAM allocation
- **Persistence**: RDB + AOF for reliability
- **Security**: Password authentication enabled

### Scaling Considerations
- **Multiple Workers**: Scale across multiple servers
- **Load Balancing**: Distribute queue processing
- **Monitoring**: Production monitoring setup

### Backup & Recovery
- **Queue State**: Persistent across restarts
- **Job Recovery**: Automatic job resumption
- **Data Integrity**: Reliable job processing

## 🔮 Advanced Features

### Custom Job Types
Add new job types by extending the processor:

```javascript
// Add custom job type
rssQueue.process('custom-task', async (job) => {
    const { customData } = job.data;
    // Custom processing logic
    return result;
});
```

### Job Scheduling
Schedule jobs for specific times:

```javascript
// Schedule for later
await rssQueue.add('process-feed', { feedId }, {
    delay: 60000, // 1 minute delay
    repeat: { cron: '0 9 * * *' } // Daily at 9 AM
});
```

### Job Prioritization
Control job execution order:

```javascript
// High priority job
await rssQueue.add('urgent-process', data, {
    priority: 10 // Higher numbers = higher priority
});
```

## 🎉 Benefits

### For Administrators
- **Automated Operations**: Set and forget RSS processing
- **Real-time Monitoring**: Complete visibility into processing
- **Error Management**: Automatic handling of failures
- **Performance Control**: Configurable processing rates

### For System Performance
- **Non-blocking Operations**: UI remains responsive
- **Resource Efficiency**: Optimal use of system resources
- **Scalability**: Handle growing number of RSS feeds
- **Reliability**: Robust error handling and recovery

### For Content Management
- **Continuous Updates**: Regular content refresh
- **Quality Control**: Duplicate detection and cleanup
- **Source Tracking**: Monitor RSS feed performance
- **Content Analytics**: Processing statistics and insights

This Bull + Redis system transforms your RSS processing from manual, blocking operations into a professional, automated background service that scales with your needs! 🚀
