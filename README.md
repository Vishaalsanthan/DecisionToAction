# Decision-to-Action Extractor (D2A)

> **Autonomous architectural decision governance system** that bridges the gap between engineering discussions and tracked, accountable execution.

[![Status](https://img.shields.io/badge/Status-MVP%20Ready-success.svg)]()
[![Compliance](https://img.shields.io/badge/Audit-SOC2%20%2F%20SOX%20Ready-blue.svg)]()
[![Design System](https://img.shields.io/badge/UI-Dark%20Glassmorphism-indigo.svg)]()

---

## 1. Problem & Executive Summary

In large engineering organizations, crucial architecture decisions occur verbally in Zoom meetings, across Slack channels, or inside preliminary design reviews. These decisions rarely get converted into tracked actions with accountable owners and concrete deadlines.

The **Decision-to-Action Extractor (D2A)** continuously ingests multi-source engineering communication streams, extracts architectural commitments via rule-based linguistic pattern matching, attaches confidence scores and evidence links, generates tracked actions, enforces human confirmation for high-impact decisions, and logs all mutations to an immutable audit trail with instant rollback capabilities.

---

## 2. Key Capabilities & Features

- 🎙️ **Multi-Source Ingestion**: Ingests meeting transcripts, Slack/Teams chat threads, Architecture Decision Records (ADRs), and Jira task updates.
- 🧠 **Pattern-Matching Decision Extraction**: Identifies commitments using linguistic rules (`we decided`, `we agreed`, `action item:`, `going forward`, etc.) with confidence weighting.
- ⚡ **Automated Action Decomposition**: Maps decisions to actionable tickets with inferred owners (via participant context and @mentions) and deadline extraction.
- 🛡️ **Human-in-the-Loop Governance**: Auto-approves LOW/MEDIUM impact actions, but strictly halts HIGH-impact actions in a `PENDING_CONFIRM` state until authorized by a lead or manager.
- ✍️ **Mandatory Override & Rejection Rationale**: Any change to owner, deadline, impact level, or status requires structured reasoning logged to the audit ledger.
- ↺ **One-Click Rollback**: Any confirmed high-impact action can be safely rolled back with full reason capture, restoring previous states while preserving original decision provenance.
- 🔌 **Graceful Degradation**: If meeting transcripts or chat integrations experience an outage or sync lag, the system degrades gracefully with confidence adjustments rather than halting.
- 📊 **Empirical Experiment Dashboard**: Tracks baseline vs. target vs. measured conversion metrics, SLA compliance, and an error analysis matrix.

---

## 3. Architecture & Repository Structure

```
COE/
├── index.html                      # Single-page application entry point
├── PRD.md                          # Comprehensive Product Requirements Document
├── IMPLEMENTATION_PLAN.md          # Technical implementation blueprint
├── README.md                       # Documentation & run instructions
├── css/
│   └── styles.css                  # Ultra-modern dark glassmorphism design system
├── js/
│   ├── app.js                      # Application orchestrator & bootstrap
│   ├── data.js                     # Data source ingestion & health simulation
│   ├── extraction.js               # Linguistic pattern matching & confidence engine
│   ├── actions.js                  # Action lifecycle, human confirmation & rollback
│   ├── audit.js                    # Immutable audit trail & compliance reporting
│   ├── metrics.js                  # Conversion rate calculations & error analysis
│   ├── dashboard.js                # UI rendering, tab navigation & modal controllers
│   └── utils.js                    # UUIDs, formatters, storage helpers & event bus
└── data/
    ├── sample-transcripts.json     # Realistic engineering review meeting transcripts
    ├── sample-chats.json           # Multi-user Slack architectural discussions
    ├── sample-decisions.json       # Formal Architecture Decision Records (ADRs)
    ├── sample-tasks.json           # Jira-style task updates & completion tracking
    └── edge-cases.json            # Edge case test scenarios & degradation fixtures
```

---

## 4. Quick Start Guide

### Option 1: Direct Browser Launch
Simply open `index.html` in any modern web browser (Chrome, Edge, Firefox, Safari). The system includes embedded fallback data, ensuring 100% functionality even when loaded via `file:///`.

### Option 2: Local HTTP Server (Recommended)
You can run a lightweight local server using Python or Node:

```bash
# Using Python 3:
python -m http.server 8080

# Or using Node.js:
npx serve .
```

Open `http://localhost:8080` in your browser.

---

## 5. Walkthrough of Interactive Views

1. **Executive Dashboard (`#overview`)**:
   - Live KPI cards: Decision→Action Conversion Rate, Extracted Decisions, Pending Confirmations, Audit Completeness.
   - High-Impact Confirmation Queue with inline **Confirm**, **Override**, and **Reject** buttons.
   - Ingestion Source Health summary with real-time status indicators.
   - Baseline vs. Target vs. Measured progress table.

2. **Decision Feed (`#decisions`)**:
   - Filter decisions by source (Transcripts, Chats, ADRs, Tasks) and impact level (HIGH, MEDIUM, LOW).
   - Real-time search across titles, descriptions, speakers, and tags.
   - Expandable source evidence drawers showing verbatim quotes and matched linguistic rule IDs.
   - One-click "+ Generate Action" button.

3. **Action Tracker (`#actions`)**:
   - Status tabs: *All, Pending Confirmation, Confirmed, In Progress, Completed, Rolled Back, Rejected*.
   - High-impact warning banners with approval gate enforcement.
   - Interactive modals for Human Confirmation, Parameter Overrides (owner, deadline, impact), and Rollbacks.

4. **Audit Log & Compliance (`#audit`)**:
   - Chronological, immutable event ledger tracking every state transition.
   - Deep JSON state diff inspector showing `previousState` vs. `newState`.
   - List of confirmed high-impact actions eligible for rollback.
   - "Export Audit JSON" button for SOC2/SOX compliance reporting.

5. **Metrics & Experimentation (`#metrics`)**:
   - Results from the 4-week controlled experiment (Control Team A vs Treatment Teams B & C).
   - Detailed progress meters showing improvements over pre-D2A baselines.
   - Error Analysis Matrix tracking extraction precision, owner accuracy, and false positive rates.

6. **Degradation Lab (`#edge-cases`)**:
   - Interactive test harnesses for all 4 failure scenarios:
     - **Scenario 1**: Simulate transcript service outage and observe graceful degradation.
     - **Scenario 2**: Resolve contradictory decisions (PostgreSQL vs ClickHouse) with side-by-side evidence.
     - **Scenario 3**: Inspect ambiguous owner assignment (`UNASSIGNED — Platform Team`) and assign suggested leads.
     - **Scenario 4**: Execute a rollback workflow for a breaking gRPC deprecation.

7. **Data Ingestion (`#sources`)**:
   - Live status cards for all 5 data sources with simulated lag and outage controls.
   - Raw document inspector for reviewing ingested transcripts, chat logs, and ADR markdown.

---

## 6. Verification & Acceptance Criteria

| PRD Requirement | Verification Method | Status |
|---|---|---|
| **FR-1 to FR-5**: Multi-source ingestion | Ingests transcripts, chats, ADRs, tasks | ✅ Verified |
| **FR-6 to FR-7**: Graceful degradation | Outage toggles in Degradation Lab | ✅ Verified |
| **FR-8 to FR-12**: Decision extraction & confidence | Pattern matching with linguistic rule tags | ✅ Verified |
| **FR-13 to FR-15**: Action generation with owners & deadlines | Inferred from dialogue participants | ✅ Verified |
| **FR-16**: Human confirmation for HIGH impact | Confirmation gate in Action Tracker | ✅ Verified |
| **FR-17**: Mandatory override reasoning | Minimum character validation & audit logging | ✅ Verified |
| **FR-18 to FR-20**: Immutable audit trail & rollback | State diffs & rollback execution | ✅ Verified |
| **FR-22 to FR-25**: Metrics & Error analysis | Baseline vs Target vs Measured dashboard | ✅ Verified |

---

## 7. License & Authors

Designed and built by the Engineering Platform Architecture Team.
Licensed under the Apache 2.0 License.
