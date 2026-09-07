# Product Requirements Document (PRD)
# Decision-to-Action Extractor (D2A)

**Version:** 1.0  
**Date:** 2026-09-07  
**Author:** Engineering Platform Team  
**Status:** Draft → Review → Approved  

---

## 1. Executive Summary

Large engineering teams document architecture decisions inconsistently. Important decisions disappear inside long discussions (meetings, Slack threads, design docs) and are never converted into tracked, accountable actions. The **Decision-to-Action Extractor (D2A)** is a system that ingests meeting transcripts, chat threads, decision records, tasks, and completion updates — extracts architectural decisions — and links each decision to an **owner**, **deadline**, **evidence trail**, and **impact classification**. It requires human confirmation for high-impact actions, captures override reasons, and provides a full audit trail with rollback capability.

---

## 2. Stakeholder Assumptions

| Stakeholder | Assumption | Risk if Wrong |
|---|---|---|
| **Engineering Managers** | They want visibility into decisions made across teams and want to track decision→action conversion rate | If they don't value this metric, adoption stalls |
| **Tech Leads / Architects** | They make decisions verbally in meetings and expect someone else to document them | If they already document well, the tool adds friction |
| **Individual Contributors** | They will accept assigned actions if evidence is clear and deadlines are reasonable | If they see it as micromanagement, they will resist |
| **Product Managers** | They want to understand architectural trade-offs that affect delivery timelines | If they don't engage, cross-functional alignment is lost |
| **Engineering Directors** | They want aggregate metrics: how many decisions are made vs. tracked vs. completed | If metrics are gamed, the system loses credibility |
| **Compliance / Governance** | They need audit trails for SOX/SOC2 compliance on architectural changes | If audit trail is incomplete, legal/compliance risk |
| **Data Sources** | Meeting transcripts, chat threads, and task systems may have different availability SLAs | System must degrade gracefully when sources are delayed/missing |

### Key Assumption Validation Plan
- **Survey**: Pre-deployment survey of 50 engineers across 5 teams measuring current decision documentation practices
- **Interviews**: 10 structured interviews with tech leads on decision-making workflows
- **Baseline Measurement**: 2-week observation period measuring decisions made vs. documented vs. actioned

---

## 3. Problem Statement

### Current State (Before)
```
Meeting happens → Discussion occurs → Decisions are made verbally
    ↓                                         ↓
Notes are partial or missing          No one writes an ADR
    ↓                                         ↓
Action items are vague              No owner, no deadline assigned
    ↓                                         ↓
Follow-up meeting: "What did we decide?"   Decision is relitigated
    ↓
Cycle repeats → Architecture drift → Technical debt accumulates
```

### Desired State (After)
```
Meeting/Chat/Discussion occurs
    ↓
D2A ingests transcript/thread automatically
    ↓
Decisions extracted with confidence scores + evidence links
    ↓
Actions generated with owners + deadlines + impact classification
    ↓
High-impact actions → Human confirmation required
    ↓
Confirmed actions → Tracked in task system with full audit trail
    ↓
Dashboard: Decisions→Actions conversion rate, completion rate, SLA compliance
```

### Before-and-After Comparison

| Metric | Before D2A | After D2A (Target) |
|---|---|---|
| Decisions documented within 24h | ~15% | >80% |
| Decisions with assigned owner | ~25% | >95% |
| Decisions with deadline | ~10% | >90% |
| Decision→Action conversion rate | ~20% | >85% |
| Time to document a decision | 2-5 days (manual) | <1 hour (auto-extracted) |
| Decisions relitigated in follow-up meetings | ~40% | <10% |
| Audit trail completeness | ~5% | 100% |
| Action completion rate (within deadline) | Unknown | Measurable + tracked |

---

