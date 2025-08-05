-- CreateEnum
CREATE TYPE "SocialMediaType" AS ENUM ('FACEBOOK', 'TWITTER', 'INSTAGRAM', 'LINKEDIN', 'YOUTUBE', 'TIKTOK', 'SNAPCHAT', 'PINTEREST', 'WHATSAPP', 'TELEGRAM', 'DISCORD', 'REDDIT', 'GITHUB', 'WEBSITE', 'OTHER');

-- CreateTable
CREATE TABLE "social_media_links" (
    "id" TEXT NOT NULL,
    "categoryName" VARCHAR(100) NOT NULL,
    "link" VARCHAR(500) NOT NULL,
    "socialMedia" "SocialMediaType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_media_links_pkey" PRIMARY KEY ("id")
);
