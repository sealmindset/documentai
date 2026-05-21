# DocAI Architecture Roadmap — Criminal Defense Platform

## Current State (v4.0.0)

### Existing Agents

| Agent | Purpose | Status |
|-------|---------|--------|
| **LEXA** | Client profiling, priority tier calculation | Active |
| **CLARA** | Deep-dive case reviews, multi-dimensional scoring | Active |
| **DORA** | Document collection requests and tracking | Active |
| **ARIA** | Document analysis, issue identification | Active |
| **RITA** | Report generation, executive summaries | Active |
| **ATLAS** | Action item tracking, escalation management | Active |
| **AURA** | Document extraction, deduplication | Active |

Pipeline: LEXA → CLARA → DORA → ARIA → RITA → ATLAS

### Existing Data Model

- **Client** — case/matter record with contact info, status
- **ClientProfile** — priority tier, data sensitivity, review scores
- **CaseReview** — multi-dimensional case strength assessment
- **Document** — legal documents, evidence, analysis results
- **Issue** — AI-identified legal issues and findings
- **ActionItem** — court deadlines, remediation tasks
- **Report** — AI-generated case reports
- **Contact** — people (attorneys, judges, clerks) with phones/emails
- **CaseContact** — many-to-many linking contacts to cases with roles

### What Works Today

- Client onboarding with document upload and AI analysis
- Document extraction (PDF, DOCX, images via AURA)
- Automated issue identification from documents
- Report generation
- Contact management with case role assignments
- RBAC with 4 system roles
- Notification system
- Audit trail

---

## Phase 1: Document Generation (SAGE Agent)

**Priority: Highest — most immediate value to attorneys**

### New Agent: SAGE (Structured Assembly & Generation Engine)

Generates court-ready letters, pleadings, and correspondence from templates populated with case data.

### Capabilities

1. **Template-based document assembly** — merge client info, case contacts, court info, dates into document templates
2. **Multiple output formats** — PDF (court filings), DOCX (editable drafts), plain text (emails)
3. **Smart field resolution** — pull data from Client, Contact, CaseContact, Issue, and ActionItem records
4. **Template library** — firm-managed templates with version control
5. **Attorney review/approval workflow** — generated documents require attorney sign-off before sending

### Data Model Additions

```
model DocumentTemplate {
  id              String   @id @default(cuid())
  name            String                    // "Entry of Appearance"
  category        String                    // PLEADING, CORRESPONDENCE, MOTION, NOTICE, DISCOVERY
  subcategory     String?                   // "Initial Pleading", "Courtesy Letter"
  jurisdiction    String?                   // "IN" (Indiana), "Federal", etc.
  courtType       String?                   // CIRCUIT, SUPERIOR, FEDERAL_DISTRICT
  content         String                    // Template body with {{placeholders}}
  format          String   @default("DOCX") // DOCX, PDF, TXT
  requiredFields  String?                   // JSON array of required merge fields
  isActive        Boolean  @default(true)
  createdBy       String?
  version         Int      @default(1)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  generatedDocs   GeneratedDocument[]

  @@map("document_templates")
}

model GeneratedDocument {
  id              String    @id @default(cuid())
  templateId      String
  clientId        String
  documentName    String
  mergeData       String                      // JSON of resolved field values
  content         String?                     // Generated content
  filePath        String?                     // Path to rendered file
  status          String    @default("DRAFT") // DRAFT, PENDING_REVIEW, APPROVED, SENT, FILED
  generatedBy     String?                     // "SAGE"
  reviewedBy      String?                     // Attorney who approved
  reviewedAt      DateTime?
  sentTo          String?                     // Recipient contact ID
  sentAt          DateTime?
  filedAt         DateTime?
  courtCaseNumber String?
  createdAt       DateTime  @default(now())

  template        DocumentTemplate @relation(fields: [templateId], references: [id])

  @@map("generated_documents")
}
```

### Template Merge Fields

Templates use `{{field}}` placeholders resolved from the database:

| Category | Fields |
|----------|--------|
| **Client** | `{{client.name}}`, `{{client.legalName}}`, `{{client.caseNumber}}` |
| **Defendant** | `{{defendant.name}}`, `{{defendant.address}}`, `{{defendant.dob}}` |
| **Court** | `{{court.name}}`, `{{court.address}}`, `{{court.county}}`, `{{court.caseNumber}}` |
| **Judge** | `{{judge.name}}`, `{{judge.title}}` (from CaseContact where role=JUDGE) |
| **Prosecutor** | `{{prosecutor.name}}`, `{{prosecutor.email}}`, `{{prosecutor.phone}}` |
| **Attorney** | `{{attorney.name}}`, `{{attorney.barNumber}}`, `{{attorney.firm}}`, `{{attorney.address}}` |
| **Dates** | `{{today}}`, `{{filingDeadline}}`, `{{nextHearingDate}}` |
| **Case** | `{{charges}}`, `{{chargeStatutes}}`, `{{arrestDate}}`, `{{bondAmount}}` |