## 4. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DATA SOURCES LAYER                          │
│                                                                     │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐│
│  │   Meeting     │ │   Chat       │ │  Decision    │ │   Task     ││
│  │  Transcripts  │ │  Threads     │ │  Records     │ │  Updates   ││
│  │  (Zoom/Teams) │ │ (Slack/Teams)│ │  (ADRs/Docs) │ │(Jira/Asana)││
│  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘ └─────┬──────┘│
│         │                │                │               │        │
│         ▼                ▼                ▼               ▼        │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              INGESTION & NORMALIZATION ENGINE               │   │
│  │  • Source health monitor (missing/delayed detection)        │   │
│  │  • Format normalization (timestamps, speakers, threads)     │   │
│  │  • Deduplication across sources                             │   │
│  │  • Graceful degradation when sources unavailable            │   │
│  └─────────────────────────┬───────────────────────────────────┘   │
└────────────────────────────┼───────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     EXTRACTION ENGINE                               │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  DECISION DETECTOR                                          │   │
│  │  • Pattern matching (linguistic markers)                    │   │
│  │  • Context analysis (who said what, when)                   │   │
│  │  • Confidence scoring (0.0 - 1.0)                          │   │
│  │  • Evidence linking (source → decision)                     │   │
│  └──────────────────────────┬───────────────────────────────────┘   │
│                             │                                       │
│  ┌──────────────────────────▼───────────────────────────────────┐   │
│  │  ACTION GENERATOR                                           │   │
│  │  • Decision → Action decomposition                          │   │
│  │  • Owner inference (from discussion participants)           │   │
│  │  • Deadline extraction / suggestion                         │   │
│  │  • Impact classification (HIGH / MEDIUM / LOW)              │   │
│  │  • Rule/evidence display for each recommendation            │   │
│  └──────────────────────────┬───────────────────────────────────┘   │
│                             │                                       │
│  ┌──────────────────────────▼───────────────────────────────────┐   │
│  │  IMPACT CLASSIFIER                                          │   │
│  │  • Service criticality assessment                           │   │
│  │  • Blast radius estimation                                  │   │
│  │  • Reversibility check                                      │   │
│  │  • Cross-team dependency detection                          │   │
│  └──────────────────────────┬───────────────────────────────────┘   │
└────────────────────────────┼───────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   CONFIRMATION & GOVERNANCE LAYER                   │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  HUMAN-IN-THE-LOOP                                          │   │
│  │  • Auto-approve LOW impact actions                          │   │
│  │  • Require confirmation for HIGH impact actions             │   │
│  │  • Override capture (reason + approver)                     │   │
│  │  • Escalation paths for unconfirmed actions                 │   │
│  └──────────────────────────┬───────────────────────────────────┘   │
│                             │                                       │
│  ┌──────────────────────────▼───────────────────────────────────┐   │
│  │  AUDIT TRAIL ENGINE                                         │   │
│  │  • Immutable event log                                      │   │
│  │  • Change history (who changed what, when, why)             │   │
│  │  • Rollback capability for high-impact actions              │   │
│  │  • Compliance reporting (SOC2/SOX)                          │   │
│  └──────────────────────────┬───────────────────────────────────┘   │
└────────────────────────────┼───────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      PRESENTATION LAYER                             │
│                                                                     │
│  ┌─────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐ │
│  │  Dashboard   │ │  Decision    │ │  Action      │ │   Audit    │ │
│  │  (Metrics)   │ │  Feed        │ │  Tracker     │ │   Log      │ │
│  └─────────────┘ └──────────────┘ └──────────────┘ └────────────┘ │
│                                                                     │
│  Key Metrics Displayed:                                             │
│  • Decision→Action conversion rate                                  │
│  • Actions pending confirmation                                     │
│  • Overdue actions                                                  │
│  • Source health status                                             │
│  • Audit completeness score                                         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 5. Data Schema

### 5.1 Core Entities

