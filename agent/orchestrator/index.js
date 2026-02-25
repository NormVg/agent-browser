import { Planner } from '../planner/index.js';
import { BrowserRuntime } from '../browser/index.js';
import { Memory } from '../memory/index.js';
import chalk from 'chalk';
import readline from 'readline';

export class Orchestrator {
  constructor() {
    this.planner = new Planner();
    this.browser = new BrowserRuntime();
    this.memory = new Memory();
  }

  /**
   * Prompt the user for input mid-execution (e.g., CAPTCHA, login).
   */
  async promptUser(question) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    console.log(chalk.yellow(`\n[Agent Question] ${question}`));
    return new Promise((resolve) => {
      rl.question(chalk.cyan('You ❯ '), (answer) => {
        rl.close();
        resolve(answer);
      });
    });
  }

  /**
   * Build a partial summary from everything collected so far,
   * so even incomplete runs return useful info.
   */
  buildPartialReport(goal, reason) {
    const history = this.memory.getHistory(20);
    const states = this.memory.states;

    const visitedUrls = [...new Set(states.map(s => s.url).filter(u => u && u !== 'unknown' && u !== 'about:blank'))];
    const actionsLog = history
      .filter(e => e.action && e.action.action !== 'error')
      .map(e => {
        const a = e.action;
        if (a.action === 'navigate') return `Navigated to: ${a.url}`;
        if (a.action === 'click') return `Clicked element #${a.elementId}`;
        if (a.action === 'type') return `Typed "${a.text}" into element #${a.elementId}`;
        if (a.action === 'pressEnter') return `Pressed Enter`;
        if (a.action === 'scroll') return `Scrolled ${a.direction}`;
        if (a.action === 'extract') return `Extracted: ${a.instruction}`;
        if (a.action === 'userResponse') return `User replied: ${a.response}`;
        if (a.action === 'finish') return `Finished: ${a.result}`;
        return null;
      })
      .filter(Boolean);

    const errors = history
      .filter(e => e.action?.action === 'error')
      .map(e => e.action.message || e.action.result)
      .filter(Boolean);

    let report = `⚠️ Agent stopped: ${reason}\n\nGoal: "${goal}"\n`;

    if (visitedUrls.length > 0) {
      report += `\nPages visited:\n${visitedUrls.map(u => `  • ${u}`).join('\n')}`;
    }

    if (actionsLog.length > 0) {
      report += `\n\nActions taken:\n${actionsLog.map(a => `  • ${a}`).join('\n')}`;
    }

    if (errors.length > 0) {
      report += `\n\nErrors encountered:\n${errors.map(e => `  ⚠ ${e}`).join('\n')}`;
    }

    if (visitedUrls.length === 0 && actionsLog.length === 0) {
      report += '\n\nNo actions were completed — the agent could not start.';
    }

    return report;
  }

  /**
   * Run the Observe → Plan → Act loop.
   * @param {string} goal - The natural-language task to complete.
   * @param {number} maxSteps - Maximum iterations before giving up.
   * @param {boolean} headless - Whether to run the browser visibly.
   */
  async run(goal, maxSteps = 15, headless = true) {
    console.log(chalk.blue(`\n[Orchestrator] Starting goal: "${goal}"`));
    console.log(chalk.dim(`[Orchestrator] headless=${headless} | maxSteps=${maxSteps}`));

    await this.browser.init(headless);

    let stepCount = 0;

    try {
      while (stepCount < maxSteps) {
        stepCount++;
        console.log(chalk.dim(`\n--- Step ${stepCount}/${maxSteps} ---`));

        // OBSERVE
        let state;
        try {
          state = await this.browser.observeState();
          this.memory.logState(state);
          console.log(chalk.dim(`[Observer] ${state.url} | ${state.elements.length} elements`));
        } catch (e) {
          console.warn('[Observer] Error observing page:', e.message);
          state = { url: 'unknown', title: '', elements: [] };
        }

        // PLAN
        console.log(chalk.dim('[Planner]  Thinking...'));
        let action;
        try {
          action = await this.planner.decideNextAction(goal, this.memory, state);
        } catch (e) {
          console.error('[Planner]  Failed:', e.message);
          return this.buildPartialReport(goal, `Planner error: ${e.message}`);
        }

        if (!action || !action.action) {
          console.log(chalk.red('[Error] Invalid action from planner.'));
          return this.buildPartialReport(goal, 'Planner returned an invalid action');
        }

        console.log(chalk.magenta(`[Action]   => ${JSON.stringify(action)}`));
        this.memory.logAction(action);

        // ACT
        try {
          switch (action.action) {
            case 'navigate':
              await this.browser.navigate(action.url);
              this.memory.logOutcome(true, `Loaded ${action.url}`);
              break;

            case 'click':
              if (!action.elementId) throw new Error("Missing 'elementId' for click");
              await this.browser.click(action.elementId);
              this.memory.logOutcome(true, `Clicked element #${action.elementId}`);
              break;

            case 'type':
              if (!action.elementId || action.text === undefined) throw new Error("Missing 'elementId' or 'text' for type");
              await this.browser.type(action.elementId, action.text);
              this.memory.logOutcome(true, `Typed into #${action.elementId}`);
              break;

            case 'pressEnter':
              await this.browser.pressEnter();
              this.memory.logOutcome(true, 'Enter pressed');
              break;

            case 'scroll':
              await this.browser.scroll(action.direction || 'down');
              this.memory.logOutcome(true, `Scrolled ${action.direction || 'down'}`);
              break;

            case 'wait': {
              const ms = action.milliseconds || 2000;
              console.log(chalk.dim(`[Wait]     ${ms}ms...`));
              await this.browser.wait(ms);
              this.memory.logOutcome(true, `Waited ${ms}ms`);
              break;
            }

            case 'extract':
              console.log(chalk.green(`[Extract]  ${action.instruction}`));
              this.memory.logOutcome(true, `Extract logged — planner reads next observation`);
              break;

            case 'askUser': {
              const userAnswer = await this.promptUser(action.question);
              this.memory.logAction({ action: 'userResponse', response: userAnswer });
              this.memory.logOutcome(true, 'Got user answer');
              break;
            }

            case 'finish':
              console.log(chalk.green.bold(`\n🎉 [Goal Completed] ${action.result}\n`));
              return action.result;

            case 'error':
              console.log(chalk.red(`[Planner Error] ${action.result}`));
              this.memory.logAction({ action: 'error', message: action.result });
              this.memory.logOutcome(false, `Planner gave error: ${action.result}`);
              break;

            default:
              console.log(chalk.yellow(`[Warning] Unknown action: ${action.action}`));
          }
        } catch (actionError) {
          console.error(chalk.red(`[Action Error] ${actionError.message}`));
          this.memory.logAction({ action: 'error', message: actionError.message });
          this.memory.logOutcome(false, actionError.message);
        }

        // Brief pause between actions
        await this.browser.wait(800);
      }

      // Max steps hit — return partial report instead of null
      console.log(chalk.yellow(`\n⚠️  [Max Steps Reached] Agent stopped after ${maxSteps} steps.\n`));
      return this.buildPartialReport(goal, `Max steps (${maxSteps}) reached`);

    } catch (error) {
      console.error(chalk.red.bold(`\n❌ [Runtime Error] ${error.message}\n`));
      return this.buildPartialReport(goal, `Runtime error: ${error.message}`);
    } finally {
      await this.browser.close();
    }
  }
}
