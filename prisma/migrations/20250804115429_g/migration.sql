-- AlterTable
ALTER TABLE "StaticPage" ADD COLUMN     "customFields" JSONB,
ADD COLUMN     "translatedContent" JSONB;

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "customFields" JSONB,
ADD COLUMN     "translatedContent" JSONB;
