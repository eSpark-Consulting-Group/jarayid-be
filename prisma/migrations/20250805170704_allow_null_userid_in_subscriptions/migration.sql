-- DropForeignKey
ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_userId_fkey";

-- DropIndex
DROP INDEX "subscriptions_userId_key";

-- AlterTable
ALTER TABLE "subscriptions" ALTER COLUMN "userId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
