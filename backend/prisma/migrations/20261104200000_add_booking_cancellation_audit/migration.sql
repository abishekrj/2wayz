ALTER TABLE "Booking"
  ADD COLUMN "cancelledAt" TIMESTAMP(3),
  ADD COLUMN "cancelledBy" TEXT,
  ADD COLUMN "cancellationReason" TEXT;

CREATE INDEX "Booking_status_cancelledAt_idx" ON "Booking"("status", "cancelledAt");
