-- CreateTable
CREATE TABLE "TripShareLink" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TripShareLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TripShareLink_bookingId_key" ON "TripShareLink"("bookingId");
CREATE UNIQUE INDEX "TripShareLink_tokenHash_key" ON "TripShareLink"("tokenHash");
CREATE INDEX "TripShareLink_expiresAt_idx" ON "TripShareLink"("expiresAt");

-- AddForeignKey
ALTER TABLE "TripShareLink" ADD CONSTRAINT "TripShareLink_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
