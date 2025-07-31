/*
  Warnings:

  - You are about to drop the column `category` on the `cookies` table. All the data in the column will be lost.
  - You are about to drop the column `isEssential` on the `cookies` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "cookies" DROP COLUMN "category",
DROP COLUMN "isEssential";

-- DropEnum
DROP TYPE "CookieCategory";
