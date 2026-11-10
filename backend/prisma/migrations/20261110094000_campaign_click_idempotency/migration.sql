CREATE TABLE "CampaignClick" (
    "id" SERIAL NOT NULL,
    "campaignId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CampaignClick_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CampaignClick_campaignId_userId_key"
ON "CampaignClick"("campaignId", "userId");

CREATE INDEX "CampaignClick_userId_createdAt_idx"
ON "CampaignClick"("userId", "createdAt");

ALTER TABLE "CampaignClick"
ADD CONSTRAINT "CampaignClick_campaignId_fkey"
FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CampaignClick"
ADD CONSTRAINT "CampaignClick_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- This table is written only by the authoritative Express API.
ALTER TABLE "CampaignClick" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "CampaignClick" FROM anon, authenticated;
REVOKE ALL ON SEQUENCE "CampaignClick_id_seq" FROM anon, authenticated;
