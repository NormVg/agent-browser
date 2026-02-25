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
   * Retrieve the last N trace entries formatted as a readable
   * conversational step log for the planner.
   */
  getStepLog(limit = 12) {
    return this.trace.slice(-limit).map(entry => {
      if (entry.type === 'observe') {
        return `🌐 Page: ${entry.url} | "${entry.title}" | ${entry.elementCount} elements`;
      }
      if (entry.type === 'action') {
        const a = entry.action;
        if (a.action === 'navigate') return `➡️  Action: navigate to ${a.url}`;
        if (a.action === 'click') return `🖱️  Action: click element #${a.elementId}`;
        if (a.action === 'type') return `⌨️  Action: type "${a.text}" into #${a.elementId}`;
        if (a.action === 'pressEnter') return `↩️  Action: press Enter`;
        if (a.action === 'scroll') return `🔽 Action: scroll ${a.direction}`;
        if (a.action === 'wait') return `⏳ Action: wait ${a.milliseconds}ms`;
        if (a.action === 'extract') return `📋 Action: extract — ${a.instruction}`;
        if (a.action === 'askUser') return `❓ Action: asked user — ${a.question}`;
        if (a.action === 'userResponse') return `💬 User said: ${a.response}`;
        if (a.action === 'finish') return `✅ Action: finish — ${a.result}`;
        if (a.action === 'error') return `⚠️  Planner error: ${a.result || a.message}`;
        return `➤  Action: ${JSON.stringify(a)}`;
      }
      if (entry.type === 'success') return `✓  Succeeded${entry.detail ? ': ' + entry.detail : ''}`;
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
