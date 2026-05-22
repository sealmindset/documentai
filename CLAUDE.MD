# Document AI Platform

An AI-powered Legal Document Intelligence platform for Vanmerven Law Firm (VLF), automating document reviews, compliance monitoring, and legal workflow management.

## Project Overview

This project integrates AI capabilities with legal document management to streamline document review operations:

- **Document Reviews**: Automated document analysis and review workflows
- **Compliance Monitoring**: Continuous monitoring of client compliance
- **Issue Tracking**: AI-identified issues with action item management
- **Evidence Collection**: Automated evidence gathering and documentation

## Technology Stack

- **Runtime**: Node.js v22.12.0
- **Framework**: Next.js 16
- **AI Provider**: Claude via Azure AI Foundry (PRIMARY)
  - Primary: Claude Opus 4.6
  - Fallback: Claude Opus 4.5
  - OpenAI is optional alternative only
- **ORM**: Prisma with PostgreSQL
- **Auth**: OIDC + stateless JWT, database-driven RBAC (4 system roles)
- **UI**: Radix UI + Tailwind CSS
- **AI Safety**: Input sanitization, output validation, rate limiting, PII masking, NeMo Guardrails
- **Infra**: Docker Compose (app + PostgreSQL + mock-oidc), Terraform (Azure)

## AI Agents

7 specialized agents work in a coordinated pipeline:

| Agent | Full Name | Purpose | Tier |
|-------|-----------|---------|------|
| **LEXA** | Legal Examination & Assessment Agent | Client profiling, priority tier calculation | standard |
| **CLARA** | Comprehensive Legal Analysis & Review Agent | Deep-dive case reviews | complex |
| **DORA** | Documentation & Outreach Retrieval Agent | Document collection and tracking | simple |
| **ARIA** | Automated Review, Identification & Analysis Agent | Document analysis, issue identification | complex |
| **RITA** | Report Intelligence & Threat Assessment Agent | Report generation, executive summaries | standard |
| **ATLAS** | Action Tracking & Legal Advisory System Agent | Action items, escalation management | standard |
| **AURA** | Automated Upload & Recognition Agent | Document extraction, deduplication | standard |
| **SAGE** | Structured Assembly & Generation Engine | Court document generation from templates | standard |
| **ECHO** | Email Communications & Handoff Orchestrator | Outbound email composition and delivery via M365 Graph | standard |

Pipeline: LEXA → CLARA → DORA → ARIA → RITA → ATLAS
Document Pipeline: SAGE → ECHO (generate document → draft courtesy email)
Ingestion Pipeline: SharePoint → AURA (auto-download → extraction & classification)

## Data Model

| Model | Table | Purpose |
|-------|-------|---------|
| Client | `clients` | Legal cases/matters |
| ClientProfile | `client_profiles` | Case priority and data sensitivity profiles |
| CaseReview | `case_reviews` | Multi-dimensional case strength assessments |
| Issue | `issues` | AI-identified legal issues and findings |
| ActionItem | `action_items` | Court deadlines and remediation tasks |
| Document | `documents` | Legal documents and evidence |
| Report | `reports` | AI-generated case reports |
| DocumentTemplate | `document_templates` | Court document templates with merge fields |
| GeneratedDocument | `generated_documents` | SAGE-generated court documents |
| OutboundEmail | `outbound_emails` | Attorney-approved outbound emails |
| EmailTemplate | `email_templates` | Email templates for ECHO agent |
| SharePointSync | `sharepoint_syncs` | SharePoint library sync configurations |
| SharePointFile | `sharepoint_files` | Tracked files from SharePoint syncs |

## Project Structure

```
docai/
├── src/
│   ├── app/                     # Next.js pages and API routes
│   │   ├── api/clients/         # Client CRUD API
│   │   ├── api/case-reviews/    # Case review API
│   │   ├── api/issues/          # Issues API
│   │   └── (authenticated)/clients/  # Client pages
│   ├── components/              # UI components (Radix + Tailwind)
│   ├── lib/
│   │   ├── ai/                  # AI provider abstraction + safety controls
│   │   ├── agents/              # 7 AI agents (LEXA, CLARA, DORA, ARIA, RITA, ATLAS, AURA)
│   │   └── prompts.ts           # DB-backed prompt loader with safety preamble
│   └── middleware.ts            # Auth guard (JWT validation)
├── prisma/                      # Schema + seed data
├── mock-services/mock-oidc/     # OIDC provider for local dev
├── infra/                       # Terraform (Azure)
├── docs/attestations/           # NeMo Guardrails safety attestations
├── docker-compose.yml           # App + PostgreSQL + mock-oidc
└── CLAUDE.md                    # This file
```

## Development Guidelines

### Security Considerations

- Never commit API keys or credentials
- Use service accounts with minimal required permissions
- Audit API access logs regularly
- Rotate credentials periodically

### Docker

Container names: `docai-app`, `docai-db`, `docai-mock-oidc`
DB credentials: `docai_user` / `docai_pass` / `docai_db`
Ports: 3020 (app), 5438 (PostgreSQL), 10091 (mock-oidc)
