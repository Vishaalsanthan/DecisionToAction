// ─── Utility Functions ───────────────────────────────────────────────
// UUID generation, date formatting, storage helpers, event bus

const Utils = (() => {
  // UUID v4 generator
  function generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  // Date formatting
  function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function formatDateTime(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  function formatRelativeTime(dateStr) {
    const now = new Date();
    const d = new Date(dateStr);
    const diff = now - d;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 30) return `${days}d ago`;
    return formatDate(dateStr);
  }

  function daysUntil(dateStr) {
    const now = new Date();
    const d = new Date(dateStr);
    return Math.ceil((d - now) / 86400000);
  }

  // LocalStorage helpers
  function saveToStorage(key, data) {
    try {
      localStorage.setItem(`d2a_${key}`, JSON.stringify(data));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }

  function loadFromStorage(key) {
    try {
      const data = localStorage.getItem(`d2a_${key}`);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.warn('LocalStorage load failed:', e);
      return null;
    }
  }

  function clearStorage() {
    Object.keys(localStorage)
      .filter(k => k.startsWith('d2a_'))
      .forEach(k => localStorage.removeItem(k));
  }

  // Simple Event Bus
  const _listeners = {};

  function on(event, callback) {
    if (!_listeners[event]) _listeners[event] = [];
    _listeners[event].push(callback);
  }

  function off(event, callback) {
    if (!_listeners[event]) return;
    _listeners[event] = _listeners[event].filter(cb => cb !== callback);
  }

  function emit(event, data) {
    if (!_listeners[event]) return;
    _listeners[event].forEach(cb => cb(data));
  }

  // Confidence helpers
  function confidenceLabel(score) {
    if (score >= 0.9) return 'Very High';
    if (score >= 0.7) return 'High';
    if (score >= 0.5) return 'Medium';
    return 'Low';
  }

  function confidenceColor(score) {
    if (score >= 0.9) return 'var(--success)';
    if (score >= 0.7) return 'var(--accent-primary)';
    if (score >= 0.5) return 'var(--warning)';
    return 'var(--danger)';
  }

  function impactColor(impact) {
    switch (impact) {
      case 'HIGH': return 'var(--danger)';
      case 'MEDIUM': return 'var(--warning)';
      case 'LOW': return 'var(--success)';
      default: return 'var(--text-muted)';
    }
  }

  function statusColor(status) {
    switch (status) {
      case 'CONFIRMED': case 'COMPLETED': return 'var(--success)';
      case 'PENDING_CONFIRM': case 'IN_PROGRESS': return 'var(--warning)';
      case 'REJECTED': case 'OVERDUE': return 'var(--danger)';
      case 'ROLLED_BACK': return 'var(--accent-secondary)';
      default: return 'var(--text-muted)';
    }
  }

  function statusLabel(status) {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  // Truncate text
  function truncate(text, maxLen = 120) {
    if (!text || text.length <= maxLen) return text;
    return text.substring(0, maxLen) + '…';
  }

  // Debounce
  function debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  // Animate number counter
  function animateCounter(element, target, duration = 1000) {
    const start = parseInt(element.textContent) || 0;
    const startTime = performance.now();
    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (target - start) * eased);
      element.textContent = current;
      if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  }

  return {
    generateId, formatDate, formatDateTime, formatRelativeTime, daysUntil,
    saveToStorage, loadFromStorage, clearStorage,
    on, off, emit,
    confidenceLabel, confidenceColor, impactColor, statusColor, statusLabel,
    truncate, debounce, animateCounter
  };
})();
