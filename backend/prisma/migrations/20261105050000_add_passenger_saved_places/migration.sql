CREATE TABLE "PassengerSavedPlace" (
  "id" TEXT NOT NULL,
  "passengerId" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "placeId" TEXT,
  "name" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "latitude" DOUBLE PRECISION NOT NULL,
  "longitude" DOUBLE PRECISION NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PassengerSavedPlace_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PassengerSavedPlace_passengerId_category_createdAt_idx" ON "PassengerSavedPlace"("passengerId", "category", "createdAt");
ALTER TABLE "PassengerSavedPlace" ADD CONSTRAINT "PassengerSavedPlace_passengerId_fkey" FOREIGN KEY ("passengerId") REFERENCES "PassengerUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;