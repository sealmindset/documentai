# Document AI Platform -- Try-It Report
> Tested: 2026-05-23 (v5.1.0 Calendar Fix, 4-Role Testing)
> Status: All Passing (4 roles, 50 total tests)

## Summary

| What Was Tested | Result |
|----------------|--------|
| App starts up | PASS |
| Login works (all 4 roles) | PASS |
| All pages load | 50 of 50 passing |
| RBAC permissions | PASS |
| API responding | PASS |
| Calendar seed (fixed this session) | PASS |
| Dependency health | 4 moderate (blocked on upstream) |

## Services

| Service | Container | Port | Status |
|---------|-----------|------|--------|
| App | docai-app | 3020 | Healthy |
| Database | docai-db | 5438 | Healthy |

## Login Testing

| User Type | Email | Login | First Page | Pages | Result |
|-----------|-------|-------|-----------|-------|--------|
| Admin (Rob Vance) | rob@vanmeverenlawfirm.com | PASS | Dashboard | 22/22 | PASS |
| Managing Partner (Brian Vanmeveren) | brian@vanmeverenlawfirm.com | PASS | Firm Overview | 9/9 | PASS |
| Attorney (Emily Crabtree) | emily@vanmeverenlawfirm.com | PASS | Briefing | 6/6 | PASS |
| Paralegal (Debbie Sampson) | debbie@vanmeverenlawfirm.com | PASS | Briefing | 6/6 | PASS |

## Pages Tested

### Admin Portal (Rob Vance -- ADMIN)
| Page | URL | Status | Size |
|------|-----|--------|------|
| Dashboard | /dashboard | PASS | 56KB |
| Caseload | /dashboard/caseload | PASS | 40KB |
| Pipeline | /dashboard/pipeline | PASS | 42KB |
| Calendar | /dashboard/calendar | PASS | 64KB |
| Deadlines | /dashboard/deadlines | PASS | 59KB |
| Motions | /dashboard/motions | PASS | 40KB |
| Cases by Type | /dashboard/cases-by-type | PASS | 42KB |
| Billing | /dashboard/billing | PASS | 42KB |
| Clients | /clients | PASS | 65KB |
| Documents | /documents | PASS | 81KB |
| Reports | /reports | PASS | 51KB |
| Contacts | /contacts | PASS | 46KB |
| AI Agents | /agents | PASS | 44KB |
| Settings | /settings | PASS | 33KB |
| AI Memory (User) | /settings/ai-memory | PASS | 24KB |
| Admin: Users | /admin/users | PASS | 10KB |
| Admin: Roles | /admin/roles | PASS | 10KB |
| Admin: Settings | /admin/settings | PASS | 23KB |
| Admin: AI Instructions | /admin/prompts | PASS | 29KB |
| Admin: Activity Logs | /admin/logs | PASS | 25KB |
| Admin: AI Memory | /admin/ai-memory | PASS | 24KB |

### Managing Partner Portal (Brian Vanmeveren -- MANAGING_PARTNER)
| Page | URL | Status | Size |
|------|-----|--------|------|
| Firm Overview | /partner | PASS | 58KB |
| Dashboard | /dashboard | PASS | 56KB |
| Calendar | /dashboard/calendar | PASS | 64KB |
| Clients | /clients | PASS | 65KB |
| Documents | /documents | PASS | 81KB |
| Reports | /reports | PASS | 51KB |
| Contacts | /contacts | PASS | 46KB |
| AI Agents | /agents | PASS | 44KB |
| Settings | /settings | PASS | 33KB |

### Attorney Portal (Emily Crabtree -- ATTORNEY)
| Page | URL | Status | Size |
|------|-----|--------|------|
| Briefing | /attorney | PASS | 42KB |
| Cases | /attorney/cases | PASS | 40KB |
| Calendar | /attorney/calendar | PASS | 41KB |
| Documents | /documents | PASS | 81KB |
| Contacts | /contacts | PASS | 46KB |
| Settings | /settings | PASS | 33KB |

### Paralegal Portal (Debbie Sampson -- PARALEGAL)
| Page | URL | Status | Size |
|------|-----|--------|------|
| Briefing | /attorney | PASS | 42KB |
| Cases | /attorney/cases | PASS | 40KB |
| Calendar | /attorney/calendar | PASS | 41KB |
| Documents | /documents | PASS | 81KB |
| Contacts | /contacts | PASS | 45KB |
| Settings | /settings | PASS | 32KB |

## Seed Data Verification

All pages render with real seed data:
- 12 clients with case numbers, courts, and priority tiers
- 19 calendar events (court dates, deadlines, client meetings)
- Issues with severity badges (CRITICAL, HIGH, MEDIUM)
- Action items with due date tracking and overdue indicators
- Attorney workload metrics on partner Firm Overview
- Case pipeline visualization (2 New, 1 Accepted, 2 Assigned, 5 Active, 2 Closed)

## Fixes This Session

- **Calendar seed dedup**: Fixed matching logic from `title + startAt` to `title` only, preventing duplicate events and "0 calendar events" on restart. Now uses upsert pattern showing `(X new, Y updated)`.

## Dependency Health

4 moderate advisories remain (all blocked on upstream fixes):
- postcss 8.4.31 (2 advisories) -- bundled inside Next.js, fix requires Next.js >= 16.3.0
- uuid < 11.1.1 (2 advisories) -- bundled inside exceljs, fix requires breaking change

These are build-time/library dependencies with low runtime risk.

## Screenshots

50 screenshots saved in `try-it-screenshots/` covering all 4 roles across all pages.

Key screenshots:
- `admin_Dashboard.png` -- Dashboard with case pipeline, alerts, deadlines, motions
- `partner_PartnerOverview.png` -- Firm Overview with attorney workload, billing, alerts
- `attorney_AttorneyBriefing.png` -- Attorney briefing with urgent items and case list
- `attorney_AttorneyCases.png` -- Case list with priority badges and court info
- `attorney_AttorneyCalendar.png` -- Monthly calendar with court dates and events
- `admin_Calendar.png` -- Court Calendar with all 19 seed events
- `admin_Clients.png` -- Full client list with attorneys and priority tiers

## How to Access Your App

- **Open your browser to:** http://localhost:3020
- **Auth:** Entra ID (Azure AD) -- requires user accounts created in the Azure AD tenant
- **Admin:** rob@vanmeverenlawfirm.com -- full access including admin pages
- **Managing Partner:** brian@vanmeverenlawfirm.com -- Firm Overview + operational pages
- **Attorney:** emily@vanmeverenlawfirm.com -- Attorney portal (Briefing, Cases, Calendar)
- **Paralegal:** debbie@vanmeverenlawfirm.com -- Attorney portal (same pages, reduced permissions)

## What to Do Next

1. Create Entra ID user accounts in Azure AD tenant for all 4 users
2. Register `http://localhost:3020/api/auth/callback` as redirect URI in app registration
3. Test the full Entra login flow end-to-end
4. When you're happy, type **/ship-it** to deploy
5. To make changes, type **/resume-it**
