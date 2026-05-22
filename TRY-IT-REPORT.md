# Document AI Platform -- Try-It Report
> Tested: 2026-05-21 (v4.4.0 Brain Layer, Prompt Management Tier 2 Standard)
> Status: All Passing (3 roles, 57 total tests)

## Summary

| What Was Tested | Result |
|----------------|--------|
| App starts up | PASS |
| Login works (all 3 roles) | PASS |
| All pages load | 57 of 57 passing |
| RBAC permissions | PASS |
| API responding | PASS |
| AI Prompt Management (Tier 2) | PASS |
| Brain Layer (AI Memory) | PASS |

## Services

| Service | Container | Port | Status |
|---------|-----------|------|--------|
| App | docai-app | 3020 | Healthy |
| Database | docai-db | 5438 | Healthy |
| Mock OIDC | docai-mock-oidc | 10091 | Healthy |

## Login Testing

| User Type | Email | Login | Dashboard | Pages | Result |
|-----------|-------|-------|-----------|-------|--------|
| Admin (Alex Admin) | admin@example.com | PASS | PASS | 22/22 | PASS |
| Analyst (Sam Analyst) | analyst@example.com | PASS | PASS | 16/16 | PASS |
| Viewer (Val Viewer) | user@example.com | PASS | PASS | 16/16 | PASS |

## Pages Tested

| Page | URL | Admin | Analyst | Viewer |
|------|-----|-------|---------|--------|
| Dashboard | /dashboard | PASS | PASS | PASS |
| Pipeline | /dashboard/pipeline | PASS | PASS | PASS |
| Cases by Type | /dashboard/cases-by-type | PASS | PASS | PASS |
| Deadlines | /dashboard/deadlines | PASS | PASS | PASS |
| Motions | /dashboard/motions | PASS | PASS | PASS |
| Caseload | /dashboard/caseload | PASS | PASS | PASS |
| Billing | /dashboard/billing | PASS | PASS | PASS |
| Calendar | /dashboard/calendar | PASS | PASS | PASS |
| Clients | /clients | PASS | PASS | PASS |
| Contacts | /contacts | PASS | PASS | PASS |
| Documents | /documents | PASS | PASS | PASS |
| Reports | /reports | PASS | PASS | PASS |
| AI Agents | /agents | PASS | PASS | PASS |
| Settings | /settings | PASS | PASS | PASS |
| AI Memory (User) | /settings/ai-memory | PASS | PASS | PASS |
| Admin: Users | /admin/users | PASS | -- | -- |
| Admin: Roles | /admin/roles | PASS | -- | -- |
| Admin: Settings | /admin/settings | PASS | -- | -- |
| Admin: AI Instructions | /admin/prompts | PASS | -- | -- |
| Admin: Activity Logs | /admin/logs | PASS | -- | -- |
| Admin: AI Memory | /admin/ai-memory | PASS | -- | -- |

## New Features (v4.4.0)

### AI Prompt Management (Tier 2 Standard)
- Card-based registry with 9 agent prompts
- Stats bar: Total Prompts, Published, Drafts, Agents
- Grid/list view toggle, search, agent/category filters
- Safety badges (Safe/Warning) and Published/Draft status
- 5 scaffold components: prompt-card, prompt-editor, safety-indicator, variable-pill, version-timeline
- Save Draft -> Test -> Publish workflow with adversarial testing
- Sidebar label updated to "AI Instructions"

### Brain Layer (AI Memory)
- Admin page: stats cards (Active, Approved, Pending, Archived), category/source breakdowns, memory list with approve/archive/delete, Run Decay
- User page: simplified view with search, category filter, Add Memory
- Brain service: confidence decay (0.02 rate, 30-day stale threshold), context assembly for agent prompts
- BaseAgent integration: `_loadBrainContext()` appends brain context to system prompts
- RBAC: brain.view, brain.create, brain.edit, brain.delete permissions
- Feature flag: brain.enabled in App Settings

### OIDC login_hint Passthrough
- Login route now forwards `login_hint` query parameter to OIDC provider
- Enables automated testing without manual user selection

## AI Prompt Management

| Agent | Slug | Category | Model Tier | Status |
|-------|------|----------|------------|--------|
| ARIA | aria-system | system | complex | Published |
| ATLAS | atlas-system | system | standard | Published |
| AURA | aura-similarity | system | simple | Published |
| AURA | aura-system | system | standard | Published |
| CLARA | clara-system | system | complex | Published |
| DORA | dora-system | system | simple | Published |
| LEXA | lexa-system | system | standard | Published |
| RITA | rita-system | system | standard | Published |
| SAGE | sage-system | system | standard | Published |

## Screenshots

57 screenshots saved in `try-it-screenshots/` covering all 3 roles across all pages.

Key screenshots:
- `admin_Dashboard.png` -- Managing Partner Dashboard with case pipeline, alerts
- `admin_AdminPrompts.png` -- AI Prompt Management card grid (9 prompts)
- `admin_AdminAIMemory.png` -- Brain Layer admin with stats and controls
- `admin_Agents.png` -- AI Agents workflow visualization
- `admin_Clients.png` -- 96 seeded cases with priority tiers
- `analyst_Dashboard.png` -- Analyst role dashboard
- `viewer_AIMemory.png` -- User-facing AI Memory page

## How to Access Your App

- **Open your browser to:** http://localhost:3020
- **Admin:** Click "Sign in with SSO", pick "Alex Admin" -- full access including prompt management and AI Memory admin
- **Analyst:** Click "Sign in with SSO", pick "Sam Analyst" -- case data, agents, user AI Memory
- **Viewer:** Click "Sign in with SSO", pick "Val Viewer" -- read-only access, user AI Memory

## What to Do Next

- Explore AI Instructions: log in as Admin, find "AI Instructions" in the admin sidebar
- Click any prompt card to edit, test, and publish agent prompts
- Visit AI Memory (admin sidebar) to see the Brain Layer dashboard
- Visit Settings > AI Memory as any role to see the user view
- Try the Agents page for the full workflow visualization
- When you're happy, type **/ship-it** to deploy
- To make changes, type **/resume-it**
