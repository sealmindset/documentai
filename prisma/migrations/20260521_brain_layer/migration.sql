-- Brain Layer: AI Memory System
CREATE TABLE "brain_memories" (
    "id" TEXT NOT NULL,
    "agentName" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "category" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "accessCount" INTEGER NOT NULL DEFAULT 0,
    "lastAccessedAt" TIMESTAMP(3),
    "source" TEXT,
    "createdBy" TEXT,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brain_memories_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "brain_memories_entityType_entityId_idx" ON "brain_memories"("entityType", "entityId");
CREATE INDEX "brain_memories_agentName_idx" ON "brain_memories"("agentName");
CREATE INDEX "brain_memories_category_idx" ON "brain_memories"("category");
CREATE INDEX "brain_memories_isApproved_isArchived_idx" ON "brain_memories"("isApproved", "isArchived");