### SAGE Agent Design

```typescript
// New agent type
export interface DocumentGenerationInput {
  clientId: string
  templateId: string
  overrides?: Record<string, string>    // Manual field overrides
  outputFormat?: 'DOCX' | 'PDF' | 'TXT'
}

export interface DocumentGenerationOutput {
  documentName: string
  content: string
  resolvedFields: Record<string, string>
  unresolvedFields: string[]             // Fields that couldn't be auto-filled
  warnings: string[]                     // "No judge assigned to case", etc.
}
```

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/templates` | List document templates |
| POST | `/api/templates` | Create/update template |
| POST | `/api/generate` | Generate document from template |
| GET | `/api/generated-documents` | List generated documents |
| PUT | `/api/generated-documents/:id/approve` | Attorney approves document |
| POST | `/api/generated-documents/:id/send` | Send approved document |

### UI Pages

- `/templates` — template library with categories, preview, and editing
- `/generate` — document generation wizard: pick template → pick case → review fields → generate → preview → approve

### Implementation Steps

1. Schema migration for `DocumentTemplate` and `GeneratedDocument`
2. Build SAGE agent with template merge engine
3. Template CRUD API + admin page
4. Generation workflow API
5. Generation wizard UI with field preview
6. PDF rendering (via puppeteer or react-pdf)
7. Seed initial templates (Entry of Appearance, Courtesy Letter to Prosecutor, etc.)

### Estimated Effort: 2-3 weeks

---

## Phase 2: Outreach & Notifications (ECHO Agent)

**Priority: High — directly requested by managing partner**

### New Agent: ECHO (Email Communications & Handoff Orchestrator)

Sends courtesy emails to prosecutors and paralegals, manages outreach workflows with attorney approval.

### Capabilities

1. **Templated email composition** — populate prosecutor/paralegal contact info, case details
2. **Approval queue** — attorney reviews and approves outgoing emails before send
3. **Email delivery** — SMTP or SendGrid integration
4. **CC/BCC management** — automatically CC the assigned attorney
5. **Thread tracking** — log sent emails, link to case record
6. **Scheduled sends** — queue emails for specific times (e.g., after court filing)
7. **Attachment support** — attach generated documents (from SAGE) to emails

### Data Model Additions

```
model OutboundEmail {
  id                String    @id @default(cuid())
  clientId          String
  recipientContactId String?               // Links to CaseContact
  recipientEmail    String
  recipientName     String?
  ccEmails          String?                // JSON array
  subject           String
  body              String                 // HTML or plain text
  attachmentIds     String?                // JSON array of GeneratedDocument IDs
  status            String   @default("DRAFT")  // DRAFT, PENDING_APPROVAL, APPROVED, SENT, FAILED
  approvedBy        String?
  approvedAt        DateTime?
  sentAt            DateTime?
  sentBy            String?                // "ECHO"
  errorMessage      String?
  threadId          String?                // For tracking email threads
  triggeredBy       String?                // What event triggered this: "FILING", "MANUAL", "SAGE"
  createdAt         DateTime @default(now())

  @@map("outbound_emails")
}

model EmailTemplate {
  id          String   @id @default(cuid())
  name        String                       // "Prosecutor Courtesy Notice"
  subject     String                       // "Re: State v. {{client.name}} — {{court.caseNumber}}"
  body        String                       // Template with {{placeholders}}
  category    String                       // COURTESY, DISCOVERY_REQUEST, SCHEDULING, FOLLOW_UP
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("email_templates")
}
```

### Workflow: SAGE → ECHO Pipeline

```
Attorney triggers document generation
  → SAGE generates Entry of Appearance
  → Attorney approves document
  → ECHO auto-drafts courtesy email to prosecutor
  → Email queued with document attached
  → Attorney reviews & approves email
  → ECHO sends via configured SMTP/SendGrid
  → Email logged in OutboundEmail, linked to case
  → Notification created for audit trail
