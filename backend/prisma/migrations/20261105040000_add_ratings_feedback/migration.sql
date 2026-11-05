CREATE TABLE "Rating" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "passengerId" TEXT NOT NULL,
  "driverId" TEXT NOT NULL,
  "stars" INTEGER NOT NULL,
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "comment" TEXT,
  "isVisible" BOOLEAN NOT NULL DEFAULT true,
  "moderationNote" TEXT,
  "hiddenAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Rating_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Rating_bookingId_key" ON "Rating"("bookingId");
CREATE INDEX "Rating_driverId_isVisible_createdAt_idx" ON "Rating"("driverId", "isVisible", "createdAt");
CREATE INDEX "Rating_isVisible_createdAt_idx" ON "Rating"("isVisible", "createdAt");
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_passengerId_fkey" FOREIGN KEY ("passengerId") REFERENCES "PassengerUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;
