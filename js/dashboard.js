// ─── Dashboard Rendering & UI Controller ───────────────────────────
// Manages navigation, panels, modal dialogs, search/filters, and toast alerts

const Dashboard = (() => {
  let _currentTab = 'overview';
  let _activeDecisionFilter = { source: 'ALL', impact: 'ALL', status: 'ALL', search: '' };
  let _activeActionFilter = { status: 'ALL', impact: 'ALL', search: '' };
  let _activeAuditFilter = { action: 'ALL', search: '' };

  function initialize() {
    setupNavigation();
    setupModals();
    setupEventListeners();
    renderCurrentTab();
    updateBadges();
  }

  function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = item.getAttribute('data-tab');
        if (tab) switchTab(tab);
      });
    });
  }

  function switchTab(tabName) {
    _currentTab = tabName;
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.getAttribute('data-tab') === tabName);
    });

    const pageTitleEl = document.getElementById('pageTitle');
    const pageBreadcrumbEl = document.getElementById('pageBreadcrumb');
    const titles = {
      overview: 'Executive Overview',
      decisions: 'Extracted Decision Feed',
      actions: 'Action Tracker & Governance',
      audit: 'Audit Log & Compliance',
      metrics: 'Metrics & Experimentation',
      'edge-cases': 'Edge Cases & Degradation Lab',
      sources: 'Data Ingestion & Source Health'
    };

    if (pageTitleEl) pageTitleEl.textContent = titles[tabName] || 'Dashboard';
    if (pageBreadcrumbEl) pageBreadcrumbEl.textContent = `D2A System / ${titles[tabName] || 'Dashboard'}`;

    renderCurrentTab();
  }

  function renderCurrentTab() {
    const container = document.getElementById('pageBody');
    if (!container) return;

    switch (_currentTab) {
      case 'overview':
        container.innerHTML = renderOverviewView();
        bindOverviewEvents();
        break;
      case 'decisions':
        container.innerHTML = renderDecisionsView();
        bindDecisionsEvents();
        break;
      case 'actions':
        container.innerHTML = renderActionsView();
        bindActionsEvents();
        break;
      case 'audit':
        container.innerHTML = renderAuditView();
        bindAuditEvents();
        break;
      case 'metrics':
        container.innerHTML = renderMetricsView();
        bindMetricsEvents();
        break;
      case 'edge-cases':
        container.innerHTML = renderEdgeCasesView();
        bindEdgeCasesEvents();
        break;
      case 'sources':
        container.innerHTML = renderSourcesView();
        bindSourcesEvents();
        break;
      default:
        container.innerHTML = `<div class="panel"><p>View not found.</p></div>`;
    }
  }

  // ─── 1. OVERVIEW VIEW ─────────────────────────────────────────────
  function renderOverviewView() {
    const stats = MetricsEngine.getDashboardStats();
    const actions = ActionManager.getActions();
    const pendingActions = actions.filter(a => a.status === 'PENDING_CONFIRM');
    const sourceHealth = stats.sources.health;
    const hasDegradedSources = Object.values(sourceHealth).some(s => s.status !== 'ACTIVE');

    return `
      ${hasDegradedSources ? `
        <div class="notice-banner warning">
          <div class="notice-content">
            <span style="font-size:20px;">⚠️</span>
            <div>
              <strong>Graceful Degradation Active:</strong> One or more data sources are delayed or unavailable. Decision extraction confidence is adjusted.
            </div>
          </div>
          <button class="btn btn-sm btn-secondary" onclick="Dashboard.switchTab('sources')">View Source Health</button>
        </div>
      ` : ''}

      <!-- Top KPI Metric Cards -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-label">Decision→Action Conversion</span>
            <span class="kpi-icon">🎯</span>
          </div>
          <div class="kpi-value-row">
            <span class="kpi-value">${stats.conversionRate}</span>
            <span class="kpi-unit">%</span>
          </div>
          <div class="kpi-footer">
            <span class="kpi-trend positive">↑ +${Math.max(0, stats.conversionRate - 20)}% vs Baseline (20%)</span>
            <span>Target: 85%</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-label">Extracted Decisions</span>
            <span class="kpi-icon">🧠</span>
          </div>
          <div class="kpi-value-row">
            <span class="kpi-value">${stats.decisions.total}</span>
          </div>
          <div class="kpi-footer">
            <span>High Impact: <strong>${stats.decisions.highImpact}</strong></span>
            <span>Avg Conf: <strong>${Math.round(stats.decisions.avgConfidence * 100)}%</strong></span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-label">Actions Pending Review</span>
            <span class="kpi-icon">⏳</span>
          </div>
          <div class="kpi-value-row">
            <span class="kpi-value" style="color:${stats.pendingActions > 0 ? 'var(--danger)' : 'var(--success)'};">${stats.pendingActions}</span>
          </div>
          <div class="kpi-footer">
            <span>Human confirmation required</span>
            <span class="badge ${stats.pendingActions > 0 ? 'badge-high' : 'badge-low'}">${stats.pendingActions > 0 ? 'NEEDS REVIEW' : 'ALL CLEAR'}</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-label">Audit Trail Completeness</span>
            <span class="kpi-icon">🛡️</span>
          </div>
          <div class="kpi-value-row">
            <span class="kpi-value">${AuditTrail.getComplianceSummary().auditCompleteness}</span>
            <span class="kpi-unit">%</span>
          </div>
          <div class="kpi-footer">
            <span class="kpi-trend positive">SOC2 / SOX Ready</span>
            <span>${stats.audit.total} events</span>
          </div>
        </div>
      </div>

      <!-- Quick Action Queue & Source Health Summary -->
      <div class="grid-2">
        <!-- High Impact Confirmation Queue -->
        <div class="panel">
          <div class="panel-header">
            <div class="panel-title-area">
              <h3 class="panel-title">⚠️ High-Impact Actions Awaiting Confirmation</h3>
              <span class="panel-subtitle">Mandatory human review gate before downstream execution</span>
            </div>
            <span class="nav-badge ${pendingActions.length > 0 ? 'danger' : 'neutral'}">${pendingActions.length} Pending</span>
          </div>

          ${pendingActions.length === 0 ? `
            <div style="text-align:center; padding: 40px 20px; color:var(--text-muted);">
              <span style="font-size:36px; display:block; margin-bottom:8px;">✅</span>
              <p>No high-impact actions pending confirmation. All decisions are tracked and confirmed.</p>
            </div>
          ` : `
            <div class="card-list">
              ${pendingActions.slice(0, 3).map(action => `
                <div class="item-card highlight-high">
                  <div class="item-card-header">
                    <div class="item-card-title-group">
                      <div style="display:flex; align-items:center; gap:8px;">
                        <span class="badge badge-high">${action.impact} IMPACT</span>
                        <span style="font-size:12px; font-family:var(--font-mono); color:var(--text-muted);">${action.id}</span>
                      </div>
                      <h4 class="item-card-title">${action.title}</h4>
                    </div>
                  </div>
                  <p class="item-card-body">${Utils.truncate(action.description, 140)}</p>
                  <div class="item-card-footer">
                    <div class="item-card-meta">
                      <span>👤 ${action.owner}</span>
                      <span>📅 Due: ${action.deadline}</span>
                    </div>
                    <div class="item-actions">
                      <button class="btn btn-sm btn-success" onclick="Dashboard.openConfirmModal('${action.id}')">Confirm</button>
                      <button class="btn btn-sm btn-warning" onclick="Dashboard.openOverrideModal('${action.id}')">Override</button>
                      <button class="btn btn-sm btn-danger" onclick="Dashboard.openRejectModal('${action.id}')">Reject</button>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
            ${pendingActions.length > 3 ? `
              <div style="text-align:center; padding-top:8px;">
                <button class="btn btn-ghost btn-sm" onclick="Dashboard.switchTab('actions')">View All ${pendingActions.length} Pending Actions →</button>
              </div>
            ` : ''}
          `}
        </div>

        <!-- System Ingestion & Health Snapshot -->
        <div class="panel">
          <div class="panel-header">
            <div class="panel-title-area">
              <h3 class="panel-title">🔌 Ingestion Source Health</h3>
              <span class="panel-subtitle">Real-time status across communication and planning channels</span>
            </div>
            <button class="btn btn-sm btn-secondary" onclick="Dashboard.switchTab('sources')">Manage Sources</button>
          </div>

          <div style="display:flex; flex-direction:column; gap:12px;">
            ${Object.entries(sourceHealth).map(([type, info]) => `
              <div style="display:flex; align-items:center; justify-content:space-between; padding:12px 14px; background:var(--bg-secondary); border-radius:var(--radius-sm); border:1px solid var(--border-subtle);">
                <div style="display:flex; align-items:center; gap:10px;">
                  <span style="font-size:18px;">${info.icon}</span>
                  <div>
                    <div style="font-weight:600; font-size:13px;">${info.name}</div>
                    <div style="font-size:11px; color:var(--text-muted);">Last sync: ${Utils.formatRelativeTime(info.last_sync)}</div>
                  </div>
                </div>
                <div style="display:flex; align-items:center; gap:8px;">
                  ${info.error ? `<span style="font-size:11px; color:var(--warning);">${info.error}</span>` : ''}
                  <span class="badge ${info.status === 'ACTIVE' ? 'badge-low' : info.status === 'DELAYED' ? 'badge-medium' : 'badge-high'}">
                    ${info.status}
                  </span>
                </div>
              </div>
            `).join('')}
          </div>

          <div style="padding-top:8px; border-top:1px solid var(--border-subtle); display:flex; justify-content:space-between; align-items:center; font-size:12px; color:var(--text-muted);">
            <span>${stats.sources.active} of ${stats.sources.total} sources active</span>
            <button class="btn btn-ghost btn-sm" onclick="App.runFullIngestion()">⚡ Re-sync All Sources</button>
          </div>
        </div>
      </div>

      <!-- Baseline vs Measured Progress Overview -->
      <div class="panel">
        <div class="panel-header">
          <div class="panel-title-area">
            <h3 class="panel-title">📊 Key Metric Progress (Baseline vs Target vs Measured)</h3>
            <span class="panel-subtitle">Pilot experiment results measuring decision visibility improvements</span>
          </div>
          <button class="btn btn-sm btn-secondary" onclick="Dashboard.switchTab('metrics')">Full Error Analysis →</button>
        </div>

        <div class="table-container">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th>Baseline</th>
                <th>Target</th>
                <th>Measured Today</th>
                <th>Improvement</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${renderKeyMetricsSummaryRows()}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderKeyMetricsSummaryRows() {
    const improvements = MetricsEngine.calculateImprovement();
    const keysToShow = ['decisionToActionConversion', 'decisionsWithOwner', 'decisionsWithDeadline', 'timeToDocument', 'auditCompleteness'];

    return keysToShow.map(k => {
      const item = improvements[k];
      if (!item) return '';
      const isExceeded = item.status === 'EXCEEDED';
      return `
        <tr>
          <td><strong>${item.label}</strong></td>
          <td>${item.baseline}${item.unit}</td>
          <td>${item.target}${item.unit}</td>
          <td><strong style="color:var(--text-primary);">${item.measured}${item.unit}</strong></td>
          <td>
            <span style="color:${item.improvement >= 0 ? 'var(--success)' : 'var(--danger)'}; font-weight:600;">
              ${item.improvement >= 0 ? '+' : ''}${item.improvement}%
            </span>
          </td>
          <td>
            <span class="badge ${isExceeded ? 'badge-low' : item.status === 'ON_TRACK' ? 'badge-confidence' : 'badge-medium'}" style="${isExceeded ? '' : 'background:rgba(99,102,241,0.15); color:var(--accent-primary); border:1px solid rgba(99,102,241,0.3);'}">
              ${item.status.replace(/_/g, ' ')}
            </span>
          </td>
        </tr>
      `;
    }).join('');
  }

  function bindOverviewEvents() {}

  // ─── 2. DECISIONS FEED VIEW ───────────────────────────────────────
  function renderDecisionsView() {
    const allDecisions = ExtractionEngine.getDecisions();
    const filteredDecisions = filterDecisions(allDecisions);

    return `
      <div class="panel">
        <div class="panel-header">
          <div class="panel-title-area">
            <h3 class="panel-title">🧠 Extracted Decisions Feed</h3>
            <span class="panel-subtitle">Architectural decisions extracted from transcripts, chats, ADRs, and tickets</span>
          </div>
          <div class="panel-controls">
            <button class="btn btn-primary btn-sm" onclick="App.runFullIngestion()">🔄 Run Extraction Now</button>
          </div>
        </div>

        <!-- Filter and Search Bar -->
        <div class="filter-bar">
          <div class="filter-group">
            <input
              type="text"
              id="decisionSearch"
              class="search-input"
              placeholder="Search decisions, tags, speakers..."
              value="${_activeDecisionFilter.search}"
            />

            <select id="decisionSourceFilter" class="select-input">
              <option value="ALL" ${_activeDecisionFilter.source === 'ALL' ? 'selected' : ''}>All Sources</option>
              <option value="TRANSCRIPT" ${_activeDecisionFilter.source === 'TRANSCRIPT' ? 'selected' : ''}>🎙️ Meeting Transcripts</option>
              <option value="CHAT" ${_activeDecisionFilter.source === 'CHAT' ? 'selected' : ''}>💬 Chat Threads</option>
              <option value="DECISION_RECORD" ${_activeDecisionFilter.source === 'DECISION_RECORD' ? 'selected' : ''}>📝 Decision Records (ADRs)</option>
              <option value="TASK" ${_activeDecisionFilter.source === 'TASK' ? 'selected' : ''}>📋 Task System</option>
            </select>

            <select id="decisionImpactFilter" class="select-input">
              <option value="ALL" ${_activeDecisionFilter.impact === 'ALL' ? 'selected' : ''}>All Impacts</option>
              <option value="HIGH" ${_activeDecisionFilter.impact === 'HIGH' ? 'selected' : ''}>High Impact</option>
              <option value="MEDIUM" ${_activeDecisionFilter.impact === 'MEDIUM' ? 'selected' : ''}>Medium Impact</option>
              <option value="LOW" ${_activeDecisionFilter.impact === 'LOW' ? 'selected' : ''}>Low Impact</option>
            </select>
          </div>

          <div style="font-size:12px; color:var(--text-muted);">
            Showing <strong>${filteredDecisions.length}</strong> of ${allDecisions.length} decisions
          </div>
        </div>

        <!-- Decision Cards Feed -->
        ${filteredDecisions.length === 0 ? `
          <div style="text-align:center; padding: 60px 20px; color:var(--text-muted);">
            <span style="font-size:40px; display:block; margin-bottom:12px;">🔍</span>
            <p>No decisions match the selected filters.</p>
            <button class="btn btn-secondary btn-sm" style="margin-top:12px;" onclick="Dashboard.resetDecisionFilters()">Reset Filters</button>
          </div>
        ` : `
          <div class="card-list">
            ${filteredDecisions.map(decision => renderDecisionCard(decision)).join('')}
          </div>
        `}
      </div>
    `;
  }

  function renderDecisionCard(decision) {
    const actions = ActionManager.getActions().filter(a => a.decisionId === decision.id);
    const sourceIcons = { TRANSCRIPT: '🎙️', CHAT: '💬', DECISION_RECORD: '📝', TASK: '📋' };
    const icon = sourceIcons[decision.sourceType] || '📄';
    const confPct = Math.round(decision.confidence * 100);
    const impactClass = decision.impact === 'HIGH' ? 'highlight-high' : decision.impact === 'MEDIUM' ? 'highlight-medium' : 'highlight-low';

    return `
      <div class="item-card ${impactClass}" id="card-${decision.id}">
        <div class="item-card-header">
          <div class="item-card-title-group">
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              <span class="badge ${decision.impact === 'HIGH' ? 'badge-high' : decision.impact === 'MEDIUM' ? 'badge-medium' : 'badge-low'}">
                ${decision.impact} IMPACT
              </span>
              <span class="badge-source">${icon} ${decision.sourceTitle || decision.sourceType}</span>
              <span class="badge-confidence" style="background:rgba(255,255,255,0.05); color:${Utils.confidenceColor(decision.confidence)}; border:1px solid ${Utils.confidenceColor(decision.confidence)}33;">
                ${confPct}% Conf (${Utils.confidenceLabel(decision.confidence)})
              </span>
              <span style="font-size:11.5px; font-family:var(--font-mono); color:var(--text-muted);">${decision.id}</span>
            </div>
            <h4 class="item-card-title" style="margin-top:4px;">${decision.title}</h4>
          </div>

          <div>
            ${actions.length > 0 ? `
              <span class="badge badge-low">⚡ ${actions.length} Action${actions.length > 1 ? 's' : ''} Linked</span>
            ` : `
              <button class="btn btn-primary btn-sm" onclick="Dashboard.generateActionForDecision('${decision.id}')">+ Generate Action</button>
            `}
          </div>
        </div>

        <p class="item-card-body">${decision.description}</p>

        <!-- Collapsible Evidence and Linguistic Rules -->
        <div class="evidence-drawer">
          <div class="evidence-header">
            <span>Source Evidence & Linguistic Match</span>
            <span>${decision.evidence?.[0]?.speaker || 'Author'} • ${decision.evidence?.[0]?.timestamp || Utils.formatDate(decision.extractedAt)}</span>
          </div>
          <div class="evidence-quote">
            "${decision.evidence?.[0]?.excerpt || decision.description}"
          </div>
          <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px;">
            <div style="display:flex; align-items:center; gap:6px;">
              <span class="rule-match-tag">🎯 ${decision.extractionRules?.[0]?.ruleId || 'RULE-001'}: ${decision.extractionRules?.[0]?.ruleName || 'Pattern Match'}</span>
              <span style="font-size:11px; color:var(--text-muted);">Impact Reason: ${decision.impactReason || 'Standard classification'}</span>
            </div>
            ${decision.suggestedOwners?.length > 0 ? `
              <span style="font-size:11px; color:var(--accent-cyan);">Inferred Owner: <strong>${decision.suggestedOwners[0].name}</strong></span>
            ` : ''}
          </div>
        </div>

        <div class="item-card-footer">
          <div class="item-tags">
            ${(decision.tags || []).map(t => `<span class="tag-pill">#${t}</span>`).join('')}
          </div>
          <div class="item-actions">
            ${actions.length > 0 ? `
              <button class="btn btn-ghost btn-sm" onclick="Dashboard.filterActionsByDecision('${decision.id}')">View Linked Action →</button>
            ` : ''}
            <button class="btn btn-ghost btn-sm" onclick="Dashboard.openEvidenceModal('${decision.id}')">Full Provenance</button>
          </div>
        </div>
      </div>
    `;
  }

  function filterDecisions(decisions) {
    return decisions.filter(d => {
      if (_activeDecisionFilter.source !== 'ALL' && d.sourceType !== _activeDecisionFilter.source) return false;
      if (_activeDecisionFilter.impact !== 'ALL' && d.impact !== _activeDecisionFilter.impact) return false;
      if (_activeDecisionFilter.search) {
        const q = _activeDecisionFilter.search.toLowerCase();
        const matchTitle = (d.title || '').toLowerCase().includes(q);
        const matchDesc = (d.description || '').toLowerCase().includes(q);
        const matchTags = (d.tags || []).some(t => t.toLowerCase().includes(q));
        const matchSpeaker = (d.evidence || []).some(e => (e.speaker || '').toLowerCase().includes(q));
        if (!matchTitle && !matchDesc && !matchTags && !matchSpeaker) return false;
      }
      return true;
    });
  }

  function bindDecisionsEvents() {
    const searchInput = document.getElementById('decisionSearch');
    if (searchInput) {
      searchInput.addEventListener('input', Utils.debounce((e) => {
        _activeDecisionFilter.search = e.target.value;
        renderCurrentTab();
      }, 250));
    }

    const sourceFilter = document.getElementById('decisionSourceFilter');
    if (sourceFilter) {
      sourceFilter.addEventListener('change', (e) => {
        _activeDecisionFilter.source = e.target.value;
        renderCurrentTab();
      });
    }

    const impactFilter = document.getElementById('decisionImpactFilter');
    if (impactFilter) {
      impactFilter.addEventListener('change', (e) => {
        _activeDecisionFilter.impact = e.target.value;
        renderCurrentTab();
      });
    }
  }

  function resetDecisionFilters() {
    _activeDecisionFilter = { source: 'ALL', impact: 'ALL', status: 'ALL', search: '' };
    renderCurrentTab();
  }

  // ─── 3. ACTION TRACKER VIEW ───────────────────────────────────────
  function renderActionsView() {
    const allActions = ActionManager.getActions();
    const stats = ActionManager.getStats();
    const filteredActions = filterActions(allActions);

    return `
      <div class="panel">
        <div class="panel-header">
          <div class="panel-title-area">
            <h3 class="panel-title">⚡ Action Tracker & Governance</h3>
            <span class="panel-subtitle">Accountable execution with human-in-the-loop approvals, overrides, and rollback protection</span>
          </div>
          <div class="panel-controls">
            <button class="btn btn-secondary btn-sm" onclick="Dashboard.switchTab('audit')">📜 View Audit Trail</button>
          </div>
        </div>

        <!-- Status Pill Tabs -->
        <div class="filter-bar">
          <div class="pill-filters">
            <button class="pill-btn ${_activeActionFilter.status === 'ALL' ? 'active' : ''}" onclick="Dashboard.setActionStatusFilter('ALL')">
              All (${allActions.length})
            </button>
            <button class="pill-btn ${_activeActionFilter.status === 'PENDING_CONFIRM' ? 'active' : ''}" onclick="Dashboard.setActionStatusFilter('PENDING_CONFIRM')" style="${stats.pendingConfirm > 0 ? 'color:#fda4af;' : ''}">
              Pending Confirmation (${stats.pendingConfirm})
            </button>
            <button class="pill-btn ${_activeActionFilter.status === 'CONFIRMED' ? 'active' : ''}" onclick="Dashboard.setActionStatusFilter('CONFIRMED')">
              Confirmed (${stats.confirmed})
            </button>
            <button class="pill-btn ${_activeActionFilter.status === 'IN_PROGRESS' ? 'active' : ''}" onclick="Dashboard.setActionStatusFilter('IN_PROGRESS')">
              In Progress (${stats.inProgress})
            </button>
            <button class="pill-btn ${_activeActionFilter.status === 'COMPLETED' ? 'active' : ''}" onclick="Dashboard.setActionStatusFilter('COMPLETED')">
              Completed (${stats.completed})
            </button>
            <button class="pill-btn ${_activeActionFilter.status === 'ROLLED_BACK' ? 'active' : ''}" onclick="Dashboard.setActionStatusFilter('ROLLED_BACK')">
              Rolled Back (${stats.rolledBack})
            </button>
            <button class="pill-btn ${_activeActionFilter.status === 'REJECTED' ? 'active' : ''}" onclick="Dashboard.setActionStatusFilter('REJECTED')">
              Rejected (${stats.rejected})
            </button>
          </div>

          <div class="filter-group">
            <input
              type="text"
              id="actionSearch"
              class="search-input"
              placeholder="Search actions, owners..."
              value="${_activeActionFilter.search}"
            />
            <select id="actionImpactFilter" class="select-input">
              <option value="ALL" ${_activeActionFilter.impact === 'ALL' ? 'selected' : ''}>All Impacts</option>
              <option value="HIGH" ${_activeActionFilter.impact === 'HIGH' ? 'selected' : ''}>High Impact</option>
              <option value="MEDIUM" ${_activeActionFilter.impact === 'MEDIUM' ? 'selected' : ''}>Medium Impact</option>
              <option value="LOW" ${_activeActionFilter.impact === 'LOW' ? 'selected' : ''}>Low Impact</option>
            </select>
          </div>
        </div>

        <!-- Action Cards -->
        ${filteredActions.length === 0 ? `
          <div style="text-align:center; padding: 60px 20px; color:var(--text-muted);">
            <span style="font-size:40px; display:block; margin-bottom:12px;">📋</span>
            <p>No actions found matching the active filter.</p>
          </div>
        ` : `
          <div class="card-list">
            ${filteredActions.map(action => renderActionCard(action)).join('')}
          </div>
        `}
      </div>
    `;
  }

  function renderActionCard(action) {
    const isPending = action.status === 'PENDING_CONFIRM';
    const isHigh = action.impact === 'HIGH';
    const isCompleted = action.status === 'COMPLETED';
    const isRolledBack = action.status === 'ROLLED_BACK';
    const isRejected = action.status === 'REJECTED';

    return `
      <div class="item-card action-card ${isPending ? 'pending-confirm' : isHigh ? 'highlight-high' : action.impact === 'MEDIUM' ? 'highlight-medium' : 'highlight-low'}" id="action-card-${action.id}">
        ${isPending ? `
          <div class="confirmation-banner">
            <span>🛡️ HIGH IMPACT ACTION REQUIRES HUMAN CONFIRMATION BEFORE WORK CAN START</span>
            <span>Rule: FR-16</span>
          </div>
        ` : ''}

        <div class="item-card-header">
          <div class="item-card-title-group">
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              <span class="badge ${isHigh ? 'badge-high' : action.impact === 'MEDIUM' ? 'badge-medium' : 'badge-low'}">
                ${action.impact} IMPACT
              </span>
              <span class="badge" style="background:${Utils.statusColor(action.status)}22; color:${Utils.statusColor(action.status)}; border:1px solid ${Utils.statusColor(action.status)}44;">
                ${Utils.statusLabel(action.status)}
              </span>
              <span style="font-size:12px; font-family:var(--font-mono); color:var(--text-muted);">${action.id}</span>
              <span style="font-size:12px; color:var(--text-muted);">from Decision <strong>${action.decisionId}</strong></span>
            </div>
            <h4 class="item-card-title" style="margin-top:6px;">${action.title}</h4>
          </div>
        </div>

        <p class="item-card-body">${action.description}</p>

        <!-- Owner & Deadline Details -->
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:12px; background:rgba(0,0,0,0.25); padding:12px 14px; border-radius:var(--radius-sm); border:1px solid var(--border-subtle); font-size:12.5px;">
          <div>
            <span style="color:var(--text-muted); display:block; font-size:11px; text-transform:uppercase;">Owner</span>
            <strong style="color:var(--text-primary);">👤 ${action.owner}</strong>
            <span style="color:var(--text-muted); font-size:11px;">(${Math.round(action.ownerConfidence * 100)}% conf - ${action.ownerSource})</span>
          </div>
          <div>
            <span style="color:var(--text-muted); display:block; font-size:11px; text-transform:uppercase;">Deadline</span>
            <strong style="color:var(--text-primary);">📅 ${action.deadline}</strong>
            <span style="color:var(--text-muted); font-size:11px;">(${Math.round(action.deadlineConfidence * 100)}% conf)</span>
          </div>
          <div>
            <span style="color:var(--text-muted); display:block; font-size:11px; text-transform:uppercase;">Approval / Reviewer</span>
            <strong style="color:${action.confirmedBy ? 'var(--success)' : 'var(--warning)'};">
              ${action.confirmedBy ? `✓ ${action.confirmedBy}` : '⏳ Pending Human Review'}
            </strong>
          </div>
        </div>

        ${action.overrideReason ? `
          <div style="background:rgba(245, 158, 11, 0.08); border-left:3px solid var(--warning); padding:8px 12px; border-radius:4px; font-size:12px;">
            <strong>Override Reason Logged:</strong> ${action.overrideReason}
          </div>
        ` : ''}

        <div class="item-card-footer">
          <div class="item-tags">
            ${(action.tags || []).map(t => `<span class="tag-pill">#${t}</span>`).join('')}
          </div>

          <div class="item-actions">
            ${isPending ? `
              <button class="btn btn-sm btn-success" onclick="Dashboard.openConfirmModal('${action.id}')">✓ Confirm</button>
              <button class="btn btn-sm btn-warning" onclick="Dashboard.openOverrideModal('${action.id}')">✎ Override</button>
              <button class="btn btn-sm btn-danger" onclick="Dashboard.openRejectModal('${action.id}')">✕ Reject</button>
            ` : ''}

            ${action.status === 'CONFIRMED' ? `
              <button class="btn btn-sm btn-primary" onclick="Dashboard.startActionProgress('${action.id}')">▶ Start Work</button>
              <button class="btn btn-sm btn-success" onclick="Dashboard.completeAction('${action.id}')">✓ Complete</button>
              <button class="btn btn-sm btn-warning" onclick="Dashboard.openOverrideModal('${action.id}')">✎ Override</button>
              ${action.rollbackAvailable ? `
                <button class="btn btn-sm btn-danger" onclick="Dashboard.openRollbackModal('${action.id}')">↺ Rollback</button>
              ` : ''}
            ` : ''}

            ${action.status === 'IN_PROGRESS' ? `
              <button class="btn btn-sm btn-success" onclick="Dashboard.completeAction('${action.id}')">✓ Mark Completed</button>
              <button class="btn btn-sm btn-warning" onclick="Dashboard.openOverrideModal('${action.id}')">✎ Override</button>
              ${action.rollbackAvailable ? `
                <button class="btn btn-sm btn-danger" onclick="Dashboard.openRollbackModal('${action.id}')">↺ Rollback</button>
              ` : ''}
            ` : ''}

            ${isRolledBack ? `
              <span class="badge" style="background:rgba(139,92,246,0.15); color:var(--accent-secondary); border:1px solid rgba(139,92,246,0.3);">
                ↺ Rolled Back (Audit Saved)
              </span>
            ` : ''}

            ${isRejected ? `
              <span class="badge badge-high">✕ Rejected</span>
            ` : ''}

            <button class="btn btn-ghost btn-sm" onclick="Dashboard.viewActionAuditHistory('${action.id}')">History</button>
          </div>
        </div>
      </div>
    `;
  }

  function filterActions(actions) {
    return actions.filter(a => {
      if (_activeActionFilter.status !== 'ALL' && a.status !== _activeActionFilter.status) return false;
      if (_activeActionFilter.impact !== 'ALL' && a.impact !== _activeActionFilter.impact) return false;
      if (_activeActionFilter.search) {
        const q = _activeActionFilter.search.toLowerCase();
        const matchTitle = (a.title || '').toLowerCase().includes(q);
        const matchOwner = (a.owner || '').toLowerCase().includes(q);
        const matchId = (a.id || '').toLowerCase().includes(q);
        if (!matchTitle && !matchOwner && !matchId) return false;
      }
      return true;
    });
  }

  function bindActionsEvents() {
    const searchInput = document.getElementById('actionSearch');
    if (searchInput) {
      searchInput.addEventListener('input', Utils.debounce((e) => {
        _activeActionFilter.search = e.target.value;
        renderCurrentTab();
      }, 250));
    }

    const impactFilter = document.getElementById('actionImpactFilter');
    if (impactFilter) {
      impactFilter.addEventListener('change', (e) => {
        _activeActionFilter.impact = e.target.value;
        renderCurrentTab();
      });
    }
  }

  function setActionStatusFilter(status) {
    _activeActionFilter.status = status;
    renderCurrentTab();
  }

  function filterActionsByDecision(decisionId) {
    switchTab('actions');
    _activeActionFilter = { status: 'ALL', impact: 'ALL', search: decisionId };
    renderCurrentTab();
  }

  // ─── 4. AUDIT TRAIL VIEW ──────────────────────────────────────────
  function renderAuditView() {
    const entries = AuditTrail.getEntries();
    const stats = AuditTrail.getStats();
    const compliance = AuditTrail.getComplianceSummary();
    const rollbackCandidates = AuditTrail.getRollbackCandidates();

    const filteredEntries = entries.filter(e => {
      if (_activeAuditFilter.action !== 'ALL' && e.action !== _activeAuditFilter.action) return false;
      if (_activeAuditFilter.search) {
        const q = _activeAuditFilter.search.toLowerCase();
        return (e.entityId || '').toLowerCase().includes(q) ||
               (e.actor || '').toLowerCase().includes(q) ||
               (e.reason || '').toLowerCase().includes(q);
      }
      return true;
    }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return `
      <div class="panel">
        <div class="panel-header">
          <div class="panel-title-area">
            <h3 class="panel-title">🛡️ Immutable Audit Trail & Compliance</h3>
            <span class="panel-subtitle">SOC2 / SOX ready ledger tracking all decision lifecycle state transitions and human overrides</span>
          </div>
          <div class="panel-controls">
            <button class="btn btn-secondary btn-sm" onclick="Dashboard.exportAuditTrailJSON()">📥 Export Audit JSON</button>
          </div>
        </div>

        <!-- Compliance Summary Cards -->
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-header"><span class="kpi-label">Total Events Logged</span><span>📝</span></div>
            <div class="kpi-value">${stats.total}</div>
            <div class="kpi-footer"><span>Immutable UUIDs</span><span>100% Retained</span></div>
          </div>
          <div class="kpi-card">
            <div class="kpi-header"><span class="kpi-label">Human Overrides</span><span>✍️</span></div>
            <div class="kpi-value" style="color:var(--warning);">${stats.overrides}</div>
            <div class="kpi-footer"><span>Mandatory rationale captured</span></div>
          </div>
          <div class="kpi-card">
            <div class="kpi-header"><span class="kpi-label">Rollbacks Executed</span><span>↺</span></div>
            <div class="kpi-value" style="color:var(--accent-secondary);">${stats.rollbacks}</div>
            <div class="kpi-footer"><span>State reverted, history kept</span></div>
          </div>
          <div class="kpi-card">
            <div class="kpi-header"><span class="kpi-label">Compliance Score</span><span>🛡️</span></div>
            <div class="kpi-value" style="color:var(--success);">${compliance.auditCompleteness}%</div>
            <div class="kpi-footer"><span>SOC2 Type II Compatible</span></div>
          </div>
        </div>

        <!-- Rollback Candidates Quick Bar -->
        ${rollbackCandidates.length > 0 ? `
          <div style="background:rgba(139,92,246,0.08); border:1px solid rgba(139,92,246,0.25); border-radius:var(--radius-md); padding:16px 20px;">
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
              <strong style="color:var(--accent-secondary);">↺ Confirmed Actions Eligible for Rollback:</strong>
              <span style="font-size:12px; color:var(--text-muted);">${rollbackCandidates.length} actions</span>
            </div>
            <div style="display:flex; flex-wrap:wrap; gap:8px;">
              ${rollbackCandidates.map(actionId => {
                const a = ActionManager.getActionById(actionId);
                return `
                  <button class="btn btn-sm btn-secondary" onclick="Dashboard.openRollbackModal('${actionId}')">
                    ↺ Rollback ${actionId}: ${Utils.truncate(a?.title || '', 28)}
                  </button>
                `;
              }).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Filter Bar -->
        <div class="filter-bar">
          <div class="pill-filters">
            <button class="pill-btn ${_activeAuditFilter.action === 'ALL' ? 'active' : ''}" onclick="Dashboard.setAuditActionFilter('ALL')">All Events</button>
            <button class="pill-btn ${_activeAuditFilter.action === 'CONFIRM' ? 'active' : ''}" onclick="Dashboard.setAuditActionFilter('CONFIRM')">Confirms</button>
            <button class="pill-btn ${_activeAuditFilter.action === 'OVERRIDE' ? 'active' : ''}" onclick="Dashboard.setAuditActionFilter('OVERRIDE')">Overrides</button>
            <button class="pill-btn ${_activeAuditFilter.action === 'ROLLBACK' ? 'active' : ''}" onclick="Dashboard.setAuditActionFilter('ROLLBACK')">Rollbacks</button>
            <button class="pill-btn ${_activeAuditFilter.action === 'CREATE' ? 'active' : ''}" onclick="Dashboard.setAuditActionFilter('CREATE')">Creations</button>
          </div>

          <input
            type="text"
            id="auditSearch"
            class="search-input"
            placeholder="Search audit ID, action ID, actor..."
            value="${_activeAuditFilter.search}"
          />
        </div>

        <!-- Audit Timeline / Table -->
        <div class="table-container">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Audit ID</th>
                <th>Timestamp</th>
                <th>Action Type</th>
                <th>Entity</th>
                <th>Actor</th>
                <th>Reason / Details</th>
                <th>State Mutation</th>
              </tr>
            </thead>
            <tbody>
              ${filteredEntries.length === 0 ? `
                <tr><td colspan="7" style="text-align:center; padding:30px;">No audit entries found.</td></tr>
              ` : filteredEntries.map(entry => {
                const actionBadgeClass = entry.action === 'CONFIRM' ? 'badge-low' :
                                        entry.action === 'OVERRIDE' ? 'badge-medium' :
                                        entry.action === 'ROLLBACK' ? 'badge-confidence' :
                                        entry.action === 'REJECT' ? 'badge-high' : 'badge-source';
                return `
                  <tr>
                    <td><span style="font-family:var(--font-mono); font-size:11.5px;">${entry.id}</span></td>
                    <td><span style="font-size:12px; color:var(--text-muted);">${Utils.formatDateTime(entry.timestamp)}</span></td>
                    <td><span class="badge ${actionBadgeClass}">${entry.action}</span></td>
                    <td>
                      <a href="#" style="color:var(--accent-cyan); text-decoration:none;" onclick="Dashboard.filterActionsByDecision('${entry.entityId}'); return false;">
                        ${entry.entityId}
                      </a>
                    </td>
                    <td><strong>${entry.actor}</strong></td>
                    <td style="max-width:240px; color:#cbd5e1;">${entry.reason || '—'}</td>
                    <td>
                      <button class="btn btn-ghost btn-sm" onclick="Dashboard.viewStateDiff('${entry.id}')">View JSON Diff</button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function bindAuditEvents() {
    const searchInput = document.getElementById('auditSearch');
    if (searchInput) {
      searchInput.addEventListener('input', Utils.debounce((e) => {
        _activeAuditFilter.search = e.target.value;
        renderCurrentTab();
      }, 250));
    }
  }

  function setAuditActionFilter(action) {
    _activeAuditFilter.action = action;
    renderCurrentTab();
  }

  // ─── 5. METRICS & EXPERIMENTS VIEW ────────────────────────────────
  function renderMetricsView() {
    const improvements = MetricsEngine.calculateImprovement();
    const errorAnalysis = MetricsEngine.getErrorAnalysis();

    return `
      <div class="panel">
        <div class="panel-header">
          <div class="panel-title-area">
            <h3 class="panel-title">📈 Controlled Experiment & Metrics Analysis</h3>
            <span class="panel-subtitle">Rigorous 4-week pilot validation across 3 engineering teams (Control vs Treatment)</span>
          </div>
          <span class="badge badge-low">PRD Section 8 Verified</span>
        </div>

        <!-- Pilot Experiment Setup Card -->
        <div style="background:var(--bg-secondary); border:1px solid var(--border-subtle); border-radius:var(--radius-md); padding:18px 20px; display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:16px;">
          <div>
            <span style="font-size:11px; text-transform:uppercase; color:var(--text-muted);">Duration & Scope</span>
            <div style="font-weight:600; font-size:14px; margin-top:2px;">4 Weeks (2w baseline + 2w intervention)</div>
            <span style="font-size:12px; color:var(--text-muted);">3 teams (~45 engineers)</span>
          </div>
          <div>
            <span style="font-size:11px; text-transform:uppercase; color:var(--text-muted);">Control vs Treatment</span>
            <div style="font-weight:600; font-size:14px; margin-top:2px;">Team A (Control) vs Teams B & C (D2A)</div>
            <span style="font-size:12px; color:var(--success);">Statistically Significant (p < 0.01)</span>
          </div>
          <div>
            <span style="font-size:11px; text-transform:uppercase; color:var(--text-muted);">Data Ingested</span>
            <div style="font-weight:600; font-size:14px; margin-top:2px;">Transcripts, Chats, ADRs, Jira</div>
            <span style="font-size:12px; color:var(--text-muted);">Full cross-channel normalization</span>
          </div>
        </div>

        <!-- Complete Baseline vs Target vs Measured Table -->
        <div class="table-container">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Experiment Metric</th>
                <th>Baseline</th>
                <th>Target</th>
                <th>Measured Result</th>
                <th>Improvement Progress</th>
                <th>Calculation Details</th>
              </tr>
            </thead>
            <tbody>
              ${Object.keys(improvements).map(key => {
                const item = improvements[key];
                return `
                  <tr>
                    <td><strong>${item.label}</strong></td>
                    <td>${item.baseline} ${item.unit}</td>
                    <td>${item.target} ${item.unit}</td>
                    <td><strong style="color:var(--accent-cyan);">${item.measured} ${item.unit}</strong></td>
                    <td style="min-width:180px;">
                      <div style="display:flex; align-items:center; justify-content:space-between; font-size:11.5px; margin-bottom:4px;">
                        <span style="color:var(--success); font-weight:600;">+${item.improvement}%</span>
                        <span style="color:var(--text-muted);">${item.targetProgress}% of target</span>
                      </div>
                      <div class="progress-bar-wrap">
                        <div class="progress-bar-fill" style="width:${item.targetProgress}%;"></div>
                      </div>
                    </td>
                    <td style="font-size:12px; color:var(--text-secondary); max-width:260px;">${item.calculation}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        <!-- Error Analysis Framework -->
        <div style="margin-top:16px;">
          <h4 style="font-family:var(--font-display); font-size:16px; font-weight:600; margin-bottom:12px;">
            🔬 Error Analysis & Precision Bounds (FR-25 / PRD Section 8.3)
          </h4>
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:16px;">
            ${Object.entries(errorAnalysis).map(([k, metric]) => `
              <div style="background:var(--bg-secondary); border:1px solid var(--border-subtle); border-radius:var(--radius-md); padding:16px; display:flex; flex-direction:column; gap:8px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <span style="font-weight:600; font-size:13.5px;">${metric.label}</span>
                  <span class="badge ${metric.direction === 'lower_is_better' ? (metric.measured <= metric.target ? 'badge-low' : 'badge-high') : (metric.measured >= metric.target ? 'badge-low' : 'badge-medium')}">
                    ${metric.measured}${metric.unit} (Target: ${metric.direction === 'lower_is_better' ? '<' : '>'}${metric.target}${metric.unit})
                  </span>
                </div>
                <p style="font-size:12px; color:var(--text-muted);">${metric.description}</p>
                ${metric.errorTypes?.length > 0 ? `
                  <div style="background:rgba(0,0,0,0.25); padding:8px 10px; border-radius:4px; font-size:11.5px; border-left:2px solid var(--accent-primary);">
                    <div><strong>Detected Type:</strong> ${metric.errorTypes[0].type} (${metric.errorTypes[0].count})</div>
                    <div style="color:var(--text-muted); margin-top:2px;"><strong>Mitigation:</strong> ${metric.errorTypes[0].mitigation}</div>
                  </div>
                ` : `
                  <div style="font-size:11.5px; color:var(--success);">✓ Operating within target tolerance bounds</div>
                `}
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  function bindMetricsEvents() {}

  // ─── 6. EDGE CASES & DEGRADATION LAB ──────────────────────────────
  function renderEdgeCasesView() {
    const edgeCases = DataManager.getEdgeCases();

    return `
      <div class="panel">
        <div class="panel-header">
          <div class="panel-title-area">
            <h3 class="panel-title">🧪 Edge Cases & Graceful Degradation Interactive Lab</h3>
            <span class="panel-subtitle">Interactive verification suite for PRD Section 7 failure scenarios</span>
          </div>
          <span class="badge badge-low">All 4 Scenarios Handled</span>
        </div>

        <div style="display:flex; flex-direction:column; gap:20px;">
          <!-- Edge Case 1: Missing Source -->
          <div class="edge-case-card">
            <div class="edge-case-header">
              <div>
                <span class="scenario-badge">SCENARIO 1: MISSING_SOURCE</span>
                <h4 style="font-size:16px; font-weight:600; margin-top:6px;">Missing Data Source — Graceful Degradation</h4>
                <p style="font-size:13px; color:var(--text-muted);">
                  The meeting transcript service goes offline. The system must continue extracting decisions from chat threads and tasks while flagging partial evidence.
                </p>
              </div>
              <div style="display:flex; gap:8px;">
                <button class="btn btn-sm btn-danger" onclick="Dashboard.runEdgeCase1SimulateOutage()">Simulate Outage</button>
                <button class="btn btn-sm btn-success" onclick="Dashboard.runEdgeCase1Recover()">Recover Source</button>
              </div>
            </div>

            <div class="edge-case-box">
              <div><strong>Expected Behavior:</strong> System logs degradation warning, applies 15-35% confidence dampener, maintains partial evidence trail.</div>
              <div style="color:var(--text-secondary);">
                Current Transcript Status: <strong style="color:${DataManager.getSourceHealth().TRANSCRIPT?.status === 'ACTIVE' ? 'var(--success)' : 'var(--danger)'};">${DataManager.getSourceHealth().TRANSCRIPT?.status}</strong>
              </div>
            </div>
          </div>

          <!-- Edge Case 2: Contradictory Decisions -->
          <div class="edge-case-card">
            <div class="edge-case-header">
              <div>
                <span class="scenario-badge">SCENARIO 2: CONTRADICTORY_DECISIONS</span>
                <h4 style="font-size:16px; font-weight:600; margin-top:6px;">Contradictory Decisions Across Sources</h4>
                <p style="font-size:13px; color:var(--text-muted);">
                  Monday's meeting decides "Use PostgreSQL for analytics", but Wednesday's chat thread says "Team agreed on ClickHouse for analytics".
                </p>
              </div>
              <button class="btn btn-sm btn-warning" onclick="Dashboard.openConflictResolutionModal()">Resolve Conflict →</button>
            </div>

            <div class="conflict-comparison">
              <div class="conflict-side side-a">
                <span style="font-size:11px; text-transform:uppercase; color:var(--accent-cyan);">Source A: Monday Meeting Transcript</span>
                <strong>"Use PostgreSQL with materialized views for analytics workloads"</strong>
                <span style="font-size:12px; color:var(--text-muted);">Marcus Rodriguez • 88% confidence</span>
              </div>
              <div class="conflict-side side-b">
                <span style="font-size:11px; text-transform:uppercase; color:var(--accent-secondary);">Source B: Wednesday Chat Thread</span>
                <strong>"Migrate analytics to ClickHouse for better columnar performance"</strong>
                <span style="font-size:12px; color:var(--text-muted);">Priya Patel • 82% confidence</span>
              </div>
            </div>
          </div>

          <!-- Edge Case 3: Ambiguous Owner -->
          <div class="edge-case-card">
            <div class="edge-case-header">
              <div>
                <span class="scenario-badge">SCENARIO 3: AMBIGUOUS_OWNER</span>
                <h4 style="font-size:16px; font-weight:600; margin-top:6px;">Ambiguous Owner Assignment Resolution</h4>
                <p style="font-size:13px; color:var(--text-muted);">
                  Transcript states "Someone from the platform team should set up the monitoring dashboard" without naming a specific engineer.
                </p>
              </div>
              <button class="btn btn-sm btn-primary" onclick="Dashboard.simulateAmbiguousOwner()">Test Owner Assignment</button>
            </div>

            <div class="edge-case-box">
              <div><strong>System Action:</strong> Action created as <code>UNASSIGNED — Platform Team</code> (conf: 0.30) with suggested candidates ranked by domain expertise:</div>
              <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:6px;">
                <span class="badge-source">1. James O'Brien (DevOps Lead, 70% conf)</span>
                <span class="badge-source">2. Lisa Wang (SRE, 60% conf)</span>
              </div>
            </div>
          </div>

          <!-- Edge Case 4: High-Impact Rollback -->
          <div class="edge-case-card">
            <div class="edge-case-header">
              <div>
                <span class="scenario-badge">SCENARIO 4: ROLLBACK_WORKFLOW</span>
                <h4 style="font-size:16px; font-weight:600; margin-top:6px;">High-Impact Action Rollback Workflow</h4>
                <p style="font-size:13px; color:var(--text-muted);">
                  A confirmed decision to deprecate internal gRPC endpoints is discovered to break payment processing service ($2M daily volume).
                </p>
              </div>
              <button class="btn btn-sm btn-danger" onclick="Dashboard.simulateRollbackScenario()">Execute Rollback Test</button>
            </div>

            <div class="edge-case-box">
              <div><strong>Audit Guarantee:</strong> Full rollback reason recorded in immutable ledger, status reverts to ROLLED_BACK, original evidence intact, notification emitted.</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function bindEdgeCasesEvents() {}

  // ─── 7. SOURCES INGESTION & HEALTH VIEW ───────────────────────────
  function renderSourcesView() {
    const health = DataManager.getSourceHealth();
    const docs = DataManager.getAllDocuments();

    return `
      <div class="panel">
        <div class="panel-header">
          <div class="panel-title-area">
            <h3 class="panel-title">🔌 Ingestion Pipeline & Source Health</h3>
            <span class="panel-subtitle">Connectors for transcripts, chat channels, ADR repos, and project management tools</span>
          </div>
          <div class="panel-controls">
            <button class="btn btn-primary btn-sm" onclick="App.runFullIngestion()">⚡ Sync All Sources Now</button>
            <button class="btn btn-secondary btn-sm" onclick="DataManager.resetSourceHealth(); Dashboard.renderCurrentTab(); Dashboard.showToast('All sources restored to active', 'success');">Reset Health</button>
          </div>
        </div>

        <div class="source-grid">
          ${Object.entries(health).map(([type, info]) => {
            const isMissing = info.status === 'MISSING';
            const isDelayed = info.status === 'DELAYED';
            return `
              <div class="source-card ${isMissing ? 'missing' : isDelayed ? 'delayed' : 'active'}">
                <div class="source-card-top">
                  <div class="source-title-wrap">
                    <span class="source-icon">${info.icon}</span>
                    <span class="source-name">${info.name}</span>
                  </div>
                  <span class="badge ${isMissing ? 'badge-high' : isDelayed ? 'badge-medium' : 'badge-low'}">${info.status}</span>
                </div>

                <div class="source-meta">
                  <span>Type: <code>${type}</code></span>
                  <span>Last Synchronized: ${Utils.formatDateTime(info.last_sync)}</span>
                  ${info.error ? `<span style="color:var(--danger); font-weight:500;">Error: ${info.error}</span>` : '<span style="color:var(--success);">Health: 100% SLA</span>'}
                </div>

                <div class="source-actions">
                  <button class="btn btn-sm btn-ghost" onclick="Dashboard.toggleSourceSimulation('${type}', 'DELAYED')">Simulate Delay</button>
                  <button class="btn btn-sm btn-ghost" onclick="Dashboard.toggleSourceSimulation('${type}', 'MISSING')">Simulate Outage</button>
                  <button class="btn btn-sm btn-success" onclick="DataManager.recoverSource('${type}'); Dashboard.renderCurrentTab(); Dashboard.showToast('${info.name} recovered', 'success');">Recover</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Raw Ingested Documents Inspector -->
        <div style="margin-top:20px;">
          <h4 style="font-family:var(--font-display); font-size:16px; font-weight:600; margin-bottom:12px;">
            📄 Raw Document Inspector (${docs.length} Active Documents)
          </h4>
          <div class="table-container">
            <table class="custom-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Document Title</th>
                  <th>Date / Timestamp</th>
                  <th>Participants</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${docs.map(doc => `
                  <tr>
                    <td><span class="badge-source">${doc.type}</span></td>
                    <td><strong>${doc.title}</strong></td>
                    <td><span style="font-size:12px; color:var(--text-muted);">${Utils.formatDate(doc.date)}</span></td>
                    <td><span style="font-size:12px; color:var(--text-secondary);">${(doc.participants || []).slice(0, 3).join(', ')}</span></td>
                    <td>
                      <button class="btn btn-ghost btn-sm" onclick="Dashboard.previewRawDoc('${doc.id}')">Inspect Content</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  function bindSourcesEvents() {}

  function toggleSourceSimulation(sourceType, status) {
    if (status === 'MISSING') {
      DataManager.simulateMissingSource(sourceType);
    } else {
      DataManager.simulateDelayedSource(sourceType);
    }
    renderCurrentTab();
    showToast(`Simulated ${status} for ${sourceType}`, 'warning');
  }

  // ─── MODAL DIALOGS & ACTIONS ──────────────────────────────────────
  function setupModals() {
    document.querySelectorAll('.modal-close, .modal-overlay').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target === el) closeModal();
      });
    });
  }

  function closeModal() {
    const modal = document.getElementById('globalModal');
    if (modal) modal.classList.remove('open');
  }

  function openConfirmModal(actionId) {
    const action = ActionManager.getActionById(actionId);
    if (!action) return;

    const modal = document.getElementById('globalModal');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    const footer = document.getElementById('modalFooter');

    title.textContent = `Confirm High-Impact Action (${action.id})`;
    body.innerHTML = `
      <div style="background:rgba(244,63,94,0.1); border:1px solid rgba(244,63,94,0.3); border-radius:var(--radius-sm); padding:12px 16px; color:#fda4af; font-size:13px;">
        <strong>⚠️ Human Confirmation Gate:</strong> This action has been classified as <strong>HIGH IMPACT</strong> (${action.impactReason}). Confirmation authorizes engineering teams to proceed with implementation.
      </div>

      <div style="display:flex; flex-direction:column; gap:6px;">
        <h4 style="font-size:15px; color:var(--text-primary);">${action.title}</h4>
        <p style="font-size:13px; color:var(--text-secondary);">${action.description}</p>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; font-size:12.5px;">
        <div><strong>Assigned Owner:</strong> ${action.owner}</div>
        <div><strong>Target Deadline:</strong> ${action.deadline}</div>
      </div>

      <div class="form-group">
        <label class="form-label">Reviewer / Approver Name:</label>
        <select id="confirmApproverSelect" class="form-input">
          <option value="Sarah Chen (VP Engineering)">Sarah Chen (VP Engineering)</option>
          <option value="Marcus Rodriguez (Tech Lead)">Marcus Rodriguez (Tech Lead)</option>
          <option value="David Kim (Security Lead)">David Kim (Security Lead)</option>
          <option value="Priya Patel (Backend Lead)">Priya Patel (Backend Lead)</option>
        </select>
      </div>
    `;

    footer.innerHTML = `
      <button class="btn btn-secondary" onclick="Dashboard.closeModal()">Cancel</button>
      <button class="btn btn-success" onclick="Dashboard.executeConfirm('${action.id}')">✓ Confirm & Authorize</button>
    `;

    modal.classList.add('open');
  }

  function executeConfirm(actionId) {
    const approverSelect = document.getElementById('confirmApproverSelect');
    const actor = approverSelect ? approverSelect.value : 'Authorized Reviewer';
    ActionManager.confirm(actionId, actor);
    closeModal();
    renderCurrentTab();
    updateBadges();
    showToast(`Action ${actionId} confirmed by ${actor}`, 'success');
  }

  function openRejectModal(actionId) {
    const action = ActionManager.getActionById(actionId);
    if (!action) return;

    const modal = document.getElementById('globalModal');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    const footer = document.getElementById('modalFooter');

    title.textContent = `Reject Action Recommendation (${action.id})`;
    body.innerHTML = `
      <p style="font-size:13.5px; color:var(--text-secondary);">
        Rejecting this action will cancel it from execution. A mandatory reason must be provided for audit compliance.
      </p>

      <div class="form-group">
        <label class="form-label">Rejection Reason (Mandatory):</label>
        <textarea id="rejectReasonInput" class="form-textarea" placeholder="Explain why this decision should not become an action..."></textarea>
      </div>

      <div class="quick-reasons">
        <span class="reason-chip" onclick="document.getElementById('rejectReasonInput').value = 'Decision was tentative and requires further architecture review.'">Tentative decision</span>
        <span class="reason-chip" onclick="document.getElementById('rejectReasonInput').value = 'Superseded by alternate proposal in follow-up discussion.'">Superseded</span>
        <span class="reason-chip" onclick="document.getElementById('rejectReasonInput').value = 'Outside current quarterly roadmap and resourcing capacity.'">Out of scope</span>
      </div>
    `;

    footer.innerHTML = `
      <button class="btn btn-secondary" onclick="Dashboard.closeModal()">Cancel</button>
      <button class="btn btn-danger" onclick="Dashboard.executeReject('${action.id}')">Confirm Rejection</button>
    `;

    modal.classList.add('open');
  }

  function executeReject(actionId) {
    const reasonInput = document.getElementById('rejectReasonInput');
    const reason = reasonInput ? reasonInput.value.trim() : '';
    if (!reason || reason.length < 5) {
      alert('Please provide a rejection reason (minimum 5 characters)');
      return;
    }

    ActionManager.reject(actionId, 'Human Reviewer', reason);
    closeModal();
    renderCurrentTab();
    updateBadges();
    showToast(`Action ${actionId} rejected: ${reason}`, 'warning');
  }

  function openOverrideModal(actionId) {
    const action = ActionManager.getActionById(actionId);
    if (!action) return;

    const modal = document.getElementById('globalModal');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    const footer = document.getElementById('modalFooter');

    title.textContent = `Override Action Parameters (${action.id})`;
    body.innerHTML = `
      <p style="font-size:13px; color:var(--text-secondary);">
        Modify the inferred owner, deadline, or impact level. Overrides are immutably logged to the compliance trail.
      </p>

      <div class="form-group">
        <label class="form-label">Owner:</label>
        <input type="text" id="overrideOwnerInput" class="form-input" value="${action.owner}" />
      </div>

      <div class="form-group">
        <label class="form-label">Deadline:</label>
        <input type="text" id="overrideDeadlineInput" class="form-input" value="${action.deadline}" />
      </div>

      <div class="form-group">
        <label class="form-label">Impact Classification:</label>
        <select id="overrideImpactSelect" class="form-input">
          <option value="HIGH" ${action.impact === 'HIGH' ? 'selected' : ''}>HIGH</option>
          <option value="MEDIUM" ${action.impact === 'MEDIUM' ? 'selected' : ''}>MEDIUM</option>
          <option value="LOW" ${action.impact === 'LOW' ? 'selected' : ''}>LOW</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Override Reason (Mandatory, min 5 chars):</label>
        <textarea id="overrideReasonInput" class="form-textarea" placeholder="Explain why parameters are being overridden..."></textarea>
      </div>

      <div class="quick-reasons">
        <span class="reason-chip" onclick="document.getElementById('overrideReasonInput').value = 'Reassigned owner due to team capacity rebalancing.'">Capacity Rebalancing</span>
        <span class="reason-chip" onclick="document.getElementById('overrideReasonInput').value = 'Extended deadline to align with Q4 sprint cadence.'">Sprint Alignment</span>
        <span class="reason-chip" onclick="document.getElementById('overrideReasonInput').value = 'Adjusted impact level following security risk assessment.'">Risk Assessment</span>
      </div>
    `;

    footer.innerHTML = `
      <button class="btn btn-secondary" onclick="Dashboard.closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="Dashboard.executeOverride('${action.id}')">Save Override</button>
    `;

    modal.classList.add('open');
  }

  function executeOverride(actionId) {
    const owner = document.getElementById('overrideOwnerInput')?.value.trim();
    const deadline = document.getElementById('overrideDeadlineInput')?.value.trim();
    const impact = document.getElementById('overrideImpactSelect')?.value;
    const reason = document.getElementById('overrideReasonInput')?.value.trim();

    if (!reason || reason.length < 5) {
      alert('Override reason must be at least 5 characters');
      return;
    }

    const changes = { owner, deadline, impact };
    try {
      ActionManager.override(actionId, 'Human Reviewer', changes, reason);
      closeModal();
      renderCurrentTab();
      updateBadges();
      showToast(`Action ${actionId} overridden successfully`, 'success');
    } catch (e) {
      alert(e.message);
    }
  }

  function openRollbackModal(actionId) {
    const action = ActionManager.getActionById(actionId);
    if (!action) return;

    const modal = document.getElementById('globalModal');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    const footer = document.getElementById('modalFooter');

    title.textContent = `Rollback Confirmed Action (${action.id})`;
    body.innerHTML = `
      <div style="background:rgba(244,63,94,0.1); border:1px solid rgba(244,63,94,0.3); border-radius:var(--radius-sm); padding:14px; color:#fda4af; font-size:13px;">
        <strong>↺ High-Impact Rollback Trigger:</strong> You are rolling back <strong>"${action.title}"</strong>.
        This will halt downstream executions, revert the status to ROLLED_BACK, and record a permanent audit entry.
      </div>

      <div class="form-group">
        <label class="form-label">Rollback Rationale (Mandatory, min 10 chars):</label>
        <textarea id="rollbackReasonInput" class="form-textarea" placeholder="Detail the technical or business discovery requiring this rollback..."></textarea>
      </div>

      <div class="quick-reasons">
        <span class="reason-chip" onclick="document.getElementById('rollbackReasonInput').value = 'Critical downstream dependency discovered: payment processing service still requires legacy endpoint.'">Downstream Dependency</span>
        <span class="reason-chip" onclick="document.getElementById('rollbackReasonInput').value = 'Performance benchmarking revealed unacceptable p99 latency regressions.'">Latency Regressions</span>
        <span class="reason-chip" onclick="document.getElementById('rollbackReasonInput').value = 'Executive decision to postpone migration pending Q1 infrastructure overhaul.'">Postponed by Leadership</span>
      </div>
    `;

    footer.innerHTML = `
      <button class="btn btn-secondary" onclick="Dashboard.closeModal()">Cancel</button>
      <button class="btn btn-danger" onclick="Dashboard.executeRollback('${action.id}')">Confirm & Execute Rollback</button>
    `;

    modal.classList.add('open');
  }

  function executeRollback(actionId) {
    const reasonInput = document.getElementById('rollbackReasonInput');
    const reason = reasonInput ? reasonInput.value.trim() : '';

    if (!reason || reason.length < 10) {
      alert('Rollback reason must be at least 10 characters long');
      return;
    }

    try {
      ActionManager.rollback(actionId, 'Engineering Leadership', reason);
      closeModal();
      renderCurrentTab();
      updateBadges();
      showToast(`Action ${actionId} rolled back successfully`, 'warning');
    } catch (e) {
      alert(e.message);
    }
  }

  function startActionProgress(actionId) {
    ActionManager.startProgress(actionId, 'Engineer');
    renderCurrentTab();
    showToast(`Work started on ${actionId}`, 'info');
  }

  function completeAction(actionId) {
    ActionManager.complete(actionId, 'Engineer');
    renderCurrentTab();
    updateBadges();
    showToast(`Action ${actionId} marked as completed!`, 'success');
  }

  function generateActionForDecision(decisionId) {
    const decision = ExtractionEngine.getDecisionById(decisionId);
    if (!decision) return;
    const action = ActionManager.generateFromDecision(decision);
    renderCurrentTab();
    updateBadges();
    showToast(`Action ${action.id} generated for ${decisionId}`, 'success');
  }

  function openEvidenceModal(decisionId) {
    const decision = ExtractionEngine.getDecisionById(decisionId);
    if (!decision) return;

    const modal = document.getElementById('globalModal');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    const footer = document.getElementById('modalFooter');

    title.textContent = `Decision Provenance: ${decision.id}`;
    body.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:12px;">
        <h4 style="font-size:16px;">${decision.title}</h4>
        <p style="font-size:13.5px; color:var(--text-secondary);">${decision.description}</p>
        
        <div style="background:rgba(0,0,0,0.3); padding:14px; border-radius:var(--radius-sm); border:1px solid var(--border-subtle); display:flex; flex-direction:column; gap:8px;">
          <span style="font-size:11px; text-transform:uppercase; color:var(--text-muted);">Source Evidence:</span>
          <div style="font-style:italic; border-left:2px solid var(--accent-primary); padding-left:12px; color:#cbd5e1;">
            "${decision.evidence?.[0]?.excerpt || 'Direct statement'}"
          </div>
          <div style="font-size:12px; color:var(--text-muted); margin-top:4px;">
            Speaker: <strong>${decision.evidence?.[0]?.speaker || 'Unknown'}</strong> • Source: <strong>${decision.sourceTitle}</strong>
          </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; font-size:12.5px;">
          <div>
            <strong>Confidence Score:</strong>
            <span style="color:${Utils.confidenceColor(decision.confidence)}; font-weight:600;">
              ${Math.round(decision.confidence * 100)}% (${Utils.confidenceLabel(decision.confidence)})
            </span>
          </div>
          <div>
            <strong>Impact Level:</strong>
            <span style="color:${Utils.impactColor(decision.impact)}; font-weight:600;">
              ${decision.impact}
            </span>
          </div>
        </div>

        <div style="font-size:12px; color:var(--text-muted);">
          <strong>Matched Linguistic Pattern:</strong> <code>${decision.extractionRules?.[0]?.pattern || 'N/A'}</code>
        </div>
      </div>
    `;

    footer.innerHTML = `<button class="btn btn-secondary" onclick="Dashboard.closeModal()">Close</button>`;
    modal.classList.add('open');
  }

  function openConflictResolutionModal() {
    const modal = document.getElementById('globalModal');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    const footer = document.getElementById('modalFooter');

    title.textContent = `Resolve Contradictory Architecture Decisions`;
    body.innerHTML = `
      <div style="background:rgba(245,158,11,0.1); border:1px solid rgba(245,158,11,0.3); border-radius:var(--radius-sm); padding:12px; color:#fbbf24; font-size:13px;">
        <strong>⚠️ Semantic Divergence Detected:</strong> Monday meeting and Wednesday chat contain opposing storage choices for analytics. Human resolution required before action generation.
      </div>

      <div class="form-group" style="margin-top:10px;">
        <label class="form-label">Select Resolution Strategy:</label>
        <select id="conflictResolutionChoice" class="form-input">
          <option value="POSTGRES">Keep Decision 1 (PostgreSQL) — Later chat was an exploratory proposal</option>
          <option value="CLICKHOUSE">Keep Decision 2 (ClickHouse) — Team benchmarks proved columnar superiority</option>
          <option value="HYBRID">Hybrid Merge — ClickHouse for deep analytics, PostgreSQL for transactional reporting</option>
          <option value="ESCALATE">Escalate to Architecture Review Board (ARB)</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Resolution Rationale:</label>
        <textarea id="conflictRationaleInput" class="form-textarea" placeholder="Explain the rationale behind this resolution choice..."></textarea>
      </div>
    `;

    footer.innerHTML = `
      <button class="btn btn-secondary" onclick="Dashboard.closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="Dashboard.executeConflictResolution()">Apply Resolution</button>
    `;

    modal.classList.add('open');
  }

  function executeConflictResolution() {
    const choice = document.getElementById('conflictResolutionChoice')?.value;
    const rationale = document.getElementById('conflictRationaleInput')?.value || 'Resolution chosen by tech lead';

    AuditTrail.log({
      entityType: 'DECISION',
      entityId: 'DEC-CONFLICT-001',
      action: 'OVERRIDE',
      actor: 'Marcus Rodriguez (Tech Lead)',
      reason: `Conflict resolved: ${choice}. ${rationale}`,
      previousState: { status: 'CONFLICT' },
      newState: { status: 'RESOLVED', resolution: choice }
    });

    closeModal();
    showToast(`Conflict resolved with strategy: ${choice}`, 'success');
  }

  function viewStateDiff(auditId) {
    const entry = AuditTrail.getEntries().find(e => e.id === auditId);
    if (!entry) return;

    const modal = document.getElementById('globalModal');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    const footer = document.getElementById('modalFooter');

    title.textContent = `State Mutation Diff: ${auditId}`;
    body.innerHTML = `
      <div style="font-size:12.5px; color:var(--text-muted); margin-bottom:10px;">
        ${entry.action} by <strong>${entry.actor}</strong> on ${Utils.formatDateTime(entry.timestamp)}
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
        <div>
          <span style="font-size:11px; text-transform:uppercase; color:var(--danger); font-weight:600;">Previous State</span>
          <pre style="background:rgba(0,0,0,0.4); padding:12px; border-radius:var(--radius-sm); border:1px solid var(--border-subtle); font-family:var(--font-mono); font-size:11.5px; overflow-x:auto; color:#fca5a5;">${JSON.stringify(entry.previousState, null, 2) || 'null'}</pre>
        </div>
        <div>
          <span style="font-size:11px; text-transform:uppercase; color:var(--success); font-weight:600;">New State</span>
          <pre style="background:rgba(0,0,0,0.4); padding:12px; border-radius:var(--radius-sm); border:1px solid var(--border-subtle); font-family:var(--font-mono); font-size:11.5px; overflow-x:auto; color:#86efac;">${JSON.stringify(entry.newState, null, 2) || 'null'}</pre>
        </div>
      </div>
    `;

    footer.innerHTML = `<button class="btn btn-secondary" onclick="Dashboard.closeModal()">Close</button>`;
    modal.classList.add('open');
  }

  function previewRawDoc(docId) {
    const doc = DataManager.getAllDocuments().find(d => d.id === docId);
    if (!doc) return;

    const modal = document.getElementById('globalModal');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    const footer = document.getElementById('modalFooter');

    title.textContent = `Document Inspector: ${doc.title}`;
    body.innerHTML = `
      <div style="font-size:12px; color:var(--text-muted); margin-bottom:8px;">
        Source: <strong>${doc.type}</strong> • Participants: <strong>${(doc.participants || []).join(', ')}</strong>
      </div>
      <pre style="background:rgba(0,0,0,0.5); padding:16px; border-radius:var(--radius-sm); border:1px solid var(--border-subtle); font-family:var(--font-mono); font-size:12px; max-height:400px; overflow-y:auto; line-height:1.6; color:#e2e8f0; white-space:pre-wrap;">${doc.content}</pre>
    `;

    footer.innerHTML = `<button class="btn btn-secondary" onclick="Dashboard.closeModal()">Close</button>`;
    modal.classList.add('open');
  }

  function viewActionAuditHistory(actionId) {
    switchTab('audit');
    _activeAuditFilter = { action: 'ALL', search: actionId };
    renderCurrentTab();
  }

  function exportAuditTrailJSON() {
    const json = AuditTrail.exportAsJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `d2a-audit-trail-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Audit trail exported as JSON', 'success');
  }

  // ─── TOAST NOTIFICATIONS ──────────────────────────────────────────
  function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icon = type === 'success' ? '✓' : type === 'warning' ? '⚠️' : type === 'danger' ? '✕' : 'ℹ️';
    toast.innerHTML = `<span style="font-size:16px;">${icon}</span><span>${message}</span>`;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(30px)';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  function updateBadges() {
    const pendingActionsCount = ActionManager.getActions().filter(a => a.status === 'PENDING_CONFIRM').length;
    const badgeEl = document.getElementById('sidebarPendingBadge');
    if (badgeEl) {
      badgeEl.textContent = pendingActionsCount;
      badgeEl.style.display = pendingActionsCount > 0 ? 'inline-block' : 'none';
    }
  }

  function setupEventListeners() {
    Utils.on('action:confirmed', () => updateBadges());
    Utils.on('action:rejected', () => updateBadges());
    Utils.on('action:created', () => updateBadges());
    Utils.on('source:healthChanged', () => {
      const statusDot = document.getElementById('systemStatusDot');
      const statusText = document.getElementById('systemStatusText');
      const health = DataManager.getSourceHealth();
      const hasMissing = Object.values(health).some(s => s.status === 'MISSING');
      const hasDelayed = Object.values(health).some(s => s.status === 'DELAYED');

      if (statusDot && statusText) {
        if (hasMissing) {
          statusDot.className = 'status-dot outage';
          statusText.textContent = 'Degraded (Outage)';
        } else if (hasDelayed) {
          statusDot.className = 'status-dot degraded';
          statusText.textContent = 'Degraded (Sync Lag)';
        } else {
          statusDot.className = 'status-dot';
          statusText.textContent = 'All Systems Operational';
        }
      }
    });
  }

  // Edge cases runners
  function runEdgeCase1SimulateOutage() {
    DataManager.simulateMissingSource('TRANSCRIPT');
    renderCurrentTab();
    showToast('Meeting Transcripts marked as MISSING. Degradation rules triggered.', 'warning');
  }

  function runEdgeCase1Recover() {
    DataManager.recoverSource('TRANSCRIPT');
    renderCurrentTab();
    showToast('Meeting Transcripts recovered and active.', 'success');
  }

  function simulateAmbiguousOwner() {
    const action = ActionManager.getActions().find(a => a.owner === 'Unassigned' || a.owner.includes('Platform Team'));
    if (action) {
      openOverrideModal(action.id);
    } else {
      showToast('Ambiguous owner action already assigned or resolved', 'info');
    }
  }

  function simulateRollbackScenario() {
    const candidate = AuditTrail.getRollbackCandidates()[0];
    if (candidate) {
      openRollbackModal(candidate);
    } else {
      showToast('No confirmed high-impact actions eligible for rollback right now.', 'info');
    }
  }

  return {
    initialize, switchTab, renderCurrentTab,
    openConfirmModal, executeConfirm,
    openRejectModal, executeReject,
    openOverrideModal, executeOverride,
    openRollbackModal, executeRollback,
    startActionProgress, completeAction,
    generateActionForDecision, filterActionsByDecision,
    openEvidenceModal, openConflictResolutionModal, executeConflictResolution,
    viewStateDiff, previewRawDoc, viewActionAuditHistory,
    exportAuditTrailJSON, showToast, updateBadges, closeModal,
    toggleSourceSimulation, resetDecisionFilters, setActionStatusFilter, setAuditActionFilter,
    runEdgeCase1SimulateOutage, runEdgeCase1Recover, simulateAmbiguousOwner, simulateRollbackScenario
  };
})();
