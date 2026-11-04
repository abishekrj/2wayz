ALTER TABLE "Booking"
ADD COLUMN "dispatchStatus" TEXT NOT NULL DEFAULT 'SCHEDULED',
ADD COLUMN "dispatchLastAttemptAt" TIMESTAMP(3),
ADD COLUMN "dispatchAttemptCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "dispatchAlertedAt" TIMESTAMP(3);

CREATE INDEX "Booking_mode_dispatchStatus_scheduledAt_idx"
ON "Booking"("mode", "dispatchStatus", "scheduledAt");