```

### Implementation Steps

1. Schema migration for `OutboundEmail` and `EmailTemplate`
2. Email service abstraction (SMTP + SendGrid adapters)
3. Build ECHO agent with template composition
4. Email approval queue API + UI
5. SAGE → ECHO pipeline integration in orchestrator
6. Email tracking and history UI on client detail page
7. Configuration page for SMTP/SendGrid credentials

### Estimated Effort: 2 weeks

---

## Phase 3: Evidence Management (VAULT System)

**Priority: High — "biggest issue for criminal defense attorneys"**

### New System: VAULT (Verified Archive & Unified Legal Tracking)

Not a single agent but a subsystem with multiple components for managing criminal case evidence.

### The Problem

Criminal defense evidence comes from many sources in many formats:
- Prosecution discovery (body cam, police reports, lab results)
- ZIP drives mailed or handed over
- Download portals (some with CAPTCHA, login, payment)
- Third-party agencies (some require forms, physical checks)
- Client-provided documents and communications

### Architecture

```
┌─────────────────────────────────────────────────┐
│                  VAULT System                    │
├──────────┬───────────┬──────────┬───────────────┤
│  Intake  │  Storage  │  Index   │  Access       │
│  Engine  │  Backend  │  Service │  Gateway      │
├──────────┼───────────┼──────────┼───────────────┤
│ ZIP      │ Local     │ Full-    │ Search UI     │
│ Extract  │ Disk      │ text     │ Preview       │
│          │     +     │ Search   │ Download      │
│ Upload   │ OneDrive  │          │ Share         │
│ Portal   │ /Share-   │ AI Tag   │ Chain of      │
│          │ Point     │ & Class  │ Custody       │
│ Manual   │           │          │               │
│ Entry    │           │ Timeline │               │
└──────────┴───────────┴──────────┴───────────────┘
```

### Data Model Additions

```
model EvidenceItem {
  id                String    @id @default(cuid())
  clientId          String
  title             String
  description       String?
  evidenceType      String                    // BODY_CAM, POLICE_REPORT, LAB_RESULT, WITNESS_STATEMENT,
                                              // SURVEILLANCE, PHONE_RECORDS, FINANCIAL_RECORDS,
                                              // PHOTOS, AUDIO, VIDEO, DOCUMENT, OTHER
  sourceAgency      String?                   // "Indianapolis Metro PD", "State Crime Lab"
  sourceType        String                    // PROSECUTION_DISCOVERY, CLIENT_PROVIDED, SUBPOENA,
                                              // PUBLIC_RECORD, THIRD_PARTY
  receivedDate      DateTime?
  evidenceDate      DateTime?                 // Date of the actual evidence event
  fileCount         Int       @default(1)
  totalSizeBytes    BigInt?
  storageLocation   String?                   // Local path or OneDrive URL
  storageProvider   String    @default("LOCAL") // LOCAL, ONEDRIVE, SHAREPOINT
  chainOfCustody    String?                   // JSON array of custody events
  tags              String?                   // JSON array of AI-generated + manual tags
  aiSummary         String?                   // AI-generated summary of evidence content
  status            String    @default("RECEIVED") // RECEIVED, PROCESSING, INDEXED, REVIEWED, FLAGGED
  reviewedBy        String?
  reviewedAt        DateTime?
  notes             String?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  client            Client    @relation(fields: [clientId], references: [id], onDelete: Cascade)
  files             EvidenceFile[]

  @@index([clientId])
  @@index([evidenceType])
  @@map("evidence_items")
}

model EvidenceFile {
  id              String   @id @default(cuid())
  evidenceItemId  String
  fileName        String
  filePath        String?                    // Local path
  externalUrl     String?                    // OneDrive/SharePoint URL
  mimeType        String?
  fileSize        BigInt?
  duration        Int?                       // For audio/video, in seconds
  extractedText   String?                    // OCR or transcription result
  thumbnailPath   String?
  checksum        String?                    // SHA-256 for integrity
  createdAt       DateTime @default(now())

  evidenceItem    EvidenceItem @relation(fields: [evidenceItemId], references: [id], onDelete: Cascade)

  @@map("evidence_files")
}

