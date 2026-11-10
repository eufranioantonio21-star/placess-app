-- One review per consumer and Spot. The migration intentionally fails if
-- historical duplicates exist so they can be audited instead of deleted.
CREATE UNIQUE INDEX "Review_userId_placeId_key"
ON "Review"("userId", "placeId");

-- Defence in depth: the API validates this range and PostgreSQL enforces it.
ALTER TABLE "Review"
ADD CONSTRAINT "Review_rating_range_check"
CHECK ("rating" BETWEEN 1 AND 5);
