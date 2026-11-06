ALTER TABLE "calendarEvent" ADD COLUMN "dealId" TEXT;
ALTER TABLE "calendarEvent" ADD COLUMN "dealStage" "DealStage";

CREATE INDEX "calendarEvent_dealId_startsAt_idx" ON "calendarEvent"("dealId", "startsAt");

ALTER TABLE "calendarEvent" ADD CONSTRAINT "calendarEvent_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
