import { getModel } from '../../lib/ai.js';
import { generateText } from 'ai';
import chalk from 'chalk';

// Steps that can run without any live page data (no elementId needed)
export const STATIC_ACTIONS = new Set(['navigate', 'wait', 'scroll', 'pressEnter']);

export class Planner {

  /**
   * CHAIN MODE — Ask the model for a sequence of steps upfront.
   * Returns an array of action objects.
   * Dynamic steps (click/type) are placeholders until re-plan.
   */
  async planChain(goal, memory, pageState) {
    const elementsForContext = (pageState.elements || [])
      .filter(el => el.inViewport)
      .slice(0, 40);

    const stepLog = memory.getStepLog();

    const prompt = `You are the brain of an autonomous Browser Agent.

## GOAL
"${goal}"

## WHAT HAS HAPPENED SO FAR
${stepLog || '(nothing yet — this is the first step)'}

## CURRENT PAGE
URL: ${pageState.url}
Title: "${pageState.title || 'unknown'}"

## VISIBLE ELEMENTS (only in viewport)
${elementsForContext.length > 0
        ? elementsForContext.map(el => {
          let desc = `  [${el.id}] ${el.tag}`;
          if (el.type) desc += `[${el.type}]`;
          if (el.role) desc += `(${el.role})`;
          desc += ` "${el.text || el.ariaLabel || ''}"`; if (el.checked) desc += ' ✓CHECKED';
          if (el.href) desc += ` → ${el.href}`;
          return desc;
        }).join('\n')
        : '  (none visible — page may still be loading)'}

## YOUR JOB
Output a JSON array of sequential steps to accomplish the goal.
Steps are executed in order. Stop planning once the goal is achievable or finished.
Plan UP TO 6 steps at a time — keep chains short and focused.

## AVAILABLE STEP TYPES
{"action": "navigate", "url": "https://..."}
{"action": "click", "elementId": "NUMERIC_ID"}
{"action": "type", "elementId": "NUMERIC_ID", "text": "text"}
{"action": "selectOption", "elementId": "NUMERIC_ID", "value": "option text"}
{"action": "pressEnter"}
{"action": "scroll", "direction": "down"}
{"action": "wait", "milliseconds": 1500}
{"action": "extract", "instruction": "what to extract"}
{"action": "askUser", "question": "question"}
{"action": "finish", "result": "final answer or summary"}

## SMART SHORTCUTS — ALWAYS USE THESE FIRST
  YouTube search:   https://www.youtube.com/results?search_query=QUERY
  YouTube video:    https://www.youtube.com/watch?v=VIDEO_ID
  Google search:    https://www.google.com/search?q=QUERY
  Amazon search:    https://www.amazon.com/s?k=QUERY
  Reddit search:    https://www.reddit.com/search/?q=QUERY
  GitHub search:    https://github.com/search?q=QUERY&type=repositories
  Wikipedia:        https://en.wikipedia.org/wiki/QUERY  (spaces → underscores)
  DuckDuckGo:       https://duckduckgo.com/?q=QUERY
  * and many more which you think can be useful
Replace spaces in QUERY with + (e.g. "seedhe maut" → "seedhe+maut").

## RULES
- Start with a navigate step using SMART SHORTCUTS whenever possible.
- Never repeat an action that just failed — use a different approach.
- If you need to click/type something that requires seeing the live page, add just those dynamic steps after initial navigation.
- NEVER type passwords, credentials, or login info yourself. If a page needs login, use askUser: {"action": "askUser", "question": "This page requires login. Please log in manually in the browser, then type 'done' here."} — then continue after the user confirms.
- Use askUser for CAPTCHA, 2FA, login, or genuinely unknown info.
- For FORMS: use click to select radio buttons and checkboxes. Use type for text inputs. Use selectOption for <select> dropdowns. Look for LABEL or heading elements to understand what each field is asking. Scroll down to find more fields or the submit button.
- Google Forms: radio options show as role="radio", checkboxes as role="checkbox". Click them to toggle. After filling all visible fields, scroll down for more, then click the Submit button.
- End with a finish step when the goal is complete.

Output ONLY a valid JSON array, no markdown, no explanation.`;

    try {
      // Step 1: Reason out loud
      const reasoningRes = await generateText({
        model: getModel(),
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: 'Explain your plan briefly (2-3 sentences) before outputting it.' },
        ],
        temperature: 0.3,
        maxTokens: 150,
      });
      const reasoning = reasoningRes.text.trim();
      if (reasoning) console.log(chalk.yellow(`[Thinking] ${reasoning}`));

      // Step 2: Get the actual chain
      const chainRes = await generateText({
        model: getModel(),
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: 'Now output ONLY the JSON array of steps. No markdown.' },
        ],
        temperature: 0.1,
        maxTokens: 600,
      });

      let text = chainRes.text.trim();
      text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      // Extract just the JSON array
      const arrayMatch = text.match(/\[[\s\S]*\]/);
      if (arrayMatch) text = arrayMatch[0];

      const chain = JSON.parse(text);
      if (!Array.isArray(chain)) throw new Error('Planner did not return an array');
      return chain;

    } catch (error) {
      console.error('[Planner] planChain failed:', error.message);
      // Fallback: single error action
      return [{ action: 'error', result: error.message }];
    }
  }

  /**
   * SINGLE STEP MODE — used when re-planning after a dynamic step.
   * Same as before but kept for compatibility.
   */
  async decideNextAction(goal, memory, pageState) {
    const chain = await this.planChain(goal, memory, pageState);
    return chain[0] || { action: 'error', result: 'Empty chain returned' };
  }
}
