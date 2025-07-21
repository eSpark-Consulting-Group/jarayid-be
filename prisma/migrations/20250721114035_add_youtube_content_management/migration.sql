-- CreateEnum
CREATE TYPE "YouTubeContentType" AS ENUM ('SHORTS', 'FULL_VIDEO');

-- CreateTable
CREATE TABLE "youtube_contents" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "youtubeUrl" VARCHAR(500) NOT NULL,
    "contentType" "YouTubeContentType" NOT NULL,
    "categoryId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "thumbnailUrl" VARCHAR(500),
    "deviceType" VARCHAR(50),
    "duration" VARCHAR(20),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "youtube_contents_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "youtube_contents" ADD CONSTRAINT "youtube_contents_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "youtube_contents" ADD CONSTRAINT "youtube_contents_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
