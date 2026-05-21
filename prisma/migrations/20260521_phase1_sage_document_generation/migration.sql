-- Phase 1: SAGE Document Generation
-- Adds criminal defense case fields to clients, plus document template and generation tables

-- Add criminal defense fields to clients
ALTER TABLE "clients" ADD COLUMN "caseNumber" TEXT;
ALTER TABLE "clients" ADD COLUMN "caseType" TEXT;
ALTER TABLE "clients" ADD COLUMN "charges" TEXT;
ALTER TABLE "clients" ADD COLUMN "chargeStatutes" TEXT;
ALTER TABLE "clients" ADD COLUMN "arrestDate" TIMESTAMP(3);
ALTER TABLE "clients" ADD COLUMN "bondAmount" DECIMAL(65,30);
ALTER TABLE "clients" ADD COLUMN "bondType" TEXT;
ALTER TABLE "clients" ADD COLUMN "nextHearingDate" TIMESTAMP(3);
ALTER TABLE "clients" ADD COLUMN "nextHearingType" TEXT;
ALTER TABLE "clients" ADD COLUMN "trialDate" TIMESTAMP(3);
ALTER TABLE "clients" ADD COLUMN "disposition" TEXT;
ALTER TABLE "clients" ADD COLUMN "dispositionDate" TIMESTAMP(3);
ALTER TABLE "clients" ADD COLUMN "courtName" TEXT;
ALTER TABLE "clients" ADD COLUMN "courtAddress" TEXT;
ALTER TABLE "clients" ADD COLUMN "courtCounty" TEXT;
ALTER TABLE "clients" ADD COLUMN "courtDivision" TEXT;
ALTER TABLE "clients" ADD COLUMN "courtPhone" TEXT;

-- Create document templates table
CREATE TABLE "document_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subcategory" TEXT,
    "jurisdiction" TEXT,
    "courtType" TEXT,
    "content" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'DOCX',
    "requiredFields" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_templates_pkey" PRIMARY KEY ("id")
);

-- Create generated documents table
CREATE TABLE "generated_documents" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "documentName" TEXT NOT NULL,
    "mergeData" TEXT NOT NULL,
    "content" TEXT,
    "filePath" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "generatedBy" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "sentTo" TEXT,
    "sentAt" TIMESTAMP(3),
    "filedAt" TIMESTAMP(3),
    "courtCaseNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "generated_documents_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "document_templates_category_idx" ON "document_templates"("category");
CREATE INDEX "generated_documents_clientId_idx" ON "generated_documents"("clientId");
CREATE INDEX "generated_documents_status_idx" ON "generated_documents"("status");

-- Foreign keys
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_templateId_fkey"
    FOREIGN KEY ("templateId") REFERENCES "document_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add template-related permissions
INSERT INTO "permissions" ("id", "resource", "action", "description")
SELECT gen_random_uuid()::text, 'templates', action, 'Document template ' || action
FROM unnest(ARRAY['view', 'create', 'edit', 'delete']) AS action
WHERE NOT EXISTS (SELECT 1 FROM "permissions" WHERE "resource" = 'templates' AND "permissions"."action" = action);

INSERT INTO "permissions" ("id", "resource", "action", "description")
SELECT gen_random_uuid()::text, 'generated-documents', action, 'Generated document ' || action
FROM unnest(ARRAY['view', 'create', 'edit', 'delete']) AS action
WHERE NOT EXISTS (SELECT 1 FROM "permissions" WHERE "resource" = 'generated-documents' AND "permissions"."action" = action);

-- Grant template permissions to ADMIN and ANALYST roles
INSERT INTO "role_permissions" ("roleId", "permissionId")
SELECT r.id, p.id FROM "roles" r, "permissions" p
WHERE r.name IN ('ADMIN', 'ANALYST') AND p.resource IN ('templates', 'generated-documents')
ON CONFLICT DO NOTHING;
