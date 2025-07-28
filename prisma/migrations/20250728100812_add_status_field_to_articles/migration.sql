/*
  Warnings:

  - You are about to drop the column `rssFeedId` on the `articles` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "articles" DROP CONSTRAINT "articles_rssFeedId_fkey";

-- AlterTable
ALTER TABLE "articles" DROP COLUMN "rssFeedId",
ADD COLUMN     "status" BOOLEAN NOT NULL DEFAULT true;
