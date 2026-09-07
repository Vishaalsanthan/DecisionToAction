// ─── Data Management Module ────────────────────────────────────────
// Loads sample data, manages data sources, simulates source health

const DataManager = (() => {
  let _transcripts = [];
  let _chats = [];
  let _decisionsData = [];
  let _tasksData = [];
  let _edgeCases = [];
  let _sourceHealth = {};
  let _initialized = false;

  const DEFAULT_SOURCE_HEALTH = {
    TRANSCRIPT: { status: 'ACTIVE', last_sync: new Date().toISOString(), name: 'Meeting Transcripts', icon: '🎙️', error: null },
    CHAT: { status: 'ACTIVE', last_sync: new Date().toISOString(), name: 'Chat Threads', icon: '💬', error: null },
    TASK: { status: 'ACTIVE', last_sync: new Date().toISOString(), name: 'Task System', icon: '📋', error: null },
    DECISION_RECORD: { status: 'ACTIVE', last_sync: new Date().toISOString(), name: 'Decision Records', icon: '📝', error: null },
    COMPLETION_UPDATE: { status: 'ACTIVE', last_sync: new Date().toISOString(), name: 'Completion Updates', icon: '✅', error: null }
  };

  async function loadJSON(path) {
    try {
      const resp = await fetch(path);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      return await resp.json();
    } catch (e) {
      console.warn(`Failed to load ${path} via fetch, will use fallback data if needed:`, e.message);
      return null;
    }
  }

  async function initialize() {
    if (_initialized) return;

    const [transcripts, chats, decisionsData, tasksData, edgeCases] = await Promise.all([
      loadJSON('data/sample-transcripts.json'),
      loadJSON('data/sample-chats.json'),
      loadJSON('data/sample-decisions.json'),
      loadJSON('data/sample-tasks.json'),
      loadJSON('data/edge-cases.json')
    ]);

    _transcripts = (transcripts && transcripts.length > 0) ? transcripts : getEmbeddedTranscripts();
    _chats = (chats && chats.length > 0) ? chats : getEmbeddedChats();
    _decisionsData = (decisionsData && decisionsData.length > 0) ? decisionsData : getEmbeddedDecisions();
    _tasksData = (tasksData && tasksData.length > 0) ? tasksData : getEmbeddedTasks();
    _edgeCases = (edgeCases && edgeCases.length > 0) ? edgeCases : getEmbeddedEdgeCases();

    // Load persisted source health or use defaults
    _sourceHealth = Utils.loadFromStorage('sourceHealth') || JSON.parse(JSON.stringify(DEFAULT_SOURCE_HEALTH));

    _initialized = true;
    Utils.emit('data:loaded', {
      transcripts: _transcripts.length,
      chats: _chats.length,
      decisions: _decisionsData.length,
      tasks: _tasksData.length,
      edgeCases: _edgeCases.length
    });
  }

  function getTranscripts() { return _transcripts; }
  function getChats() { return _chats; }
  function getDecisionsData() { return _decisionsData; }
  function getTasksData() { return _tasksData; }
  function getEdgeCases() { return _edgeCases; }

  function getSourceHealth() { return _sourceHealth; }

  function setSourceStatus(sourceType, status, error = null) {
    if (_sourceHealth[sourceType]) {
      _sourceHealth[sourceType].status = status;
      _sourceHealth[sourceType].error = error;
      if (status === 'ACTIVE') {
        _sourceHealth[sourceType].last_sync = new Date().toISOString();
        _sourceHealth[sourceType].error = null;
      }
      Utils.saveToStorage('sourceHealth', _sourceHealth);
      Utils.emit('source:healthChanged', { sourceType, status, error });
    }
  }

  function resetSourceHealth() {
    _sourceHealth = JSON.parse(JSON.stringify(DEFAULT_SOURCE_HEALTH));
    Utils.saveToStorage('sourceHealth', _sourceHealth);
    Utils.emit('source:healthChanged', { all: true });
  }

  function simulateMissingSource(sourceType) {
    setSourceStatus(sourceType, 'MISSING', `Service timeout after 3 retries — simulated outage at ${new Date().toLocaleTimeString()}`);
  }

  function simulateDelayedSource(sourceType) {
    const lastSync = new Date(Date.now() - 2 * 3600000).toISOString(); // 2 hours ago
    if (_sourceHealth[sourceType]) {
      _sourceHealth[sourceType].status = 'DELAYED';
      _sourceHealth[sourceType].last_sync = lastSync;
      _sourceHealth[sourceType].error = 'Sync lag: 2 hours behind';
      Utils.saveToStorage('sourceHealth', _sourceHealth);
      Utils.emit('source:healthChanged', { sourceType, status: 'DELAYED' });
    }
  }

  function recoverSource(sourceType) {
    setSourceStatus(sourceType, 'ACTIVE');
  }

  function getActiveSourceCount() {
    return Object.values(_sourceHealth).filter(s => s.status === 'ACTIVE').length;
  }

  function getTotalSourceCount() {
    return Object.keys(_sourceHealth).length;
  }

  function isSourceAvailable(sourceType) {
    return _sourceHealth[sourceType]?.status === 'ACTIVE';
  }

  // All documents combined for processing
  function getAllDocuments() {
    const docs = [];

    // Only include documents from available/delayed sources
    if (_sourceHealth.TRANSCRIPT && _sourceHealth.TRANSCRIPT.status !== 'MISSING') {
      _transcripts.forEach(t => {
        docs.push({
          id: t.id,
          type: 'TRANSCRIPT',
          title: t.title,
          date: t.date,
          participants: t.participants,
          content: t.content.map(c => `[${c.time}] ${c.speaker}: ${c.text}`).join('\n'),
          rawContent: t.content,
          sourceStatus: _sourceHealth.TRANSCRIPT.status
        });
      });
    }

    if (_sourceHealth.CHAT && _sourceHealth.CHAT.status !== 'MISSING') {
      _chats.forEach(c => {
        docs.push({
          id: c.id,
          type: 'CHAT',
          title: c.thread_title,
          date: c.date,
          participants: [...new Set(c.messages.map(m => m.sender))],
          content: c.messages.map(m => `[${m.time}] ${m.sender}: ${m.text}`).join('\n'),
          rawContent: c.messages,
          channel: c.channel,
          sourceStatus: _sourceHealth.CHAT.status
        });
      });
    }

    if (_sourceHealth.DECISION_RECORD && _sourceHealth.DECISION_RECORD.status !== 'MISSING') {
      _decisionsData.forEach(d => {
        docs.push({
          id: d.id,
          type: 'DECISION_RECORD',
          title: d.title,
          date: d.date,
          participants: [d.author],
          content: `${d.title}\nContext: ${d.context}\nDecision: ${d.decision}`,
          rawContent: [
            { speaker: d.author, text: d.decision, time: d.date }
          ],
          sourceStatus: _sourceHealth.DECISION_RECORD.status
        });
      });
    }

    if (_sourceHealth.TASK && _sourceHealth.TASK.status !== 'MISSING') {
      _tasksData.forEach(t => {
        docs.push({
          id: t.id,
          type: 'TASK',
          title: `${t.key}: ${t.title}`,
          date: t.completion_status?.last_updated || new Date().toISOString(),
          participants: [t.assignee],
          content: `Task: ${t.title}. Assignee: ${t.assignee}. Status: ${t.status}. Description: ${t.description}`,
          rawContent: [
            { speaker: t.assignee, text: `Action item: ${t.title}. Due by ${t.due_date}.`, time: t.due_date }
          ],
          sourceStatus: _sourceHealth.TASK.status
        });
      });
    }

    return docs;
  }

  // Embedded fallback datasets for resilience
  function getEmbeddedTranscripts() {
    return [
      {
        id: 'transcript-001',
        title: 'Platform Architecture Review — Q3 Planning',
        date: '2026-08-25T10:00:00Z',
        duration_minutes: 55,
        participants: ['Sarah Chen (VP Engineering)', 'Marcus Rodriguez (Tech Lead)', 'Priya Patel (Backend Lead)', 'James O\'Brien (DevOps)', 'Aisha Kumar (Frontend Lead)'],
        source_type: 'TRANSCRIPT',
        content: [
          { time: '00:01:15', speaker: 'Sarah Chen', text: 'Alright everyone, let\'s get started. The main topic today is our database strategy for the new recommendation engine.' },
          { time: '00:04:45', speaker: 'Priya Patel', text: 'I\'ve been running benchmarks. The hybrid approach with PostgreSQL plus Redis gives us 3x better read performance.' },
          { time: '00:08:30', speaker: 'Sarah Chen', text: 'OK, I think the data is clear. We decided to go with the hybrid approach — PostgreSQL for transactions, Redis for recommendation caching. Marcus, can you own the migration plan?' },
          { time: '00:09:00', speaker: 'Marcus Rodriguez', text: 'Yes, I\'ll draft the migration plan. We should have this done by end of September.' },
          { time: '00:09:45', speaker: 'Sarah Chen', text: 'Great. Next item — we need to deprecate the v1 API. Only 3% of traffic still uses it.' },
          { time: '00:11:20', speaker: 'Aisha Kumar', text: 'We should give at least 90 days notice. I\'ll prepare the deprecation timeline and client communication plan.' },
          { time: '00:12:30', speaker: 'Sarah Chen', text: 'Agreed. Let\'s set the deprecation date for December 1st. Aisha will handle the communication, and Priya, can you add sunset headers to the v1 endpoints?' },
          { time: '00:13:00', speaker: 'Priya Patel', text: 'Will do. I\'ll have the sunset headers deployed by next Friday.' },
          { time: '00:18:30', speaker: 'Sarah Chen', text: 'James, you\'re responsible for the CI/CD migration proof of concept. Action item: James to complete PoC by September 8th.' },
          { time: '00:20:00', speaker: 'Marcus Rodriguez', text: 'Also, going forward, all new services must use OpenTelemetry for observability. No more custom logging solutions.' },
          { time: '00:22:00', speaker: 'Marcus Rodriguez', text: 'I\'ll have the ADR drafted by end of this week.' }
        ]
      },
      {
        id: 'transcript-002',
        title: 'Microservices Decomposition — Authentication Service',
        date: '2026-08-28T14:00:00Z',
        duration_minutes: 40,
        participants: ['Marcus Rodriguez (Tech Lead)', 'David Kim (Security Lead)', 'Priya Patel (Backend Lead)', 'Lisa Wang (SRE)'],
        source_type: 'TRANSCRIPT',
        content: [
          { time: '00:02:30', speaker: 'David Kim', text: 'My recommendation is to use a dedicated auth service with JWT tokens and centralized key management.' },
          { time: '00:07:00', speaker: 'Marcus Rodriguez', text: 'We agreed to implement JWT with Redis-backed token revocation and mTLS for inter-service auth. David, you\'ll lead this.' },
          { time: '00:08:00', speaker: 'David Kim', text: 'This affects every service. We should target mid-October for the initial rollout.' },
          { time: '00:10:30', speaker: 'Marcus Rodriguez', text: 'Lisa, please have the canary deployment pipeline ready by September 15th.' },
          { time: '00:13:30', speaker: 'David Kim', text: 'I\'ll have the runbook ready by October 1st.' }
        ]
      },
      {
        id: 'transcript-003',
        title: 'Frontend Architecture — Design System Migration',
        date: '2026-09-01T11:00:00Z',
        duration_minutes: 35,
        participants: ['Aisha Kumar (Frontend Lead)', 'Tom Chen (Design Lead)', 'Marcus Rodriguez (Tech Lead)', 'Nina Gonzalez (Frontend Engineer)'],
        source_type: 'TRANSCRIPT',
        content: [
          { time: '00:03:00', speaker: 'Tom Chen', text: 'The decision is to build our own design system package using Web Components, so it\'s framework-agnostic.' },
          { time: '00:06:00', speaker: 'Aisha Kumar', text: 'Let\'s go with Lit for the design system implementation. Tom, can your team maintain the Figma-to-code pipeline?' },
          { time: '00:08:00', speaker: 'Tom Chen', text: 'Yes, we\'ll own the component library tokens by September 20th.' }
        ]
      }
    ];
  }

  function getEmbeddedChats() {
    return [
      {
        id: 'chat-001',
        channel: '#architecture-decisions',
        thread_title: 'Database sharding strategy',
        date: '2026-08-26T09:15:00Z',
        source_type: 'CHAT',
        messages: [
          { time: '09:15:00', sender: 'Marcus Rodriguez', text: 'We are approaching 500M rows in user tables. We need a sharding plan.' },
          { time: '09:18:00', sender: 'Priya Patel', text: 'We should shard by user_id range with hash partitioning.' },
          { time: '09:30:00', sender: 'Marcus Rodriguez', text: 'OK, we\'ll go with hash-based sharding using Vitess. @James can you set up a Vitess PoC environment by next Wednesday?' },
          { time: '09:32:00', sender: 'James O\'Brien', text: 'On it. I\'ll have the Vitess PoC running on staging by Wednesday Sept 3rd.' }
        ]
      },
      {
        id: 'chat-002',
        channel: '#backend-team',
        thread_title: 'Event sourcing for order service',
        date: '2026-08-27T14:30:00Z',
        source_type: 'CHAT',
        messages: [
          { time: '14:30:00', sender: 'Priya Patel', text: 'Proposal: migrate the order service from CRUD to event sourcing with Kafka.' },
          { time: '14:42:00', sender: 'Marcus Rodriguez', text: 'The decision is to adopt event sourcing for the order service using Kafka. Priya, can you write up the technical design doc by September 5th?' },
          { time: '14:45:00', sender: 'Priya Patel', text: 'Will do. I\'ll include the migration strategy and rollback plan.' }
        ]
      },
      {
        id: 'chat-003',
        channel: '#frontend-team',
        thread_title: 'State management migration',
        date: '2026-08-29T10:00:00Z',
        source_type: 'CHAT',
        messages: [
          { time: '10:00:00', sender: 'Aisha Kumar', text: 'We need to standardize state management across our web applications.' },
          { time: '10:12:00', sender: 'Aisha Kumar', text: 'Let\'s go with Zustand as our standard state management solution. @Nina, can you create a migration playbook by September 8th?' },
          { time: '10:15:00', sender: 'Nina Gonzalez', text: 'Sure thing. I\'ll also set up an eslint rule.' }
        ]
      }
    ];
  }

  function getEmbeddedDecisions() {
    return [
      {
        id: 'adr-001',
        title: 'ADR-001: Adopt OpenTelemetry for Distributed Tracing',
        status: 'ACCEPTED',
        date: '2026-08-20T10:00:00Z',
        source_type: 'DECISION_RECORD',
        author: 'Marcus Rodriguez (Tech Lead)',
        context: 'Transition from monolith to microservices requires unified observability.',
        decision: 'We decided to adopt OpenTelemetry as the standard observability framework across all backend services.',
        impact: 'MEDIUM',
        tags: ['observability', 'opentelemetry', 'architecture']
      },
      {
        id: 'adr-002',
        title: 'ADR-002: Vitess Sharding for High-Volume User Tables',
        status: 'ACCEPTED',
        date: '2026-08-27T16:00:00Z',
        source_type: 'DECISION_RECORD',
        author: 'Priya Patel (Backend Lead)',
        context: 'User tables have exceeded 450M rows.',
        decision: 'We decided to implement hash-based sharding on user_id using Vitess as the distributed database proxy layer.',
        impact: 'HIGH',
        tags: ['database', 'vitess', 'sharding']
      },
      {
        id: 'adr-003',
        title: 'ADR-003: Deprecate Legacy REST API v1 in Favor of v2 gRPC and REST',
        status: 'PROPOSED',
        date: '2026-08-30T11:30:00Z',
        source_type: 'DECISION_RECORD',
        author: 'Sarah Chen (VP Engineering)',
        context: 'API v1 maintenance overhead is significant with 3% traffic.',
        decision: 'We decided to deprecate internal and external v1 API endpoints with an effective sunset date of December 1st, 2026.',
        impact: 'HIGH',
        tags: ['api', 'deprecation', 'security']
      }
    ];
  }

  function getEmbeddedTasks() {
    return [
      {
        id: 'task-001',
        key: 'ENG-4102',
        title: 'Set up Vitess proof-of-concept environment on staging',
        assignee: 'James O\'Brien',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        due_date: '2026-09-03',
        source_type: 'TASK',
        description: 'Deploy 2-shard Vitess cluster on Kubernetes staging namespace.',
        completion_status: { percent: 65, last_updated: '2026-08-29T15:30:00Z' }
      },
      {
        id: 'task-002',
        key: 'ENG-4108',
        title: 'Draft OpenTelemetry instrumentation guidelines ADR',
        assignee: 'Marcus Rodriguez',
        status: 'COMPLETED',
        priority: 'MEDIUM',
        due_date: '2026-08-29',
        source_type: 'TASK',
        description: 'Document standard naming conventions and span attributes.',
        completion_status: { percent: 100, last_updated: '2026-08-28T14:20:00Z' }
      },
      {
        id: 'task-003',
        key: 'ENG-4120',
        title: 'Add sunset headers and warning logs to API v1 endpoints',
        assignee: 'Priya Patel',
        status: 'PENDING',
        priority: 'HIGH',
        due_date: '2026-09-04',
        source_type: 'TASK',
        description: 'Inject Sunset and Link headers into all v1 responses.',
        completion_status: { percent: 30, last_updated: '2026-08-31T10:15:00Z' }
      }
    ];
  }

  function getEmbeddedEdgeCases() {
    return [
      {
        id: 'edge-001',
        title: 'Missing Data Source — Transcripts Unavailable',
        scenario: 'MISSING_SOURCE',
        affected_source: 'TRANSCRIPT',
        expected_behavior: 'System processes available sources, marks transcript-dependent decisions as partial evidence'
      },
      {
        id: 'edge-002',
        title: 'Contradictory Decisions Across Sources',
        scenario: 'CONTRADICTION',
        expected_behavior: 'System detects semantic similarity between conflicting decisions, flags as CONFLICT'
      },
      {
        id: 'edge-003',
        title: 'Ambiguous Owner Assignment',
        scenario: 'AMBIGUOUS_OWNER',
        expected_behavior: 'Action created with owner marked UNASSIGNED — Platform Team with suggested owners ranked by confidence'
      },
      {
        id: 'edge-004',
        title: 'High-Impact Action Requiring Rollback',
        scenario: 'ROLLBACK',
        expected_behavior: 'System records rollback with full audit trail, reverts status to ROLLED_BACK'
      }
    ];
  }

  return {
    initialize,
    getTranscripts, getChats, getDecisionsData, getTasksData, getEdgeCases,
    getSourceHealth, setSourceStatus, resetSourceHealth,
    simulateMissingSource, simulateDelayedSource, recoverSource,
    getActiveSourceCount, getTotalSourceCount, isSourceAvailable,
    getAllDocuments
  };
})();