model EvidenceRequest {
  id              String    @id @default(cuid())
  clientId        String
  agencyName      String
  requestType     String                     // FOIA, DISCOVERY, SUBPOENA, RECORDS_REQUEST
  contactInfo     String?                    // JSON: name, email, phone, portal URL
  paymentMethod   String?                    // CHECK, ONLINE, WAIVED, PREPAID
  paymentAmount   Decimal?
  paymentStatus   String?                    // PENDING, PAID, WAIVED
  formRequired    Boolean   @default(false)
  formSubmitted   Boolean   @default(false)
  portalUrl       String?
  portalCredentials String?                  // Encrypted reference, NOT plaintext
  status          String    @default("PENDING") // PENDING, SUBMITTED, PAYMENT_PENDING,
                                                // AWAITING_RESPONSE, RECEIVED, PARTIAL, DENIED
  requestedDate   DateTime  @default(now())
  expectedDate    DateTime?
  receivedDate    DateTime?
  notes           String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@map("evidence_requests")
}
```

### Components

#### 3A. Intake Engine

- **ZIP extraction** — unpack ZIP/RAR archives, preserve folder structure, index contents
- **Bulk upload** — drag-and-drop multiple files with auto-classification
- **AURA integration** — existing document extraction agent handles OCR, text extraction
- **Manual entry** — form for physical evidence (USB drives, CDs, paper docs)

#### 3B. Storage Backend

**Phase 3a: Local storage** (existing disk-based system, enhanced)
- Organized directory structure: `/{clientId}/evidence/{evidenceType}/`
- SHA-256 checksums for integrity
- Chain of custody logging

**Phase 3b: OneDrive/SharePoint integration**
- Microsoft Graph API integration
- Sync between local and cloud
- Shared folder structure matching the firm's existing OneDrive layout
- Delta sync for large evidence sets

#### 3C. Index Service

- Full-text search across all evidence (extracted text, OCR results, transcriptions)
- AI-generated tags and classification (AURA agent extension)
- Timeline view — evidence organized chronologically by evidence date
- Cross-reference with issues and action items

#### 3D. Evidence Request Tracker

- Track outstanding records requests by agency
- Payment status tracking (check mailed, online payment made, etc.)
- Portal access management (store portal URLs, track form submissions)
- Due date and follow-up reminders
- Human-in-the-loop checkpoints for CAPTCHA, forms, and payment

### UI Pages

- `/evidence` — evidence dashboard with search, filter by type/source/case
- `/evidence/upload` — bulk upload wizard with ZIP extraction
- `/evidence/requests` — outstanding records requests tracker
- Client detail page — evidence tab showing all evidence for a case
- Evidence detail — file preview, chain of custody, AI summary, tags

### Implementation Steps

1. Schema migration for evidence tables
2. ZIP extraction service (using `adm-zip` or `unzipper`)
3. Evidence upload API with auto-classification
4. Evidence search API with full-text search
5. Evidence dashboard UI
6. Evidence request tracker
7. AURA agent extension for evidence classification
8. OneDrive integration (Phase 3b — separate milestone)

### Estimated Effort: 4-5 weeks (Phase 3a), +2 weeks (Phase 3b OneDrive)

---

## Phase 3.5: AI Evidence Intelligence (AURA Extensions + IRIS Agent)

**Priority: High — differentiator vs. Everlaw/DISCO/Clearbrief**

These capabilities upgrade VAULT from a storage system into an AI litigation operations platform. Informed by competitive analysis of Everlaw, DISCO, Clearbrief, and what criminal defense attorneys actually need.

### New Agent: IRIS (Intelligent Recognition & Insight Synthesis)

Handles deep evidence analysis — transcription, entity extraction, timeline construction, and contradiction detection across evidence items.

### Capability 1: Audio/Video Transcription

Criminal defense evidence is heavily audio/video: body cam, squad car dash cam, jail phone calls, DWI stop recordings, interview recordings.

**Implementation:**
- Whisper API (OpenAI) or Azure Speech Services for transcription
- Speaker diarization (identify who said what)
- Timestamp alignment (link transcript to video timecode)
- Store transcription as `extractedText` on `EvidenceFile`
- Support formats: MP4, AVI, MOV, MP3, WAV, M4A, WMA

**Evidence types this unlocks:**
| Type | Typical Source | Key Analysis |
|------|---------------|-------------|
| Body cam | Prosecution discovery | Officer statements, Miranda warnings, use of force |
| Squad car video | Prosecution discovery | Traffic stop procedure, field sobriety |
| Jail calls | Sheriff/corrections | Admissions, witness contact, intent |
| Interview recordings | Law enforcement | Interrogation tactics, inconsistencies |
| 911 calls | Prosecution/FOIA | Caller statements, timeline of events |
| Voicemail | Client-provided | Threats, harassment, context |

### Capability 2: Auto-Naming Convention

Transform raw evidence filenames into firm-standard naming:

```
Raw:        "BWC_01234_20260415_143022.mp4"
Auto-named: "2026-04-15 BodyCam Ofc Martinez 143022.mp4"

Raw:        "Report_Final_v2.pdf"  
Auto-named: "2026-03-20 Police Report - Incident 26-04521.pdf"

