ALTER TABLE "deal" ALTER COLUMN "stage" SET DEFAULT 'BUILDING_SNIPER';

UPDATE "activity"
SET "meta" = replace(
  replace(
    replace(
      replace("meta"::text, '"DEMO_BOOKED"', '"SCREENING_BOOKED"'),
      '"QUALIFIED_TO_BUY"', '"SCREENING_DONE"'
    ),
    '"DECISION_MAKER_BOUGHT_IN"', '"PROPOSAL_MEETING"'
  ),
  '"CONTRACT_SENT"', '"NEGOTIATION"'
)::jsonb
WHERE "meta" IS NOT NULL
  AND "meta"::text ~ '"(DEMO_BOOKED|QUALIFIED_TO_BUY|DECISION_MAKER_BOUGHT_IN|CONTRACT_SENT)"';

UPDATE "savedView"
SET "filters" = replace(
  replace(
    replace(
      replace("filters"::text, '"DEMO_BOOKED"', '"SCREENING_BOOKED"'),
      '"QUALIFIED_TO_BUY"', '"SCREENING_DONE"'
    ),
    '"DECISION_MAKER_BOUGHT_IN"', '"PROPOSAL_MEETING"'
  ),
  '"CONTRACT_SENT"', '"NEGOTIATION"'
)::jsonb
WHERE "filters"::text ~ '"(DEMO_BOOKED|QUALIFIED_TO_BUY|DECISION_MAKER_BOUGHT_IN|CONTRACT_SENT)"';
