CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "recipientRole" TEXT NOT NULL,
    "recipientId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "bookingId" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Notification_recipientRole_recipientId_readAt_createdAt_idx"
ON "Notification"("recipientRole", "recipientId", "readAt", "createdAt");

CREATE INDEX "Notification_type_createdAt_idx"
ON "Notification"("type", "createdAt");