Raw:        "IMG_4832.jpg"
Auto-named: "2026-04-15 Scene Photo - 100 Block Main St.jpg"
```

**Pattern:** `{evidenceDate} {evidenceType} {keyDetail}.{ext}`

Key details extracted by AURA/IRIS:
- Officer name (from body cam metadata or transcript)
- Incident/report number
- Location
- Subject of the document

### Capability 3: Timeline/Chronology Builder

Visual timeline linking evidence to events, auto-constructed from evidence dates, extracted timestamps, and case milestones.

**Data Model Addition:**

```
model TimelineEvent {
  id              String    @id @default(cuid())
  clientId        String
  eventDate       DateTime
  eventTime       String?                   // "14:30:22" for precise timestamps
  endDate         DateTime?                 // For events with duration
  title           String
  description     String?
  eventType       String                    // ARREST, CHARGE, HEARING, EVIDENCE,
                                            // WITNESS_STATEMENT, OFFICER_ACTION,
                                            // MIRANDA, SEARCH, SEIZURE, BOOKING,
                                            // BAIL, FILING, MOTION, TRIAL
  source          String?                   // "Body Cam - Ofc Martinez", "Police Report #26-04521"
  evidenceItemId  String?                   // Link to supporting evidence
  extractedBy     String?                   // "IRIS" or manual
  confidence      Float?                    // AI confidence in date extraction
  isKeyEvent      Boolean   @default(false) // Attorney-flagged as important
  notes           String?
  createdAt       DateTime  @default(now())

  @@index([clientId, eventDate])
  @@map("timeline_events")
}
```

**UI:** Horizontal scrollable timeline on client detail page. Click event → see linked evidence. Filter by event type. Export to PDF for trial preparation.

### Capability 4: Named Entity Recognition (NER)

Extract and cross-reference people, locations, and key terms across all evidence in a case.

**Data Model Addition:**

```
model ExtractedEntity {
  id              String   @id @default(cuid())
  clientId        String
  evidenceFileId  String?
  entityType      String                    // PERSON, LOCATION, ORGANIZATION,
                                            // VEHICLE, WEAPON, SUBSTANCE,
                                            // STATUTE, CASE_NUMBER, DATE, AMOUNT
  entityValue     String                    // "Officer J. Martinez"
  normalizedValue String?                   // "Martinez, Jose (Badge #4521)"
  context         String?                   // Surrounding text snippet
  frequency       Int      @default(1)      // Times mentioned across case
  firstSeen       DateTime?
  lastSeen        DateTime?
  linkedContactId String?                   // Auto-link to CaseContact if matched
  createdAt       DateTime @default(now())

  @@index([clientId, entityType])
  @@index([normalizedValue])
  @@map("extracted_entities")
}
```

**Value:** "Show me every mention of Officer Martinez across all evidence in this case" — with links to the specific documents and timestamps.

### Capability 5: Contradiction Detection

Compare statements, reports, and testimony across evidence sources to flag inconsistencies.

Examples for criminal defense:
- Officer's report says suspect was "belligerent" but body cam shows calm interaction
- Witness statement at scene differs from later deposition
- Timeline in police report doesn't match CAD dispatch timestamps
- Miranda warnings claimed but not on body cam audio
- BAC test time vs. arrest time discrepancy in DWI cases

**Implementation:** IRIS compares extracted text/transcripts across evidence items for the same case, flags contradictions with confidence scores. Requires evidence to be transcribed and entity-extracted first.

**Data Model Addition:**

```
model Contradiction {
  id              String   @id @default(cuid())
  clientId        String
  sourceAId       String                    // EvidenceFile ID
  sourceBId       String                    // EvidenceFile ID
  contradictionType String                  // TIMELINE, STATEMENT, FACT, PROCEDURE
  description     String                    // AI-generated explanation
  sourceAExcerpt  String                    // Relevant text from source A
  sourceBExcerpt  String                    // Relevant text from source B
  severity        String                    // HIGH, MEDIUM, LOW
  confidence      Float                     // AI confidence score
  isVerified      Boolean  @default(false)  // Attorney confirmed
  isUsedInMotion  Boolean  @default(false)  // Incorporated into a filing
  notes           String?
  createdAt       DateTime @default(now())

  @@index([clientId])
  @@map("contradictions")
}
```

### Criminal Defense Evidence Type Enum (Expanded)

Based on what criminal defense attorneys actually process:

```
BODY_CAM              // Officer body-worn camera
SQUAD_VIDEO           // Dash cam / squad car camera
JAIL_CALL             // Recorded jail phone calls
INTERVIEW_RECORDING   // Police/detective interview
911_CALL              // Emergency dispatch recordings
POLICE_REPORT         // Incident/arrest reports
CAD_RECORD            // Computer-aided dispatch logs
LAB_RESULT            // BAC, drug testing, DNA, forensics
SEARCH_WARRANT        // Warrant and return documents
WARRANT_RETURN        // Items seized under warrant
MEDICAL_RECORD        // Hospital, EMT, toxicology
WITNESS_STATEMENT     // Written witness accounts
DEPOSITION            // Recorded or transcribed depositions
PHONE_DUMP            // Cell phone extraction (Cellebrite etc.)
TEXT_MESSAGES          // SMS/iMessage/chat exports
FINANCIAL_RECORD      // Bank records, transaction history
SURVEILLANCE          // Security camera, ring doorbell
SCENE_PHOTO           // Crime scene photographs
BOOKING_PHOTO         // Mugshot, booking records
COURT_ORDER           // Prior orders, protection orders
PRIOR_CONVICTION      // Criminal history records
OFW_EXPORT            // Our Family Wizard (family law cases)
EXHIBIT               // Trial exhibit (assembled from other evidence)
OTHER                 // Uncategorized
```

### Auto-Folder Routing Rules

When evidence is ingested, AURA + IRIS classify and route to standardized folders:

```
/{caseNumber}/
  /Discovery/
    /Video/           ← BODY_CAM, SQUAD_VIDEO, SURVEILLANCE
    /Audio/           ← JAIL_CALL, INTERVIEW_RECORDING, 911_CALL
    /Reports/         ← POLICE_REPORT, CAD_RECORD, LAB_RESULT
    /Digital/         ← PHONE_DUMP, TEXT_MESSAGES, FINANCIAL_RECORD
    /Warrants/        ← SEARCH_WARRANT, WARRANT_RETURN
  /Medical/           ← MEDICAL_RECORD
  /Witness/           ← WITNESS_STATEMENT, DEPOSITION
  /Client/            ← Client-provided documents
  /Motions/
    /Exhibits/        ← EXHIBIT (assembled for trial)
    /Drafts/          ← SAGE-generated documents
  /Correspondence/    ← ECHO-sent emails, prosecutor letters
