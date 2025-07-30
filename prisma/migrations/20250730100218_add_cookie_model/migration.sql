-- CreateEnum
CREATE TYPE "CookieCategory" AS ENUM ('ESSENTIAL', 'FUNCTIONAL', 'ANALYTICS', 'MARKETING', 'PREFERENCES');

-- CreateTable
CREATE TABLE "cookies" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "purpose" VARCHAR(500) NOT NULL,
    "duration" VARCHAR(50) NOT NULL,
    "category" "CookieCategory" NOT NULL DEFAULT 'FUNCTIONAL',
    "isEssential" BOOLEAN NOT NULL DEFAULT false,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cookies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cookies_name_key" ON "cookies"("name");
