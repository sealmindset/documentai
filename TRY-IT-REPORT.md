# Document AI Platform -- Try-It Report
> Tested: 2026-05-21 (v3.2.0 contacts, prompt management, RBAC fix)
> Status: All Passing (4 roles, 21 pages each, 84 total tests)

## Summary

| What Was Tested | Result |
|----------------|--------|
| App starts up | PASS |
| Login works (all 4 roles) | PASS |
| All pages load | 84 of 84 passing |
| RBAC permissions | PASS |
| API responding | PASS |
| AI Prompt Management | PASS |
| Contacts system | PASS |
| Dependency health | 4 moderate (no high/critical) |

## Services

| Service | Container | Port | Status |
|---------|-----------|------|--------|
| App | docai-app | 3020 | Healthy |
| Database | docai-db | 5438 | Healthy |
| Mock OIDC | docai-mock-oidc | 10091 | Healthy |

## Login Testing

| User Type | Email | Login | Dashboard | Pages | Result |
|-----------|-------|-------|-----------|-------|--------|
| Admin (Alex Admin) | admin@example.com | PASS | PASS | 21/21 | PASS |
| Analyst (Sam Analyst) | analyst@example.com | PASS | PASS | 21/21 | PASS |
| Viewer (Val Viewer) | user@example.com | PASS | PASS | 21/21 | PASS |
| Vendor (Vic Vendor) | vendor@example.com | PASS | PASS | 21/21 | PASS |

## Pages Tested (21 pages)

| Page | URL | Admin | Analyst | Viewer | Vendor |
|------|-----|-------|---------|--------|--------|
| Dashboard | /dashboard | PASS | PASS | PASS | PASS |
| Pipeline | /dashboard/pipeline | PASS | PASS | PASS | PASS |
| Cases by Type | /dashboard/cases-by-type | PASS | PASS | PASS | PASS |
| Deadlines | /dashboard/deadlines | PASS | PASS | PASS | PASS |
| Motions | /dashboard/motions | PASS | PASS | PASS | PASS |
| Caseload | /dashboard/caseload | PASS | PASS | PASS | PASS |
| Billing | /dashboard/billing | PASS | PASS | PASS | PASS |
| Calendar | /dashboard/calendar | PASS | PASS | PASS | PASS |
| Parties | /parties | PASS | PASS | PASS | PASS |
| Contacts | /contacts | PASS | PASS | PASS | PASS |
| Document Reviews | /assessments | PASS | PASS | PASS | PASS |
| Documents | /documents | PASS | PASS | PASS | PASS |
| Issues | /findings | PASS | PASS | PASS | PASS |
| Reports | /reports | PASS | PASS | PASS | PASS |
| AI Agents | /agents | PASS | PASS | PASS | PASS |
| Settings | /settings | PASS | PASS | PASS | PASS |
| Admin: Users | /admin/users | PASS | PASS | PASS* | PASS* |
| Admin: Roles | /admin/roles | PASS | PASS | PASS* | PASS* |
| Admin: Prompts | /admin/prompts | PASS | PASS | PASS* | PASS* |
| Admin: Activity Logs | /admin/logs | PASS | PASS | PASS* | PASS* |
| Admin: App Settings | /admin/settings | PASS | PASS | PASS | PASS |

*Page loads but shows empty data — API correctly enforces RBAC permissions

## RBAC Verification

| Feature | Admin | Analyst | Viewer | Vendor |
|---------|-------|---------|--------|--------|
| Full sidebar (Users, Roles, Prompts, Logs) | YES | YES | NO | NO |
| View/edit AI prompts | YES | NO | NO | NO |
| Prompt data visible on admin page | 8 prompts | Empty | Empty | Empty |

## AI Prompt Management

| Agent | Slug | Category | Model Tier | Status |
|-------|------|----------|------------|--------|
| ARIA | aria-system | system | complex | Active |
| ATLAS | atlas-system | system | standard | Active |
| AURA | aura-similarity | system | simple | Active |
| AURA | aura-system | system | standard | Active |
| CLARA | clara-system | system | complex | Active |
| DORA | dora-system | system | simple | Active |
| LEXA | lexa-system | system | standard | Active |
| RITA | rita-system | system | standard | Active |

Features: Edit prompt content, version history, active/inactive toggle, change summary, safety preamble (immutable, auto-prepended), content validation on save.

## Contacts System

- 15 seed contacts (prosecutors, judges, expert witnesses, opposing counsel, etc.)
- Many-to-many case linking via CaseContact table with legal roles
- Full CRUD in modal interface (role-based permissions)
- Contact detail: name, organization, title, address, multiple phones/emails with types
- Linked cases clickable from contact modal
- Case detail page shows contacts section with expandable cards

## Recent Changes (this session)

1. **RBAC fix**: Seed users aligned with mock-oidc (emails + oidcSubjects). Admin now correctly gets ADMIN role, not VIEWER.
2. **Contacts system**: New Contact, ContactPhone, ContactEmail, CaseContact models. Full API (4 route files). List page with DataTable + detail/edit/create modals. Sidebar nav item added.
3. **Vendors → Parties rename**: All frontend routes moved from /vendors to /parties. API routes unchanged.
4. **Case detail contacts**: Expandable contact cards with role badges, phone/email details.
5. **Mock OIDC updated**: User names match seed data (Val Viewer, Vic Vendor).

## Screenshots

98 screenshots saved in `.try-it/screenshots/` covering all 4 roles across 21 pages.

Key screenshots:
- `admin_dashboard.png` -- Full managing partner dashboard
- `admin_admin_prompts.png` -- AI Prompt Management with 8 prompts
- `admin_contacts.png` -- Contacts list page
- `viewer_dashboard.png` -- Viewer role dashboard (limited sidebar)
- `viewer_admin_prompts.png` -- Viewer sees empty prompts (RBAC enforced)
- `prompt_editor.png` -- Prompt editor dialog
- `case_contacts_section.png` -- Case detail with linked contacts
- `contacts_list.png` -- Full contacts page

## How to Access Your App

- **Open your browser to:** http://localhost:3020
- **Admin:** Click "Sign in with SSO", pick "Alex Admin" -- full access including prompt management
- **Analyst:** Click "Sign in with SSO", pick "Sam Analyst" -- case data, no admin features
- **Viewer:** Click "Sign in with SSO", pick "Val Viewer" -- read-only access
- **Vendor:** Click "Sign in with SSO", pick "Vic Vendor" -- limited external access

## Dependency Health

4 moderate npm vulnerabilities remaining (no auto-fix available without breaking changes). No high or critical issues.

## What to Do Next

- Explore AI Prompt Management: log in as Admin, go to Prompts in the sidebar
- Click Edit on any agent prompt to see the full system prompt and modify it
- Check the Contacts page for all 15 linked contacts
- Open a case detail and scroll to "Case Contacts" section
- Try different roles to see RBAC in action
- When you're happy, type **/ship-it** to deploy
- To make changes, type **/resume-it**
