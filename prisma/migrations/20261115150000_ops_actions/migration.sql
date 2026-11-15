-- CreateTable
CREATE TABLE "OpsAction" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "actorRef" TEXT NOT NULL,
    "affected" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpsAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OpsAction_idempotencyKey_key" ON "OpsAction"("idempotencyKey");

-- CreateIndex
CREATE INDEX "OpsAction_createdAt_idx" ON "OpsAction"("createdAt");
