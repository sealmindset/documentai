# Transitioning from SplashTop to Document AI Platform

**Vanmerven Law Firm — Operational Modernization**

---

## 1. Where We Are Today

The firm's current document workflow relies on a chain of manual handoffs between three systems and two people. Every case file passes through this sequence:

```
Paralegal's Home Workstation (document storage)
        ↕ SplashTop (remote access)
Attorney reviews → emails paralegal about caseload/strategy
        ↓
Attorney opens M365 → pulls from template cache → drafts responses
        ↓
Attorney uploads finished docs back via SplashTop → paralegal's workstation
        ↓
Attorney recalls docs to laptop when needed (again via SplashTop)
```

### What This Costs the Firm

| Pain Point | Impact |
|-----------|--------|
| **Single point of failure** | Every document lives on one home workstation. If that machine goes down, the entire firm's case files are inaccessible. No redundancy. |
| **SplashTop bottleneck** | Remote desktop is slow, session-limited, and depends on the paralegal's home internet connection. Two people can't efficiently work on the same case simultaneously. |
| **Email-driven coordination** | Case strategy, assignments, and status updates happen over email. Nothing is tracked centrally. If an email is missed, work stalls or duplicates. |
| **Manual template workflow** | The attorney opens M365, hunts for the right template, manually fills in case details (names, dates, charges, case numbers), and saves locally before uploading. Every document starts from scratch. |
| **Document shuttling** | Files move: workstation → SplashTop → M365 → SplashTop → workstation → SplashTop → laptop. Each hop is a chance for version confusion, lost work, or wasted time. |
| **No audit trail** | There is no record of who accessed what, when a document was last modified, or which version the court received. |
| **Paralegal as gatekeeper** | The paralegal must be available for the attorney to access, organize, or locate case files. Vacation, illness, or schedule conflicts create immediate access gaps. |

**The team spends significant time managing the movement of documents instead of working on the substance of cases.**

---

## 2. Where We're Going

Document AI Platform replaces the SplashTop/email/M365 chain with a single browser-based system that both the attorney and paralegal access from anywhere — no remote desktop, no file shuttling, no email coordination.

```
┌─────────────────────────────────────────────────┐
│              Document AI Platform                │
│         (browser — any device, anywhere)         │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │  Cases &  │  │Documents │  │  AI Agents    │  │
│  │ Pipeline  │  │& Reviews │  │  (7 agents)   │  │
│  └──────────┘  └──────────┘  └───────────────┘  │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ Deadlines│  │ Motions  │  │  Templates    │  │
│  │& Calendar│  │& Issues  │  │  (AI-filled)  │  │
│  └──────────┘  └──────────┘  └───────────────┘  │
└─────────────────────────────────────────────────┘
         ▲                ▲
         │                │
    Attorney           Paralegal
   (any device)      (any device)
```

### The Transition, Step by Step

| Phase | What Happens | Effort |
|-------|-------------|--------|
| **1. Upload & organize** | Paralegal uploads existing case files from the workstation into Document AI. Each document gets tagged to its case, categorized by type (police report, motion, medical record, etc.), and stored in the cloud database. | One-time — a few hours per active case |
| **2. Daily workflow shifts** | Instead of opening SplashTop, both attorney and paralegal open Document AI in a browser. Case files, deadlines, and status are all in one place. No emailing about caseload — the dashboard shows it. | Immediate — replaces SplashTop on day one |
| **3. Templates move in** | Word templates from M365 are imported into Document AI. Instead of manually filling in case details, the attorney selects a template and AI pre-fills party names, case numbers, dates, charges, and relevant facts from the case record. | Gradual — migrate templates as they're used |
| **4. SplashTop retired** | Once all active case files are in Document AI and the team is comfortable, SplashTop is no longer needed for document access. The paralegal's workstation becomes a backup, not the primary. | After 2-4 weeks of parallel operation |

---

## 3. How This Reduces Overhead

### Before vs. After

| Task | Before (SplashTop + Email + M365) | After (Document AI) |
|------|----------------------------------|-------------------|
| **Attorney needs a case file** | Open SplashTop → wait for connection → navigate folders → find file → download or view remotely | Open browser → click case → document is there |
| **Check case status** | Email paralegal → wait for response, or dig through email threads | Open dashboard → pipeline shows all cases at a glance |
| **Prepare a motion** | Open M365 → find template → manually type case details → save → upload via SplashTop | Select template → AI pre-fills case data → review and edit → save (already in the system) |
| **Track deadlines** | Manually maintained calendar or memory | Dashboard shows deadlines in 30/90/180 day buckets with alerts |
| **Know who's working on what** | Ask via email/phone | Caseload by Attorney chart — visible to everyone |
| **Find a specific document** | SplashTop → browse folders → hope the naming convention helps | Search bar → type any keyword → instant results across all cases |
| **Ensure nothing falls through cracks** | Relies on paralegal's organization and attorney's memory | Automated alerts: overdue actions, expiring documents, upcoming motions |

### Time Savings Estimate (per week)

| Activity | Current Time | With Document AI | Saved |
|----------|-------------|-----------------|-------|
| SplashTop connections + file transfers | ~3-4 hrs | 0 | 3-4 hrs |
| Email coordination on case status | ~2-3 hrs | 0 (dashboard replaces it) | 2-3 hrs |
| Template hunting + manual fill-in | ~2-3 hrs | ~30 min (AI pre-fills) | 1.5-2.5 hrs |
| Searching for documents | ~1-2 hrs | ~10 min (instant search) | 1-2 hrs |
| Deadline tracking + manual reminders | ~1 hr | 0 (automated) | 1 hr |
| **Total** | **~9-13 hrs/week** | **~40 min/week** | **~8-12 hrs/week** |