```
┌─────────────────────────┐
│       DataSource        │
├─────────────────────────┤
│ id: UUID (PK)           │
│ type: ENUM              │
│   (TRANSCRIPT, CHAT,    │
│    DECISION_RECORD,     │
│    TASK, UPDATE)        │
│ name: STRING            │
│ status: ENUM            │
│   (ACTIVE, DELAYED,     │
│    MISSING, ERROR)      │
│ last_sync: TIMESTAMP    │
│ health_score: FLOAT     │
│ created_at: TIMESTAMP   │
│ updated_at: TIMESTAMP   │
└─────────┬───────────────┘
          │ 1:N
          ▼
┌─────────────────────────┐
│      RawDocument        │
├─────────────────────────┤
│ id: UUID (PK)           │
│ source_id: UUID (FK)    │
│ content: TEXT            │
│ metadata: JSON           │
│   {speakers, duration,  │
│    channel, thread_id}  │
│ ingested_at: TIMESTAMP  │
│ processed: BOOLEAN      │
│ processing_errors: JSON │
└─────────┬───────────────┘
          │ 1:N
          ▼
┌─────────────────────────┐        ┌─────────────────────────┐
│      Decision           │        │    DecisionEvidence     │
├─────────────────────────┤        ├─────────────────────────┤
│ id: UUID (PK)           │───1:N─▶│ id: UUID (PK)           │
│ document_id: UUID (FK)  │        │ decision_id: UUID (FK)  │
│ title: STRING           │        │ source_type: ENUM       │
│ description: TEXT        │        │ source_ref: STRING      │
│ confidence: FLOAT(0-1)  │        │ excerpt: TEXT           │
│ context: TEXT            │        │ speaker: STRING         │
│ impact: ENUM             │        │ timestamp: TIMESTAMP    │
│   (HIGH, MEDIUM, LOW)   │        │ confidence: FLOAT       │
│ status: ENUM             │        └─────────────────────────┘
│   (EXTRACTED, CONFIRMED,│
│    REJECTED, ARCHIVED)  │
│ extraction_rules: JSON   │
│ extracted_at: TIMESTAMP  │
│ confirmed_by: STRING    │
│ confirmed_at: TIMESTAMP │
│ tags: JSON               │
└─────────┬───────────────┘
          │ 1:N
          ▼
┌─────────────────────────┐        ┌─────────────────────────┐
│       Action            │        │     AuditEntry          │
├─────────────────────────┤        ├─────────────────────────┤
│ id: UUID (PK)           │───1:N─▶│ id: UUID (PK)           │
│ decision_id: UUID (FK)  │        │ entity_type: ENUM       │
│ title: STRING           │        │ entity_id: UUID         │
│ description: TEXT        │        │ action: ENUM            │
│ owner: STRING            │        │   (CREATE, UPDATE,      │
│ owner_email: STRING      │        │    CONFIRM, REJECT,     │
│ deadline: DATE           │        │    OVERRIDE, ROLLBACK,  │
│ impact: ENUM             │        │    COMPLETE, REOPEN)    │
│   (HIGH, MEDIUM, LOW)   │        │ actor: STRING           │
│ status: ENUM             │        │ reason: TEXT            │
│   (PENDING_CONFIRM,     │        │ previous_state: JSON    │
│    CONFIRMED, IN_PROG,  │        │ new_state: JSON         │
│    COMPLETED, OVERDUE,  │        │ timestamp: TIMESTAMP    │
│    ROLLED_BACK)          │        │ ip_address: STRING      │
│ confirmation_required:   │        └─────────────────────────┘
│   BOOLEAN                │
│ confirmed_by: STRING    │
│ confirmed_at: TIMESTAMP │
│ override_reason: TEXT    │
│ rollback_available: BOOL │
│ evidence_rules: JSON     │
│ created_at: TIMESTAMP   │
│ updated_at: TIMESTAMP   │
│ completed_at: TIMESTAMP │
└─────────────────────────┘
```

### 5.2 Supporting Entities

```
┌─────────────────────────┐        ┌─────────────────────────┐
│   ExtractionRule        │        │      Metric             │
├─────────────────────────┤        ├─────────────────────────┤
│ id: UUID (PK)           │        │ id: UUID (PK)           │
│ name: STRING            │        │ name: STRING            │
│ pattern: STRING          │        │ value: FLOAT            │
│ category: STRING         │        │ period: ENUM            │
│ description: TEXT        │        │   (DAILY, WEEKLY,       │
│ confidence_weight: FLOAT│        │    MONTHLY)             │
│ examples: JSON           │        │ baseline: FLOAT         │
│ active: BOOLEAN          │        │ target: FLOAT           │
│ created_at: TIMESTAMP   │        │ measured_at: TIMESTAMP  │
│ updated_at: TIMESTAMP   │        │ error_margin: FLOAT     │
└─────────────────────────┘        │ metadata: JSON          │
                                   └─────────────────────────┘
```

