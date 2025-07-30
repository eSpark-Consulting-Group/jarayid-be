-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('WEB', 'APP');

-- CreateEnum
CREATE TYPE "PageType" AS ENUM ('MAIN_PAGE', 'ARTICLE_PAGE', 'CATEGORY');

-- CreateTable
CREATE TABLE "VisualAdPlacement" (
    "id" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "pageType" "PageType" NOT NULL,
    "positionName" TEXT NOT NULL,
    "adLink" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VisualAdPlacement_pkey" PRIMARY KEY ("id")
);
