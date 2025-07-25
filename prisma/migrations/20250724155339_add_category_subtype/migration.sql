/*
  Warnings:

  - You are about to drop the column `email` on the `contacts` table. All the data in the column will be lost.
  - Added the required column `business_name` to the `contacts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `contact_email` to the `contacts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `contact_number` to the `contacts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `country` to the `contacts` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CategorySubType" AS ENUM ('SPORTS', 'ECONOMICS', 'POLITICS');

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "subType" "CategorySubType";

-- AlterTable
ALTER TABLE "contacts" DROP COLUMN "email",
ADD COLUMN     "business_name" VARCHAR(150) NOT NULL,
ADD COLUMN     "contact_email" VARCHAR(500) NOT NULL,
ADD COLUMN     "contact_number" VARCHAR(20) NOT NULL,
ADD COLUMN     "country" VARCHAR(100) NOT NULL;

-- CreateTable
CREATE TABLE "StaticPage" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaticPage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StaticPage_title_key" ON "StaticPage"("title");

-- CreateIndex
CREATE UNIQUE INDEX "StaticPage_slug_key" ON "StaticPage"("slug");
