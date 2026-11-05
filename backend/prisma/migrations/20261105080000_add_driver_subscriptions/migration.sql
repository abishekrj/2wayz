CREATE TABLE "DriverSubscriptionPlan" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "durationDays" INTEGER NOT NULL,
  "price" INTEGER NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DriverSubscriptionPlan_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "DriverSubscriptionPayment" (
  "id" TEXT NOT NULL,
  "driverId" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "planName" TEXT NOT NULL,
  "durationDays" INTEGER NOT NULL,
  "amount" INTEGER NOT NULL,
  "paymentMethod" TEXT NOT NULL,
  "paymentReference" TEXT,
  "proofUrl" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "reviewNote" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "reviewedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DriverSubscriptionPayment_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "DriverSubscription" (
  "id" TEXT NOT NULL,
  "driverId" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "planName" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DriverSubscription_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DriverSubscription_paymentId_key" ON "DriverSubscription"("paymentId");
CREATE INDEX "DriverSubscriptionPlan_isActive_price_idx" ON "DriverSubscriptionPlan"("isActive","price");
CREATE INDEX "DriverSubscriptionPayment_driverId_status_createdAt_idx" ON "DriverSubscriptionPayment"("driverId","status","createdAt");
CREATE INDEX "DriverSubscriptionPayment_status_createdAt_idx" ON "DriverSubscriptionPayment"("status","createdAt");
CREATE INDEX "DriverSubscription_driverId_status_expiresAt_idx" ON "DriverSubscription"("driverId","status","expiresAt");
ALTER TABLE "DriverSubscriptionPayment" ADD CONSTRAINT "DriverSubscriptionPayment_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DriverSubscriptionPayment" ADD CONSTRAINT "DriverSubscriptionPayment_planId_fkey" FOREIGN KEY ("planId") REFERENCES "DriverSubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DriverSubscription" ADD CONSTRAINT "DriverSubscription_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DriverSubscription" ADD COLUMN "expiryNoticeSentAt" TIMESTAMP(3);
