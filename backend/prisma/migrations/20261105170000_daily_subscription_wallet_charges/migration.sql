ALTER TABLE "DriverSubscription"
  ADD COLUMN "durationDays" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "isDailyPlan" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "WalletTransaction"
  ADD COLUMN "subscriptionId" TEXT,
  ADD COLUMN "subscriptionDate" TEXT;

ALTER TABLE "WalletTransaction"
  ADD CONSTRAINT "WalletTransaction_subscriptionId_fkey"
  FOREIGN KEY ("subscriptionId") REFERENCES "DriverSubscription"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "WalletTransaction_subscriptionId_subscriptionDate_key"
  ON "WalletTransaction"("subscriptionId", "subscriptionDate");

CREATE INDEX "DriverSubscription_driverId_status_isDailyPlan_startsAt_idx"
  ON "DriverSubscription"("driverId", "status", "isDailyPlan", "startsAt");