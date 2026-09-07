// ─── Audit Trail Engine ────────────────────────────────────────────
// Immutable event log, change history, rollback support, compliance reporting

const AuditTrail = (() => {
  let _entries = [];
  let _entryCounter = 0;

  function initialize() {
    _entries = Utils.loadFromStorage('auditTrail') || [];
    _entryCounter = _entries.length;
  }

  function getEntries() { return _entries; }

  function getEntriesForEntity(entityType, entityId) {
    return _entries.filter(e => e.entityType === entityType && e.entityId === entityId);
  }

  function log(entry) {
    const auditEntry = {
      id: `AUD-${String(++_entryCounter).padStart(5, '0')}`,
      entityType: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
      actor: entry.actor,
      reason: entry.reason || null,
      previousState: entry.previousState || null,
      newState: entry.newState || null,
      timestamp: new Date().toISOString(),
      sessionId: getSessionId(),
      immutable: true
    };

    _entries.push(auditEntry);
    save();
    Utils.emit('audit:logged', auditEntry);
    return auditEntry;
  }

  function save() {
    Utils.saveToStorage('auditTrail', _entries);
  }

  function getSessionId() {
    let sessionId = sessionStorage.getItem('d2a_sessionId');
    if (!sessionId) {
      sessionId = Utils.generateId();
      sessionStorage.setItem('d2a_sessionId', sessionId);
    }
    return sessionId;
  }

  // Get change history for a specific action
  function getChangeHistory(entityId) {
    return _entries
      .filter(e => e.entityId === entityId)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  // Get rollback candidates (confirmed high-impact actions)
  function getRollbackCandidates() {
    const confirmedActions = _entries
      .filter(e => e.entityType === 'ACTION' && e.action === 'CONFIRM')
      .map(e => e.entityId);

    const rolledBack = _entries
      .filter(e => e.entityType === 'ACTION' && e.action === 'ROLLBACK')
      .map(e => e.entityId);

    return confirmedActions.filter(id => !rolledBack.includes(id));
  }

  // Generate compliance summary
  function getComplianceSummary() {
    const now = new Date();
    const last30Days = new Date(now.getTime() - 30 * 86400000);

    const recentEntries = _entries.filter(e => new Date(e.timestamp) >= last30Days);

    return {
      totalAuditEntries: _entries.length,
      recentEntries: recentEntries.length,
      actionsCreated: recentEntries.filter(e => e.action === 'CREATE').length,
      actionsConfirmed: recentEntries.filter(e => e.action === 'CONFIRM').length,
      actionsRejected: recentEntries.filter(e => e.action === 'REJECT').length,
      actionsOverridden: recentEntries.filter(e => e.action === 'OVERRIDE').length,
      actionsRolledBack: recentEntries.filter(e => e.action === 'ROLLBACK').length,
      actionsCompleted: recentEntries.filter(e => e.action === 'COMPLETE').length,
      uniqueActors: [...new Set(recentEntries.map(e => e.actor))].length,
      overrideReasons: recentEntries
        .filter(e => e.action === 'OVERRIDE' && e.reason)
        .map(e => ({ entityId: e.entityId, reason: e.reason, actor: e.actor, timestamp: e.timestamp })),
      rollbackReasons: recentEntries
        .filter(e => e.action === 'ROLLBACK' && e.reason)
        .map(e => ({ entityId: e.entityId, reason: e.reason, actor: e.actor, timestamp: e.timestamp })),
      auditCompleteness: calculateCompleteness(recentEntries)
    };
  }

  function calculateCompleteness(entries) {
    if (entries.length === 0) return 100;

    const actions = entries.filter(e => e.entityType === 'ACTION');
    const withReason = actions.filter(e =>
      !['CREATE', 'CONFIRM', 'START', 'COMPLETE'].includes(e.action) || e.reason
    );
    const withState = actions.filter(e => e.previousState || e.newState);

    const reasonScore = actions.length > 0 ? (withReason.length / actions.length) * 50 : 50;
    const stateScore = actions.length > 0 ? (withState.length / actions.length) * 50 : 50;

    return Math.round(reasonScore + stateScore);
  }

  // Export audit trail as JSON (for download)
  function exportAsJSON() {
    const data = {
      exportedAt: new Date().toISOString(),
      totalEntries: _entries.length,
      entries: _entries
    };
    return JSON.stringify(data, null, 2);
  }

  function clearAudit() {
    _entries = [];
    _entryCounter = 0;
    Utils.saveToStorage('auditTrail', _entries);
    Utils.emit('audit:cleared');
  }

  function getStats() {
    return {
      total: _entries.length,
      creates: _entries.filter(e => e.action === 'CREATE').length,
      confirms: _entries.filter(e => e.action === 'CONFIRM').length,
      rejects: _entries.filter(e => e.action === 'REJECT').length,
      overrides: _entries.filter(e => e.action === 'OVERRIDE').length,
      rollbacks: _entries.filter(e => e.action === 'ROLLBACK').length,
      completions: _entries.filter(e => e.action === 'COMPLETE').length
    };
  }

  return {
    initialize, log,
    getEntries, getEntriesForEntity, getChangeHistory,
    getRollbackCandidates, getComplianceSummary,
    exportAsJSON, clearAudit, getStats
  };
})();
