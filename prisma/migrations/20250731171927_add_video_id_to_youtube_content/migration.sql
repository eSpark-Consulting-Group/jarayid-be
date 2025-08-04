/*
  Warnings:

  - You are about to drop the column `positionName` on the `VisualAdPlacement` table. All the data in the column will be lost.
  - Added the required column `platform` to the `VisualAdPlacement` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "VisualAdPlacement" DROP COLUMN "positionName",
ADD COLUMN     "articlePage" TEXT,
ADD COLUMN     "category" TEXT[],
ADD COLUMN     "mainPage" TEXT,
ADD COLUMN     "platform" "Platform" NOT NULL;

-- AlterTable
ALTER TABLE "youtube_contents" ADD COLUMN     "videoId" VARCHAR(20);
