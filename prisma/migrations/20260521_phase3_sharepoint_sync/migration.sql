-- Phase 3: SharePoint document sync

CREATE TABLE "sharepoint_syncs" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "siteName" TEXT NOT NULL,
    "driveId" TEXT NOT NULL,
    "driveName" TEXT NOT NULL,
    "folderPath" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "lastSyncStatus" TEXT,
    "lastSyncError" TEXT,
    "lastSyncFileCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sharepoint_syncs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sharepoint_files" (
    "id" TEXT NOT NULL,
    "syncConfigId" TEXT NOT NULL,
    "sharepointItemId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "webUrl" TEXT,
    "lastModifiedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "documentId" TEXT,
    "processedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sharepoint_files_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sharepoint_files_syncConfigId_sharepointItemId_key"
    ON "sharepoint_files"("syncConfigId", "sharepointItemId");

CREATE INDEX "sharepoint_files_syncConfigId_idx" ON "sharepoint_files"("syncConfigId");
CREATE INDEX "sharepoint_files_status_idx" ON "sharepoint_files"("status");

ALTER TABLE "sharepoint_files"
    ADD CONSTRAINT "sharepoint_files_syncConfigId_fkey"
    FOREIGN KEY ("syncConfigId") REFERENCES "sharepoint_syncs"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
