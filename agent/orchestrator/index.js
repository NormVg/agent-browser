import { Planner, STATIC_ACTIONS } from '../planner/index.js';
import { BrowserRuntime } from '../browser/index.js';
import { Memory } from '../memory/index.js';
import { VisionObserver } from '../vision/index.js';
import { SessionLogger } from '../logger/index.js';
import chalk from 'chalk';

export class Orchestrator {
  constructor(opts = {}) {
    this.planner = new Planner();
    this.browser = new BrowserRuntime();
    this.memory = new Memory();
    this.vision = new VisionObserver();
    this.logger = new SessionLogger();
    this.askUserFn = opts.askUserFn || null;
    this._lastVisualContext = '';
    this._lastUrl = '';
  }

  async promptUser(question) {
    if (this.askUserFn) return this.askUserFn(question);
    console.log(chalk.yellow(`[Agent] Wanted to ask: "${question}" — skipping (no stdin)`));
    return '(no answer available)';
  }

  buildPartialReport(goal, reason) {
    const history = this.memory.getHistory(20);
    const states = this.memory.states;
    const visitedUrls = [...new Set(states.map(s => s.url).filter(u => u && u !== 'unknown' && u !== 'about:blank'))];
    const actionsLog = history.filter(e => e.action?.action !== 'error').map(e => {
      const a = e.action;
      if (a.action === 'navigate') return `Navigated to: ${a.url}`;
      if (a.action === 'click') return `Clicked #${a.elementId}`;
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

  async executeAction(action) {
    console.log(chalk.magenta(`  ➤ ${JSON.stringify(action)}`));
    this.memory.logAction(action);

    try {
      switch (action.action) {
        case 'navigate':
          await this.browser.navigate(action.url);
          return this._verify(action);

        case 'click':
          if (!action.elementId) throw new Error('Missing elementId');
          await this.browser.click(String(action.elementId));
          return this._verify(action);

        case 'type':
          if (!action.elementId || action.text === undefined) throw new Error('Missing elementId or text');
          await this.browser.type(String(action.elementId), action.text);
          return this._verify(action);

        case 'selectOption':
          if (!action.elementId || !action.value) throw new Error('Missing elementId or value');
          await this.browser.selectOption(String(action.elementId), action.value);
          return this._verify(action);

        case 'pressEnter':
          await this.browser.pressEnter();
          this.memory.logOutcome(true, 'Enter pressed');
          return 'ok';

        case 'scroll':
          await this.browser.scroll(action.direction || 'down');
          this.memory.logOutcome(true, `Scrolled ${action.direction || 'down'}`);
          return 'ok';

        case 'wait':
          await this.browser.wait(action.milliseconds || 1000);
          this.memory.logOutcome(true, `Waited ${action.milliseconds || 1000}ms`);
          return 'ok';

        case 'extract': {
          console.log(chalk.green(`  📋 ${action.instruction}`));
          const text = await this.browser.extractText();
          const summary = text ? text.substring(0, 800) : '(no text found)';
          console.log(chalk.dim(`  📄 Extracted ${summary.split('\n').length} items`));
          this.memory.logAction({ action: 'extractResult', data: summary });
          this.memory.logOutcome(true, `Extracted: ${summary.substring(0, 200)}`);
          this.logger.log('extract', { instruction: action.instruction, result: summary });
          return 'replan';
        }

        case 'askUser': {
          await this.browser.unlockPage();
          const ans = await this.promptUser(action.question);
          await this.browser.lockPage();
          this.memory.logAction({ action: 'userResponse', response: ans });
          this.memory.logOutcome(true, 'Got user answer');
          this.logger.log('askUser', { question: action.question, answer: ans });
          return 'replan';
        }

        case 'finish':
          await this.browser.unlockPage();
          console.log(chalk.green.bold(`\n🎉 Done: ${action.result}\n`));
          return 'finish';

        case 'error':
          console.log(chalk.red(`  ✗ Planner error: ${action.result}`));
          this.memory.logOutcome(false, `Planner error: ${action.result}`);
          return 'replan';

        default:
          console.log(chalk.yellow(`  ? Unknown: ${action.action}`));
          return 'ok';
      }
    } catch (e) {
      console.error(chalk.red(`  ✗ ${e.message}`));
      this.memory.logAction({ action: 'error', message: e.message });
      this.memory.logOutcome(false, e.message);
      this.logger.logError(action.action, e);
      return 'replan';
    }
  }

  async _verify(action) {
    const v = await this.browser.verifyAction(action);
    const icon = v.ok ? chalk.green('  ✓') : chalk.red('  ✗');
    console.log(`${icon} ${v.detail}`);
    this.memory.logOutcome(v.ok, v.detail);
    this.logger.logAction(action, v.ok ? 'ok' : 'failed', v.detail);
    return v.ok ? 'ok' : 'replan';
  }

  async observeDOM() {
    try {
      const state = await this.browser.observeState();
      this.memory.logState(state);
      return state;
    } catch (e) {
      return { url: 'unknown', title: '', elements: [] };
    }
  }

  async observe(goal = '', forceVision = false) {
    try {
      const state = await this.browser.observeState();
      this.memory.logState(state);
      const visible = state.elements.filter(e => e.inViewport).length;
      console.log(chalk.dim(`  👁  ${state.url} | ${visible} visible / ${state.elements.length} total`));
      this.logger.logObserve(state.url, state.elements.length, visible);

      const urlChanged = state.url !== this._lastUrl;
      if (urlChanged || forceVision) {
        this._lastUrl = state.url;
        try {
          const screenshot = await this.browser.captureScreenshot();
          this._lastVisualContext = await this.vision.analyze(screenshot, state.url, goal);
          this.logger.logVision(state.url, this._lastVisualContext);
        } catch (_) { }
      }

      return state;
    } catch (e) {
      console.warn(chalk.yellow(`  ⚠ Observe error: ${e.message}`));
      this.logger.logError('observe', e);
      return { url: 'unknown', title: '', elements: [] };
    }
  }

  async run(goal, maxSteps = 25, headless = true) {
    console.log(chalk.blue(`\n[Orchestrator] "${goal}"`));
    console.log(chalk.dim(`  chain-mode | rounds=${maxSteps} | headless=${headless}`));
    console.log(chalk.dim(`  📝 Log: ${this.logger.filePath}`));

    this.logger.log('start', { goal, maxSteps, headless });

    await this.browser.init(headless);
    await this.browser.lockPage();

    let round = 0;

    try {
      while (round < maxSteps) {
        round++;
        console.log(chalk.blue(`\n════ Round ${round}/${maxSteps} ════`));
        this.logger.logRound(round, maxSteps);

        const state = await this.observe(goal, round === 1);

        console.log(chalk.cyan('[Plan] Generating chain...'));
        let chain;
        try {
          chain = await this.planner.planChain(goal, this.memory, state, this._lastVisualContext);
        } catch (e) {
          this.logger.logError('planner', e);
          return this.buildPartialReport(goal, `Planner failed: ${e.message}`);
        }

        if (!chain || chain.length === 0) {
          return this.buildPartialReport(goal, 'Planner returned empty chain');
        }

        // Log the full planner interaction
        this.logger.logPlanner(
          this.memory.getStepLog(),
          JSON.stringify(chain),
          chain,
        );

        console.log(chalk.cyan(`[Chain] ${chain.length} step(s):`));
        chain.forEach((s, i) => {
          const detail = s.url ? ` → ${s.url}` : s.elementId ? ` #${s.elementId}` : s.result ? ` → "${s.result.substring(0, 50)}"` : '';
          console.log(chalk.dim(`  ${i + 1}. ${s.action}${detail}`));
        });

        let prevAction = null;
        for (let i = 0; i < chain.length; i++) {
          const action = chain[i];
          const isLast = i === chain.length - 1;
          console.log(chalk.dim(`\n  [${i + 1}/${chain.length}] ${action.action}`));

          if (['click', 'type', 'selectOption'].includes(action.action) && i > 0) {
            const prevChanged = prevAction && (
              prevAction.action === 'navigate' ||
              prevAction.action === 'scroll' ||
              prevAction.action === 'pressEnter' ||
              prevAction.action === 'wait'
            );
            if (prevChanged) {
              await this.observeDOM();
            }
          }

          const result = await this.executeAction(action);
          prevAction = action;

          if (result === 'finish') {
            this.logger.logEnd(goal, action.result);
            return action.result;
          }

          if (result === 'replan') break;

          if (!isLast) await this.browser.wait(200);
        }
      }

      const report = this.buildPartialReport(goal, `Max rounds (${maxSteps}) reached`);
      this.logger.logEnd(goal, report);
      return report;

    } catch (error) {
      console.error(chalk.red(`\n❌ Runtime error: ${error.message}\n`));
      this.logger.logError('runtime', error);
      this.logger.logEnd(goal, `Runtime error: ${error.message}`);
      return this.buildPartialReport(goal, `Runtime error: ${error.message}`);
    } finally {
      await this.browser.unlockPage();
      await this.browser.close();
    }
  }
}
