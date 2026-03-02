import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGS_DIR = path.join(__dirname, '..', 'logs');

/**
 * Session logger — writes all AI interactions to a timestamped JSON log file.
 * One file per agent run. Can be reviewed later for debugging/research.
 */
export class SessionLogger {
  constructor() {
    if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });

    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    this.file = path.join(LOGS_DIR, `session-${ts}.json`);
    this.entries = [];
    this.startTime = Date.now();
  }

  /**
   * Log any event with a type and payload.
   */
  log(type, data) {
    const entry = {
      type,
      time: new Date().toISOString(),
      elapsed: `${((Date.now() - this.startTime) / 1000).toFixed(1)}s`,
      ...data,
    };
    this.entries.push(entry);
    this._flush();
  }

  /** Log planner prompt + response */
  logPlanner(prompt, response, chain) {
    this.log('planner', {
      prompt: prompt.substring(0, 3000),
      response: response.substring(0, 2000),
      chain,
    });
  }

  /** Log vision analysis */
  logVision(url, description) {
    this.log('vision', { url, description });
  }

  /** Log an action execution + result */
  logAction(action, result, detail = '') {
    this.log('action', { action, result, detail });
  }

  /** Log observe state summary */
  logObserve(url, elementCount, visibleCount) {
    this.log('observe', { url, elementCount, visibleCount });
  }

  /** Log errors */
  logError(context, error) {
    this.log('error', { context, message: error.message || error });
  }

  /** Log round start */
  logRound(round, maxRounds) {
    this.log('round', { round, maxRounds });
  }

  /** Log the full session summary at the end */
  logEnd(goal, result) {
    this.log('end', {
      goal,
      result: typeof result === 'string' ? result.substring(0, 1000) : result,
      totalEntries: this.entries.length,
      duration: `${((Date.now() - this.startTime) / 1000).toFixed(1)}s`,
    });
    this._flush();
  }

  /** Write to disk */
  _flush() {
    try {
      fs.writeFileSync(this.file, JSON.stringify(this.entries, null, 2));
    } catch (_) { }
  }

  get filePath() {
    return this.file;
  }
}
