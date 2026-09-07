# Implementation Plan
# Decision-to-Action Extractor (D2A) — Technical Implementation

**Version:** 1.0  
**Date:** 2026-09-07  
**Status:** Implementation  

---

## 1. Goal Description

Build a fully functional, browser-based MVP of the Decision-to-Action Extractor (D2A) system. The system ingests meeting transcripts, chat threads, decision records, tasks, and completion updates. It extracts architectural decisions using pattern-matching rules, generates tracked actions linked to owners and deadlines, requires human confirmation for high-impact actions, captures override reasons, and provides a complete audit trail with rollback capability. The system must degrade gracefully when data sources are missing or delayed.

---

## 2. Technical Approach

### 2.1 Architecture
- **Single-page application** built with vanilla HTML/CSS/JS
- **No backend required** — all processing happens client-side with simulated data
- **LocalStorage** for persistence of state changes, confirmations, and audit trail
- **Modular JS architecture** with clear separation of concerns

### 2.2 Decision Extraction Engine
The extraction engine uses **rule-based pattern matching** on text content:

| Rule Category | Patterns | Confidence Weight |
|---|---|---|
| **Explicit Decision** | "we decided", "the decision is", "we agreed", "we'll go with" | 0.95 |
| **Implicit Decision** | "let's use", "we should", "the plan is", "going forward" | 0.75 |
| **Action Directive** | "action item:", "TODO:", "someone needs to", "we need to" | 0.85 |
| **Deadline Mention** | "by end of", "before next", "deadline is", "due by" | 0.80 |
| **Owner Assignment** | "@name", "name will", "name is responsible", "assigned to" | 0.85 |

### 2.3 Impact Classification Rules

| Signal | Impact Level | Reasoning |
|---|---|---|
| Affects >3 services | HIGH | Broad blast radius |
| Contains "deprecate", "migrate", "rewrite" | HIGH | Irreversible or costly |
| Affects security or compliance | HIGH | Regulatory risk |
| Affects 1-3 services | MEDIUM | Moderate blast radius |
| Contains "refactor", "update", "add" | MEDIUM | Standard changes |
| Affects single component | LOW | Contained change |
| Contains "fix", "patch", "tweak" | LOW | Minor adjustment |

### 2.4 Graceful Degradation Strategy

| Missing Source | System Response |
|---|---|
| Meeting Transcripts | Process chats + tasks, flag "transcript context may be missing" |
| Chat Threads | Process transcripts + tasks, mark decisions as "chat evidence unavailable" |
| Task System | Extract decisions + actions but skip completion tracking |
| Decision Records | Rely on transcript/chat extraction, note "no formal ADR found" |
| All Sources Down | Show cached data with "OFFLINE" banner, queue processing |

---

## 3. Proposed Changes

### Frontend Application

#### [NEW] [index.html](file:///c:/Users/santh/Desktop/COE/index.html)
Main application shell with navigation, dashboard, decision feed, action tracker, audit log, metrics, and settings panels. Implements a dark-theme, glassmorphism-styled single-page application.

#### [NEW] [css/styles.css](file:///c:/Users/santh/Desktop/COE/css/styles.css)
Complete design system with CSS custom properties, glassmorphism effects, animations, responsive layout, and component styles for cards, modals, tables, badges, and charts.

---

### JavaScript Modules

#### [NEW] [js/utils.js](file:///c:/Users/santh/Desktop/COE/js/utils.js)
Utility functions: UUID generation, date formatting, confidence scoring, local storage helpers, event bus for module communication.

#### [NEW] [js/data.js](file:///c:/Users/santh/Desktop/COE/js/data.js)
Sample data management: meeting transcripts, chat threads, decision records, task updates, completion updates. Includes edge case data. Simulates data source health monitoring.

#### [NEW] [js/extraction.js](file:///c:/Users/santh/Desktop/COE/js/extraction.js)
Decision extraction engine: pattern matching, confidence scoring, evidence linking, impact classification. Contains all extraction rules with explanations.

#### [NEW] [js/actions.js](file:///c:/Users/santh/Desktop/COE/js/actions.js)
Action generation and lifecycle management: create, confirm, reject, override, complete, rollback. Enforces human confirmation for HIGH impact. Captures override reasons.

#### [NEW] [js/audit.js](file:///c:/Users/santh/Desktop/COE/js/audit.js)
Immutable audit trail: logs all state changes, supports review and rollback, generates compliance reports. Stores previous and new state for each change.

#### [NEW] [js/metrics.js](file:///c:/Users/santh/Desktop/COE/js/metrics.js)
Metrics calculation engine: conversion rates, completion rates, baseline vs. target vs. measured, error analysis. Powers dashboard charts and experiment results.

#### [NEW] [js/dashboard.js](file:///c:/Users/santh/Desktop/COE/js/dashboard.js)
Dashboard rendering: source health indicators, metric cards, charts (using canvas), decision feed, action tracker, audit log viewer. Handles all UI interactions.

#### [NEW] [js/app.js](file:///c:/Users/santh/Desktop/COE/js/app.js)
Application bootstrap: initializes all modules, sets up event listeners, manages navigation, coordinates data flow between modules.

---

### Sample Data

#### [NEW] [data/sample-transcripts.json](file:///c:/Users/santh/Desktop/COE/data/sample-transcripts.json)
3 realistic meeting transcripts with architecture discussions, decisions, and action items embedded in natural conversation.

#### [NEW] [data/sample-chats.json](file:///c:/Users/santh/Desktop/COE/data/sample-chats.json)
5 Slack-style threaded conversations with architecture decisions.

#### [NEW] [data/edge-cases.json](file:///c:/Users/santh/Desktop/COE/data/edge-cases.json)
Edge case scenarios: contradictory decisions, ambiguous owners, missing sources, rollback scenarios.

---

### Documentation

#### [NEW] [README.md](file:///c:/Users/santh/Desktop/COE/README.md)
Setup instructions, usage guide, architecture overview, and contribution guidelines.

---

## 4. Verification Plan

### Manual Verification
1. Open `index.html` in browser — dashboard loads with all panels
2. Source health indicators show correct status
3. Click through sample data — decisions extracted with evidence
4. Confirm/reject/override HIGH impact actions
5. Verify audit trail records all changes
6. Simulate missing data source — verify graceful degradation
7. Perform rollback — verify state reversion and audit entry
8. Check metrics dashboard — baseline vs. target vs. measured
9. Test all 3+ edge cases
10. Verify responsive layout on different screen sizes

### Automated Checks
- Console should show no errors
- All extraction rules should fire on sample data
- Audit trail should have entries for every state change
- Metrics should calculate correctly from sample data
