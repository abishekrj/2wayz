ALTER TABLE "Driver"
  ADD COLUMN "drivingLicenceExpiryDate" TIMESTAMP(3),
  ADD COLUMN "vehicleInsuranceExpiryDate" TIMESTAMP(3),
  ADD COLUMN "fcExpiryDate" TIMESTAMP(3),
  ADD COLUMN "age" INTEGER,
  ADD COLUMN "profilePhotoUrl" TEXT,
  ADD COLUMN "complianceNoticeSentAt" TIMESTAMP(3);