```

### Implementation Steps

1. Transcription service integration (Whisper API or Azure Speech)
2. Auto-naming engine with metadata extraction
3. Named entity extraction pipeline (Claude for NER)
4. Timeline event extraction from evidence dates + transcript timestamps
5. Timeline UI component on client detail page
6. Entity cross-reference search UI
7. Contradiction detection agent (IRIS)
8. Contradiction review UI with side-by-side evidence viewer

### Estimated Effort: 5-6 weeks

---

## Phase 4: Court Filing (APEX Agent)

**Priority: Future — managing partner will provide workflow details**

### New Agent: APEX (Automated Pleading & EFiling eXecutor)

Handles the preparation and filing of initial pleadings and other court documents.

### Capabilities (Preliminary)

1. **Filing package assembly** — combine generated documents, certificates of service, proposed orders
2. **E-filing integration** — interface with state e-filing systems (Indiana uses Odyssey/Tyler Technologies)
3. **Filing checklist validation** — verify all required documents, signatures, filing fees before submission
4. **Service list management** — auto-generate certificate of service from CaseContact records
5. **Filing confirmation tracking** — capture filing timestamps, case numbers, confirmation receipts

### Dependencies

- SAGE must be complete (document generation)
- ECHO must be complete (service notifications)
- Managing partner must provide specific filing workflows and requirements
- E-filing API access must be arranged with court system

### Architecture Approach

```
Attorney initiates filing
  → APEX validates filing package (all docs present, correct court, correct case number)
  → APEX assembles filing package (cover sheet, pleading, certificate of service, proposed order)
  → Attorney reviews complete package
  → APEX submits to e-filing system (or prepares for manual filing)
  → APEX triggers ECHO to send service copies to all parties
  → Filing confirmation logged, deadlines updated