---

## 6. Functional Requirements

### 6.1 Data Ingestion
- **FR-1**: Ingest meeting transcripts (text format, speaker-labeled)
- **FR-2**: Ingest chat threads (threaded conversations with timestamps)
- **FR-3**: Ingest existing decision records (ADRs, design docs)
- **FR-4**: Ingest task/ticket updates (status changes, assignments)
- **FR-5**: Ingest completion updates (progress reports, stand-up notes)
- **FR-6**: Monitor data source health and continue operating when sources are missing/delayed
- **FR-7**: Display source health status on dashboard

### 6.2 Decision Extraction
- **FR-8**: Extract decisions using linguistic pattern matching
- **FR-9**: Assign confidence scores (0.0-1.0) to each extracted decision
- **FR-10**: Link each decision to source evidence (transcript excerpt, chat message)
- **FR-11**: Classify decision impact (HIGH/MEDIUM/LOW)
- **FR-12**: Display extraction rules/evidence behind each recommendation

### 6.3 Action Generation
- **FR-13**: Generate actionable tasks from decisions
- **FR-14**: Infer owners from discussion participants
- **FR-15**: Extract or suggest deadlines
- **FR-16**: Require human confirmation for HIGH impact actions
- **FR-17**: Allow override with mandatory reason capture

### 6.4 Audit & Governance
- **FR-18**: Maintain immutable audit trail for all changes
- **FR-19**: Support rollback for high-impact actions
- **FR-20**: Track change history with actor, timestamp, and reason
- **FR-21**: Generate compliance reports

### 6.5 Metrics & Reporting
- **FR-22**: Calculate and display decision→action conversion rate
- **FR-23**: Track action completion rate and SLA compliance
- **FR-24**: Show baseline vs. target vs. measured results
- **FR-25**: Provide error analysis for missed/incorrect extractions

---

## 7. Edge Cases & Failure Scenarios

### Edge Case 1: Missing Data Source
**Scenario**: The meeting transcript service is down for 4 hours.  
**Expected Behavior**: System continues processing chat threads and task updates. Dashboard shows "Meeting Transcripts: DELAYED" with last sync time. Decisions from other sources are still extracted. When transcripts become available, they are backfilled and cross-referenced with existing decisions.  
**Acceptance Criteria**: No data loss, no duplicate decisions after backfill, clear user notification.

### Edge Case 2: Contradictory Decisions
**Scenario**: A Monday meeting decides "Use PostgreSQL" but a Wednesday chat thread says "Team agreed on MongoDB."  
**Expected Behavior**: System detects contradiction via semantic similarity. Both decisions are flagged with a "CONFLICT" status. Human review is required before either becomes an action. Evidence from both sources is presented side-by-side.  
**Acceptance Criteria**: Conflict detected within 1 processing cycle, both evidence trails preserved.

### Edge Case 3: Ambiguous Owner Assignment
**Scenario**: Transcript says "Someone from the backend team should handle the migration."  
**Expected Behavior**: System extracts the action but marks owner as "UNASSIGNED - Backend Team" with a confidence score of 0.3. Action is flagged for human assignment. Suggested owners are listed based on team membership and recent activity.  
**Acceptance Criteria**: Action is not auto-assigned to wrong person, escalation after 48h if still unassigned.

### Edge Case 4: High-Impact Action Without Confirmation
**Scenario**: A decision to "deprecate the v1 API by end of quarter" is extracted with HIGH impact.  
**Expected Behavior**: Action is created in PENDING_CONFIRM status. Notification sent to tech lead and engineering manager. Action cannot proceed without explicit confirmation. If not confirmed within 72h, escalation to director.  
**Acceptance Criteria**: No HIGH impact action proceeds without human confirmation.

### Edge Case 5: Rollback of Confirmed Action  
**Scenario**: A confirmed HIGH-impact action ("migrate to microservices") needs to be reversed after new information surfaces.  
**Expected Behavior**: Authorized user initiates rollback. System records rollback reason, creates audit entry, reverts action status to ROLLED_BACK. Original decision is preserved. New decision record is created linking to the rollback.  
**Acceptance Criteria**: Full audit trail preserved, rollback reason mandatory, original evidence intact.

