export class Memory {
  constructor() {
    this.trace = []; // Ordered log of {type, data} entries
  }

  /**
   * Log a page observation.
   */
  logState(pageState) {
    this.trace.push({
      type: 'observe',
      url: pageState.url,
      title: pageState.title || '',
      elementCount: pageState.elements?.length ?? 0,
      at: new Date().toISOString(),
    });
  }

  /**
   * Log an action the agent decided to take.
   */
  logAction(action) {
    this.trace.push({
      type: 'action',
      action,
      at: new Date().toISOString(),
    });
  }

  /**
   * Log the outcome of an action — success or failure.
   */
  logOutcome(success, detail = '') {
    this.trace.push({
      type: success ? 'success' : 'failure',
      detail,
      at: new Date().toISOString(),
    });
  }

  /**
   * Get a compact step log for the planner.
   * Last observe + last 8 action/outcome pairs — capped to avoid prompt bloat.
   */
  getStepLog() {
    // Always show the most recent observation
    const lastObserve = [...this.trace].reverse().find(e => e.type === 'observe');
    // Last 12 action + outcome pairs
    const recent = this.trace
      .filter(e => e.type === 'action' || e.type === 'success' || e.type === 'failure')
      .slice(-24); // 12 pairs max

    const entries = lastObserve ? [lastObserve, ...recent] : recent;

    return entries.map(entry => {
      if (entry.type === 'observe') {
        return `🌐 Page: ${entry.url} | "${entry.title}" | ${entry.elementCount} elements`;
      }
      if (entry.type === 'action') {
        const a = entry.action;
        if (a.action === 'navigate') return `➡️  navigate → ${a.url}`;
        if (a.action === 'click') return `🖱️  click #${a.elementId}`;
        if (a.action === 'type') return `⌨️  type "${a.text}" → #${a.elementId}`;
        if (a.action === 'pressEnter') return `↩️  pressEnter`;
        if (a.action === 'scroll') return `🔽 scroll ${a.direction}`;
        if (a.action === 'wait') return `⏳ wait ${a.milliseconds}ms`;
        if (a.action === 'extract') return `📋 extract: ${a.instruction}`;
        if (a.action === 'extractResult') return `📄 FOUND:\n${a.data}`;
        if (a.action === 'askUser') return `❓ asked: ${a.question}`;
        if (a.action === 'userResponse') return `💬 user: ${a.response}`;
        if (a.action === 'finish') return `✅ finish: ${a.result}`;
        if (a.action === 'error') return `⚠️  error: ${a.result || a.message}`;
        return `➤  ${JSON.stringify(a)}`;
      }
      if (entry.type === 'success') return `✓  ${entry.detail}`;
      if (entry.type === 'failure') return `✗  FAILED: ${entry.detail}`;
      return '';
    }).filter(Boolean).join('\n');
  }

  /**
   * Expose raw states for partial report building.
   */
  get states() {
    return this.trace.filter(e => e.type === 'observe');
  }

  /**
   * Expose raw history for partial report building.
   */
  getHistory(limit = 20) {
    return this.trace.filter(e => e.type === 'action').slice(-limit);
  }

  clear() {
    this.trace = [];
  }
}