```

### Data Model (Preliminary)

```
model CourtFiling {
  id                String    @id @default(cuid())
  clientId          String
  filingType        String                    // ENTRY_OF_APPEARANCE, MOTION, PLEA, DISCOVERY_RESPONSE
  courtName         String
  courtCaseNumber   String
  documentIds       String                    // JSON array of GeneratedDocument IDs
  filingStatus      String    @default("PREPARING") // PREPARING, READY, FILED, CONFIRMED, REJECTED
  filedAt           DateTime?
  confirmationNumber String?
  filingFee         Decimal?
  feeStatus         String?                   // PAID, WAIVED, PENDING
  serviceList       String?                   // JSON array of contacts served
  servicedAt        DateTime?
  notes             String?
  createdAt         DateTime  @default(now())

  @@map("court_filings")
}
```

### Estimated Effort: 3-4 weeks (after managing partner provides workflow details)

---

## Phase 5: OneDrive/SharePoint Integration

**Priority: Medium — infrastructure foundation for multi-attorney access**

### Capabilities

1. **Microsoft Graph API** — OAuth2 auth, file upload/download, folder management
2. **Bidirectional sync** — local ↔ OneDrive for case files and evidence
3. **Shared folder structure** — standardized per-case folder layout across the firm
4. **Permission mapping** — OneDrive sharing permissions aligned with RBAC roles
5. **Large file handling** — chunked upload for evidence (video, large ZIP archives)

### Integration Points

- Evidence storage backend (Phase 3b)
- Generated document storage (SAGE output)
- Document templates (shared across attorneys)
- Case file organization

### Implementation Steps

1. Microsoft Graph API client with OAuth2 flow
2. OneDrive storage adapter (implements same interface as local storage)
3. Folder structure provisioning for new cases
4. Sync service for bidirectional file management
5. Settings page for OneDrive configuration and account linking

### Estimated Effort: 2-3 weeks

---

## New Agent Registry (Updated)

| Agent | Full Name | Purpose | Tier | Phase |
|-------|-----------|---------|------|-------|
| **LEXA** | Legal Examination & Assessment Agent | Client profiling, priority tier | standard | Existing |
| **CLARA** | Comprehensive Legal Analysis & Review Agent | Deep-dive case reviews | complex | Existing |
| **DORA** | Documentation & Outreach Retrieval Agent | Document collection and tracking | simple | Existing |
| **ARIA** | Automated Review, Identification & Analysis Agent | Document analysis, issue identification | complex | Existing |
| **RITA** | Report Intelligence & Threat Assessment Agent | Report generation, executive summaries | standard | Existing |
| **ATLAS** | Action Tracking & Legal Advisory System Agent | Action items, escalation management | standard | Existing |
| **AURA** | Automated Upload & Recognition Agent | Document extraction, deduplication | standard | Existing |
| **SAGE** | Structured Assembly & Generation Engine | Court document generation from templates | standard | Phase 1 |
| **ECHO** | Email Communications & Handoff Orchestrator | Outreach emails with approval workflow | simple | Phase 2 |
| **IRIS** | Intelligent Recognition & Insight Synthesis | Transcription, NER, timelines, contradictions | complex | Phase 3.5 |
| **APEX** | Automated Pleading & EFiling eXecutor | Court filing assembly and submission | complex | Phase 4 |

### Updated Orchestrator Pipeline

```
New Case Onboarding:
  LEXA → CLARA → DORA → SAGE (generate Entry of Appearance)
    → ECHO (courtesy email to prosecutor)

Document Received:
  AURA → ARIA → ATLAS → RITA

Evidence Received (the full AI eDiscovery pipeline):
  AURA (extract/OCR) → IRIS (transcribe if A/V, extract entities, build timeline)
    → Auto-name → Auto-folder → ARIA (if document-type evidence)
    → IRIS (cross-reference entities, detect contradictions)

Court Filing:
  SAGE → Attorney Approval → APEX → ECHO (service copies)

Evidence Review (attorney-initiated):
  IRIS timeline view → Contradiction report → SAGE (draft motion citing evidence)
