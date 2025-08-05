# Quick Setup Guide - RSS Queue System

## 🚀 Get Started in 5 Minutes

### Step 1: Configure Redis
Add to your `.env` file:
```env
REDIS_HOST=ec2-54-161-117-68.compute-1.amazonaws.com
REDIS_PORT=5579
REDIS_PASSWORD=vS61c4ETiHssMQ2kYV
```

### Step 2: Start Your Server
```bash
npm start
```
*The RSS Queue Service starts automatically!*

### Step 3: Test the System
```bash
node scripts/testRSSQueue.js
```

### Step 4: Verify Everything Works
Check server logs for:
```
✅ RSS Queue Service initialized successfully
✅ Scheduled RSS processing started (every 6 hours)
✅ Redis connection established
```

## 🎯 Quick API Test

### Queue RSS Processing (Admin only)
```bash
curl -X POST http://localhost:3000/api/rss-feeds/queue-process/all \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Check Queue Status
```bash
curl -X GET http://localhost:3000/api/rss-feeds/queue/status \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## ✅ What's Now Automated

- ✅ RSS feeds process every 6 hours automatically
- ✅ Background processing (non-blocking)
- ✅ Duplicate detection and handling
- ✅ Image processing and storage
- ✅ Error handling with retries
- ✅ Job monitoring and management
- ✅ Queue pause/resume capabilities

## 🎉 You're Done!

Your RSS processing is now fully automated with enterprise-grade background job processing using Bull + Redis queues!

Need help? Check `docs/BULL_REDIS_SYSTEM.md` for detailed documentation.
