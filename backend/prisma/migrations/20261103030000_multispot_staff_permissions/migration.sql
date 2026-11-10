CREATE TABLE "PlaceMembership" (
  "id" SERIAL NOT NULL,
  "placeId" INTEGER NOT NULL,
  "userId" INTEGER NOT NULL,
  "canManageOrders" BOOLEAN NOT NULL DEFAULT false,
  "canManageCampaigns" BOOLEAN NOT NULL DEFAULT false,
  "canManageMenu" BOOLEAN NOT NULL DEFAULT false,
  "canViewMetrics" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlaceMembership_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BusinessAuditEvent" (
  "id" SERIAL NOT NULL,
  "actorUserId" INTEGER NOT NULL,
  "placeId" INTEGER NOT NULL,
  "targetUserId" INTEGER,
  "action" TEXT NOT NULL,
  "detailsJson" TEXT NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BusinessAuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlaceMembership_placeId_userId_key" ON "PlaceMembership"("placeId", "userId");
CREATE INDEX "PlaceMembership_userId_idx" ON "PlaceMembership"("userId");
CREATE INDEX "BusinessAuditEvent_placeId_createdAt_idx" ON "BusinessAuditEvent"("placeId", "createdAt");
CREATE INDEX "BusinessAuditEvent_actorUserId_createdAt_idx" ON "BusinessAuditEvent"("actorUserId", "createdAt");

ALTER TABLE "PlaceMembership" ADD CONSTRAINT "PlaceMembership_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlaceMembership" ADD CONSTRAINT "PlaceMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlaceMembership" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BusinessAuditEvent" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "PlaceMembership" FROM anon, authenticated;
REVOKE ALL ON TABLE "BusinessAuditEvent" FROM anon, authenticated;
