import { Planner, STATIC_ACTIONS } from '../planner/index.js';
import { BrowserRuntime } from '../browser/index.js';
import { Memory } from '../memory/index.js';
import chalk from 'chalk';

export class Orchestrator {
  /**
   * @param {Object} opts
   * @param {Function} opts.askUserFn - callback(question) => Promise<string>
   *   Injected from chat.js to reuse the existing readline — avoids stdin conflicts.
   */
  constructor(opts = {}) {
    this.planner = new Planner();
    this.browser = new BrowserRuntime();
    this.memory = new Memory();
    this.askUserFn = opts.askUserFn || null;
  }

  async promptUser(question) {
    if (this.askUserFn) {
      return this.askUserFn(question);
    }
    // No callback — can't ask the user, return a fallback
    console.log(chalk.yellow(`[Agent] Wanted to ask: "${question}" — skipping (no stdin access)`));
    return '(no answer available)';
  }

  buildPartialReport(goal, reason) {
    const history = this.memory.getHistory(20);
    const states = this.memory.states;
    const visitedUrls = [...new Set(states.map(s => s.url).filter(u => u && u !== 'unknown' && u !== 'about:blank'))];
    const actionsLog = history.filter(e => e.action?.action !== 'error').map(e => {
      const a = e.action;
      if (a.action === 'navigate') return `Navigated to: ${a.url}`;
      if (a.action === 'click') return `Clicked element #${a.elementId}`;
      if (a.action === 'type') return `Typed "${a.text}" into #${a.elementId}`;
      if (a.action === 'pressEnter') return `Pressed Enter`;
      if (a.action === 'scroll') return `Scrolled ${a.direction}`;
      if (a.action === 'extract') return `Extracted: ${a.instruction}`;
      if (a.action === 'userResponse') return `User replied: ${a.response}`;
      if (a.action === 'finish') return `Finished: ${a.result}`;
      return null;
    }).filter(Boolean);
    const errors = history.filter(e => e.action?.action === 'error').map(e => e.action.message || e.action.result).filter(Boolean);

    let report = `⚠️ Agent stopped: ${reason}\n\nGoal: "${goal}"\n`;
    if (visitedUrls.length > 0) report += `\nPages visited:\n${visitedUrls.map(u => `  • ${u}`).join('\n')}`;
    if (actionsLog.length > 0) report += `\n\nActions taken:\n${actionsLog.map(a => `  • ${a}`).join('\n')}`;
    if (errors.length > 0) report += `\n\nErrors:\n${errors.map(e => `  ⚠ ${e}`).join('\n')}`;
    if (visitedUrls.length === 0 && actionsLog.length === 0) report += '\n\nNo actions completed.';
    return report;
  }

  /**
   * Execute a single action object.
   * Returns: 'finish' | 'replan' | 'ok' | 'fatal'
   */
  async executeAction(action) {
    console.log(chalk.magenta(`  ➤ ${JSON.stringify(action)}`));
    this.memory.logAction(action);

    try {
      switch (action.action) {
        case 'navigate':
          await this.browser.navigate(action.url);
          {
            const v = await this.browser.verifyAction(action);
            console.log(v.ok ? chalk.green(`  ✓ ${v.detail}`) : chalk.red(`  ✗ ${v.detail}`));
            this.memory.logOutcome(v.ok, v.detail);
            if (!v.ok) return 'replan';
          }
          return 'ok';

        case 'click':
          if (!action.elementId) throw new Error("Missing elementId for click");
          await this.browser.click(String(action.elementId));
          {
            const v = await this.browser.verifyAction(action);
            console.log(v.ok ? chalk.green(`  ✓ ${v.detail}`) : chalk.red(`  ✗ ${v.detail}`));
            this.memory.logOutcome(v.ok, v.detail);
            if (!v.ok) return 'replan';
          }
          return 'ok';

        case 'type':
          if (!action.elementId || action.text === undefined) throw new Error("Missing elementId or text for type");
          await this.browser.type(String(action.elementId), action.text);
          {
            const v = await this.browser.verifyAction(action);
            console.log(v.ok ? chalk.green(`  ✓ ${v.detail}`) : chalk.red(`  ✗ ${v.detail}`));
            this.memory.logOutcome(v.ok, v.detail);
            if (!v.ok) return 'replan';
          }
          return 'ok';

        case 'selectOption':
          if (!action.elementId || !action.value) throw new Error("Missing elementId or value for selectOption");
          await this.browser.selectOption(String(action.elementId), action.value);
          {
            const v = await this.browser.verifyAction(action);
            console.log(v.ok ? chalk.green(`  ✓ ${v.detail}`) : chalk.red(`  ✗ ${v.detail}`));
            this.memory.logOutcome(v.ok, v.detail);
            if (!v.ok) return 'replan';
          }
          return 'ok';

        case 'pressEnter':
          await this.browser.pressEnter();
          this.memory.logOutcome(true, 'Enter pressed');
          return 'ok';

        case 'scroll':
          await this.browser.scroll(action.direction || 'down');
          this.memory.logOutcome(true, `Scrolled ${action.direction || 'down'}`);
          return 'ok';

        case 'wait': {
          const ms = action.milliseconds || 1500;
          console.log(chalk.dim(`  ⏳ ${ms}ms...`));
          await this.browser.wait(ms);
          this.memory.logOutcome(true, `Waited ${ms}ms`);
          return 'ok';
        }

        case 'extract':
          console.log(chalk.green(`  📋 ${action.instruction}`));
          this.memory.logOutcome(true, 'Extract noted');
          // Re-observe + re-plan after extract so planner can read fresh data
          return 'replan';

        case 'askUser': {
          const ans = await this.promptUser(action.question);
          this.memory.logAction({ action: 'userResponse', response: ans });
          this.memory.logOutcome(true, 'Got user answer');
          return 'replan';
        }

        case 'finish':
          console.log(chalk.green.bold(`\n🎉 Goal completed: ${action.result}\n`));
          return 'finish';

        case 'error':
          console.log(chalk.red(`  ✗ Planner error: ${action.result}`));
          this.memory.logOutcome(false, `Planner error: ${action.result}`);
          return 'replan';

        default:
          console.log(chalk.yellow(`  ? Unknown action: ${action.action}`));
          return 'ok';
      }
    } catch (e) {
      console.error(chalk.red(`  ✗ Failed: ${e.message}`));
      this.memory.logAction({ action: 'error', message: e.message });
      this.memory.logOutcome(false, e.message);
      return 'replan'; // Failure → re-plan, don't die
    }
  }

