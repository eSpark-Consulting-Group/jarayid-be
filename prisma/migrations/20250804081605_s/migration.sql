-- CreateTable
CREATE TABLE "rss_summarization_settings" (
    "id" TEXT NOT NULL,
    "settings" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rss_summarization_settings_pkey" PRIMARY KEY ("id")
);
