import { getModel } from '../../lib/ai.js';
import { generateText } from 'ai';
import chalk from 'chalk';
import config from '../../config.js';

// Steps that can run without any live page data (no elementId needed)
export const STATIC_ACTIONS = new Set(['navigate', 'wait', 'scroll', 'pressEnter']);

export class Planner {

  /**
   * CHAIN MODE — single LLM call that returns a JSON array of steps.
   * The model sees the goal, page state, and action history.
   */
  async planChain(goal, memory, pageState) {
    const maxChain = config.browserAgent.maxChainLength;
    const elementsForContext = (pageState.elements || [])
      .filter(el => el.inViewport)
      .slice(0, 50);

    const stepLog = memory.getStepLog();

    const prompt = `You are the brain of a Browser Agent. You decide what to do next.

## GOAL
"${goal}"

## HISTORY
${stepLog || '(first step — nothing done yet)'}

## CURRENT PAGE
URL: ${pageState.url}
Title: "${pageState.title || 'unknown'}"

## VISIBLE ELEMENTS
${elementsForContext.length > 0
        ? elementsForContext.map(el => {
          let d = `[${el.id}] ${el.tag}`;
          if (el.type) d += `[${el.type}]`;
          if (el.role) d += `(${el.role})`;
          d += ` "${el.text || el.ariaLabel || ''}"`;
          if (el.checked) d += ' ✓';
          if (el.href) d += ` → ${el.href}`;
          return d;
        }).join('\n')
        : '(none visible — scroll down or wait)'}

## ACTIONS
navigate  → {"action":"navigate","url":"URL"}
click     → {"action":"click","elementId":ID}
type      → {"action":"type","elementId":ID,"text":"value"}
select    → {"action":"selectOption","elementId":ID,"value":"option"}
enter     → {"action":"pressEnter"}
scroll    → {"action":"scroll","direction":"down"}
wait      → {"action":"wait","milliseconds":1500}
extract   → {"action":"extract","instruction":"what to read"}
ask       → {"action":"askUser","question":"what you need"}
done      → {"action":"finish","result":"summary of what was accomplished"}

## SHORTCUTS (use direct URLs to save steps)
YouTube:    https://www.youtube.com/results?search_query=QUERY
Google:     https://www.google.com/search?q=QUERY
Amazon:     https://www.amazon.com/s?k=QUERY
Wikipedia:  https://en.wikipedia.org/wiki/QUERY
(spaces → + in queries)

## RULES
1. Navigate first using shortcuts when possible.
2. Never repeat a failed action — try a different approach.
3. For forms: click radio/checkbox elements, type into inputs, selectOption for <select>.
4. Google Forms: radios show as role="radio", checkboxes as role="checkbox". Click to toggle.
5. NEVER enter passwords or login credentials. Use askUser for login, CAPTCHA, 2FA.
6. After filling visible form fields, scroll down for more before submitting.
7. Use finish when the goal is complete.
8. Plan ${maxChain} steps MAX per chain.

Respond with ONLY a JSON array. No markdown, no prose, no explanation.`;

    try {
      const res = await generateText({
        model: getModel(),
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: `Output your step chain as a JSON array for: "${goal}"` },
        ],
        temperature: 0.1,
        maxTokens: 800,
      });

      let text = res.text.trim();

      // Strip markdown fences
      text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

      // Extract JSON array
      const match = text.match(/\[[\s\S]*\]/);
      if (match) text = match[0];

      const chain = JSON.parse(text);
      if (!Array.isArray(chain)) throw new Error('Not an array');

      // Log the reasoning if the model prepended text before the array
      const preamble = res.text.substring(0, res.text.indexOf('[')).trim();
      if (preamble) console.log(chalk.yellow(`[Thinking] ${preamble.substring(0, 200)}`));

      return chain.slice(0, maxChain);

    } catch (error) {
      console.error('[Planner] Failed:', error.message);
      return [{ action: 'error', result: error.message }];
    }
  }

  async decideNextAction(goal, memory, pageState) {
    const chain = await this.planChain(goal, memory, pageState);
    return chain[0] || { action: 'error', result: 'Empty chain' };
  }
}
