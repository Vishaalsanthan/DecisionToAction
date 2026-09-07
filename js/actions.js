// ─── Action Management Module ──────────────────────────────────────
// Action generation, lifecycle management, confirmation flow, rollback

const ActionManager = (() => {
  let _actions = [];
  let _actionCounter = 0;

  function initialize() {
    _actions = Utils.loadFromStorage('actions') || [];
    _actionCounter = _actions.length;
  }

  function getActions() { return _actions; }

  function getActionById(id) {
    return _actions.find(a => a.id === id);
  }

  // Generate actions from a decision
  function generateFromDecision(decision) {
    const requiresConfirmation = decision.impact === 'HIGH';
    const owner = decision.suggestedOwners?.[0]?.name || 'Unassigned';
    const ownerConfidence = decision.suggestedOwners?.[0]?.confidence || 0;
    const deadline = decision.suggestedDeadlines?.[0]?.text || suggestDefaultDeadline(decision.impact);

    const action = {
      id: `ACT-${String(++_actionCounter).padStart(4, '0')}`,
      decisionId: decision.id,
      title: decision.title,
      description: decision.description,
      owner: owner,
      ownerConfidence: ownerConfidence,
      ownerSource: decision.suggestedOwners?.[0]?.source || 'default',
      deadline: deadline,
      deadlineConfidence: decision.suggestedDeadlines?.[0]?.confidence || 0.5,
      impact: decision.impact,
      impactReason: decision.impactReason,
      status: requiresConfirmation ? 'PENDING_CONFIRM' : 'CONFIRMED',
      confirmationRequired: requiresConfirmation,
      confirmedBy: requiresConfirmation ? null : 'AUTO',
      confirmedAt: requiresConfirmation ? null : new Date().toISOString(),
      overrideReason: null,
      rollbackAvailable: decision.impact === 'HIGH',
      evidence: decision.evidence,
      extractionRules: decision.extractionRules,
      sourceType: decision.sourceType,
      sourceTitle: decision.sourceTitle,
      tags: decision.tags,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null,
      history: [{
        timestamp: new Date().toISOString(),
        action: 'CREATED',
        actor: 'SYSTEM',
        details: `Action generated from decision ${decision.id}`,
        previousState: null,
        newState: requiresConfirmation ? 'PENDING_CONFIRM' : 'CONFIRMED'
      }]
    };

    _actions.push(action);
    save();

    Utils.emit('action:created', action);

    // Log to audit
    AuditTrail.log({
      entityType: 'ACTION',
      entityId: action.id,
      action: 'CREATE',
      actor: 'SYSTEM',
      reason: `Auto-generated from decision ${decision.id}`,
      previousState: null,
      newState: { status: action.status, owner: action.owner, deadline: action.deadline }
    });

    return action;
  }

  function suggestDefaultDeadline(impact) {
    const now = new Date();
    switch (impact) {
      case 'HIGH': return formatDeadline(new Date(now.getTime() + 30 * 86400000)); // 30 days
      case 'MEDIUM': return formatDeadline(new Date(now.getTime() + 14 * 86400000)); // 14 days
      case 'LOW': return formatDeadline(new Date(now.getTime() + 7 * 86400000)); // 7 days
      default: return formatDeadline(new Date(now.getTime() + 14 * 86400000));
    }
  }

  function formatDeadline(date) {
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }

  // Confirm an action
  function confirm(actionId, actor) {
    const action = _actions.find(a => a.id === actionId);
    if (!action) return null;

    const previousState = { ...action };
    action.status = 'CONFIRMED';
    action.confirmedBy = actor;
    action.confirmedAt = new Date().toISOString();
    action.updatedAt = new Date().toISOString();
    action.history.push({
      timestamp: new Date().toISOString(),
      action: 'CONFIRM',
      actor: actor,
      details: 'Action confirmed by human reviewer',
      previousState: previousState.status,
      newState: 'CONFIRMED'
    });

    save();
    Utils.emit('action:confirmed', action);

    AuditTrail.log({
      entityType: 'ACTION',
      entityId: action.id,
      action: 'CONFIRM',
      actor: actor,
      reason: 'Human confirmation',
      previousState: { status: previousState.status },
      newState: { status: 'CONFIRMED', confirmedBy: actor }
    });

    return action;
  }

  // Reject an action
  function reject(actionId, actor, reason) {
    const action = _actions.find(a => a.id === actionId);
    if (!action) return null;

    const previousState = { ...action };
    action.status = 'REJECTED';
    action.overrideReason = reason;
    action.updatedAt = new Date().toISOString();
    action.history.push({
      timestamp: new Date().toISOString(),
      action: 'REJECT',
      actor: actor,
      details: `Rejected: ${reason}`,
      previousState: previousState.status,
      newState: 'REJECTED'
    });

    save();
    Utils.emit('action:rejected', action);

    AuditTrail.log({
      entityType: 'ACTION',
      entityId: action.id,
      action: 'REJECT',
      actor: actor,
      reason: reason,
      previousState: { status: previousState.status },
      newState: { status: 'REJECTED', overrideReason: reason }
    });

    return action;
  }

  // Override an action (change owner, deadline, or impact)
  function override(actionId, actor, changes, reason) {
    const action = _actions.find(a => a.id === actionId);
    if (!action) return null;
    if (!reason || reason.trim().length < 5) {
      throw new Error('Override reason must be at least 5 characters');
    }

    const previousState = {
      owner: action.owner,
      deadline: action.deadline,
      impact: action.impact,
      status: action.status
    };

    if (changes.owner) action.owner = changes.owner;
    if (changes.deadline) action.deadline = changes.deadline;
    if (changes.impact) action.impact = changes.impact;
    if (changes.status) action.status = changes.status;
    action.overrideReason = reason;
    action.updatedAt = new Date().toISOString();
    action.history.push({
      timestamp: new Date().toISOString(),
      action: 'OVERRIDE',
      actor: actor,
      details: `Override: ${reason}. Changes: ${JSON.stringify(changes)}`,
      previousState: JSON.stringify(previousState),
      newState: JSON.stringify({
        owner: action.owner,
        deadline: action.deadline,
        impact: action.impact,
        status: action.status
      })
    });

    save();
    Utils.emit('action:overridden', { action, changes, reason });

    AuditTrail.log({
      entityType: 'ACTION',
      entityId: action.id,
      action: 'OVERRIDE',
      actor: actor,
      reason: reason,
      previousState: previousState,
      newState: { owner: action.owner, deadline: action.deadline, impact: action.impact }
    });

    return action;
  }

  // Mark as in progress
  function startProgress(actionId, actor) {
    const action = _actions.find(a => a.id === actionId);
    if (!action || action.status !== 'CONFIRMED') return null;

    const previousState = action.status;
    action.status = 'IN_PROGRESS';
    action.updatedAt = new Date().toISOString();
    action.history.push({
      timestamp: new Date().toISOString(),
      action: 'START',
      actor: actor,
      details: 'Work started',
      previousState: previousState,
      newState: 'IN_PROGRESS'
    });

    save();
    Utils.emit('action:started', action);

    AuditTrail.log({
      entityType: 'ACTION',
      entityId: action.id,
      action: 'UPDATE',
      actor: actor,
      reason: 'Work started',
      previousState: { status: previousState },
      newState: { status: 'IN_PROGRESS' }
    });

    return action;
  }

  // Mark as complete
  function complete(actionId, actor) {
    const action = _actions.find(a => a.id === actionId);
    if (!action) return null;

    const previousState = action.status;
    action.status = 'COMPLETED';
    action.completedAt = new Date().toISOString();
    action.updatedAt = new Date().toISOString();
    action.history.push({
      timestamp: new Date().toISOString(),
      action: 'COMPLETE',
      actor: actor,
      details: 'Action completed',
      previousState: previousState,
      newState: 'COMPLETED'
    });

    save();
    Utils.emit('action:completed', action);

    AuditTrail.log({
      entityType: 'ACTION',
      entityId: action.id,
      action: 'COMPLETE',
      actor: actor,
      reason: 'Action completed',
      previousState: { status: previousState },
      newState: { status: 'COMPLETED' }
    });

    return action;
  }

  // Rollback a confirmed high-impact action
  function rollback(actionId, actor, reason) {
    const action = _actions.find(a => a.id === actionId);
    if (!action) return null;
    if (!action.rollbackAvailable) {
      throw new Error('Rollback not available for this action');
    }
    if (!reason || reason.trim().length < 10) {
      throw new Error('Rollback reason must be at least 10 characters');
    }

    const previousState = { ...action };
    action.status = 'ROLLED_BACK';
    action.updatedAt = new Date().toISOString();
    action.history.push({
      timestamp: new Date().toISOString(),
      action: 'ROLLBACK',
      actor: actor,
      details: `Rolled back: ${reason}`,
      previousState: previousState.status,
      newState: 'ROLLED_BACK'
    });

    save();
    Utils.emit('action:rolledBack', { action, reason });

    AuditTrail.log({
      entityType: 'ACTION',
      entityId: action.id,
      action: 'ROLLBACK',
      actor: actor,
      reason: reason,
      previousState: { status: previousState.status, confirmedBy: previousState.confirmedBy },
      newState: { status: 'ROLLED_BACK' }
    });

    return action;
  }

  function save() {
    Utils.saveToStorage('actions', _actions);
  }

  function getStats() {
    return {
      total: _actions.length,
      pendingConfirm: _actions.filter(a => a.status === 'PENDING_CONFIRM').length,
      confirmed: _actions.filter(a => a.status === 'CONFIRMED').length,
      inProgress: _actions.filter(a => a.status === 'IN_PROGRESS').length,
      completed: _actions.filter(a => a.status === 'COMPLETED').length,
      rejected: _actions.filter(a => a.status === 'REJECTED').length,
      rolledBack: _actions.filter(a => a.status === 'ROLLED_BACK').length,
      overdue: _actions.filter(a => a.status !== 'COMPLETED' && a.status !== 'REJECTED' && a.status !== 'ROLLED_BACK' && isOverdue(a)).length,
      highImpact: _actions.filter(a => a.impact === 'HIGH').length,
      withOwner: _actions.filter(a => a.owner && a.owner !== 'Unassigned').length,
      withDeadline: _actions.filter(a => a.deadline).length
    };
  }

  function isOverdue(action) {
    if (!action.deadline) return false;
    try {
      const deadline = new Date(action.deadline);
      return deadline < new Date();
    } catch {
      return false;
    }
  }

  function clearActions() {
    _actions = [];
    _actionCounter = 0;
    Utils.saveToStorage('actions', _actions);
    Utils.emit('actions:cleared');
  }

  return {
    initialize, generateFromDecision,
    getActions, getActionById,
    confirm, reject, override, startProgress, complete, rollback,
    getStats, clearActions
  };
})();
