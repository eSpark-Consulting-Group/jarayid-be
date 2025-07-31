-- CreateTable
CREATE TABLE "Bug" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bug_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BugEvent" (
    "id" TEXT NOT NULL,
    "bugId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BugEvent_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "BugEvent" ADD CONSTRAINT "BugEvent_bugId_fkey" FOREIGN KEY ("bugId") REFERENCES "Bug"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
