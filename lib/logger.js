import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGS_DIR = path.join(__dirname, '../logs');

/**
 * Professional logging system with file output
 * Logs conversations, tool calls, errors, and system events
 */
class Logger {
  constructor() {
    this.sessionId = Date.now();
    this.logFile = path.join(LOGS_DIR, `session-${this.sessionId}.log`);
    this.jsonFile = path.join(LOGS_DIR, `session-${this.sessionId}.json`);
    this.conversationLog = [];
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;

    try {
      await fs.mkdir(LOGS_DIR, { recursive: true });

      // Write initial session header
      const header = this.formatHeader();
      await fs.writeFile(this.logFile, header);

      this.initialized = true;
    } catch (err) {
      console.error('Failed to initialize logger:', err.message);
    }
  }

  formatHeader() {
    const now = new Date();
    return `
╔════════════════════════════════════════════════════════════════╗
║                    OOPS AI CONVERSATION LOG                     ║
╠════════════════════════════════════════════════════════════════╣
║ Session ID: ${this.sessionId.toString().padEnd(48)}║
║ Started:    ${now.toLocaleString().padEnd(48)}║
╚════════════════════════════════════════════════════════════════╝

`;
  }

  formatTimestamp() {
    const now = new Date();
    return `[${now.toLocaleTimeString()}]`;
  }

  formatSection(title, width = 64) {
    const padding = Math.floor((width - title.length - 2) / 2);
    const leftPad = '─'.repeat(padding);
    const rightPad = '─'.repeat(width - padding - title.length - 2);
    return `\n${leftPad} ${title} ${rightPad}\n`;
  }

  async logUser(message) {
    await this.init();

    const timestamp = this.formatTimestamp();
    const section = this.formatSection('USER');
    const content = `${timestamp} ${section}${message}\n`;

    await this.append(content);

    this.conversationLog.push({
      timestamp: new Date().toISOString(),
      role: 'user',
      message: message
    });
  }

  async logAssistant(message) {
    await this.init();

    const timestamp = this.formatTimestamp();
    const section = this.formatSection('ASSISTANT');
    const content = `${timestamp} ${section}${message}\n`;

    await this.append(content);

    this.conversationLog.push({
      timestamp: new Date().toISOString(),
      role: 'assistant',
      message: message
    });
  }

  async logToolCall(toolName, args) {
    await this.init();

    const timestamp = this.formatTimestamp();
    const section = this.formatSection(`TOOL: ${toolName}`);
    const argsFormatted = JSON.stringify(args, null, 2);
    const content = `${timestamp} ${section}Arguments:\n${argsFormatted}\n`;

    await this.append(content);

    this.conversationLog.push({
      timestamp: new Date().toISOString(),
      type: 'tool_call',
      toolName: toolName,
      arguments: args
    });
  }

  async logToolResult(toolName, result) {
    await this.init();

    const timestamp = this.formatTimestamp();
    const section = this.formatSection(`RESULT: ${toolName}`);
    const resultFormatted = typeof result === 'string'
      ? result
      : JSON.stringify(result, null, 2);
    const content = `${timestamp} ${section}${resultFormatted}\n`;

    await this.append(content);

    this.conversationLog.push({
      timestamp: new Date().toISOString(),
      type: 'tool_result',
      toolName: toolName,
      result: result
    });
  }

  async logError(error, context = '') {
    await this.init();

    const timestamp = this.formatTimestamp();
    const section = this.formatSection('ERROR');
    const content = `${timestamp} ${section}Context: ${context}\nError: ${error.message}\nStack: ${error.stack}\n`;

    await this.append(content);

    this.conversationLog.push({
      timestamp: new Date().toISOString(),
      type: 'error',
      context: context,
      error: error.message,
      stack: error.stack
    });
  }

  async logSystem(message) {
    await this.init();

    const timestamp = this.formatTimestamp();
    const section = this.formatSection('SYSTEM');
    const content = `${timestamp} ${section}${message}\n`;

    await this.append(content);

    this.conversationLog.push({
      timestamp: new Date().toISOString(),
      type: 'system',
      message: message
    });
  }

  async append(content) {
    try {
      await fs.appendFile(this.logFile, content);
    } catch (err) {
      console.error('Failed to write log:', err.message);
    }
  }

  async saveJSON() {
    try {
      const jsonContent = JSON.stringify({
        sessionId: this.sessionId,
        startTime: new Date(this.sessionId).toISOString(),
        endTime: new Date().toISOString(),
        conversationLog: this.conversationLog
      }, null, 2);

      await fs.writeFile(this.jsonFile, jsonContent);
    } catch (err) {
      console.error('Failed to save JSON log:', err.message);
    }
  }

  async close() {
    await this.saveJSON();

    const footer = `\n${this.formatSection('SESSION ENDED')}\nEnded: ${new Date().toLocaleString()}\nTotal events: ${this.conversationLog.length}\n`;
    await this.append(footer);
  }
}

// Singleton instance
export const logger = new Logger();