```

---

## Competitive Positioning

Based on analysis of Everlaw, DISCO, Clearbrief, Filevine AI, and Relativity:

| Capability | Enterprise (Everlaw/DISCO) | DocAI (Our Platform) | Advantage |
|------------|--------------------------|---------------------|-----------|
| Document ingestion | Yes | Yes (AURA) | Parity |
| OCR | Yes | Yes (AURA) | Parity |
| Audio/video transcription | Yes | Yes (IRIS Phase 3.5) | Parity |
| Auto-classification | Yes | Yes (AURA + ARIA) | Parity |
| Auto-naming + auto-foldering | Limited | Yes (IRIS + VAULT) | **DocAI wins** — firm-specific naming conventions |
| Timeline builder | Yes | Yes (IRIS Phase 3.5) | Parity |
| Entity extraction | Yes | Yes (IRIS Phase 3.5) | Parity |
| Contradiction detection | Limited/manual | Yes (IRIS Phase 3.5) | **DocAI wins** — automated AI detection |
| Court document generation | No | Yes (SAGE Phase 1) | **DocAI wins** — competitors don't generate filings |
| Email to prosecutor | No | Yes (ECHO Phase 2) | **DocAI wins** — integrated outreach |
| Court e-filing | No | Yes (APEX Phase 4) | **DocAI wins** — end-to-end |
| Case management | No (separate tool) | Yes (built-in) | **DocAI wins** — single platform |
| Criminal defense specific | Generic litigation | Purpose-built | **DocAI wins** — evidence types, folder structure, workflows |
| Cost | $50-200+/user/month | Self-hosted | **DocAI wins** — no per-seat licensing |

**Key differentiator:** Enterprise tools are generic litigation platforms. DocAI is purpose-built for criminal defense — from evidence types (body cam, jail calls, phone dumps) to workflows (prosecutor courtesy letters, discovery tracking) to output (motions citing specific evidence contradictions).

The ChatGPT analysis concludes firms want an "AI litigation operations system." That's exactly what DocAI becomes across all phases — not just eDiscovery, but the full loop from evidence intake through motion drafting and court filing.

---

## Phasing Summary

| Phase | Deliverable | Effort | Dependencies |
|-------|-------------|--------|--------------|
| **1** | SAGE — Document Generation | 2-3 weeks | None |
| **2** | ECHO — Email Outreach | 2 weeks | Phase 1 (templates) |
| **3a** | VAULT — Evidence Management (local) | 4-5 weeks | None (can parallel Phase 1) |
| **3.5** | IRIS — AI Evidence Intelligence | 5-6 weeks | Phase 3a (evidence must be stored) |
| **3b** | VAULT — OneDrive Integration | 2 weeks | Phase 3a + Phase 5 |
| **4** | APEX — Court Filing | 3-4 weeks | Phase 1 + 2 + managing partner input |
| **5** | OneDrive/SharePoint | 2-3 weeks | Can start anytime |

### Recommended Sequencing

```
Week 1-3:   Phase 1 (SAGE) ─────────────────────────┐
Week 3-5:   Phase 2 (ECHO) ──────── depends on ─────┘
Week 1-6:   Phase 3a (VAULT local) ─── runs in parallel with Phase 1-2
Week 6-8:   Phase 5 (OneDrive) ──────┐
Week 6-12:  Phase 3.5 (IRIS) ────────┤─ depends on Phase 3a
Week 8-10:  Phase 3b (VAULT cloud) ──┘─ depends on Phase 5
Week 12-16: Phase 4 (APEX) ──────────── depends on Phase 1+2 + partner input
```

**Total estimated timeline: ~16 weeks to full capability**

### What's Demoable at Each Phase

| After Phase | Demo Capability |
|-------------|----------------|
| Phase 1 (Week 3) | "Upload a case, click Generate, get a court-ready Entry of Appearance with all client info filled in" |
| Phase 2 (Week 5) | "Generate the filing, approve it, and the system emails the prosecutor a courtesy copy automatically" |
| Phase 3a (Week 6) | "Drop a ZIP of discovery evidence, system extracts, classifies, and organizes into folders automatically" |
| Phase 3.5 (Week 12) | "Upload a body cam video, get a transcript, see officer names extracted, and a timeline built from all case evidence. System flags where the officer's report contradicts what the camera shows." |
| Phase 4 (Week 16) | "Click File, system assembles the package, you approve, it e-files and serves all parties" |

---

## Technical Considerations

### Human-in-the-Loop Checkpoints

The managing partner correctly identified that full automation isn't realistic. Every workflow includes mandatory human checkpoints:

| Action | Automation Level | Human Step |
|--------|-----------------|------------|
| Generate court document | Fully automated | Attorney reviews and approves |
| Send email to prosecutor | Draft automated | Attorney approves before send |
| File with court | Package assembly automated | Attorney authorizes filing |
| Extract evidence from ZIP | Fully automated | Attorney reviews classification |
| Pay for records | Cannot automate | Attorney/paralegal pays manually |
| Complete portal forms | Cannot automate | Paralegal completes manually |
| CAPTCHA verification | Cannot automate | Flagged for human completion |

### Security Additions

- Generated documents must be immutable after filing (append-only audit)
- Evidence files require SHA-256 checksums for chain of custody
- Email credentials stored encrypted (not in `.env` plaintext)
- OneDrive OAuth tokens stored securely with refresh rotation
- Portal credentials (Phase 3) encrypted at rest, access-logged

### Criminal Defense-Specific Adaptations

The current data model was built for compliance/risk management (TPRM origins). Criminal defense requires:

1. **Case-centric rather than client-centric** — a "client" in our model maps to a case/matter, which is correct
2. **Charges and statutes** — need fields on Client for criminal charges, statute numbers, arrest date, bond info
3. **Court information** — need a Court model or fields for court name, address, county, division, case number
4. **Discovery tracking** — evidence received vs. evidence requested from prosecution
5. **Deadlines that are court-imposed** — filing deadlines, hearing dates, trial dates (ActionItem extended)
6. **Plea and disposition tracking** — outcome fields on Client

These schema changes should be planned as a data model evolution alongside Phase 1.
