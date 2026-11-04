CREATE TABLE "SOSAlert" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT,
  "triggeredByRole" TEXT NOT NULL,
  "triggeredById" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "locationAccuracy" DOUBLE PRECISION,
  "description" TEXT,
  "actionTaken" TEXT,
  "acknowledgedAt" TIMESTAMP(3),
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SOSAlert_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SOSAlert_status_createdAt_idx" ON "SOSAlert"("status", "createdAt");
CREATE INDEX "SOSAlert_bookingId_createdAt_idx" ON "SOSAlert"("bookingId", "createdAt");
CREATE INDEX "SOSAlert_triggeredByRole_triggeredById_createdAt_idx" ON "SOSAlert"("triggeredByRole", "triggeredById", "createdAt");
ALTER TABLE "SOSAlert" ADD CONSTRAINT "SOSAlert_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
