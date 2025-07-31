/*
  Warnings:

  - You are about to drop the column `pageType` on the `VisualAdPlacement` table. All the data in the column will be lost.
  - You are about to drop the column `platform` on the `VisualAdPlacement` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "VisualAdPlacement" DROP COLUMN "pageType",
DROP COLUMN "platform",
ALTER COLUMN "positionName" DROP NOT NULL;
