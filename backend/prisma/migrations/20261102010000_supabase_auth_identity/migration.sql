-- Preserve legacy password hashes while moving active authentication to Supabase Auth.
ALTER TABLE "User" ALTER COLUMN "password" DROP NOT NULL;
ALTER TABLE "User" ADD COLUMN "authUserId" TEXT;

CREATE UNIQUE INDEX "User_authUserId_key" ON "User"("authUserId");

-- Application-level denylist makes SPOTS logout effective immediately, even though
-- a Supabase access token remains cryptographically valid until its exp claim.
CREATE TABLE "RevokedSession" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RevokedSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RevokedSession_expiresAt_idx" ON "RevokedSession"("expiresAt");
