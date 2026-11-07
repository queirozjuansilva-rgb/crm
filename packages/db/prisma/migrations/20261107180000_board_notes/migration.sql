CREATE TYPE "NoteBoard" AS ENUM ('CLIENTS', 'FINANCE');

CREATE TABLE "boardNote" (
    "id" TEXT NOT NULL,
    "board" "NoteBoard" NOT NULL,
    "period" TEXT,
    "body" TEXT NOT NULL,
    "companyId" TEXT,
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "boardNote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "boardNote_board_period_createdAt_idx" ON "boardNote"("board", "period", "createdAt");

ALTER TABLE "boardNote" ADD CONSTRAINT "boardNote_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "boardNote" ADD CONSTRAINT "boardNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
