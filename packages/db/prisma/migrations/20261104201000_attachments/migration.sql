CREATE TYPE "AttachmentKind" AS ENUM ('FILE', 'LINK');

CREATE TABLE "attachment" (
    "id" TEXT NOT NULL,
    "kind" "AttachmentKind" NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT,
    "storagePath" TEXT,
    "contentType" TEXT,
    "size" INTEGER,
    "dealId" TEXT,
    "companyId" TEXT,
    "contactId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "attachment_storagePath_key" ON "attachment"("storagePath");

CREATE INDEX "attachment_dealId_createdAt_idx" ON "attachment"("dealId", "createdAt");

CREATE INDEX "attachment_companyId_createdAt_idx" ON "attachment"("companyId", "createdAt");

CREATE INDEX "attachment_contactId_createdAt_idx" ON "attachment"("contactId", "createdAt");

ALTER TABLE "attachment" ADD CONSTRAINT "attachment_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "attachment" ADD CONSTRAINT "attachment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "attachment" ADD CONSTRAINT "attachment_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "attachment" ADD CONSTRAINT "attachment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "attachment" ADD CONSTRAINT "attachment_one_record" CHECK (num_nonnulls("dealId", "companyId", "contactId") = 1);
