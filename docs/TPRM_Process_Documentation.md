# Third Party Risk Management (TPRM) Process Documentation

## Document Control

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0 | 2025-01-05 | TPRM Team | Initial documentation |

---

## Table of Contents

1. [Overview](#1-overview)
2. [TPRM Lifecycle](#2-tprm-lifecycle)
3. [Process 1: Vendor Onboarding](#3-process-1-vendor-onboarding)
4. [Process 2: Risk Assessment](#4-process-2-risk-assessment)
5. [Process 3: Due Diligence](#5-process-3-due-diligence)
6. [Process 4: Contract & SLA Management](#6-process-4-contract--sla-management)
7. [Process 5: Ongoing Monitoring](#7-process-5-ongoing-monitoring)
8. [Process 6: Incident Response](#8-process-6-incident-response)
9. [Process 7: Vendor Offboarding](#9-process-7-vendor-offboarding)
10. [RACI Matrix](#10-raci-matrix)
11. [Lucidchart Diagram Specifications](#11-lucidchart-diagram-specifications)

---

## 1. Overview

### 1.1 Purpose

This document defines the standardized processes for Third Party Risk Management (TPRM) operations, ensuring consistent evaluation, monitoring, and management of vendor relationships and associated risks.

### 1.2 Scope

Applies to all third-party vendors, suppliers, and service providers that:
- Access company data or systems
- Process customer information
- Provide critical business services
- Have access to facilities or infrastructure

### 1.3 Risk Categories

| Category | Description | Examples |
|----------|-------------|----------|
| **Strategic** | Impact on business objectives | Vendor viability, market position |
| **Operational** | Service delivery disruption | Outages, quality issues |
| **Financial** | Monetary loss exposure | Pricing, fraud, bankruptcy |
| **Compliance** | Regulatory violations | GDPR, HIPAA, SOX |
| **Cybersecurity** | Data/system compromise | Breaches, vulnerabilities |
| **Reputational** | Brand damage | Public incidents, ethics |

---

## 2. TPRM Lifecycle

```
┌─────────────────────────────────────────────────────────────────────┐
│                        TPRM LIFECYCLE                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    │
│    │   1.     │    │   2.     │    │   3.     │    │   4.     │    │
│    │ IDENTIFY │───▶│  ASSESS  │───▶│ ENGAGE   │───▶│ MONITOR  │    │
│    │          │    │          │    │          │    │          │    │
│    └──────────┘    └──────────┘    └──────────┘    └────┬─────┘    │
│         ▲                                               │          │
│         │              ┌──────────┐                     │          │
│         │              │   5.     │                     │          │
│         └──────────────│  EXIT    │◀────────────────────┘          │
│                        │          │                                 │
│                        └──────────┘                                 │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Lifecycle Phases

| Phase | Activities | Key Outputs |
|-------|------------|-------------|
| **Identify** | Business need, vendor selection | Vendor shortlist |
| **Assess** | Risk assessment, due diligence | Risk rating, approval |
| **Engage** | Contracting, onboarding | Signed contract, access |
| **Monitor** | Ongoing oversight, reassessment | Performance reports |
| **Exit** | Offboarding, transition | Termination checklist |

---

## 3. Process 1: Vendor Onboarding

### 3.1 Process Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         VENDOR ONBOARDING PROCESS                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [START]                                                                     │
│     │                                                                        │
│     ▼                                                                        │
│  ┌─────────────────┐                                                        │
│  │ Business Unit   │                                                        │
│  │ submits vendor  │                                                        │
│  │ request         │                                                        │
│  └────────┬────────┘                                                        │
│           │                                                                  │
│           ▼                                                                  │
│  ┌─────────────────┐     ┌─────────────────┐                               │
│  │ TPRM Team       │     │ Request vendor  │                               │
│  │ reviews request │────▶│ questionnaire   │                               │
│  └────────┬────────┘     └────────┬────────┘                               │
│           │                       │                                         │
│           ▼                       ▼                                         │
│  ┌─────────────────┐     ┌─────────────────┐                               │
│  │ Determine       │     │ Vendor submits  │                               │
│  │ inherent risk   │◀────│ questionnaire   │                               │
│  │ tier            │     └─────────────────┘                               │
│  └────────┬────────┘                                                        │
│           │                                                                  │
│           ▼                                                                  │
│     ◆───────────◆                                                           │
│    ╱   Risk     ╲        ┌─────────────────┐                               │
│   ╱    Tier?     ╲──────▶│ HIGH: Enhanced  │                               │
│   ╲              ╱  High │ due diligence   │                               │
│    ╲            ╱        └────────┬────────┘                               │
│     ◆─────┬────◆                  │                                         │
│      Med  │  Low                  │                                         │
│           ▼                       │                                         │
│  ┌─────────────────┐              │                                         │
│  │ Standard due    │              │                                         │
│  │ diligence       │◀─────────────┘                                         │
│  └────────┬────────┘                                                        │
│           │                                                                  │
│           ▼                                                                  │
│     ◆───────────◆                                                           │
│    ╱  Approved?  ╲       ┌─────────────────┐                               │
│   ╱              ╲──────▶│ Return to BU    │───▶ [END - Rejected]          │
│   ╲              ╱   No  │ with findings   │                               │
│    ╲            ╱        └─────────────────┘                               │
│     ◆────┬─────◆                                                            │
│          │ Yes                                                               │
│          ▼                                                                  │
│  ┌─────────────────┐                                                        │
│  │ Contract        │                                                        │
│  │ negotiation     │                                                        │
│  └────────┬────────┘                                                        │
│           │                                                                  │
│           ▼                                                                  │
│  ┌─────────────────┐                                                        │
│  │ System access   │                                                        │
│  │ provisioning    │                                                        │
│  └────────┬────────┘                                                        │
│           │                                                                  │
│           ▼                                                                  │
│  ┌─────────────────┐                                                        │
│  │ Add to          │                                                        │
│  │ monitoring      │                                                        │
│  └────────┬────────┘                                                        │
│           │                                                                  │
│           ▼                                                                  │
│       [END - Active]                                                         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Detailed Steps

| Step | Owner | Action | SLA | System |
|------|-------|--------|-----|--------|
| 1 | Business Unit | Submit vendor request form | - | ServiceNow |
| 2 | TPRM Analyst | Review request completeness | 2 days | AuditBoard |
| 3 | TPRM Analyst | Send vendor questionnaire | 1 day | AuditBoard |
| 4 | Vendor | Complete questionnaire | 10 days | Portal |
| 5 | TPRM Analyst | Calculate inherent risk tier | 2 days | AuditBoard |
| 6 | TPRM Analyst | Perform due diligence | 5-15 days | AuditBoard |
| 7 | TPRM Manager | Review and approve/reject | 3 days | AuditBoard |
| 8 | Legal | Contract review and execution | 10 days | CLM |
| 9 | IT Security | Provision access | 3 days | IAM |
| 10 | TPRM Analyst | Activate monitoring | 1 day | AuditBoard |

### 3.3 Inputs & Outputs

**Inputs:**
- Vendor request form
- Business justification
- Vendor contact information
- Scope of services

**Outputs:**
- Completed risk assessment
- Approved/rejected decision
- Signed contract
- Vendor record in AuditBoard

---

## 4. Process 2: Risk Assessment

### 4.1 Process Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         RISK ASSESSMENT PROCESS                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐                                                            │
│  │ Inherent    │                                                            │
│  │ Risk        │                                                            │
│  │ Assessment  │                                                            │
│  └──────┬──────┘                                                            │
│         │                                                                    │
│         ▼                                                                    │
│  ┌─────────────────────────────────────────────────────┐                    │
│  │              RISK SCORING MATRIX                     │                    │
│  ├─────────────────────────────────────────────────────┤                    │
│  │                                                      │                    │
│  │   Data         Access      Criticality   Financial  │                    │
│  │   Sensitivity  Level       Rating        Exposure   │                    │
│  │   (1-5)        (1-5)       (1-5)         (1-5)      │                    │
│  │      │            │            │             │       │                    │
│  │      └────────────┼────────────┼─────────────┘       │                    │
│  │                   │            │                     │                    │
│  │                   ▼            ▼                     │                    │
│  │            ┌─────────────────────┐                   │                    │
│  │            │  INHERENT RISK      │                   │                    │
│  │            │  SCORE (4-20)       │                   │                    │
│  │            └──────────┬──────────┘                   │                    │
│  │                       │                              │                    │
│  └───────────────────────┼──────────────────────────────┘                    │
│                          │                                                   │
│         ┌────────────────┼────────────────┐                                 │
│         │                │                │                                 │
│         ▼                ▼                ▼                                 │
│   ┌───────────┐   ┌───────────┐   ┌───────────┐                            │
│   │   HIGH    │   │  MEDIUM   │   │    LOW    │                            │
│   │  (15-20)  │   │  (10-14)  │   │   (4-9)   │                            │
│   │           │   │           │   │           │                            │
│   │ Enhanced  │   │ Standard  │   │ Limited   │                            │
│   │ DD        │   │ DD        │   │ DD        │                            │
│   └─────┬─────┘   └─────┬─────┘   └─────┬─────┘                            │
│         │               │               │                                   │
│         └───────────────┼───────────────┘                                   │
│                         │                                                   │
│                         ▼                                                   │
│  ┌─────────────────────────────────────────────────────┐                    │
│  │              CONTROL ASSESSMENT                      │                    │
│  ├─────────────────────────────────────────────────────┤                    │
│  │  • Security controls evaluation                     │                    │
│  │  • Compliance certifications review                 │                    │
│  │  • Penetration test results                         │                    │
│  │  • SOC reports analysis                             │                    │
│  │  • Business continuity review                       │                    │
│  └──────────────────────┬──────────────────────────────┘                    │
│                         │                                                   │
│                         ▼                                                   │
│            ┌─────────────────────┐                                          │
│            │  RESIDUAL RISK      │                                          │
│            │  SCORE              │                                          │
│            │  (Inherent - Controls)                                         │
│            └──────────┬──────────┘                                          │
│                       │                                                     │
│                       ▼                                                     │
│               [Risk Rating]                                                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Risk Tier Definitions

| Tier | Score | Assessment Scope | Review Frequency | Approver |
|------|-------|------------------|------------------|----------|
| **Critical** | 18-20 | Full enhanced DD | Quarterly | CISO + VP |
| **High** | 15-17 | Enhanced DD | Semi-annual | TPRM Director |
| **Medium** | 10-14 | Standard DD | Annual | TPRM Manager |
| **Low** | 4-9 | Limited DD | Biennial | TPRM Analyst |

### 4.3 Risk Scoring Criteria

#### Data Sensitivity (1-5)
| Score | Classification | Examples |
|-------|---------------|----------|
| 5 | Highly Sensitive | PII, PHI, payment cards |
| 4 | Confidential | Financial data, trade secrets |
| 3 | Internal | Employee data, internal docs |
| 2 | Limited | Non-sensitive business data |
| 1 | Public | Marketing materials |

#### Access Level (1-5)
| Score | Access Type | Description |
|-------|-------------|-------------|
| 5 | Administrative | Full system admin access |
| 4 | Privileged | Elevated permissions |
| 3 | Standard | Normal user access |
| 2 | Limited | Read-only or restricted |
| 1 | None | No system access |

#### Business Criticality (1-5)
| Score | Impact | Recovery Time |
|-------|--------|---------------|
| 5 | Business stops | Immediate |
| 4 | Major disruption | < 4 hours |
| 3 | Significant impact | < 24 hours |
| 2 | Minor impact | < 72 hours |
| 1 | Minimal impact | > 72 hours |

---

## 5. Process 3: Due Diligence

### 5.1 Process Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DUE DILIGENCE PROCESS                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  SWIMLANE: TPRM Analyst | Vendor | SME Reviewers | TPRM Manager             │
│  ─────────────────────────────────────────────────────────────              │
│                                                                              │
│  TPRM Analyst          Vendor           SME Reviewers    TPRM Manager       │
│  ──────────────        ──────           ─────────────    ────────────       │
│       │                   │                  │                │              │
│       ▼                   │                  │                │              │
│  ┌──────────┐             │                  │                │              │
│  │ Prepare  │             │                  │                │              │
│  │ DD       │             │                  │                │              │
│  │ package  │             │                  │                │              │
│  └────┬─────┘             │                  │                │              │
│       │                   │                  │                │              │
│       │    Request docs   │                  │                │              │
│       │──────────────────▶│                  │                │              │
│       │                   │                  │                │              │
│       │                   ▼                  │                │              │
│       │              ┌──────────┐            │                │              │
│       │              │ Provide  │            │                │              │
│       │              │ evidence │            │                │              │
│       │              │ & docs   │            │                │              │
│       │              └────┬─────┘            │                │              │
│       │                   │                  │                │              │
│       │◀──────────────────┘                  │                │              │
│       │                                      │                │              │
│       ▼                                      │                │              │
│  ┌──────────┐                                │                │              │
│  │ Review   │                                │                │              │
│  │ SOC      │                                │                │              │
│  │ reports  │                                │                │              │
│  └────┬─────┘                                │                │              │
│       │                                      │                │              │
│       │         Assign reviews               │                │              │
│       │─────────────────────────────────────▶│                │              │
│       │                                      │                │              │
│       │                                      ▼                │              │
│       │                                 ┌──────────┐          │              │
│       │                                 │ Security │          │              │
│       │                                 │ review   │          │              │
│       │                                 └────┬─────┘          │              │
│       │                                      │                │              │
│       │                                      ▼                │              │
│       │                                 ┌──────────┐          │              │
│       │                                 │ Legal    │          │              │
│       │                                 │ review   │          │              │
│       │                                 └────┬─────┘          │              │
│       │                                      │                │              │
│       │                                      ▼                │              │
│       │                                 ┌──────────┐          │              │
│       │                                 │ Privacy  │          │              │
│       │                                 │ review   │          │              │
│       │                                 └────┬─────┘          │              │
│       │                                      │                │              │
│       │◀─────────────────────────────────────┘                │              │
│       │                                                       │              │
│       ▼                                                       │              │
│  ┌──────────┐                                                 │              │
│  │ Compile  │                                                 │              │
│  │ findings │                                                 │              │
│  │ & rating │                                                 │              │
│  └────┬─────┘                                                 │              │
│       │                                                       │              │
│       │                    Submit for approval                │              │
│       │──────────────────────────────────────────────────────▶│              │
│       │                                                       │              │
│       │                                                       ▼              │
│       │                                                  ┌──────────┐       │
│       │                                                  │ Review & │       │
│       │                                                  │ approve  │       │
│       │                                                  └────┬─────┘       │
│       │                                                       │              │
│       │◀──────────────────────────────────────────────────────┘              │
│       │                                                                      │
│       ▼                                                                      │
│  [Complete]                                                                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Due Diligence Checklist by Risk Tier

#### High/Critical Risk Vendors

| Category | Requirement | Evidence Required |
|----------|-------------|-------------------|
| **Security** | SOC 2 Type II | Report < 12 months |
| | Penetration test | Report < 12 months |
| | Vulnerability scans | Recent results |
| | Security policies | Current versions |
| **Privacy** | Privacy policy | Current version |
| | DPA/SCC | Executed agreement |
| | Data flow diagram | Current |
| **Business** | Financial statements | Last 2 years |
| | Business continuity plan | Current version |
| | Insurance certificates | Current |
| **Compliance** | Relevant certifications | ISO 27001, SOC, etc. |
| | Regulatory compliance | Attestations |

#### Medium Risk Vendors

| Category | Requirement | Evidence Required |
|----------|-------------|-------------------|
| **Security** | SOC 2 Type II or ISO 27001 | Report < 12 months |
| | Security questionnaire | Completed |
| **Privacy** | Privacy policy | Current version |
| **Business** | Insurance certificates | Current |
| **Compliance** | Relevant certifications | As applicable |

#### Low Risk Vendors

| Category | Requirement | Evidence Required |
|----------|-------------|-------------------|
| **Security** | Security questionnaire | Completed |
| **Business** | Insurance certificates | Current |

---

## 6. Process 4: Contract & SLA Management

### 6.1 Process Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CONTRACT & SLA MANAGEMENT PROCESS                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [Risk Assessment Complete]                                                  │
│           │                                                                  │
│           ▼                                                                  │
│  ┌─────────────────┐                                                        │
│  │ TPRM provides   │                                                        │
│  │ security        │                                                        │
│  │ requirements    │                                                        │
│  └────────┬────────┘                                                        │
│           │                                                                  │
│           ▼                                                                  │
│  ┌─────────────────┐     ┌─────────────────┐                               │
│  │ Legal drafts/   │────▶│ Required        │                               │
│  │ reviews         │     │ clauses:        │                               │
│  │ contract        │     │ • Data protection                               │
│  └────────┬────────┘     │ • Security      │                               │
│           │              │ • Audit rights  │                               │
│           │              │ • Breach notify │                               │
│           │              │ • Termination   │                               │
│           │              │ • SLAs          │                               │
│           │              └─────────────────┘                               │
│           ▼                                                                  │
│     ◆───────────◆                                                           │
│    ╱  Vendor    ╲                                                           │
│   ╱   accepts?   ╲                                                          │
│   ╲              ╱                                                           │
│    ╲            ╱                                                            │
│     ◆────┬─────◆                                                            │
│     No   │   Yes                                                             │
│     │    │                                                                   │
│     ▼    │                                                                   │
│  ┌──────────┐  │                                                            │
│  │Negotiate │  │                                                            │
│  │terms     │──┘                                                            │
│  └──────────┘                                                               │
│           │                                                                  │
│           ▼                                                                  │
│  ┌─────────────────┐                                                        │
│  │ Execute         │                                                        │
│  │ contract        │                                                        │
│  └────────┬────────┘                                                        │
│           │                                                                  │
│           ▼                                                                  │
│  ┌─────────────────┐                                                        │
│  │ Record in CLM   │                                                        │
│  │ & AuditBoard    │                                                        │
│  └────────┬────────┘                                                        │
│           │                                                                  │
│           ▼                                                                  │
│  ┌─────────────────┐                                                        │
│  │ Set renewal     │                                                        │
│  │ reminders       │                                                        │
│  └────────┬────────┘                                                        │
│           │                                                                  │
│           ▼                                                                  │
│       [Complete]                                                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Required Contract Clauses

| Clause | Description | Risk Tier Applicability |
|--------|-------------|------------------------|
| **Data Protection** | Defines data handling requirements | All |
| **Security Requirements** | Minimum security standards | All |
| **Audit Rights** | Right to audit vendor | High, Critical |
| **Breach Notification** | Timeline for incident reporting | All |
| **Subcontractor Approval** | Approval for sub-processors | High, Critical |
| **Termination Rights** | Exit provisions | All |
| **SLA Definitions** | Service level commitments | All |
| **Insurance Requirements** | Minimum coverage | Medium+ |
| **Indemnification** | Liability allocation | All |
| **Business Continuity** | Continuity requirements | High, Critical |

---

## 7. Process 5: Ongoing Monitoring

### 7.1 Process Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       ONGOING MONITORING PROCESS                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│           ┌─────────────────────────────────────────────────┐               │
│           │              CONTINUOUS MONITORING               │               │
│           │                                                  │               │
│           │  ┌──────────┐  ┌──────────┐  ┌──────────┐      │               │
│           │  │ Security │  │ News &   │  │ Financial│      │               │
│           │  │ Ratings  │  │ Media    │  │ Health   │      │               │
│           │  │ (BitSight│  │ Alerts   │  │ Monitors │      │               │
│           │  │ etc.)    │  │          │  │          │      │               │
│           │  └────┬─────┘  └────┬─────┘  └────┬─────┘      │               │
│           │       │             │             │             │               │
│           │       └─────────────┼─────────────┘             │               │
│           │                     │                           │               │
│           │                     ▼                           │               │
│           │              ┌──────────────┐                   │               │
│           │              │   Alert      │                   │               │
│           │              │   Dashboard  │                   │               │
│           │              └──────┬───────┘                   │               │
│           │                     │                           │               │
│           └─────────────────────┼───────────────────────────┘               │
│                                 │                                            │
│                                 ▼                                            │
│                          ◆───────────◆                                      │
│                         ╱   Alert     ╲                                     │
│                        ╱   triggered?  ╲                                    │
│                        ╲               ╱                                     │
│                         ╲             ╱                                      │
│                          ◆─────┬─────◆                                      │
│                           No   │   Yes                                       │
│                           │    │                                             │
│        ┌──────────────────┘    │                                            │
│        │                       ▼                                            │
│        │              ┌─────────────────┐                                   │
│        │              │ TPRM Analyst    │                                   │
│        │              │ investigates    │                                   │
│        │              └────────┬────────┘                                   │
│        │                       │                                            │
│        │                       ▼                                            │
│        │                ◆───────────◆                                       │
│        │               ╱  Material   ╲                                      │
│        │              ╱   impact?     ╲                                     │
│        │              ╲               ╱                                      │
│        │               ╲             ╱                                       │
│        │                ◆─────┬─────◆                                       │
│        │                 No   │   Yes                                        │
│        │                 │    │                                              │
│        │    ┌────────────┘    │                                             │
│        │    │                 ▼                                             │
│        │    │        ┌─────────────────┐                                    │
│        │    │        │ Escalate to     │                                    │
│        │    │        │ TPRM Manager    │                                    │
│        │    │        └────────┬────────┘                                    │
│        │    │                 │                                             │
│        │    │                 ▼                                             │
│        │    │        ┌─────────────────┐                                    │
│        │    │        │ Initiate        │                                    │
│        │    │        │ reassessment    │                                    │
│        │    │        └────────┬────────┘                                    │
│        │    │                 │                                             │
│        ▼    ▼                 ▼                                             │
│  ┌─────────────────────────────────────┐                                    │
│  │         Document in AuditBoard      │                                    │
│  └─────────────────────────────────────┘                                    │
│                     │                                                        │
│                     ▼                                                        │
│           ┌─────────────────────────────────────────────────┐               │
│           │            PERIODIC REASSESSMENT                 │               │
│           │                                                  │               │
│           │  Critical: Quarterly    High: Semi-annual       │               │
│           │  Medium: Annual         Low: Biennial           │               │
│           │                                                  │               │
│           └─────────────────────────────────────────────────┘               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Monitoring Activities

| Activity | Frequency | Owner | Tool |
|----------|-----------|-------|------|
| Security rating review | Weekly | TPRM Analyst | BitSight/SecurityScorecard |
| News/media monitoring | Daily (automated) | System | Alert service |
| Financial health check | Monthly | TPRM Analyst | D&B/Experian |
| SLA performance review | Monthly | Business Owner | ServiceNow |
| Contract renewal tracking | Monthly | TPRM Analyst | CLM |
| Full reassessment | Per risk tier | TPRM Team | AuditBoard |

### 7.3 Alert Thresholds

| Monitor Type | Critical Alert | High Alert | Medium Alert |
|--------------|---------------|------------|--------------|
| Security Rating | Drop > 100 pts | Drop > 50 pts | Drop > 25 pts |
| News | Breach, lawsuit | Leadership change | Acquisition |
| Financial | Bankruptcy | Credit downgrade | Payment delays |

---

## 8. Process 6: Incident Response

### 8.1 Process Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    VENDOR INCIDENT RESPONSE PROCESS                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [Incident Reported/Detected]                                                │
│           │                                                                  │
│           ▼                                                                  │
│  ┌─────────────────┐                                                        │
│  │ Log incident    │                                                        │
│  │ in system       │◀──── Time: 0h                                         │
│  └────────┬────────┘                                                        │
│           │                                                                  │
│           ▼                                                                  │
│  ┌─────────────────┐                                                        │
│  │ Initial triage  │                                                        │
│  │ & severity      │◀──── Time: < 1h                                       │
│  │ assessment      │                                                        │
│  └────────┬────────┘                                                        │
│           │                                                                  │
│           ▼                                                                  │
│     ◆───────────◆                                                           │
│    ╱  Severity?  ╲                                                          │
│   ╱              ╲                                                           │
│   ╲              ╱                                                           │
│    ╲            ╱                                                            │
│     ◆────┬─────◆                                                            │
│          │                                                                   │
│    ┌─────┼─────┬─────────┐                                                  │
│    │     │     │         │                                                  │
│    ▼     ▼     ▼         ▼                                                  │
│ ┌─────┐┌─────┐┌─────┐┌─────┐                                               │
│ │ P1  ││ P2  ││ P3  ││ P4  │                                               │
│ │Crit ││High ││Med  ││Low  │                                               │
│ └──┬──┘└──┬──┘└──┬──┘└──┬──┘                                               │
│    │      │      │      │                                                   │
│    │      │      │      │                                                   │
│    ▼      ▼      ▼      ▼                                                   │
│  ┌─────────────────────────────────────┐                                    │
│  │        Notify stakeholders          │                                    │
│  │  P1: Immediate (CISO, Exec, Legal)  │                                    │
│  │  P2: < 4 hours                      │                                    │
│  │  P3: < 24 hours                     │                                    │
│  │  P4: Next business day              │                                    │
│  └────────────────┬────────────────────┘                                    │
│                   │                                                         │
│                   ▼                                                         │
│  ┌─────────────────┐                                                        │
│  │ Coordinate with │                                                        │
│  │ vendor          │                                                        │
│  └────────┬────────┘                                                        │
│           │                                                                  │
│           ▼                                                                  │
│  ┌─────────────────┐                                                        │
│  │ Assess impact   │                                                        │
│  │ to our data/    │                                                        │
│  │ operations      │                                                        │
│  └────────┬────────┘                                                        │
│           │                                                                  │
│           ▼                                                                  │
│     ◆───────────◆        ┌─────────────────┐                               │
│    ╱  Our data   ╲──────▶│ Activate        │                               │
│   ╱   affected?   ╲  Yes │ internal IR     │                               │
│   ╲               ╱      │ process         │                               │
│    ╲             ╱       └────────┬────────┘                               │
│     ◆─────┬─────◆                 │                                         │
│           │ No                    │                                         │
│           │◀──────────────────────┘                                         │
│           ▼                                                                  │
│  ┌─────────────────┐                                                        │
│  │ Monitor vendor  │                                                        │
│  │ remediation     │                                                        │
│  └────────┬────────┘                                                        │
│           │                                                                  │
│           ▼                                                                  │
│  ┌─────────────────┐                                                        │
│  │ Post-incident   │                                                        │
│  │ review          │                                                        │
│  └────────┬────────┘                                                        │
│           │                                                                  │
│           ▼                                                                  │
│  ┌─────────────────┐                                                        │
│  │ Update risk     │                                                        │
│  │ assessment      │                                                        │
│  └────────┬────────┘                                                        │
│           │                                                                  │
│           ▼                                                                  │
│     ◆───────────◆        ┌─────────────────┐                               │
│    ╱  Continue   ╲──────▶│ Initiate        │                               │
│   ╱   vendor?     ╲  No  │ offboarding     │                               │
│   ╲               ╱      └─────────────────┘                               │
│    ╲             ╱                                                          │
│     ◆─────┬─────◆                                                           │
│           │ Yes                                                              │
│           ▼                                                                  │
│  ┌─────────────────┐                                                        │
│  │ Update controls │                                                        │
│  │ & monitoring    │                                                        │
│  └────────┬────────┘                                                        │
│           │                                                                  │
│           ▼                                                                  │
│       [Complete]                                                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8.2 Incident Severity Matrix

| Severity | Definition | Response Time | Escalation |
|----------|------------|---------------|------------|
| **P1 - Critical** | Confirmed breach of our data, service down | Immediate | CISO, Legal, Executive |
| **P2 - High** | Potential data exposure, major service impact | < 4 hours | TPRM Director, Security |
| **P3 - Medium** | Minor service impact, vendor breach (not our data) | < 24 hours | TPRM Manager |
| **P4 - Low** | Informational, minimal impact | < 72 hours | TPRM Analyst |

---

## 9. Process 7: Vendor Offboarding

### 9.1 Process Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       VENDOR OFFBOARDING PROCESS                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [Offboarding Triggered]                                                     │
│     • Contract expiration                                                    │
│     • Business decision                                                      │
│     • Risk-based termination                                                 │
│           │                                                                  │
│           ▼                                                                  │
│  ┌─────────────────┐                                                        │
│  │ Notify vendor   │                                                        │
│  │ per contract    │                                                        │
│  │ terms           │                                                        │
│  └────────┬────────┘                                                        │
│           │                                                                  │
│           ▼                                                                  │
│  ┌─────────────────────────────────────────────────────┐                    │
│  │              PARALLEL WORKSTREAMS                    │                    │
│  ├─────────────────────────────────────────────────────┤                    │
│  │                                                      │                    │
│  │  ┌──────────┐   ┌──────────┐   ┌──────────┐        │                    │
│  │  │ DATA     │   │ ACCESS   │   │ KNOWLEDGE│        │                    │
│  │  │ RETURN/  │   │ REMOVAL  │   │ TRANSFER │        │                    │
│  │  │ DESTROY  │   │          │   │          │        │                    │
│  │  └────┬─────┘   └────┬─────┘   └────┬─────┘        │                    │
│  │       │              │              │               │                    │
│  │       ▼              ▼              ▼               │                    │
│  │  • Request data  • Revoke    • Document            │                    │
│  │    return        system      processes              │                    │
│  │  • Verify        access    • Transfer              │                    │
│  │    deletion    • Disable     knowledge             │                    │
│  │  • Get           VPN       • Archive               │                    │
│  │    certificate • Remove      records               │                    │
│  │                  from                               │                    │
│  │                  directories                        │                    │
│  │       │              │              │               │                    │
│  │       └──────────────┼──────────────┘               │                    │
│  │                      │                              │                    │
│  └──────────────────────┼──────────────────────────────┘                    │
│                         │                                                   │
│                         ▼                                                   │
│  ┌─────────────────────────────────────────────────────┐                    │
│  │              OFFBOARDING CHECKLIST                   │                    │
│  ├─────────────────────────────────────────────────────┤                    │
│  │  □ Data return/destruction certificate received     │                    │
│  │  □ All system access revoked                        │                    │
│  │  □ VPN/network access disabled                      │                    │
│  │  □ Physical access badges collected                 │                    │
│  │  □ Final invoice settled                            │                    │
│  │  □ Documentation archived                           │                    │
│  │  □ Knowledge transfer complete                      │                    │
│  │  □ Contract terminated in CLM                       │                    │
│  │  □ Vendor record updated in AuditBoard              │                    │
│  └─────────────────────────────────────────────────────┘                    │
│                         │                                                   │
│                         ▼                                                   │
│  ┌─────────────────┐                                                        │
│  │ Final review &  │                                                        │
│  │ sign-off        │                                                        │
│  └────────┬────────┘                                                        │
│           │                                                                  │
│           ▼                                                                  │
│  ┌─────────────────┐                                                        │
│  │ Archive vendor  │                                                        │
│  │ in AuditBoard   │                                                        │
│  └────────┬────────┘                                                        │
│           │                                                                  │
│           ▼                                                                  │
│       [Complete]                                                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 9.2 Offboarding Checklist

| Category | Task | Owner | Timeline |
|----------|------|-------|----------|
| **Data** | Request data return | TPRM | Day 1 |
| | Verify data deletion | TPRM | Day 30 |
| | Obtain destruction certificate | TPRM | Day 30 |
| **Access** | Revoke system access | IT | Day 1 |
| | Disable VPN/network | IT | Day 1 |
| | Collect badges/keys | Facilities | Day 1 |
| | Remove from directories | IT | Day 7 |
| **Financial** | Final invoice review | Finance | Day 30 |
| | Close PO | Procurement | Day 30 |
| **Documentation** | Archive records | TPRM | Day 30 |
| | Update AuditBoard | TPRM | Day 30 |
| | Contract termination | Legal | Day 30 |

---

## 10. RACI Matrix

### TPRM Process Responsibilities

| Activity | Business Unit | TPRM Analyst | TPRM Manager | Security | Legal | IT |
|----------|--------------|--------------|--------------|----------|-------|-----|
| Vendor request | **R/A** | I | I | I | I | I |
| Risk assessment | C | **R** | **A** | C | C | C |
| Due diligence | I | **R** | **A** | C | C | I |
| Contract review | C | C | I | C | **R/A** | I |
| Access provisioning | C | I | I | C | I | **R/A** |
| Ongoing monitoring | I | **R** | **A** | C | I | I |
| Incident response | I | **R** | C | **A** | C | C |
| Offboarding | C | **R** | **A** | C | C | **R** |

**Legend:** R = Responsible, A = Accountable, C = Consulted, I = Informed

---

## 11. Lucidchart Diagram Specifications

### 11.1 Shape Standards

Use these shapes consistently across all TPRM diagrams:

| Shape | Usage | Lucidchart Shape |
|-------|-------|------------------|
| Rectangle | Process step | Rectangle |
| Diamond | Decision point | Diamond |
| Rounded rectangle | Start/End | Terminator |
| Parallelogram | Input/Output | Data |
| Cylinder | Database/System | Database |
| Document | Document/Report | Document |

### 11.2 Color Coding

| Color | Hex Code | Usage |
|-------|----------|-------|
| Blue | #4285F4 | Standard process steps |
| Green | #34A853 | Approval/Success |
| Red | #EA4335 | Rejection/Alert |
| Yellow | #FBBC04 | Decision points |
| Purple | #A142F4 | External party (vendor) |
| Gray | #9AA0A6 | System/automated |

### 11.3 Swimlane Assignments

Standard swimlanes for TPRM processes:

1. **Business Unit** - Requesters and owners
2. **TPRM Team** - Analysts and managers
3. **Vendor** - Third party actions
4. **Security** - InfoSec reviews
5. **Legal** - Contract and compliance
6. **IT** - Access and systems

### 11.4 Connector Standards

| Connector Type | Usage |
|----------------|-------|
| Solid arrow | Normal flow |
| Dashed arrow | Optional/conditional flow |
| Thick arrow | Primary path |
| Colored arrow | Specific outcome (green=yes, red=no) |

### 11.5 Importing to Lucidchart

To import these diagrams into Lucidchart:

1. **Create new document** in Lucidchart
2. **Select template**: Flowchart > Swimlane Diagram
3. **Set up swimlanes** per section 11.3
4. **Apply shapes** per section 11.1
5. **Apply colors** per section 11.2
6. **Add connectors** per section 11.4

### 11.6 Export Options

Recommended export formats:
- **PNG/PDF** - For documentation
- **Visio (.vsdx)** - For editing in other tools
- **SVG** - For web embedding
- **Lucidchart link** - For collaboration

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| **TPRM** | Third Party Risk Management |
| **DD** | Due Diligence |
| **GRC** | Governance, Risk, and Compliance |
| **SLA** | Service Level Agreement |
| **SOC** | System and Organization Controls |
| **DPA** | Data Processing Agreement |
| **CLM** | Contract Lifecycle Management |
| **IAM** | Identity and Access Management |

---

## Appendix B: Related Documents

- Information Security Policy
- Data Classification Policy
- Incident Response Plan
- Business Continuity Plan
- Vendor Management Policy
- Contract Templates

---

*Document maintained by TPRM Team*
*Last updated: January 2025*