  async observe() {
    try {
      const state = await this.browser.observeState();
      this.memory.logState(state);
      console.log(chalk.dim(`  👁  ${state.url} | ${state.elements.length} elements`));
      return state;
    } catch (e) {
      console.warn(chalk.yellow(`  ⚠ Observe error: ${e.message}`));
      return { url: 'unknown', title: '', elements: [] };
    }
  }

  /**
   * Chain-based execution loop.
   *
   * stepCount = number of planning rounds (observe + planChain = 1 round).
   * Each round runs a full chain of actions without any LLM calls between them.
   * Re-planning only triggered by: failure, extract, askUser, or explicit finish.
   *
   * ✅ Early exit: returns as soon as 'finish' is hit — never exhausts all rounds.
   */
  async run(goal, maxSteps = 25, headless = true) {
    console.log(chalk.blue(`\n[Orchestrator] "${goal}"`));
    console.log(chalk.dim(`  chain-mode | rounds=${maxSteps} | headless=${headless}`));

    await this.browser.init(headless);

    let round = 0;

    try {
      while (round < maxSteps) {
        round++;
        console.log(chalk.blue(`\n════ Round ${round}/${maxSteps} ════`));

        // ── OBSERVE (once per round, not per action) ──
        const state = await this.observe();

        // ── PLAN: get full chain ──
        console.log(chalk.cyan('[Plan]  Generating chain...'));
        let chain;
        try {
          chain = await this.planner.planChain(goal, this.memory, state);
        } catch (e) {
          return this.buildPartialReport(goal, `Planner failed: ${e.message}`);
        }

        if (!chain || chain.length === 0) {
          return this.buildPartialReport(goal, 'Planner returned empty chain');
        }

        console.log(chalk.cyan(`[Chain] ${chain.length} action(s):`));
        chain.forEach((s, i) => console.log(chalk.dim(`        ${i + 1}. ${s.action}${s.url ? ' → ' + s.url : s.elementId ? ' #' + s.elementId : s.result ? ' → "' + s.result.substring(0, 60) + '"' : ''}`)));

        // ── EXECUTE CHAIN ──
        let shouldReplan = false;
        for (let i = 0; i < chain.length; i++) {
          const action = chain[i];
          const isLast = i === chain.length - 1;
          console.log(chalk.dim(`\n  [${i + 1}/${chain.length}] ${action.action}`));

          // For click/type/selectOption: refresh observation right before to get live element IDs
          if (['click', 'type', 'selectOption'].includes(action.action) && i > 0) {
            await this.observe();
          }

          const result = await this.executeAction(action);

          if (result === 'finish') {
            return action.result; // ✅ Early exit — done!
          }

          if (result === 'replan') {
            shouldReplan = true;
            break; // Break chain, outer loop will re-observe + re-plan
          }

          // Smooth delay between actions to prevent UI jerking
          if (!isLast) {
            await this.browser.wait(500);
          }
        }

        if (!shouldReplan && chain.every(a => a.action !== 'finish')) {
          // Chain ran to completion without a finish — check if goal is done
          // The next round's observe+plan will decide
        }
      }

      return this.buildPartialReport(goal, `Max rounds (${maxSteps}) reached`);

    } catch (error) {
      console.error(chalk.red(`\n❌ Runtime error: ${error.message}\n`));
      return this.buildPartialReport(goal, `Runtime error: ${error.message}`);
    } finally {
      await this.browser.close();
    }
  }
}