That's **1-1.5 billable days per week** returned to client-facing work.

---

## 4. Where AI Makes the Difference

Document AI isn't just a file cabinet in the cloud — it has seven specialized AI agents that automate the work that currently eats into the team's time.

### AI Agents and What They Replace

| Agent | What It Does | What It Replaces |
|-------|-------------|-----------------|
| **LEXA** (Case Intake) | Analyzes new cases: charge severity, potential penalties, evidence complexity, priority tier | Attorney manually reviewing intake paperwork and triaging |
| **CLARA** (Case Review) | Deep-dive analysis across 6 dimensions: evidence strength, legal merit, witness reliability, procedural compliance, settlement potential, client risk | Hours of attorney review to form initial case assessment |
| **DORA** (Document Collection) | Tracks which documents are needed per case (police reports, warrants, Brady material), flags what's missing | Paralegal manually maintaining document checklists |
| **ARIA** (Document Analysis) | Reads uploaded documents, identifies issues: procedural violations, evidence problems, constitutional rights concerns, statute of limitations | Attorney reading every document line-by-line for issues |
| **RITA** (Reporting) | Generates case summaries, executive reports, and status updates | Attorney writing status memos from scratch |
| **ATLAS** (Action Tracking) | Monitors court deadlines, escalates overdue items: paralegal → associate → senior attorney → managing partner | Manual calendar management and hoping nothing slips |
| **AURA** (Document Processing) | Extracts text from uploaded files (police reports, medical records, court filings), deduplicates, categorizes | Paralegal manually organizing and naming files |

### AI-Powered Templates (Future State)

Instead of the current flow:

> *Open M365 → find "Motion to Suppress" template → manually type: "State of Minnesota v. Marcus Thompson, Case No. 27-CR-26-1847, DUI 2nd Offense, arresting officer failed to read Miranda rights at 11:42 PM on March 15..." → save → upload via SplashTop*

The new flow:

> *Click "Prepare Motion to Suppress" on the Thompson case → AI pre-fills all case details, relevant facts from ARIA's document analysis, and applicable legal standards → attorney reviews, edits substance, and files*

The attorney's time shifts from **data entry** to **legal judgment** — which is what clients are paying for.

---

## 5. Key Messages

**For the managing partner:**
- The firm's entire case library currently depends on one home workstation and one person's availability. Document AI eliminates that single point of failure.
- The dashboard gives you real-time visibility into every case, every deadline, and every attorney's workload — without asking anyone.
- AI handles the operational overhead (document tracking, deadline monitoring, intake triage, template prep) so the team bills more hours on substantive legal work.

**For the paralegal:**
- You stop being the gatekeeper. The attorney can access case files without needing you online or your workstation running.
- Document organization happens automatically — upload a file, AI categorizes it, tags it to the case, and extracts the text.
- DORA tracks what documents are still needed per case, so you know exactly what to chase without maintaining manual checklists.
- Your role shifts from document logistics to higher-value case support.

**For the attorney:**
- No more SplashTop sessions. Open your browser, see your cases.
- No more hunting for templates and typing case details. AI fills them in.
- Deadlines, motions, and action items are tracked automatically with escalating alerts — nothing falls through the cracks.
- ARIA reads documents and flags issues you might spend hours finding manually. You review AI's findings and apply legal judgment.

---

## 6. What Doesn't Change

| Stays the Same | Why |
|----------------|-----|
| Attorney makes all legal decisions | AI assists and surfaces information — it never files, signs, or decides |
| Client relationships | The platform is internal tooling, not client-facing |
| Court filing process | Documents are still filed through existing court systems |
| Paralegal's role | Shifts from document logistics to case support, but the position remains essential |
| Work product quality | Same standards — just faster to produce |

---

## Summary Slide Outline

### Slide 1: The Problem
- **Title:** "Our Documents Are Trapped"
- One home workstation holds every case file
- SplashTop + email + M365 = 3 systems, constant file shuttling
- ~9-13 hours/week spent on document operations, not client work

### Slide 2: The Solution
- **Title:** "One Platform, Any Device, Anywhere"
- Document AI replaces SplashTop, email coordination, and manual templates
- Browser-based — attorney and paralegal access everything from any device
- Managing Partner Dashboard: pipeline, deadlines, motions, caseload, billing at a glance

### Slide 3: Where AI Helps
- **Title:** "AI Handles Operations, You Handle Law"
- 7 AI agents: intake triage, document analysis, deadline tracking, report generation
- AI-powered templates: pre-filled with case data, attorney edits substance only
- Automated alerts: nothing falls through the cracks

### Slide 4: The Payoff
- **Title:** "1-1.5 Billable Days Returned Per Week"
- Eliminate SplashTop dependency and single point of failure
- Zero email coordination for case status — dashboard shows everything
- Paralegal shifts from document gatekeeper to case support
- Attorney time shifts from data entry to legal judgment

### Slide 5: Transition Plan
- **Title:** "4 Phases, Minimal Disruption"
- Phase 1: Upload existing case files (one-time)
- Phase 2: Start using Document AI for daily work (day one)
- Phase 3: Migrate templates (gradual)
- Phase 4: Retire SplashTop (after 2-4 weeks)
