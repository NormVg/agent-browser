import { getModel } from '../../lib/ai.js';
import { generateText } from 'ai';
import chalk from 'chalk';
import config from '../../config.js';

// Steps that can run without any live page data (no elementId needed)
export const STATIC_ACTIONS = new Set(['navigate', 'wait', 'scroll', 'pressEnter']);

export class Planner {

  async planChain(goal, memory, pageState, visualContext = '') {
    const maxChain = config.browserAgent.maxChainLength;
    const elementsForContext = (pageState.elements || [])
      .filter(el => el.inViewport)
      .slice(0, 60);

    const stepLog = memory.getStepLog();

    const visualSection = visualContext
      ? `\n## VISUAL CONTEXT (screenshot analysis)\n${visualContext}\n`
      : '';

    const prompt = `You are oopsAI — an expert browser automation agent. You think step-by-step and act efficiently.

## GOAL
"${goal}"

## HISTORY
${stepLog || '(start — nothing done yet)'}

## PAGE
URL: ${pageState.url}
Title: "${pageState.title || ''}"

## ELEMENTS ON SCREEN
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
        : '(empty — scroll or wait)'}
${visualSection}
## ACTIONS
{"action":"navigate","url":"URL"}
{"action":"click","elementId":ID}
{"action":"type","elementId":ID,"text":"value"}
{"action":"selectOption","elementId":ID,"value":"option text"}
{"action":"pressEnter"}
{"action":"scroll","direction":"down|up"}
{"action":"wait","milliseconds":N}
{"action":"extract","instruction":"what to read from page"}
{"action":"askUser","question":"question for the human"}
{"action":"finish","result":"final summary"}

## URL SHORTCUTS (skip searching, go direct)
YouTube search: https://www.youtube.com/results?search_query=QUERY
Google search:  https://www.google.com/search?q=QUERY
Amazon search:  https://www.amazon.com/s?k=QUERY
Wikipedia:      https://en.wikipedia.org/wiki/QUERY
GitHub:         https://github.com/search?q=QUERY&type=repositories
Reddit:         https://www.reddit.com/search/?q=QUERY
Twitter/X:      https://x.com/search?q=QUERY
LinkedIn:       https://www.linkedin.com/search/results/all/?keywords=QUERY
(Replace spaces with + in QUERY)

## STRATEGY
- **Be efficient**: batch multiple actions per chain. Fill all visible form fields in one chain, don't do one-at-a-time.
- **Navigate smart**: use URL shortcuts. Construct direct URLs when possible (e.g. site.com/page#section).
- **Forms**: scan all visible fields, fill them ALL in one chain, then scroll for more.
  - For radio/checkbox: click the element.
  - For text inputs: type into them. Use realistic, professional language.
  - For dropdowns (<select>): use selectOption.
  - Airtable/Google Forms use role="radio", role="checkbox" — click to toggle.
- **Don't over-observe**: if you just scrolled, the next observe will show new fields. Plan scroll + actions together.
- **Extract wisely**: use extract ONLY when you need to read data and report back. Don't extract just to observe.
- **Never repeat failed actions**: if something failed, try a completely different approach.
- **Login/Auth**: NEVER type passwords. Use askUser to have the human log in.
- **Finish fast**: once the goal is done, immediately use finish.
- Max ${maxChain} steps per chain.

Output ONLY a JSON array. No markdown fences, no text.`;

    try {
      const res = await generateText({
        model: getModel(),
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: `Plan actions for: "${goal}"` },
        ],
        temperature: 0.1,
        maxTokens: 1200,
      });

      let text = res.text.trim();
      text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

      const match = text.match(/\[[\s\S]*\]/);
      if (match) text = match[0];

      const chain = JSON.parse(text);
      if (!Array.isArray(chain)) throw new Error('Not an array');

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
