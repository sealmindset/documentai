# Changelog

All notable changes to Document AI Platform will be documented in this file.

## [4.3.0] - 2026-05-21

### Added
- **Phase 3: SharePoint Document Pickup** — automatic document ingestion from SharePoint/OneDrive via Microsoft Graph API
  - Shared Graph client (`graph-client.ts`) extracted from email service — reused by email and SharePoint
  - SharePoint service: list sites, list libraries, list/download files, sync tracking, AURA processing
  - Configurable sync connections: pick a SharePoint site, document library, and optional folder path
  - File tracking with dedup (SharePoint item ID + last-modified check prevents re-downloading)
  - Auto-processing: downloaded files run through AURA for extraction and classification, then linked to matching clients
  - Management UI (`/sharepoint`): add connections, sync libraries, process pending files, view file status
  - DB models: `sharepoint_syncs` (connection configs), `sharepoint_files` (tracked files with status)
  - API routes: sites, libraries, configs CRUD, sync trigger, process trigger

### Fixed
- **ECHO CC bounce** — auto-CC firm email now controlled by `email.auto_cc_firm` setting (defaults off)
- **Email subject placeholders** — unresolved `{{...}}` merge fields stripped from subject lines

## [4.0.0] - 2026-05-21

### Changed
- **BREAKING: Full terminology normalization from TPRM to legal-centric naming**
  - Database: Vendor→Client, RiskProfile→ClientProfile, RiskAssessment→CaseReview, RiskFinding→Issue, RemediationAction→ActionItem
  - Tables: vendors→clients, risk_profiles→client_profiles, risk_assessments→case_reviews, risk_findings→issues, remediation_actions→action_items
  - Fields: vendorId→clientId, riskTier→priorityTier, overallRiskScore→overallReviewScore, riskRating→reviewRating, all categoryRiskScore→categoryScore, findingId→issueCode/issueId, assessmentId→caseReviewId
  - API routes: /api/vendors→/api/clients
  - Frontend routes: /parties→/clients
  - Permission resource: vendors→clients
  - All agent code, lib files, components, and seed data updated
- Prisma migration renames tables and columns (data-preserving ALTER statements)

## [3.1.0] - 2026-05-21

### Added
- **Testing: Vitest unit test suite** -- 83 tests across 7 test files covering:
  - AI input sanitization (prompt injection, control chars, delimiter wrapping, size limits)
  - AI output validation (schema rules, enum checks, range clamping, JSON recovery)
  - Prompt template validation (blocked patterns, warnings, safe rendering, adversarial testing)
  - AI rate limiting (per-user request limits, token budgets, 429 responses)
  - PII masking/unmasking (emails, phones, SSNs, roundtrip, env toggle)
  - Activity log store (circular buffer, FIFO eviction, filtering, noise skipping, stats)
  - Auth permission checking (hasPermission, AuthMe type contract)
- **Testing: Playwright E2E test suite** -- smoke tests for auth API, protected routes, admin routes, rate limiting, content-type validation (requires running Docker app)
- vitest.config.ts with `@/` path alias resolution
- playwright.config.ts targeting localhost:3020
- npm scripts: `test`, `test:watch`, `test:e2e`, `test:all`

## [3.0.0] - 2026-05-21

### Changed
- **BREAKING: Full rebrand from "AI TPRM Machine" to "Document AI Platform"**
  - Organization: Sleep Number → Vanmerven Law Firm (VLF)
  - Purpose: Third Party Risk Management → Legal Document Intelligence
  - Users: InfoSec team → Legal team (in-house counsel, paralegals, legal ops)
- **Agent rebrand**: VERA→LEXA, CARA→CLARA, SARA→ARIA, MARS→ATLAS (DORA, RITA, AURA unchanged)
  - LEXA: Legal Examination & Assessment Agent (party profiling)
  - CLARA: Comprehensive Legal Analysis & Review Agent (document review)
  - ARIA: Automated Review, Identification & Analysis Agent (document analysis)
  - ATLAS: Action Tracking & Legal Advisory System Agent (action planning)
