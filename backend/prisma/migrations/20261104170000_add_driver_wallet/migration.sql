CREATE TABLE "DriverWallet" (
  "id" TEXT NOT NULL,
  "driverId" TEXT NOT NULL,
  "balance" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DriverWallet_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "WalletSettings" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "commissionMode" TEXT NOT NULL DEFAULT 'PERCENTAGE',
  "commissionValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "minimumBalance" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT false,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WalletSettings_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "WalletRecharge" (
  "id" TEXT NOT NULL,
  "driverId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "paymentReference" TEXT NOT NULL,
  "proofUrl" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "reviewedAt" TIMESTAMP(3),
  "reviewedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WalletRecharge_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "WalletTransaction" (
  "id" TEXT NOT NULL,
  "walletId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "settledAmount" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'POSTED',
  "description" TEXT NOT NULL,
  "bookingId" TEXT,
  "rechargeId" TEXT,
  "balanceAfter" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DriverWallet_driverId_key" ON "DriverWallet"("driverId");
CREATE UNIQUE INDEX "WalletTransaction_bookingId_key" ON "WalletTransaction"("bookingId");
CREATE UNIQUE INDEX "WalletTransaction_rechargeId_key" ON "WalletTransaction"("rechargeId");
CREATE INDEX "WalletRecharge_driverId_status_createdAt_idx" ON "WalletRecharge"("driverId", "status", "createdAt");
CREATE INDEX "WalletRecharge_status_createdAt_idx" ON "WalletRecharge"("status", "createdAt");
CREATE INDEX "WalletTransaction_walletId_createdAt_idx" ON "WalletTransaction"("walletId", "createdAt");
CREATE INDEX "WalletTransaction_type_status_idx" ON "WalletTransaction"("type", "status");
ALTER TABLE "DriverWallet" ADD CONSTRAINT "DriverWallet_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WalletRecharge" ADD CONSTRAINT "WalletRecharge_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "DriverWallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_rechargeId_fkey" FOREIGN KEY ("rechargeId") REFERENCES "WalletRecharge"("id") ON DELETE SET NULL ON UPDATE CASCADE;
