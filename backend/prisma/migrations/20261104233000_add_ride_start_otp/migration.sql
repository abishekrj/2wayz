ALTER TABLE "Booking"
  ADD COLUMN "rideStartOtpHash" TEXT,
  ADD COLUMN "rideStartOtpEncrypted" TEXT,
  ADD COLUMN "rideStartOtpAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "rideStartOtpVerifiedAt" TIMESTAMP(3);
