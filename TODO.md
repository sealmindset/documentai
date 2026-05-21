# TODO - Document AI Platform

## High Priority

- [x] ~~**Environment: Configure AI credentials** - Azure AI Foundry endpoint + API key configured, all 3 model tiers verified~~

## Medium Priority

- [ ] **Testing: Add test suite** - No tests currently exist. Add Vitest for unit tests, Playwright for E2E
- [ ] **Standards: Prompt Management upgrade** - Current Tier 2 Outdated (3 of 6 scaffold tables, 1 admin page, 0 scaffold components). Upgrade to Tier 2 Standard with card-based registry, guided editing, version history, safety indicators
- [ ] **Standards: Wrap existing API routes with withRequestLog** - Activity log store exists but only logs when routes use the wrapper. Apply to high-traffic routes (vendors, agents, orchestrator)
- [ ] **Standards: ESLint warnings cleanup** - 55 warnings (unused vars, any types, console.log). Non-blocking but should be cleaned up
- [ ] **Onboarding: Add business criticality selection** - The onboarding wizard defaults to STANDARD business criticality; add a selector step for data types accessed, system integrations, PII/PHI/PCI flags, and criticality level

## Low Priority

- [ ] **CI/CD: Set up GitHub Actions** - Quality gate workflow created (.github/workflows/quality-gate.yml) but CI/CD deployment pipeline still needed
- [ ] **Dependencies: postcss vulnerability in Next.js** - 2 moderate advisories (GHSA-qx2v-qp2m-jg93) in postcss 8.4.31 bundled inside next.js. No fix until Next.js 16.3.0+ ships with postcss ≥8.5.10. Build-time CSS processor, low runtime risk
- [ ] **Standards: Brain Layer** - AI memory system for persistent context across sessions. Nice-to-have enhancement
- [ ] **Pre-commit hooks** - Install pre-commit tool: `pip install pre-commit && pre-commit install`
- [ ] **Integration: SharePoint document pickup** - Automate document ingestion from SharePoint instead of manual upload. Connect to SharePoint API, watch configured document libraries, auto-trigger AURA extraction on new files

## Completed

- [x] Import codebase to GitHub-managed local repository
- [x] Initialize git repository
- [x] Install npm dependencies
- [x] Create make-it framework files (app-context.json, CHANGELOG.md, TODO.md)
- [x] Initialize SQLite database (`npx prisma db push`)
- [x] Configure DATABASE_URL for SQLite
- [x] Fix TypeScript errors (JSON string fields, generic types)
- [x] Make LLM initialization lazy (build succeeds without AI credentials)
- [x] Consolidate dual app structure (merged /app and /src/app)
- [x] Verify build passes (`npm run build`)
- [x] **Security: Upgrade Next.js** - Upgraded from 14.2.0 to 16.1.6
- [x] **Security: Fix npm vulnerabilities** - All 22 vulnerabilities resolved (0 remaining)
- [x] **Docs: Update CLAUDE.MD** - Added Claude via Azure AI Foundry as primary AI provider
- [x] **Clarify AI provider** - Claude via Azure AI Foundry is PRIMARY, OpenAI is optional alternative only
- [x] **Replace xlsx with exceljs** - Fixed vulnerable xlsx dependency
- [x] **Retrofit Phase A** - Docker, PostgreSQL, mock-oidc
- [x] **Retrofit Phase B** - OIDC auth, database-driven RBAC, JWT sessions, admin UI, permission middleware
- [x] **Retrofit Phase C** - Multi-provider AI abstraction, model tiering, LangChain removal
- [x] **Retrofit Phase D** - UI pages (Assessments, Documents, Reports, Settings), DataTable component, admin table upgrade
- [x] **Retrofit Phase E** - Rich seed data, security headers, Terraform templates, deployment config
- [x] **Cleanup: Remove legacy files** - Removed skills/ (8.6MB generic Claude skills), diagrams/, DATABASE_SETUP.md, TPRM-Process-Requirements.md
- [x] **Cleanup: Update CLAUDE.MD** - Updated project structure and tech stack to reflect current state
- [x] **Standards: Code Quality** - ESLint 9 flat config, Prettier, pre-commit hooks config, gitleaks, CI quality gate workflow, quality scripts
- [x] **Standards: Activity Logs** - In-memory LogStore, request logger, admin UI (/admin/logs), API endpoints, RBAC permissions
- [x] **Standards: App Settings** - DB-backed settings with admin UI (/admin/settings), cache, masking, audit log, 13 seeded settings
- [x] **Security: Fix npm vulnerabilities** - Resolved 4 of 6 (brace-expansion, dompurify, lodash, picomatch). Remaining 2 postcss in next.js
- [x] **Fix: React hook errors** - 3 bugs fixed (prompts useCallback, documents useMemo, login derived state)
