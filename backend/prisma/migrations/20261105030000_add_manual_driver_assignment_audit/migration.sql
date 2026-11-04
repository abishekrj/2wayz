ALTER TABLE "Booking"
  ADD COLUMN "assignedByAdminId" TEXT,
  ADD COLUMN "manuallyAssignedAt" TIMESTAMP(3);
