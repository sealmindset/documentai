-- Rename tables
ALTER TABLE "vendors" RENAME TO "clients";
ALTER TABLE "risk_profiles" RENAME TO "client_profiles";
ALTER TABLE "risk_assessments" RENAME TO "case_reviews";
ALTER TABLE "risk_findings" RENAME TO "issues";
ALTER TABLE "remediation_actions" RENAME TO "action_items";

-- Rename columns in client_profiles (formerly risk_profiles)
ALTER TABLE "client_profiles" RENAME COLUMN "vendorId" TO "clientId";
ALTER TABLE "client_profiles" RENAME COLUMN "riskTier" TO "priorityTier";
ALTER TABLE "client_profiles" RENAME COLUMN "overallRiskScore" TO "overallReviewScore";

-- Rename columns in case_reviews (formerly risk_assessments)
ALTER TABLE "case_reviews" RENAME COLUMN "vendorId" TO "clientId";
ALTER TABLE "case_reviews" RENAME COLUMN "riskProfileId" TO "clientProfileId";
ALTER TABLE "case_reviews" RENAME COLUMN "securityRiskScore" TO "securityScore";
ALTER TABLE "case_reviews" RENAME COLUMN "operationalRiskScore" TO "operationalScore";
ALTER TABLE "case_reviews" RENAME COLUMN "complianceRiskScore" TO "complianceScore";
ALTER TABLE "case_reviews" RENAME COLUMN "financialRiskScore" TO "financialScore";
ALTER TABLE "case_reviews" RENAME COLUMN "reputationalRiskScore" TO "reputationalScore";
ALTER TABLE "case_reviews" RENAME COLUMN "strategicRiskScore" TO "strategicScore";
ALTER TABLE "case_reviews" RENAME COLUMN "overallAssessmentScore" TO "overallReviewScore";
ALTER TABLE "case_reviews" RENAME COLUMN "riskRating" TO "reviewRating";

-- Rename columns in documents
ALTER TABLE "documents" RENAME COLUMN "vendorId" TO "clientId";

-- Rename columns in issues (formerly risk_findings)
ALTER TABLE "issues" RENAME COLUMN "vendorId" TO "clientId";
ALTER TABLE "issues" RENAME COLUMN "assessmentId" TO "caseReviewId";
ALTER TABLE "issues" RENAME COLUMN "findingId" TO "issueCode";

-- Rename columns in reports
ALTER TABLE "reports" RENAME COLUMN "vendorId" TO "clientId";
ALTER TABLE "reports" RENAME COLUMN "assessmentId" TO "caseReviewId";

-- Rename columns in action_items (formerly remediation_actions)
ALTER TABLE "action_items" RENAME COLUMN "findingId" TO "issueId";
ALTER TABLE "action_items" RENAME COLUMN "vendorId" TO "clientId";

-- Rename columns in case_contacts
ALTER TABLE "case_contacts" RENAME COLUMN "vendorId" TO "clientId";

-- Update permission resource names
UPDATE "permissions" SET "resource" = 'clients' WHERE "resource" = 'vendors';
UPDATE "permissions" SET "resource" = 'issues' WHERE "resource" = 'findings';
UPDATE "permissions" SET "resource" = 'case-reviews' WHERE "resource" = 'assessments';

-- Update notification entity types
UPDATE "notifications" SET "relatedEntityType" = 'Issue' WHERE "relatedEntityType" = 'RiskFinding';
UPDATE "notifications" SET "relatedEntityType" = 'Client' WHERE "relatedEntityType" = 'Vendor';
