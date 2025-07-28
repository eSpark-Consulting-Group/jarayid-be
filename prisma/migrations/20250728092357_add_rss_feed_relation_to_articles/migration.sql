-- DropForeignKey
ALTER TABLE "contacts" DROP CONSTRAINT "contacts_userId_fkey";

-- AlterTable
ALTER TABLE "articles" ADD COLUMN     "rssFeedId" TEXT;

-- AlterTable
ALTER TABLE "contacts" ALTER COLUMN "userId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_rssFeedId_fkey" FOREIGN KEY ("rssFeedId") REFERENCES "rss_feeds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
