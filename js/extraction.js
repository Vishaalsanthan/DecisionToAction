// ─── Decision Extraction Engine ────────────────────────────────────
// Pattern matching, confidence scoring, evidence linking, impact classification

const ExtractionEngine = (() => {
  // Extraction rules with linguistic patterns
  const EXTRACTION_RULES = [
    {
      id: 'RULE-001',
      name: 'Explicit Decision Statement',
      category: 'DECISION',
      patterns: [
        /we decided to (.+?)(?:\.|$)/i,
        /the decision is to (.+?)(?:\.|$)/i,
        /we(?:'ve| have) agreed (?:to |on )(.+?)(?:\.|$)/i,
        /we agreed (?:to |on )(.+?)(?:\.|$)/i,
        /we(?:'ll| will) go with (.+?)(?:\.|$)/i
      ],
      confidenceWeight: 0.95,
      description: 'Matches explicit verbal decision statements with strong commitment language',
      examples: ['"We decided to use PostgreSQL"', '"The decision is to migrate to microservices"']
    },
    {
      id: 'RULE-002',
      name: 'Implicit Decision / Direction',
      category: 'DECISION',
      patterns: [
        /let(?:'s| us) (?:go with|use|adopt|switch to|implement) (.+?)(?:\.|$)/i,
        /the plan is to (.+?)(?:\.|$)/i,
        /going forward,?\s*(?:we(?:'ll| will| should))?\s*(.+?)(?:\.|$)/i,
        /(?:we(?:'ll| will| should)|let's) (?:go with|use|adopt) (.+?)(?:\.|$)/i
      ],
      confidenceWeight: 0.75,
      description: 'Matches implicit decisions expressed as plans or directions without explicit "decided" language',
      examples: ['"Let\'s go with Redis for caching"', '"Going forward, all services must use OpenTelemetry"']
    },
    {
      id: 'RULE-003',
      name: 'Action Directive',
      category: 'ACTION',
      patterns: [
        /(?:action item|todo|task)[:\s]+(.+?)(?:\.|$)/i,
        /(?:someone|we) need(?:s)? to (.+?)(?:\.|$)/i,
        /can you (?:please )?(.+?)(?:\?|\.|$)/i,
        /(?:i(?:'ll| will)|i can) (.+?)(?:\.|$)/i,
        /please (.+?)(?:\.|$)/i
      ],
      confidenceWeight: 0.80,
      description: 'Matches directives, requests, and commitments to take action',
      examples: ['"Action item: James to set up monitoring"', '"I\'ll handle the backend migration"']
    },
    {
      id: 'RULE-004',
      name: 'Deadline / Timeline Mention',
      category: 'DEADLINE',
      patterns: [
        /by (?:end of |the end of )?(\w+ \d{1,2}(?:st|nd|rd|th)?(?:,? \d{4})?)/i,
        /(?:by|before|due|deadline[:\s]*) ?(next (?:monday|tuesday|wednesday|thursday|friday|week|month|sprint))/i,
        /(?:by|before|due|deadline[:\s]*) ?(\w+ \d{1,2})/i,
        /(?:should|must) (?:be )?(?:done|ready|completed|finished) by (.+?)(?:\.|$)/i,
        /(?:target|targeting|aim for) (.+?)(?:\.|$)/i
      ],
      confidenceWeight: 0.85,
      description: 'Extracts deadline and timeline information from conversations',
      examples: ['"By end of September"', '"Due by next Friday"', '"Should be done by October 15th"']
    },
    {
      id: 'RULE-005',
      name: 'Owner Assignment',
      category: 'OWNER',
      patterns: [
        /@(\w+[\w\s]*?)(?:,| will| can| should| is responsible)/i,
        /(\w+(?:\s\w+)?),?\s*(?:can you|will you|you(?:'re| are) responsible|please|will handle|will own|is responsible)/i,
        /(?:assigned to|owned by|responsibility of) (\w+(?:\s\w+)?)/i,
        /(\w+(?:\s\w+)?)\s+(?:will|(?:'ll))\s+(?:handle|own|lead|draft|create|implement|write|set up|prepare)/i
      ],
      confidenceWeight: 0.85,
      description: 'Identifies action owners from assignments, commitments, and @mentions',
      examples: ['"@James will handle the migration"', '"Priya is responsible for the design doc"']
    },
    {
      id: 'RULE-006',
      name: 'Impact Signal — High',
      category: 'IMPACT',
      patterns: [
        /\b(deprecat(?:e|ing|ion))\b/i,
        /\b(migrat(?:e|ing|ion))\b/i,
        /\b(rewrit(?:e|ing))\b/i,
        /\b(breaking change)\b/i,
        /\baffects?\s+(?:all|every|multiple)\s+(?:service|team|system)/i,
        /\b(security|compliance|gdpr|sox|soc2)\b/i
      ],
      confidenceWeight: 0.90,
      description: 'Detects high-impact signals: deprecations, migrations, breaking changes, security/compliance',
      examples: ['"Deprecate the v1 API"', '"Migrate to microservices"', '"Breaking change in auth"']
    },
    {
      id: 'RULE-007',
      name: 'Impact Signal — Medium',
      category: 'IMPACT',
      patterns: [
        /\b(refactor(?:ing)?)\b/i,
        /\b(updat(?:e|ing))\b/i,
        /\b(add(?:ing)?)\s+(?:new\s+)?(?:service|feature|endpoint|module)/i,
        /\baffects?\s+(?:\d+|a few|some|several)\s+(?:service|team)/i
      ],
      confidenceWeight: 0.70,
      description: 'Detects medium-impact signals: refactoring, updates, new additions',
      examples: ['"Refactor the auth module"', '"Adding a new caching layer"']
    }
  ];

  // Impact classification rules
  const IMPACT_RULES = [
    { pattern: /deprecat/i, level: 'HIGH', reason: 'Deprecation affects downstream consumers and may cause breaking changes' },
    { pattern: /migrat/i, level: 'HIGH', reason: 'Migration involves data movement and potential downtime' },
    { pattern: /rewrit/i, level: 'HIGH', reason: 'Rewrite carries risk of introducing regressions' },
    { pattern: /security|compliance|gdpr|auth/i, level: 'HIGH', reason: 'Security/compliance changes have regulatory implications' },
    { pattern: /(?:all|every|multiple)\s+(?:service|team)/i, level: 'HIGH', reason: 'Affects multiple services — broad blast radius' },
    { pattern: /breaking/i, level: 'HIGH', reason: 'Breaking change requires coordination across teams' },
    { pattern: /refactor/i, level: 'MEDIUM', reason: 'Refactoring may affect interfaces but scope is contained' },
    { pattern: /updat/i, level: 'MEDIUM', reason: 'Updates require testing but are routine' },
    { pattern: /add(?:ing)?\s+(?:new\s+)?/i, level: 'MEDIUM', reason: 'New additions need review but don\'t break existing functionality' },
    { pattern: /fix|patch|tweak|minor/i, level: 'LOW', reason: 'Minor change with contained scope' },
    { pattern: /monitor|log|dashboard/i, level: 'LOW', reason: 'Observability changes are low risk' }
  ];

  let _decisions = [];
  let _decisionCounter = 0;

  function initialize() {
    _decisions = Utils.loadFromStorage('decisions') || [];
    _decisionCounter = _decisions.length;
  }

  function getDecisions() { return _decisions; }

  function getDecisionById(id) {
    return _decisions.find(d => d.id === id);
  }

  // Main extraction function
  function extractFromDocuments(documents) {
    const newDecisions = [];

    documents.forEach(doc => {
      const lines = doc.rawContent || [];
      const fullText = doc.content;

      lines.forEach((line, idx) => {
        const text = line.text || line;
        const speaker = line.speaker || line.sender || 'Unknown';
        const time = line.time || '';

        // Check each decision/action rule
        EXTRACTION_RULES.filter(r => r.category === 'DECISION' || r.category === 'ACTION').forEach(rule => {
          rule.patterns.forEach(pattern => {
            const match = text.match(pattern);
            if (match && match[1] && match[1].trim().length > 10) {
              const content = match[1].trim();

              // Check for duplicate
              if (isDuplicate(content, newDecisions.concat(_decisions))) return;

              const impact = classifyImpact(content + ' ' + text);
              const confidence = calculateConfidence(rule, doc, text, content);
              const owners = extractOwners(text, lines, idx, doc.participants);
              const deadlines = extractDeadlines(text, lines, idx);

              const decision = {
                id: `DEC-${String(++_decisionCounter).padStart(4, '0')}`,
                documentId: doc.id,
                title: generateTitle(content),
                description: content,
                confidence: confidence,
                impact: impact.level,
                impactReason: impact.reason,
                status: 'EXTRACTED',
                sourceType: doc.type,
                sourceTitle: doc.title,
                sourceStatus: doc.sourceStatus,
                category: rule.category === 'ACTION' ? 'ACTION_DIRECTIVE' : 'ARCHITECTURAL_DECISION',
                extractedAt: new Date().toISOString(),
                evidence: [{
                  sourceType: doc.type,
                  sourceRef: doc.id,
                  excerpt: text,
                  speaker: speaker,
                  timestamp: time,
                  channel: doc.channel || null
                }],
                extractionRules: [{
                  ruleId: rule.id,
                  ruleName: rule.name,
                  ruleDescription: rule.description,
                  pattern: pattern.toString(),
                  matchedText: match[0],
                  confidenceWeight: rule.confidenceWeight
                }],
                suggestedOwners: owners,
                suggestedDeadlines: deadlines,
                tags: extractTags(content)
              };

              newDecisions.push(decision);
            }
          });
        });
      });
    });

    // Add new decisions to store
    _decisions = [..._decisions, ...newDecisions];
    Utils.saveToStorage('decisions', _decisions);
    Utils.emit('decisions:extracted', { count: newDecisions.length, total: _decisions.length });
    return newDecisions;
  }

  function isDuplicate(content, existingDecisions) {
    const normalized = content.toLowerCase().replace(/[^a-z0-9\s]/g, '');
    return existingDecisions.some(d => {
      const existingNorm = d.description.toLowerCase().replace(/[^a-z0-9\s]/g, '');
      // Simple similarity: check if >60% of words overlap
      const words1 = new Set(normalized.split(/\s+/));
      const words2 = new Set(existingNorm.split(/\s+/));
      const intersection = [...words1].filter(w => words2.has(w));
      const similarity = intersection.length / Math.max(words1.size, words2.size);
      return similarity > 0.6;
    });
  }

  function calculateConfidence(rule, doc, text, content) {
    let confidence = rule.confidenceWeight;

    // Adjust for source status
    if (doc.sourceStatus === 'DELAYED') confidence *= 0.85;

    // Boost if multiple speakers confirm
    if (doc.rawContent && Array.isArray(doc.rawContent)) {
      const confirmations = doc.rawContent.filter(line => {
        const t = (line.text || '').toLowerCase();
        return t.includes('agree') || t.includes('yes') || t.includes('sounds good') || t.includes('will do');
      });
      if (confirmations.length >= 2) confidence = Math.min(confidence + 0.05, 1.0);
    }

    // Reduce confidence for short content
    if (content.length < 20) confidence *= 0.8;

    // Reduce confidence for hedging language
    if (/maybe|might|could|perhaps|possibly/i.test(text)) confidence *= 0.6;

    return Math.round(confidence * 100) / 100;
  }

  function classifyImpact(text) {
    for (const rule of IMPACT_RULES) {
      if (rule.pattern.test(text)) {
        return { level: rule.level, reason: rule.reason };
      }
    }
    return { level: 'MEDIUM', reason: 'Default classification — no specific impact signals detected' };
  }

  function extractOwners(text, lines, currentIdx, participants) {
    const owners = [];
    const ownerRule = EXTRACTION_RULES.find(r => r.id === 'RULE-005');

    if (ownerRule) {
      ownerRule.patterns.forEach(pattern => {
        const match = text.match(pattern);
        if (match && match[1]) {
          const name = match[1].trim();
          // Validate against participants
          const matched = participants?.find(p =>
            p.toLowerCase().includes(name.toLowerCase())
          );
          if (matched || name.length > 2) {
            owners.push({
              name: matched || name,
              confidence: matched ? 0.9 : 0.6,
              source: 'direct_mention'
            });
          }
        }
      });
    }

    // Check surrounding lines for ownership signals
    if (lines && Array.isArray(lines)) {
      const nearby = lines.slice(Math.max(0, currentIdx - 1), currentIdx + 3);
      nearby.forEach(line => {
        const t = line.text || line;
        const s = line.speaker || line.sender;
        if (/i(?:'ll| will)\b/i.test(t) && s) {
          const matched = participants?.find(p => p.toLowerCase().includes(s.toLowerCase()));
          if (matched && !owners.find(o => o.name === matched)) {
            owners.push({ name: matched, confidence: 0.85, source: 'self_assignment' });
          }
        }
      });
    }

    return owners;
  }

  function extractDeadlines(text, lines, currentIdx) {
    const deadlines = [];
    const deadlineRule = EXTRACTION_RULES.find(r => r.id === 'RULE-004');

    if (deadlineRule) {
      deadlineRule.patterns.forEach(pattern => {
        const match = text.match(pattern);
        if (match && match[1]) {
          deadlines.push({
            text: match[1].trim(),
            confidence: deadlineRule.confidenceWeight,
            source: 'direct_extraction'
          });
        }
      });
    }

    // Check nearby lines for deadline context
    if (lines && Array.isArray(lines)) {
      const nearby = lines.slice(currentIdx + 1, currentIdx + 3);
      nearby.forEach(line => {
        const t = line.text || line;
        if (deadlineRule) {
          deadlineRule.patterns.forEach(pattern => {
            const match = t.match(pattern);
            if (match && match[1] && !deadlines.find(d => d.text === match[1].trim())) {
              deadlines.push({
                text: match[1].trim(),
                confidence: deadlineRule.confidenceWeight * 0.8,
                source: 'context_extraction'
              });
            }
          });
        }
      });
    }

    return deadlines;
  }

  function generateTitle(content) {
    // Clean and capitalize
    let title = content.replace(/^(to |that |we |the )/i, '');
    title = title.charAt(0).toUpperCase() + title.slice(1);
    if (title.length > 80) title = title.substring(0, 77) + '...';
    return title;
  }

  function extractTags(content) {
    const tags = [];
    const tagPatterns = [
      { pattern: /\b(api|rest|grpc|graphql)\b/i, tag: 'api' },
      { pattern: /\b(database|postgres|redis|mongo|mysql|clickhouse)\b/i, tag: 'database' },
      { pattern: /\b(kubernetes|k8s|docker|container)\b/i, tag: 'infrastructure' },
      { pattern: /\b(security|auth|jwt|oauth|mtls)\b/i, tag: 'security' },
      { pattern: /\b(frontend|ui|ux|react|vue|component)\b/i, tag: 'frontend' },
      { pattern: /\b(ci|cd|pipeline|jenkins|github actions)\b/i, tag: 'ci-cd' },
      { pattern: /\b(monitor|observ|telemetry|logging|metric)\b/i, tag: 'observability' },
      { pattern: /\b(migrat|deprecat)\b/i, tag: 'migration' },
      { pattern: /\b(microservice|service mesh|decompos)\b/i, tag: 'architecture' },
      { pattern: /\b(cache|caching|redis|memcache)\b/i, tag: 'caching' }
    ];

    tagPatterns.forEach(({ pattern, tag }) => {
      if (pattern.test(content) && !tags.includes(tag)) tags.push(tag);
    });

    return tags;
  }

  function updateDecisionStatus(decisionId, newStatus, actor, reason) {
    const decision = _decisions.find(d => d.id === decisionId);
    if (!decision) return null;

    const previousStatus = decision.status;
    decision.status = newStatus;

    if (newStatus === 'CONFIRMED') {
      decision.confirmedBy = actor;
      decision.confirmedAt = new Date().toISOString();
    }

    Utils.saveToStorage('decisions', _decisions);
    Utils.emit('decision:statusChanged', { decisionId, previousStatus, newStatus, actor, reason });
    return decision;
  }

  function getRules() { return EXTRACTION_RULES; }
  function getImpactRules() { return IMPACT_RULES; }

  function getStats() {
    return {
      total: _decisions.length,
      extracted: _decisions.filter(d => d.status === 'EXTRACTED').length,
      confirmed: _decisions.filter(d => d.status === 'CONFIRMED').length,
      rejected: _decisions.filter(d => d.status === 'REJECTED').length,
      highImpact: _decisions.filter(d => d.impact === 'HIGH').length,
      mediumImpact: _decisions.filter(d => d.impact === 'MEDIUM').length,
      lowImpact: _decisions.filter(d => d.impact === 'LOW').length,
      avgConfidence: _decisions.length > 0
        ? Math.round((_decisions.reduce((s, d) => s + d.confidence, 0) / _decisions.length) * 100) / 100
        : 0
    };
  }

  function clearDecisions() {
    _decisions = [];
    _decisionCounter = 0;
    Utils.saveToStorage('decisions', _decisions);
    Utils.emit('decisions:cleared');
  }

  return {
    initialize, extractFromDocuments,
    getDecisions, getDecisionById, updateDecisionStatus,
    getRules, getImpactRules, getStats, clearDecisions
  };
})();