- **UI label rebrand** (DB schema unchanged):
  - Vendors → Parties, Risk Profiles → Party Profiles, Risk Assessments → Document Reviews
  - Risk Findings → Issues, Remediation Actions → Action Items
  - Risk Score → Review Score, Risk Tier → Priority Tier
- All agent system prompts rewritten for legal document context
- Docker container names: tprmai-* → docai-*, DB creds: tprm_* → docai_*
- Seed data: User emails @tprmai.local → @docai.local, department → Legal Document Intelligence
- Onboarding wizard: vendor-centric → party-centric language
- Pipeline progress: agent names and descriptions updated

### Added
- TODO: SharePoint document pickup integration (future feature)

## [2.10.0] - 2026-05-21

### Added
- **Code Quality Infrastructure**: ESLint 9 flat config, Prettier, pre-commit hooks, gitleaks secret detection, CI quality gate workflow
  - `npm run lint` / `npm run format` / `npm run format:check` / `npm run type-check` / `npm run quality`
  - `.github/workflows/quality-gate.yml` — lint, type-check, format, security scan, build, attestation artifact
  - `.pre-commit-config.yaml` with trailing whitespace, merge conflict, JSON, YAML, gitleaks, ESLint, Prettier hooks
  - `.gitleaks.toml` with allowlists for mock service tokens and .env.example
- **Activity Logs**: In-memory request logging with admin UI
  - `LogStore` circular buffer with configurable `LOG_BUFFER_SIZE` (default 10,000)
  - `withRequestLog` wrapper for API route response tracking
  - `logOutbound` utility for external HTTP call logging
  - Admin page at `/admin/logs` with stats cards, status badges, filters, auto-refresh, DataTable
  - API: `GET /api/admin/logs/events` (filtered, paginated), `GET /api/admin/logs/stats`, `DELETE /api/admin/logs/events`
  - RBAC: `logs.view` (ADMIN only), `logs.delete` (ADMIN only)
- **Application Settings**: Database-backed settings with admin UI
  - `AppSetting` and `AppSettingAuditLog` Prisma models
  - Settings service with 60s in-memory cache, `.env` fallback, sensitive value masking
  - Admin page at `/admin/settings` with group tabs, inline editing, masked sensitive values, reveal button, audit log dialog
  - API: `GET /api/admin/settings`, `PUT /api/admin/settings/[key]`, `GET /api/admin/settings/[key]` (reveal), `GET /api/admin/settings/audit-log`
  - 13 seeded settings across 5 groups (Authentication, AI Configuration, AI Safety, Observability, Security)

### Fixed
- 4 npm vulnerabilities resolved (brace-expansion, dompurify, lodash, picomatch)
- 3 React hook errors fixed (useCallback for fetchPrompts, useMemo for document expiry, derived state for login error)
- ESLint downgraded from 10 to 9 for eslint-config-next compatibility
- React 19 compiler rules (set-state-in-effect, purity, immutability) set to warn level

### Changed
- Sidebar: Added Activity Logs and App Settings nav items
- Seed data: Added `logs` resource to RBAC permissions, 13 app settings across 5 groups

### Security
- 2 remaining postcss vulnerabilities tracked in TODO.md (bundled in next.js, no fix until 16.3.0+)

## [2.9.0] - 2026-04-02

### Added
- **Functional Notification Bell**: Click the bell icon to see a dropdown of color-coded notifications
  - Red = Escalations, Orange = Remediation Required, Blue = Document Requests
  - Click a notification to see full details in a modal dialog
  - "Go to" button navigates to the relevant page (findings, vendors, documents, etc.)
  - Mark individual notifications or all as read
  - Unread badge count with 30-second auto-polling
  - Notifications scoped to logged-in user: broadcast INTERNAL + targeted by user ID
