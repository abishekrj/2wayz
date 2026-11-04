CREATE TABLE "DriverActivity" (
  "id" TEXT NOT NULL,
  "driverId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "bookingId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DriverActivity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DriverActivity_driverId_createdAt_idx" ON "DriverActivity"("driverId", "createdAt");
CREATE INDEX "DriverActivity_eventType_createdAt_idx" ON "DriverActivity"("eventType", "createdAt");

ALTER TABLE "DriverActivity"
ADD CONSTRAINT "DriverActivity_driverId_fkey"
FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;
