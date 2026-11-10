ALTER TABLE "Order" ADD COLUMN "clientRequestId" TEXT;
ALTER TABLE "Order" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE UNIQUE INDEX "Order_userId_clientRequestId_key" ON "Order"("userId", "clientRequestId");