---

## 8. Measurable Experiment Design

### 8.1 Experiment Setup

| Parameter | Value |
|---|---|
| **Duration** | 4 weeks (2 week baseline + 2 week intervention) |
| **Teams** | 3 engineering teams (~15 engineers each) |
| **Data Sources** | Meeting transcripts, Slack threads, Jira tickets, Confluence ADRs |
| **Control** | Team A (no D2A, current process) |
| **Treatment** | Team B & C (D2A enabled) |

### 8.2 Metrics

| Metric | Baseline | Target | Measurement Method |
|---|---|---|---|
| Decision→Action Conversion Rate | 20% ± 5% | 80% ± 10% | (Actions tracked / Decisions identified) × 100 |
| Time to Document Decision | 3.2 days ± 1.5d | 0.5 days ± 0.25d | Timestamp(decision made) → Timestamp(action created) |
| Action Completion Rate (on time) | Unknown | >70% | (Actions completed by deadline / Total actions) × 100 |
| Decision Re-litigation Rate | 38% ± 8% | <12% | (Decisions discussed again / Total decisions) × 100 |
| Extraction Accuracy (Precision) | N/A | >85% | Manual review of 100 random extractions |
| Extraction Completeness (Recall) | N/A | >75% | Manual identification of decisions in sample transcripts |
| False Positive Rate | N/A | <15% | (Incorrect extractions / Total extractions) × 100 |
| User Trust Score | N/A | >4.0/5.0 | Post-experiment survey |

### 8.3 Error Analysis Framework

| Error Type | Description | Mitigation |
|---|---|---|
| **False Positive** | Non-decision extracted as decision | Tune confidence threshold, add negative examples |
| **False Negative** | Real decision missed | Add linguistic patterns, lower threshold for review |
| **Wrong Owner** | Action assigned to wrong person | Improve owner inference, always require human confirmation |
| **Wrong Impact** | HIGH classified as LOW or vice versa | Refine impact rules, add domain-specific signals |
| **Wrong Deadline** | Incorrect deadline extracted | Default to conservative deadline, flag for review |
| **Stale Source** | Decision from old transcript processed as new | Deduplication by semantic similarity + timestamp |

---

## 9. Risk Register

| ID | Risk | Probability | Impact | Mitigation | Owner |
|---|---|---|---|---|---|
| R1 | Low adoption due to perceived surveillance | HIGH | HIGH | Emphasize decision tracking (not people tracking), anonymize where possible, get team buy-in | Engineering Manager |
| R2 | Poor extraction accuracy erodes trust | MEDIUM | HIGH | Start with high-confidence extractions only, iterate based on feedback, maintain >85% precision | Tech Lead |
| R3 | Data source APIs change/break | MEDIUM | MEDIUM | Abstraction layer per source, health monitoring, graceful degradation | Platform Team |
| R4 | Meeting transcripts have poor quality (ASR errors) | HIGH | MEDIUM | Pre-processing normalization, confidence adjustment for noisy sources | ML Engineer |
| R5 | Override reasons are perfunctory ("N/A", "because") | MEDIUM | LOW | Minimum character requirement, structured reason templates | Product Manager |
| R6 | Compliance requirements change | LOW | HIGH | Modular audit trail, configurable retention policies | Compliance Officer |
| R7 | System becomes bottleneck for decision workflow | LOW | HIGH | Async processing, manual bypass always available | Platform Team |
| R8 | Duplicate decisions from multiple sources | MEDIUM | MEDIUM | Cross-source deduplication using semantic similarity | Tech Lead |
| R9 | Scope creep beyond architecture decisions | MEDIUM | LOW | Clear decision taxonomy, configurable extraction rules | Product Manager |
| R10 | Single point of failure in extraction engine | LOW | HIGH | Stateless extraction, horizontal scaling, circuit breakers | Platform Team |

---

## 10. User Guide

### 10.1 Getting Started

1. **Access the Dashboard**: Navigate to the D2A web application
2. **Review Source Health**: Check that all data sources show "ACTIVE" status
3. **Browse Decisions**: View automatically extracted decisions in the Decision Feed
4. **Review Evidence**: Click any decision to see the source evidence and extraction rules
5. **Confirm/Reject Actions**: High-impact actions require your confirmation

