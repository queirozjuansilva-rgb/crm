CREATE TYPE "FinanceKind" AS ENUM ('INCOME', 'EXPENSE');

CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE', 'PAUSED', 'DONE');

CREATE TYPE "ProjectTaskStatus" AS ENUM ('TODO', 'DOING', 'DONE');

CREATE TABLE "financeEntry" (
    "id" TEXT NOT NULL,
    "kind" "FinanceKind" NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "category" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "companyId" TEXT,
    "dealId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financeEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "companyId" TEXT NOT NULL,
    "dealId" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "projectTask" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "ProjectTaskStatus" NOT NULL DEFAULT 'TODO',
    "position" INTEGER NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "assigneeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projectTask_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "financeEntry_dueDate_idx" ON "financeEntry"("dueDate");

CREATE INDEX "financeEntry_kind_dueDate_idx" ON "financeEntry"("kind", "dueDate");

CREATE INDEX "financeEntry_companyId_idx" ON "financeEntry"("companyId");

CREATE INDEX "project_companyId_idx" ON "project"("companyId");

CREATE INDEX "project_status_idx" ON "project"("status");

CREATE INDEX "projectTask_projectId_status_position_idx" ON "projectTask"("projectId", "status", "position");

CREATE INDEX "projectTask_dueDate_idx" ON "projectTask"("dueDate");

ALTER TABLE "financeEntry" ADD CONSTRAINT "financeEntry_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "financeEntry" ADD CONSTRAINT "financeEntry_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "financeEntry" ADD CONSTRAINT "financeEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "project" ADD CONSTRAINT "project_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "project" ADD CONSTRAINT "project_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "project" ADD CONSTRAINT "project_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "projectTask" ADD CONSTRAINT "projectTask_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "projectTask" ADD CONSTRAINT "projectTask_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
