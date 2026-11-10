ALTER TABLE "User"
ADD COLUMN "adultConfirmedAt" TIMESTAMP(3);

ALTER TABLE "Campaign"
DROP CONSTRAINT "Campaign_radius_km_check";

ALTER TABLE "Campaign"
ALTER COLUMN "radiusKm" TYPE DOUBLE PRECISION USING "radiusKm"::DOUBLE PRECISION,
ADD COLUMN "durationHours" INTEGER NOT NULL DEFAULT 24,
ADD COLUMN "estimatedPriceAoa" INTEGER NOT NULL DEFAULT 0;

UPDATE "Campaign"
SET "estimatedPriceAoa" = CASE
  WHEN "radiusKm" <= 0.25 THEN 2500
  WHEN "radiusKm" <= 0.5 THEN 5000
  WHEN "radiusKm" <= 1 THEN 10000
  WHEN "radiusKm" <= 4 THEN 25000
  ELSE 60000
END;

ALTER TABLE "Campaign"
ADD CONSTRAINT "Campaign_radius_km_check"
CHECK ("radiusKm" >= 0.1 AND "radiusKm" <= 10 AND "radiusKm" * 10 = FLOOR("radiusKm" * 10)),
ADD CONSTRAINT "Campaign_duration_hours_check"
CHECK ("durationHours" BETWEEN 6 AND 720),
ADD CONSTRAINT "Campaign_estimated_price_check"
CHECK ("estimatedPriceAoa" >= 0);
