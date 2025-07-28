-- AlterTable
ALTER TABLE "articles" ADD COLUMN     "rssFeedId" TEXT;

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_rssFeedId_fkey" FOREIGN KEY ("rssFeedId") REFERENCES "rss_feeds"("id") ON DELETE SET NULL ON UPDATE CASCADE;
