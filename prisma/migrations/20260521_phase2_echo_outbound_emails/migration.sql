-- Phase 2: ECHO Agent — Outbound Emails
-- Adds outbound_emails and email_templates tables for attorney-approved email outreach

CREATE TABLE "outbound_emails" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "recipientContactId" TEXT,
    "recipientEmail" TEXT NOT NULL,
    "recipientName" TEXT,
    "ccEmails" TEXT,
    "bccEmails" TEXT,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "attachmentIds" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "sentBy" TEXT,
    "messageId" TEXT,
    "errorMessage" TEXT,
    "triggeredBy" TEXT,
    "scheduledFor" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outbound_emails_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "email_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "outbound_emails_clientId_idx" ON "outbound_emails"("clientId");
CREATE INDEX "outbound_emails_status_idx" ON "outbound_emails"("status");

ALTER TABLE "outbound_emails" ADD CONSTRAINT "outbound_emails_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
