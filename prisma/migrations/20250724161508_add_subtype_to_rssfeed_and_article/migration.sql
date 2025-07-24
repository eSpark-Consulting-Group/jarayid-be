/*
  Warnings:

  - You are about to drop the column `subType` on the `categories` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "articles" ADD COLUMN     "subType" "CategorySubType";

-- AlterTable
ALTER TABLE "categories" DROP COLUMN "subType";

-- AlterTable
ALTER TABLE "rss_feeds" ADD COLUMN     "subType" "CategorySubType";
