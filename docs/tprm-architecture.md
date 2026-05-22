# AI-Powered Legal Document Intelligence Platform
## Vanmeveren Law Firm (VLF)

---

## Table of Contents
1. [System Overview](#system-overview)
2. [AI Agents](#ai-agents)
3. [System Architecture](#system-architecture)
4. [Database Schema](#database-schema)
5. [Process Workflow](#process-workflow)
6. [API Endpoints](#api-endpoints)
7. [Technology Stack](#technology-stack)
8. [Setup Instructions](#setup-instructions)

---

## System Overview

The AI-Powered Legal Document Intelligence Platform is a comprehensive system designed to automate and enhance VLF's legal document review processes. The system leverages multiple specialized AI agents to handle different aspects of party profiling, document analysis, and reporting.

### Key Capabilities
- Automated party profiling
- Intelligent document analysis and extraction
- Review scoring and categorization
- Automated report generation
- Continuous monitoring and alerting
- Audit trail and compliance tracking

---

## AI Agents

The system employs six specialized AI agents, each responsible for a specific aspect of the legal document intelligence process:

### 1. LEXA - Legal Examination & Assessment Agent
**Purpose:** Collects and processes party information to determine initial party profile

**Responsibilities:**
- Gather party demographic and business information
- Collect data access and integration details
- Assess party criticality to business operations
- Calculate initial priority tier (Critical, High, Medium, Low)
- Identify regulatory compliance requirements (SOC2, ISO27001, HIPAA, PCI-DSS)

**Input Sources:**
- Party registration forms
- Business questionnaires
- Integration specifications
- Historical party data

**Output:**
- Party Profile Score (1-100)
- Priority Tier Classification
- Data sensitivity assessment
- Recommended review depth

---

### 2. CLARA - Comprehensive Legal Analysis & Review Agent
**Purpose:** Performs deep-dive document reviews on Critical and High-priority parties

**Responsibilities:**
- Execute detailed document reviews for high-priority parties
- Evaluate business continuity and disaster recovery capabilities
- Assess financial stability indicators
- Review geographic and geopolitical risks
- Analyze concentration risk and party dependencies

**Input Sources:**
- LEXA party profiles (Critical/High tier)
- Financial reports (D&B, credit reports)
- Business continuity documentation
- Party dependency maps

**Output:**
- Detailed document review report
- Review heat map by category
- Mitigation recommendations
- Review timeline and next review date

---

### 3. DORA - Documentation & Outreach Retrieval Agent
**Purpose:** Obtains legal documentation from parties and external sources

**Responsibilities:**
- Send automated documentation requests to parties
- Track documentation status and follow-ups
- Retrieve external data (SecurityScorecard, BitSight, etc.)
- Collect certifications, attestations, and audit reports
- Manage document versioning and expiration tracking

**Input Sources:**
- Party contact information
- External security rating APIs
- Public regulatory databases
- Party portals and shared repositories

**Output:**
- Collected documentation inventory
- Document completeness score
- Missing documentation alerts
- External security ratings summary

---

### 4. ARIA - Automated Review, Identification & Analysis Agent
**Purpose:** Analyzes legal documents to identify key issues for VLF

**Responsibilities:**
- Parse and analyze SOC2 reports, penetration tests, and audits
- Extract control gaps and exceptions
- Map party issues to VLF review framework
- Identify potential compliance violations
- Correlate issues across multiple documents

**Input Sources:**
- SOC2 Type I/II reports
- Penetration test results
- Vulnerability assessments
- Security questionnaires (SIG, CAIQ, custom)
- Compliance certifications

**Output:**
- Issues with severity ratings
- Control gap analysis
- VLF-specific issue mapping
- Action item requirements
- Risk acceptance recommendations

---

### 5. RITA - Report Intelligence & Threat Assessment Agent
**Purpose:** Creates comprehensive summary reports of document review findings

**Responsibilities:**
- Aggregate issues from all review activities
- Generate executive summary reports
- Create detailed technical review reports
- Produce compliance status dashboards
- Generate trend analysis and metrics

**Input Sources:**
- ARIA issues
- Historical review data
- Industry benchmark data
- Regulatory requirement mappings

**Output:**
- Executive Review Summary Report
- Detailed Document Review Report
- Compliance Status Report
- Review Trend Analysis
- Board-level reporting package

---

### 6. ATLAS - Action Tracking & Legal Advisory System Agent
**Purpose:** Manages ongoing risk treatment and action item activities

**Responsibilities:**
- Create and track action items
- Monitor party response and progress
- Escalate overdue items and critical issues
- Manage risk acceptance workflows
- Coordinate party meetings and reviews
- Track SLA compliance

**Input Sources:**
- RITA review reports
- Action item plans from parties
- Internal stakeholder feedback
- Risk acceptance requests

**Output:**
- Action item tracking dashboard
- Action item status reports
- Escalation notifications
- Risk acceptance documentation
- Party performance scorecards

---

## System Architecture

```
                                    +------------------+
                                    |   Next.js Web    |
                                    |   Application    |
                                    |   (Frontend)     |
                                    +--------+---------+
                                             |
                                             v
                                    +------------------+
                                    |   Next.js API    |
                                    |   Routes         |
                                    |   (Backend)      |
                                    +--------+---------+
                                             |
              +------------------------------+------------------------------+
              |                              |                              |
              v                              v                              v
    +-----------------+           +------------------+           +------------------+
    |  AI Agent       |           |   PostgreSQL     |           |  External APIs   |
    |  Orchestrator   |           |   Database       |           |  Integration     |
    +-----------------+           +------------------+           +------------------+
              |                                                           |
    +---------+---------+                                    +------------+------------+
    |    |    |    |    |                                    |            |            |
    v    v    v    v    v                                    v            v            v
  LEXA CLARA DORA ARIA RITA                           SecurityScore  BitSight   D&B
                    |                                    card
                    v
                  ATLAS
```

### Component Descriptions

**Frontend Layer (Next.js)**
- Dashboard views for review overview
- Party management interface
- Document upload and management
- Report viewing and export
- User authentication and authorization

**Backend Layer (Next.js API Routes)**
- RESTful API endpoints
- Agent orchestration logic
- Authentication middleware
- File handling and storage
- Background job processing

**AI Agent Orchestrator**
- Agent lifecycle management
- Task queue and scheduling
- Inter-agent communication
- Error handling and retry logic
- Audit logging

**Database Layer (PostgreSQL)**
- Party records and profiles
- Document reviews and scores
- Document metadata and storage references
- Audit trails and history
- User and permission data

**External Integrations**
- Security rating providers (SecurityScorecard, BitSight)
- Financial data providers (D&B)
- Email/notification services
- Document storage (local/cloud)

---

## Database Schema

### Core Tables

```sql
-- Parties (table: vendors)
CREATE TABLE vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255),
    duns_number VARCHAR(20),
    website VARCHAR(500),
    industry VARCHAR(100),
    country VARCHAR(100),
    state_province VARCHAR(100),
    primary_contact_name VARCHAR(255),
    primary_contact_email VARCHAR(255),
    primary_contact_phone VARCHAR(50),
    business_owner VARCHAR(255),
    it_owner VARCHAR(255),
    contract_start_date DATE,
    contract_end_date DATE,
    annual_spend DECIMAL(15,2),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Party Profiles (table: risk_profiles)
CREATE TABLE risk_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID REFERENCES vendors(id),
    risk_tier VARCHAR(20) NOT NULL, -- Critical, High, Medium, Low
    overall_risk_score INTEGER, -- 1-100
    data_sensitivity_level VARCHAR(50),
    data_types_accessed TEXT[],
    system_integrations TEXT[],
    has_pii_access BOOLEAN DEFAULT FALSE,
    has_phi_access BOOLEAN DEFAULT FALSE,
    has_pci_access BOOLEAN DEFAULT FALSE,
    business_criticality VARCHAR(50),
    assessment_frequency VARCHAR(50),
    last_assessment_date DATE,
    next_assessment_date DATE,
    calculated_by VARCHAR(50), -- Agent name (LEXA)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Document Reviews (table: risk_assessments)
CREATE TABLE risk_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID REFERENCES vendors(id),
    risk_profile_id UUID REFERENCES risk_profiles(id),
    assessment_type VARCHAR(50), -- Initial, Annual, Triggered
    assessment_status VARCHAR(50), -- Draft, In Progress, Complete, Approved
    assessed_by VARCHAR(50), -- Agent name (CLARA)
    assessment_date DATE,

    -- Risk Categories (scores 1-5)
    security_risk_score INTEGER,
    operational_risk_score INTEGER,
    compliance_risk_score INTEGER,
    financial_risk_score INTEGER,
    reputational_risk_score INTEGER,
    strategic_risk_score INTEGER,

    overall_assessment_score INTEGER,
    risk_rating VARCHAR(20),
    summary TEXT,
    recommendations TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Documents
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID REFERENCES vendors(id),
    document_type VARCHAR(100), -- SOC2, PenTest, ISO27001, SIG, etc.
    document_name VARCHAR(500),
    file_path VARCHAR(1000),
    file_size INTEGER,
    mime_type VARCHAR(100),
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    document_date DATE,
    expiration_date DATE,
    status VARCHAR(50), -- Pending, Received, Analyzed, Expired
    retrieved_by VARCHAR(50), -- Agent name (DORA)
    source VARCHAR(100), -- Vendor Upload, API, Manual
    version VARCHAR(20),
    is_current BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Issues (table: risk_findings)
CREATE TABLE risk_findings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID REFERENCES vendors(id),
    assessment_id UUID REFERENCES risk_assessments(id),
    document_id UUID REFERENCES documents(id),
    finding_type VARCHAR(100),
    finding_category VARCHAR(100),
    severity VARCHAR(20), -- Critical, High, Medium, Low, Informational
    title VARCHAR(500),
    description TEXT,
    vlf_review_mapping VARCHAR(255),
    affected_controls TEXT[],
    source_reference TEXT,
    identified_by VARCHAR(50), -- Agent name (ARIA)
    identified_date DATE,
    status VARCHAR(50), -- Open, In Remediation, Resolved, Accepted
    due_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reports
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID REFERENCES vendors(id),
    assessment_id UUID REFERENCES risk_assessments(id),
    report_type VARCHAR(100), -- Executive Summary, Detailed, Compliance, Trend
    report_name VARCHAR(500),
    generated_by VARCHAR(50), -- Agent name (RITA)
    generated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    file_path VARCHAR(1000),
    status VARCHAR(50),
    approved_by VARCHAR(255),
    approved_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Action Items (table: remediation_actions)
CREATE TABLE remediation_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    finding_id UUID REFERENCES risk_findings(id),
    vendor_id UUID REFERENCES vendors(id),
    action_type VARCHAR(100), -- Remediate, Mitigate, Accept, Transfer
    title VARCHAR(500),
    description TEXT,
    assigned_to VARCHAR(255),
    owner_type VARCHAR(50), -- Vendor, Internal
    priority VARCHAR(20),
    status VARCHAR(50), -- Open, In Progress, Pending Verification, Closed
    due_date DATE,
    completion_date DATE,
    managed_by VARCHAR(50), -- Agent name (ATLAS)
    verification_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agent Activity Log
CREATE TABLE agent_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_name VARCHAR(50) NOT NULL,
    activity_type VARCHAR(100),
    entity_type VARCHAR(100),
    entity_id UUID,
    action_taken TEXT,
    input_summary TEXT,
    output_summary TEXT,
    status VARCHAR(50),
    error_message TEXT,
    processing_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_type VARCHAR(50), -- User, Vendor, Agent
    recipient_id VARCHAR(255),
    notification_type VARCHAR(100),
    title VARCHAR(500),
    message TEXT,
    related_entity_type VARCHAR(100),
    related_entity_id UUID,
    sent_by VARCHAR(50), -- Agent name or System
    sent_at TIMESTAMP,
    read_at TIMESTAMP,
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50), -- Admin, Analyst, Viewer, Vendor
    department VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit Trail
CREATE TABLE audit_trail (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    agent_name VARCHAR(50),
    action VARCHAR(100),
    entity_type VARCHAR(100),
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Indexes

```sql
CREATE INDEX idx_vendors_status ON vendors(status);
CREATE INDEX idx_vendors_name ON vendors(name);
CREATE INDEX idx_risk_profiles_vendor ON risk_profiles(vendor_id);
CREATE INDEX idx_risk_profiles_tier ON risk_profiles(risk_tier);
CREATE INDEX idx_assessments_vendor ON risk_assessments(vendor_id);
CREATE INDEX idx_assessments_status ON risk_assessments(assessment_status);
CREATE INDEX idx_documents_vendor ON documents(vendor_id);
CREATE INDEX idx_documents_type ON documents(document_type);
CREATE INDEX idx_findings_vendor ON risk_findings(vendor_id);
CREATE INDEX idx_findings_severity ON risk_findings(severity);
CREATE INDEX idx_findings_status ON risk_findings(status);
CREATE INDEX idx_remediation_status ON remediation_actions(status);
CREATE INDEX idx_agent_log_agent ON agent_activity_log(agent_name);
CREATE INDEX idx_agent_log_created ON agent_activity_log(created_at);
```

---

## Process Workflow

### Step 1: Party Profiling (LEXA)
```
Trigger: New party registration or periodic review
    |
    v
LEXA collects party information
    - Business details
    - Data access requirements
    - Integration specifications
    - Regulatory requirements
    |
    v
LEXA calculates party profile
    - Applies review scoring algorithm
    - Determines priority tier
    - Sets review frequency
    |
    v
Output: Party Profile created in database
    - If Critical/High -> Trigger CLARA
    - If Medium/Low -> Schedule periodic review
```

### Step 2: Critical/High Document Review (CLARA)
```
Trigger: LEXA identifies Critical or High priority party
    |
    v
CLARA initiates detailed document review
    - Reviews business continuity capabilities
    - Assesses financial stability
    - Evaluates geographic risks
    - Analyzes party dependencies
    |
    v
CLARA generates document review
    - Scores across review categories
    - Documents issues
    - Provides recommendations
    |
    v
Output: Detailed Document Review
    - Triggers DORA for documentation collection
```

### Step 3: Documentation Collection (DORA)
```
Trigger: Review requires documentation
    |
    v
DORA identifies required documents
    - SOC2 reports
    - Penetration tests
    - Certifications
    - Security questionnaires
    |
    v
DORA retrieves documentation
    - Sends automated requests to parties
    - Queries external APIs (SecurityScorecard, BitSight)
    - Tracks document status
    |
    v
Output: Document inventory updated
    - Triggers ARIA when documents received
```

### Step 4: Document Analysis (ARIA)
```
Trigger: New documents available for analysis
    |
    v
ARIA analyzes legal documentation
    - Parses SOC2 reports (Type I/II)
    - Reviews penetration test findings
    - Extracts control gaps and exceptions
    - Analyzes security questionnaire responses
    |
    v
ARIA maps issues to VLF framework
    - Identifies VLF-specific issues
    - Correlates issues across documents
    - Assigns severity ratings
    |
    v
Output: Issues created
    - Stored in risk_findings table
    - Triggers RITA for reporting
```

### Step 5: Report Generation (RITA)
```
Trigger: Document review analysis complete
    |
    v
RITA aggregates review data
    - Compiles issues from ARIA
    - Incorporates LEXA/CLARA reviews
    - Gathers historical trend data
    |
    v
RITA generates reports
    - Executive Summary (board-level)
    - Detailed Document Review
    - Compliance Status Report
    - Trend Analysis
    |
    v
Output: Reports generated and stored
    - Notifications sent to stakeholders
    - Triggers ATLAS for action item tracking
```

### Step 6: Action Item Management (ATLAS)
```
Trigger: Issues require action
    |
    v
ATLAS creates action items
    - Assigns owners (party/internal)
    - Sets due dates based on severity
    - Defines acceptance criteria
    |
    v
ATLAS monitors progress
    - Tracks party responses
    - Sends reminders and escalations
    - Updates stakeholders
    |
    v
ATLAS validates resolution
    - Verifies evidence of completion
    - Updates issue status
    - Documents risk acceptances
    |
    v
Output: Action item tracking dashboard
    - Party performance metrics
    - SLA compliance reports
```

---

## API Endpoints

### Party Management
```
GET    /api/vendors                    - List all parties
GET    /api/vendors/:id                - Get party details
POST   /api/vendors                    - Create new party
PUT    /api/vendors/:id                - Update party
DELETE /api/vendors/:id                - Delete party (soft delete)
GET    /api/vendors/:id/risk-profile   - Get party profile
GET    /api/vendors/:id/assessments    - Get party document reviews
GET    /api/vendors/:id/documents      - Get party documents
GET    /api/vendors/:id/findings       - Get party issues
```

### Party Profiles
```
GET    /api/risk-profiles              - List all party profiles
GET    /api/risk-profiles/:id          - Get party profile details
POST   /api/risk-profiles              - Create party profile (via LEXA)
PUT    /api/risk-profiles/:id          - Update party profile
```

### Document Reviews
```
GET    /api/assessments                - List all document reviews
GET    /api/assessments/:id            - Get document review details
POST   /api/assessments                - Create document review (via CLARA)
PUT    /api/assessments/:id            - Update document review
POST   /api/assessments/:id/approve    - Approve document review
```

### Documents
```
GET    /api/documents                  - List all documents
GET    /api/documents/:id              - Get document details
POST   /api/documents                  - Upload document
DELETE /api/documents/:id              - Delete document
GET    /api/documents/:id/download     - Download document
POST   /api/documents/:id/analyze      - Trigger ARIA analysis
```

### Issues
```
GET    /api/findings                   - List all issues
GET    /api/findings/:id               - Get issue details
POST   /api/findings                   - Create issue (via ARIA)
PUT    /api/findings/:id               - Update issue
PUT    /api/findings/:id/status        - Update issue status
```

### Reports
```
GET    /api/reports                    - List all reports
GET    /api/reports/:id                - Get report details
POST   /api/reports/generate           - Generate report (via RITA)
GET    /api/reports/:id/download       - Download report
```

### Action Items
```
GET    /api/remediation                - List all action items
GET    /api/remediation/:id            - Get action item details
POST   /api/remediation                - Create action item
PUT    /api/remediation/:id            - Update action item
PUT    /api/remediation/:id/status     - Update status
POST   /api/remediation/:id/escalate   - Escalate action item
```

### Agent Operations
```
POST   /api/agents/lexa/profile        - Trigger LEXA party profiling
POST   /api/agents/clara/review        - Trigger CLARA document review
POST   /api/agents/dora/collect        - Trigger DORA doc collection
POST   /api/agents/aria/analyze        - Trigger ARIA document analysis
POST   /api/agents/rita/report         - Trigger RITA reporting
POST   /api/agents/atlas/action        - Trigger ATLAS action items
GET    /api/agents/activity            - Get agent activity log
```

### Dashboard
```
GET    /api/dashboard/summary          - Get dashboard summary stats
GET    /api/dashboard/priority-overview - Get priority distribution
GET    /api/dashboard/pending-actions  - Get pending action items count
GET    /api/dashboard/recent-activity  - Get recent agent activity
GET    /api/dashboard/compliance       - Get compliance status
```

---

## Technology Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| Next.js 16 | React framework with App Router |
| TypeScript | Type-safe JavaScript |
| Tailwind CSS | Utility-first CSS framework |
| shadcn/ui | UI component library |
| React Query | Server state management |
| Zustand | Client state management |
| Recharts | Data visualization |
| React Hook Form | Form handling |
| Zod | Schema validation |

### Backend
| Technology | Purpose |
|------------|---------|
| Next.js API Routes | Backend API endpoints |
| Prisma | Database ORM |
| PostgreSQL | Primary database |
| LangChain | AI agent orchestration |
| OpenAI API / Anthropic API | LLM for AI agents |
| Bull | Job queue for background tasks |
| Redis | Caching and job queue storage |
| NextAuth.js | Authentication |
| Nodemailer | Email notifications |

### AI/ML
| Technology | Purpose |
|------------|---------|
| LangChain | Agent framework and orchestration |
| OpenAI GPT-4 / Claude | Large language model |
| LlamaIndex | Document parsing and indexing |
| Unstructured | PDF/document extraction |
| pgvector | Vector storage for embeddings |

### DevOps & Tooling
| Technology | Purpose |
|------------|---------|
| Docker | Containerization (optional) |
| Git | Version control |
| ESLint | Code linting |
| Prettier | Code formatting |
| Jest | Unit testing |
| Playwright | E2E testing |

---

## Setup Instructions

### Prerequisites
- Node.js 18+ (LTS recommended)
- PostgreSQL 15+
- Redis (for job queue)
- Git
- OpenAI API key or Anthropic API key

### Installation Steps

#### 1. Clone/Initialize the Project
```bash
# Create project directory
mkdir document-ai-platform
cd document-ai-platform

# Initialize Next.js project
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir

# Install dependencies
npm install
```

#### 2. Install Additional Dependencies
```bash
# Database
npm install prisma @prisma/client pg

# AI/LangChain
npm install langchain @langchain/openai @langchain/community

# UI Components
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu
npm install class-variance-authority clsx tailwind-merge
npm install lucide-react

# Forms & Validation
npm install react-hook-form @hookform/resolvers zod

# Data Fetching & State
npm install @tanstack/react-query zustand

# Charts
npm install recharts

# Authentication
npm install next-auth @auth/prisma-adapter

# File Handling
npm install multer formidable pdf-parse

# Job Queue
npm install bull ioredis

# Utilities
npm install date-fns uuid
```

#### 3. Configure PostgreSQL
```bash
# Windows - Start PostgreSQL service
# Via Services app or command line:
net start postgresql-x64-15

# Create database
psql -U postgres
CREATE DATABASE docai_db;
CREATE USER docai_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE docai_db TO docai_user;
\q
```

#### 4. Environment Configuration
Create `.env.local` file:
```env
# Database
DATABASE_URL="postgresql://docai_user:your_password@localhost:5432/docai_db"

# Authentication
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# AI Provider (choose one)
OPENAI_API_KEY="sk-your-openai-key"
# OR
ANTHROPIC_API_KEY="sk-ant-your-anthropic-key"

# Redis (for job queue)
REDIS_URL="redis://localhost:6379"

# External APIs (optional)
SECURITY_SCORECARD_API_KEY=""
BITSIGHT_API_KEY=""
DNB_API_KEY=""

# File Storage
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE="50000000"
```

#### 5. Initialize Prisma
```bash
# Initialize Prisma
npx prisma init

# Generate Prisma client after updating schema
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Seed database (optional)
npx prisma db seed
```

#### 6. Run the Application
```bash
# Development mode
npm run dev

# Production build
npm run build
npm start
```

### Project Structure
```
document-ai-platform/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── vendors/
│   │   │   ├── assessments/
│   │   │   ├── documents/
│   │   │   ├── findings/
│   │   │   ├── reports/
│   │   │   ├── remediation/
│   │   │   ├── agents/
│   │   │   └── dashboard/
│   │   ├── dashboard/
│   │   ├── vendors/
│   │   ├── assessments/
│   │   ├── documents/
│   │   ├── reports/
│   │   └── settings/
│   ├── components/
│   │   ├── ui/
│   │   ├── vendors/
│   │   ├── assessments/
│   │   ├── documents/
│   │   └── reports/
│   ├── lib/
│   │   ├── agents/
│   │   │   ├── lexa.ts
│   │   │   ├── clara.ts
│   │   │   ├── dora.ts
│   │   │   ├── aria.ts
│   │   │   ├── rita.ts
│   │   │   ├── atlas.ts
│   │   │   └── orchestrator.ts
│   │   ├── db/
│   │   ├── utils/
│   │   └── validations/
│   ├── hooks/
│   ├── types/
│   └── styles/
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── public/
├── uploads/
├── docs/
├── .env.local
├── package.json
└── tsconfig.json
```

---

## Agent Implementation Summary

| Agent | File | Primary Function | Triggers |
|-------|------|------------------|----------|
| LEXA | `src/lib/agents/lexa.ts` | Party profiling | New party, periodic review |
| CLARA | `src/lib/agents/clara.ts` | Document review | LEXA identifies high priority |
| DORA | `src/lib/agents/dora.ts` | Document collection | Review initiated |
| ARIA | `src/lib/agents/aria.ts` | Document analysis | Documents received |
| RITA | `src/lib/agents/rita.ts` | Report generation | Analysis complete |
| ATLAS | `src/lib/agents/atlas.ts` | Action item management | Issues identified |

---

## Quick Reference: Agent Names

| Acronym | Full Name | Role |
|---------|-----------|------|
| **LEXA** | Legal Examination & Assessment Agent | Initial party profiling |
| **CLARA** | Comprehensive Legal Analysis & Review Agent | Deep-dive document reviews |
| **DORA** | Documentation & Outreach Retrieval Agent | Document collection |
| **ARIA** | Automated Review, Identification & Analysis Agent | Document analysis |
| **RITA** | Report Intelligence & Threat Assessment | Report generation |
| **ATLAS** | Action Tracking & Legal Advisory System Agent | Action item tracking |

---

## Next Steps

1. [ ] Set up development environment
2. [ ] Initialize Next.js project with dependencies
3. [ ] Configure PostgreSQL database
4. [ ] Create Prisma schema and run migrations
5. [ ] Implement AI agent modules
6. [ ] Build API endpoints
7. [ ] Develop frontend components
8. [ ] Integrate external APIs
9. [ ] Configure authentication
10. [ ] Testing and deployment

---

*Document Version: 1.0*
*Last Updated: January 2026*
*Author: Document AI Development Team*
*Organization: Vanmeveren Law Firm (VLF)*