- **Notification API**: `GET /api/notifications`, `PATCH /api/notifications`, `GET /api/notifications/count`
- **Seed notifications**: 5 sample notifications (escalations, remediation, document requests) tied to seeded users and findings

## [2.8.0] - 2026-04-02

### Added
- **AURA Agent** (Automated Upload & Recognition): 7th AI agent formalizing document extraction and similarity comparison
  - Extends BaseAgent with full safety pipeline (sanitize, validate, PII mask, prompt management)
  - Two managed prompts: `aura-system` (extraction, standard tier) and `aura-similarity` (comparison, simple tier)
  - Both prompts editable via admin AI Prompt Management UI
  - `POST /api/agents/aura` endpoint with discriminated union for extract/compare actions
  - Multimodal support for image document extraction
  - Activity logging for both DOCUMENT_EXTRACTION and DOCUMENT_COMPARISON

### Changed
- Refactored `/api/onboarding/extract` to delegate to AURA agent (removes 60-line inline prompt + manual chat() call)
- Refactored `/api/onboarding/dedup` to delegate to `aura.compareDocuments()` (removes inline SIMILARITY_PROMPT + manual chat() call)
- Documents created via onboarding now show `retrievedBy: 'AURA'` instead of `'USER_UPLOAD'`
- Sidebar now displays all 7 agents (added AURA)
- Updated `docs/agent-workflows.md` with AURA section

## [2.7.0] - 2026-04-01

### Added
- **Document-Driven Vendor Onboarding**: Upload vendor documents and the system automatically extracts vendor info, checks for duplicates, and triggers the full AI assessment pipeline
  - New "Upload & Onboard" button on the Documents page
  - AI-powered vendor info extraction from PDFs, DOCX, XLSX, and images (standard tier)
  - Multi-point vendor deduplication: exact DUNS match (strong) + fuzzy matching on name, phone, address, and contacts
  - Semantic document similarity comparison via AI (simple tier) to detect identical, updated, or different documents
  - Side-by-side vendor comparison dialog when duplicates are found
  - Pre-filled vendor form with confidence indicators for AI-extracted fields
  - Full orchestrator pipeline integration (VERA→CARA→DORA→RITA for new vendors, SARA→MARS→RITA for reassessment)
  - Pipeline progress stepper showing real-time agent execution status
- **3 new API endpoints**: `/api/onboarding/extract`, `/api/onboarding/dedup`, `/api/onboarding/confirm`
- **Shared text extraction utility** (`src/lib/documents/extract-text.ts`) — factored out from analyze route
- **Vendor dedup utility** (`src/lib/vendors/dedup.ts`) — multi-point matching with string-similarity
- **5 new UI components**: `onboarding-wizard`, `file-upload-zone`, `vendor-info-form`, `dedup-match-dialog`, `pipeline-progress`
- **string-similarity** npm package for fuzzy vendor name/contact matching

### Changed
- Refactored `/api/documents/analyze` to use shared text extraction utility (no behavior change)

## [2.6.0] - 2026-04-01

### Added
- **docs/agent-workflows.md**: Complete documentation for all 6 AI agents (VERA, CARA, DORA, SARA, RITA, MARS), orchestrator workflows, BaseAgent pipeline, tier assignments, and input/output contracts
- **docs/api-endpoints.md**: Complete API reference for all 42 endpoints across auth, vendors, assessments, documents, findings, reports, dashboard, agents, orchestrator, and admin routes

## [2.5.0] - 2026-04-01

### Changed
- **AI Provider**: Rewrote `anthropic_foundry` provider to use the Anthropic SDK instead of raw OpenAI-compatible fetch calls
- **Dual-mode auth**: API key (AZURE_AI_FOUNDRY_API_KEY) is used when set; falls back to DefaultAzureCredential (Entra ID) when empty
- **Env var naming**: Renamed AZURE_OPENAI_* to AZURE_AI_FOUNDRY_* to match actual Anthropic endpoint
- **Docker Compose**: AI provider env vars now passed through to the app container (were commented out)
- **Model deployments**: Configured for Sleep Number Azure AI Foundry (Opus 4.5, Sonnet 4.5, Haiku 4.5)

