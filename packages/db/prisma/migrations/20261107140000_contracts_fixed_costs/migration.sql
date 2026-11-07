CREATE TYPE "ContractStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ENDED');

CREATE TABLE "contract" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "service" TEXT,
    "monthlyAmount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "dueDay" INTEGER NOT NULL,
    "startsOn" TIMESTAMP(3) NOT NULL,
    "endsOn" TIMESTAMP(3),
    "status" "ContractStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "contract_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "contractPayout" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "payee" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "contractPayout_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "fixedCost" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "category" TEXT,
    "dueDay" INTEGER NOT NULL,
    "startsOn" TIMESTAMP(3) NOT NULL,
    "endsOn" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "fixedCost_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "financeEntry" ADD COLUMN "contractId" TEXT;
ALTER TABLE "financeEntry" ADD COLUMN "payoutId" TEXT;
ALTER TABLE "financeEntry" ADD COLUMN "fixedCostId" TEXT;
ALTER TABLE "financeEntry" ADD COLUMN "period" TEXT;

CREATE INDEX "contract_companyId_idx" ON "contract"("companyId");
CREATE INDEX "contract_status_idx" ON "contract"("status");
CREATE INDEX "contractPayout_contractId_idx" ON "contractPayout"("contractId");
CREATE INDEX "fixedCost_active_idx" ON "fixedCost"("active");
CREATE UNIQUE INDEX "financeEntry_contractId_period_key" ON "financeEntry"("contractId", "period");
CREATE UNIQUE INDEX "financeEntry_payoutId_period_key" ON "financeEntry"("payoutId", "period");
CREATE UNIQUE INDEX "financeEntry_fixedCostId_period_key" ON "financeEntry"("fixedCostId", "period");

ALTER TABLE "contract" ADD CONSTRAINT "contract_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contractPayout" ADD CONSTRAINT "contractPayout_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "financeEntry" ADD CONSTRAINT "financeEntry_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "financeEntry" ADD CONSTRAINT "financeEntry_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "contractPayout"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "financeEntry" ADD CONSTRAINT "financeEntry_fixedCostId_fkey" FOREIGN KEY ("fixedCostId") REFERENCES "fixedCost"("id") ON DELETE SET NULL ON UPDATE CASCADE;
