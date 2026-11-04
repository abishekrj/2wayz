CREATE TABLE "BookingAdjustment" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "driverId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BookingAdjustment_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "WalletTransaction" ADD COLUMN "adjustmentId" TEXT;
CREATE UNIQUE INDEX "WalletTransaction_adjustmentId_key" ON "WalletTransaction"("adjustmentId");
CREATE INDEX "BookingAdjustment_bookingId_createdAt_idx" ON "BookingAdjustment"("bookingId", "createdAt");
CREATE INDEX "BookingAdjustment_driverId_createdAt_idx" ON "BookingAdjustment"("driverId", "createdAt");

ALTER TABLE "BookingAdjustment" ADD CONSTRAINT "BookingAdjustment_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BookingAdjustment" ADD CONSTRAINT "BookingAdjustment_driverId_fkey"
  FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_adjustmentId_fkey"
  FOREIGN KEY ("adjustmentId") REFERENCES "BookingAdjustment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
