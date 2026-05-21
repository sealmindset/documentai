# AI TPRM Machine

An AI-powered Third Party Risk Management platform that automates vendor risk assessments, compliance monitoring, and audit workflows using Claude via Azure AI Foundry.

## Features

- **Document-Driven Vendor Onboarding** -- Upload vendor documents (SOC 2, pen tests, questionnaires) and the system automatically extracts vendor info, checks for duplicates, and triggers the full AI assessment pipeline
- **6 AI Agents** -- VERA (vendor evaluation), CARA (comprehensive analysis), DORA (document retrieval), SARA (security assessment review), RITA (risk intelligence), MARS (mitigation and remediation)
- **Risk Dashboard** -- Real-time overview of vendor risk distribution, compliance scores, agent activity, and expiring documents
- **Database-Driven RBAC** -- 4 system roles (Admin, Analyst, Viewer, Vendor) with 40+ granular permissions
- **Multi-Point Vendor Deduplication** -- DUNS exact match, fuzzy name/phone/address/contact matching, and AI-powered semantic document comparison
- **AI Safety Controls** -- Input sanitization, output validation, rate limiting, PII masking, prompt template content validation, and NeMo Guardrails attestations

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 |
| Runtime | Node.js v22 |
| Database | PostgreSQL 16 (Prisma ORM) |
| AI Provider | Claude via Azure AI Foundry (primary), OpenAI/Ollama (optional) |
| Auth | OIDC + stateless JWT sessions |
| UI | Radix UI + Tailwind CSS |
| Infrastructure | Docker Compose (local), Terraform (Azure) |

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js v22+ (for local development outside Docker)

### 1. Clone and configure

```bash
git clone https://github.com/SleepNumberInc/tprmai.git
cd tprmai
cp .env.example .env
```

### 2. Start all services

```bash
docker compose --profile dev up -d
```

This starts three containers:
- **app** -- Next.js application on `http://localhost:3020`
- **db** -- PostgreSQL on port 5438
- **mock-oidc** -- Mock OIDC provider on port 10091 (dev profile only)

The app container automatically runs database migrations and seeds sample data on first start.

### 3. Open the app

Navigate to **http://localhost:3020** and sign in with one of the test users:

| User | Role | Access |
|------|------|--------|
| Alex Admin | Admin | Full access including user/role management |
| Sam Analyst | Analyst | Vendor management, assessments, documents |
| Val Viewer | Viewer | Read-only access across the platform |
| Vic Vendor | Vendor | Vendor-scoped access |

### 4. Configure AI (optional)

To enable the AI agents, set your Azure AI Foundry credentials in `.env`:

```bash
AI_PROVIDER="anthropic_foundry"
AZURE_AI_FOUNDRY_ENDPOINT="https://your-resource.services.ai.azure.com/anthropic"
AZURE_AI_FOUNDRY_API_KEY="your-api-key"
AI_MODEL_COMPLEX="your-opus-deployment"
AI_MODEL_STANDARD="your-sonnet-deployment"
AI_MODEL_SIMPLE="your-haiku-deployment"
```

The app works without AI credentials -- agent features will be unavailable but all other functionality operates normally.

## Project Structure

```
TPRMAI/
├── src/
│   ├── app/                          # Next.js pages and API routes
│   │   ├── (authenticated)/          # Protected pages (dashboard, vendors, etc.)
│   │   ├── api/
│   │   │   ├── auth/                 # OIDC login, callback, logout, me
│   │   │   ├── onboarding/           # Document-driven vendor onboarding
│   │   │   ├── agents/               # AI agent trigger endpoints
│   │   │   ├── admin/                # User, role, prompt management
│   │   │   └── ...                   # Vendors, assessments, documents, reports
│   │   └── login/                    # Public login page
│   ├── components/
│   │   ├── ui/                       # Radix UI primitives (Button, Card, etc.)
│   │   └── onboarding/               # Onboarding wizard components
│   ├── lib/
│   │   ├── ai/                       # AI provider abstraction + safety controls
│   │   ├── agents/                   # 6 AI agents + orchestrator
│   │   ├── documents/                # Shared text extraction utilities
│   │   └── vendors/                  # Vendor deduplication logic
│   └── middleware.ts                 # Auth guard (JWT validation)
├── prisma/                           # Schema + seed data
├── mock-services/mock-oidc/          # Python mock OIDC provider
├── infra/                            # Terraform templates (Azure)
├── docs/
│   ├── agent-workflows.md            # AI agent documentation
│   ├── api-endpoints.md              # Complete API reference (42 endpoints)
│   └── attestations/                 # NeMo Guardrails safety attestations
├── docker-compose.yml                # App + PostgreSQL + mock-oidc
├── Dockerfile                        # Multi-stage Node.js build
└── .env.example                      # Environment variable reference
```

## AI Agents

The platform uses 6 specialized AI agents orchestrated in pipelines:

| Agent | Tier | Purpose |
|-------|------|---------|
| VERA | Standard | Vendor Evaluation and Risk Assessment |
| CARA | Complex | Comprehensive Analysis and Risk Assessment |
| DORA | Simple | Document Retrieval and Organization |
| SARA | Complex | Security Assessment Review and Analysis |
| RITA | Standard | Risk Intelligence and Trend Analysis |
| MARS | Standard | Mitigation Action and Remediation Strategy |

**New vendor pipeline:** VERA → CARA → DORA → RITA
**Reassessment pipeline:** SARA → MARS → RITA

See [docs/agent-workflows.md](docs/agent-workflows.md) for detailed agent documentation.

## API Reference

42 endpoints across auth, vendors, assessments, documents, findings, reports, dashboard, agents, orchestrator, onboarding, and admin routes.

See [docs/api-endpoints.md](docs/api-endpoints.md) for the complete reference.

## Development

### Local development (outside Docker)

```bash
npm install
npx prisma db push
npx prisma db seed
npm run dev
```

### Rebuild after code changes

```bash
docker compose --profile dev build app
docker compose --profile dev up -d app
```

### Stop all services

```bash
docker compose --profile dev down
```

### Production deployment

Set `ENFORCE_SECRETS=true` and configure real values for:
- `JWT_SECRET` (generate with `openssl rand -hex 32`)
- `OIDC_ISSUER_URL`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET` (your SSO provider)
- `DATABASE_URL` (production PostgreSQL)
- AI provider credentials

See [infra/](infra/) for Terraform templates targeting Azure (Resource Group, PostgreSQL Flexible Server, Key Vault, Container Registry, App Service).

## License

Internal use only -- Sleep Number Corporation.