### 10.2 Confirming Actions

1. Navigate to the **Actions** tab
2. Filter by "Pending Confirmation"
3. Review the decision evidence and extraction rules
4. Click **Confirm** to approve or **Reject** to decline
5. For **Override**: Click Override, provide a mandatory reason, and submit

### 10.3 Rollback Process

1. Navigate to the **Audit Log** tab
2. Find the action to rollback
3. Click **Rollback** (available only for HIGH impact confirmed actions)
4. Provide rollback reason (mandatory)
5. System reverts action status and creates audit entry

### 10.4 Understanding Confidence Scores

| Score | Meaning | Action Required |
|---|---|---|
| 0.9 - 1.0 | Very High Confidence | Auto-extracted, review recommended |
| 0.7 - 0.89 | High Confidence | Review and confirm |
| 0.5 - 0.69 | Medium Confidence | Manual review required |
| 0.0 - 0.49 | Low Confidence | Flagged for human classification |

### 10.5 Reading the Dashboard

- **Conversion Rate**: Percentage of extracted decisions that have at least one tracked action
- **Source Health**: Green = active, Yellow = delayed (>1h), Red = missing (>4h)
- **Pending Actions**: Actions awaiting human confirmation
- **Overdue Actions**: Confirmed actions past their deadline
- **Audit Score**: Completeness of audit trail (target: 100%)

---

## 11. Stakeholder Validation Plan

### 11.1 Validation Sessions

| Session | Participants | Duration | Goal |
|---|---|---|---|
| **Demo Day** | Engineering Directors, Tech Leads | 60 min | Demonstrate end-to-end flow, gather feedback |
| **Hands-on Workshop** | 5 engineers from pilot team | 90 min | Usability testing, task completion rate |
| **Metrics Review** | VP Engineering, Product Director | 30 min | Review baseline vs. measured results |
| **Retrospective** | All pilot participants | 45 min | Identify improvements, decide on rollout |

### 11.2 Validation Criteria

| Criterion | Threshold | Measurement |
|---|---|---|
| Task Completion Rate (usability) | >90% | Workshop: users complete 5 tasks without help |
| Net Promoter Score | >30 | Post-workshop survey |
| Decision→Action Improvement | >3x baseline | Quantitative metric comparison |
| Time Savings | >50% reduction | Time to document and track decisions |
| Willingness to Continue | >80% of users | Survey: "Would you use this daily?" |

---

## 12. Success Criteria for MVP

- [ ] Ingest at least 3 data source types (transcripts, chats, tasks)
- [ ] Extract decisions with >85% precision on test dataset
- [ ] Generate actions with owner and deadline for >90% of decisions
- [ ] Human confirmation flow for HIGH impact actions
- [ ] Override with mandatory reason capture
- [ ] Full audit trail for all state changes
- [ ] Rollback capability for HIGH impact actions
- [ ] Dashboard with conversion rate metrics
- [ ] Graceful degradation when data source is missing
- [ ] At least 3 edge cases handled and demonstrated
- [ ] Baseline vs. target vs. measured results displayed
- [ ] Error analysis available for review

---

## 13. Reproducible Repository Structure

```
COE/
├── PRD.md                          # This document
├── IMPLEMENTATION_PLAN.md          # Technical implementation details
├── index.html                      # Main application entry point
├── css/
│   └── styles.css                  # Application styles
├── js/
│   ├── app.js                      # Main application logic
│   ├── data.js                     # Sample data & data management
│   ├── extraction.js               # Decision extraction engine
│   ├── actions.js                  # Action generation & management
│   ├── audit.js                    # Audit trail engine
│   ├── metrics.js                  # Metrics calculation
│   ├── dashboard.js                # Dashboard rendering
│   └── utils.js                    # Utility functions
├── data/
│   ├── sample-transcripts.json     # Sample meeting transcripts
│   ├── sample-chats.json           # Sample chat threads
│   ├── sample-decisions.json       # Sample decision records
│   ├── sample-tasks.json           # Sample task data
│   └── edge-cases.json            # Edge case test data
└── README.md                       # Setup & run instructions
```