## [2.4.0] - 2026-03-20

### Removed
- **skills/** directory (8.6 MB) — generic Claude Code skills (pptx, algorithmic-art, canvas-design, etc.) unrelated to the TPRM app
- **diagrams/** directory — draw.io and mermaid TPRM process diagrams from original OneDrive import
- **DATABASE_SETUP.md** — outdated SQLite setup instructions (app now uses PostgreSQL via Docker)
- **TPRM-Process-Requirements.md** — original requirements doc from OneDrive import

### Changed
- Updated **CLAUDE.MD** with current tech stack (PostgreSQL, OIDC, RBAC, AI Safety, Docker) and accurate project structure
- Updated **.gitignore** to prevent removed directories from being re-added
- Cleaned up **TODO.md** — marked cleanup items complete

## [2.3.0] - 2026-03-17

### Added
- **Rich seed data**: 7 realistic vendors (Snowflake, Salesforce, CrowdStrike, Workday, Stripe, Acme Logistics, CloudSecure Analytics) with risk profiles, documents, assessments, findings, reports, and agent activity
- **Terraform infrastructure templates** (`infra/main.tf`): Azure Resource Group, PostgreSQL Flexible Server, Key Vault, Container Registry, App Service
- **Deployment configuration** (`.ship-it.yml`): Build, deploy, and rollback steps for local/staging/production
- **Security headers** in `next.config.js`: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy

### Changed
- Seed data expanded from 3 basic vendors to 7 fully-populated vendors with related entities across all tables
- `.gitignore` updated to exclude Terraform state files and production tfvars

## [2.2.0] - 2026-03-17

### Added
- **Reusable DataTable component** with sorting, pagination, and empty states (`src/components/ui/data-table.tsx`)
- **Assessments page** (`/assessments`) — list, filter, and search vendor risk assessments
- **Documents page** (`/documents`) — browse vendor security docs with status/expiration tracking
- **Reports page** (`/reports`) — view AI-generated risk reports with content preview dialog
- **Settings page** (`/settings`) — system info, user account details, AI agent configuration overview
- **Assessments API** (`/api/assessments`) — GET with vendor, status, and type filters
- **Reports API** (`/api/reports`) — GET with vendor, status, and type filters

### Changed
- Admin Users table upgraded from plain HTML to Radix UI Table component with Badge for status
- All sidebar navigation links now point to implemented pages (no more stubs)

## [2.1.0] - 2026-03-17

### Changed
- **BREAKING: Replaced LangChain with direct multi-provider AI abstraction**
  - New `src/lib/ai/provider.ts` supports 4 providers: Azure AI Foundry, Claude API, OpenAI, Ollama
  - Provider selected via `AI_PROVIDER` env var
  - Model tiering: complex/standard/simple mapped to `AI_MODEL_COMPLEX/STANDARD/SIMPLE` env vars
  - All 6 agents updated to use tier-based model selection
  - Document analysis route rewritten to use new provider
- Removed LangChain, @langchain/openai, @langchain/core, @langchain/anthropic dependencies
- Removed NextAuth, @auth/prisma-adapter, bcryptjs dependencies (leftover from Phase B)

### Added
- Multi-provider AI abstraction (`src/lib/ai/provider.ts`)
  - `chat()`, `complete()`, `completeJSON()` public API
  - Azure AI Foundry provider with Entra ID token auth and fallback model support
  - Claude API provider (direct Anthropic API)
  - OpenAI provider
  - Ollama provider (local inference)
- Agent tier assignments: CARA/SARA → complex, VERA/RITA/MARS → standard, DORA → simple
- `ChatMessage`, `ChatOptions`, `ChatResponse` types for provider-agnostic messaging

## [2.0.0] - 2026-03-17

### Changed
- **BREAKING: Replaced NextAuth with OIDC + stateless JWT authentication**
  - Login via SSO (mock-oidc in dev, any OIDC provider in production)
  - Stateless JWT cookie-based sessions (no server-side session store)
  - Removed NextAuth, @auth/prisma-adapter, bcryptjs dependencies
  - Removed "Continue to Demo" bypass on login page
- Consolidated 4 duplicate layouts into one shared authenticated layout using route group
- Sidebar navigation now shows/hides items based on user permissions
- Header displays real user name, role, and logout button

### Added
- Database-driven RBAC: Role, Permission, RolePermission models in Prisma
- 4 system roles: ADMIN, ANALYST, VIEWER, VENDOR with auto-generated permissions
- Per-resource CRUD permissions for all app pages (40+ permissions)
- `requirePermission(resource, action)` middleware on all API routes
- OIDC auth flow: /api/auth/login, /api/auth/callback, /api/auth/me, /api/auth/logout
- Auth context provider (useAuth hook) for frontend permission checking
- Route-protecting middleware (redirects unauthenticated users to /login)
- Admin UI: User Management page (/admin/users)
- Admin UI: Role Management page with permission matrix (/admin/roles)
- Admin API: CRUD endpoints for users, roles, and permissions
- Seed data: 4 roles, 40+ permissions, 4 users aligned with mock-oidc test users
- jose package for JWT signing/verification (Edge Runtime compatible)

### Security
- All API routes now require authentication (middleware) and authorization (permissions)
- Removed Google Fonts import (Zscaler-safe system fonts)
- Removed password-based authentication entirely
- User roles sourced from application database, never from OIDC claims

## [1.2.0] - 2026-03-16

### Changed
- Switched to Entra ID authentication for Azure AI Foundry (no API keys required)
- Uses `DefaultAzureCredential` from @azure/identity for seamless az login integration
- Removed API key requirements from base-agent.ts and document analysis route

### Added
- @azure/identity package for Azure authentication

### Documentation
- Updated .env.example with Entra ID auth instructions

## [1.1.0] - 2026-03-16

### Changed
- Clarified Claude via Azure AI Foundry as PRIMARY AI provider (OpenAI is optional alternative only)
- Updated document analysis route to use Azure AI Foundry instead of direct Anthropic SDK
- Replaced vulnerable `xlsx` package with `exceljs` for Excel file processing
- Updated route handlers for Next.js 16 async params compatibility
- Added Turbopack configuration for Next.js 16

### Fixed
- All npm security vulnerabilities resolved (0 remaining)
- Next.js upgraded from 14.2.0 to 16.1.6

### Documentation
- Updated .env.example to clarify AI provider hierarchy
- Updated CLAUDE.MD with current tech stack

## [1.0.0] - 2026-03-16

### Added
- Imported existing codebase from OneDrive to GitHub-managed local repository
- Set up make-it framework for structured development
- Created app-context.json with project configuration

### Project Structure (Imported)
- Next.js 16 frontend with Tailwind CSS and Radix UI
- Prisma ORM with SQLite database
- 6 AI Agents: VERA, CARA, DORA, SARA, RITA, MARS
- Core entities: Vendors, Risk Profiles, Risk Assessments, Documents, Risk Findings, Reports, Remediation Actions
- Authentication via NextAuth with role-based access (ADMIN, ANALYST, VIEWER, VENDOR)
- AuditBoard API integration skill

### Security
- ~~Identified Next.js 14.2.0 security vulnerability~~ (fixed in 1.1.0)
- ~~22 npm vulnerabilities detected~~ (fixed in 1.1.0)

---

## Pre-Import History

The original codebase was developed January - March 2026 in the "AI TPRM MACHINE" OneDrive folder. Key milestones:

- **Jan 5, 2026**: Initial project setup with Next.js
- **Jan 7, 2026**: PowerPoint generation scripts added
- **Feb 12, 2026**: AuditBoard integration skill created
- **Mar 5-6, 2026**: Database schema finalized, document processing scripts added
- **Mar 12, 2026**: Latest updates to components and dependencies
