ALTER TABLE "Campaign"
ADD COLUMN "isSynthetic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "radiusKm" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "Campaign"
ADD CONSTRAINT "Campaign_radius_km_check"
CHECK ("radiusKm" IN (1, 4, 10));
