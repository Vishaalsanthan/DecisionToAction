// ─── Application Bootstrap & Orchestrator ─────────────────────────
// Initializes data layer, extraction engine, action lifecycle, and UI dashboard

const App = (() => {
  let _initialized = false;

  async function start() {
    if (_initialized) return;

    try {
      console.log('🚀 Bootstrapping Decision-to-Action Extractor (D2A)...');

      // 1. Initialize core storage & ledger modules
      AuditTrail.initialize();
      ExtractionEngine.initialize();
      ActionManager.initialize();

      // 2. Initialize Data Sources (transcripts, chats, ADRs, tasks, edge cases)
      await DataManager.initialize();

      // 3. If storage is empty (first run), execute initial automated extraction & action generation
      const existingDecisions = ExtractionEngine.getDecisions();
      if (existingDecisions.length === 0) {
        console.log('📦 First launch detected: running initial decision extraction...');
        await runFullIngestion(false);
      }

      // 4. Initialize Dashboard UI & event listeners
      Dashboard.initialize();

      _initialized = true;
      console.log('✅ D2A System initialized successfully.');
    } catch (error) {
      console.error('❌ Failed to initialize D2A System:', error);
      showFatalError(error);
    }
  }

  // Orchestrates full ingestion across active data sources
  async function runFullIngestion(showNotification = true) {
    const documents = DataManager.getAllDocuments();
    console.log(`📥 Ingesting ${documents.length} documents from active sources...`);

    // Extract decisions using pattern-matching rules
    const newDecisions = ExtractionEngine.extractFromDocuments(documents);
    console.log(`🧠 Extracted ${newDecisions.length} new decisions.`);

    // Automatically generate tracked actions for extracted decisions
    let createdActionCount = 0;
    const allDecisions = ExtractionEngine.getDecisions();
    const existingActions = ActionManager.getActions();

    allDecisions.forEach(decision => {
      const hasAction = existingActions.some(a => a.decisionId === decision.id);
      if (!hasAction) {
        ActionManager.generateFromDecision(decision);
        createdActionCount++;
      }
    });

    console.log(`⚡ Generated ${createdActionCount} tracked actions.`);

    if (showNotification) {
      Dashboard.showToast(
        `Ingestion complete: ${newDecisions.length} new decisions, ${createdActionCount} new actions generated.`,
        'success'
      );
      Dashboard.renderCurrentTab();
      Dashboard.updateBadges();
    }
  }

  // Reset demo environment to clean initial state
  function resetDemoData() {
    if (!confirm('Are you sure you want to reset all data and audit logs to factory defaults?')) {
      return;
    }

    Utils.clearStorage();
    ExtractionEngine.clearDecisions();
    ActionManager.clearActions();
    AuditTrail.clearAudit();
    DataManager.resetSourceHealth();

    // Re-seed from scratch
    runFullIngestion(false).then(() => {
      Dashboard.renderCurrentTab();
      Dashboard.updateBadges();
      Dashboard.showToast('Demo environment reset to fresh initial state', 'info');
    });
  }

  function showFatalError(error) {
    const pageBody = document.getElementById('pageBody');
    if (pageBody) {
      pageBody.innerHTML = `
        <div class="panel" style="border-color:var(--danger); background:var(--danger-bg); text-align:center; padding:40px;">
          <h3 style="color:var(--danger); font-size:20px;">Initialization Error</h3>
          <p style="margin-top:10px; color:var(--text-secondary);">${error.message}</p>
          <button class="btn btn-secondary" style="margin-top:16px;" onclick="location.reload()">Reload Page</button>
        </div>
      `;
    }
  }

  return {
    start,
    runFullIngestion,
    resetDemoData
  };
})();

// Auto-start on DOM readiness
document.addEventListener('DOMContentLoaded', () => {
  App.start();
});
