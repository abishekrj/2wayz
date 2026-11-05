ALTER TABLE "Booking"
  ADD COLUMN "fareBaseAmount" INTEGER,
  ADD COLUMN "fareIncludedDistanceKm" DOUBLE PRECISION,
  ADD COLUMN "farePerKmRate" DOUBLE PRECISION,
  ADD COLUMN "fareMinimumAmount" INTEGER,
  ADD COLUMN "fareRoundingIncrement" INTEGER;

CREATE TABLE "FareSettings" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "baseFare" INTEGER NOT NULL DEFAULT 30,
  "includedDistanceKm" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "perKmRate" DOUBLE PRECISION NOT NULL DEFAULT 18,
  "minimumFare" INTEGER NOT NULL DEFAULT 50,
  "roundingIncrement" INTEGER NOT NULL DEFAULT 5,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FareSettings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "FareSettings" ("id", "baseFare", "includedDistanceKm", "perKmRate", "minimumFare", "roundingIncrement", "isActive", "updatedAt", "createdAt")
VALUES ('default', 30, 1, 18, 50, 5, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
