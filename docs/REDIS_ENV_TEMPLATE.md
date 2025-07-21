# RSS Queue & Redis Configuration
REDIS_HOST=ec2-54-161-117-68.compute-1.amazonaws.com
REDIS_PORT=5579
REDIS_PASSWORD=vS61c4ETiHssMQ2kYV

# RSS Processing Configuration (Optional - will use defaults if not provided)
RSS_CONCURRENCY=3                    # Number of concurrent RSS processing jobs
RSS_BATCH_SIZE=5                     # Number of feeds to process in batch
RSS_CRON_SCHEDULE=0 */6 * * *        # Cron schedule for automatic processing (every 6 hours)
RSS_JOB_TIMEOUT=300000               # Job timeout in milliseconds (5 minutes)
RSS_RETRY_ATTEMPTS=3                 # Number of retry attempts for failed jobs
RSS_RETRY_DELAY=60000                # Delay between retries in milliseconds (1 minute)

# Add these settings to your existing .env file
