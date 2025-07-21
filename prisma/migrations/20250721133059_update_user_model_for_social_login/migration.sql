/*
  Warnings:

  - You are about to alter the column `name` on the `users` table. The data in that column could be lost. The data in that column will be cast from `JsonB` to `VarChar(500)`.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "socialId" VARCHAR(500),
ALTER COLUMN "name" DROP NOT NULL,
ALTER COLUMN "name" SET DATA TYPE VARCHAR(500),
ALTER COLUMN "password" DROP NOT NULL;
