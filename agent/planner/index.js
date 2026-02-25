import { getModel } from '../../lib/ai.js';
import { generateText } from 'ai';
import chalk from 'chalk';

export class Planner {
  /**
   * Decide the next action based on the goal, memory trace, and current page state.
   */
  async decideNextAction(goal, memory, pageState) {
    const elementsForContext = (pageState.elements || [])
      .filter(el => el.inViewport)
      .slice(0, 40);

    const stepLog = memory.getStepLog(14);

    const systemPrompt = `You are the brain of an autonomous Browser Agent. Think step-by-step.

## GOAL
"${goal}"

## WHAT HAS HAPPENED SO FAR
${stepLog || '(nothing yet — this is the first step)'}

## CURRENT PAGE
URL: ${pageState.url}
Title: "${pageState.title || 'unknown'}"

## VISIBLE ELEMENTS (only in viewport)
${elementsForContext.length > 0
        ? elementsForContext.map(el =>
          `  [${el.id}] ${el.tag}${el.type ? `[${el.type}]` : ''} "${el.text || el.ariaLabel || ''}"${el.href ? ` → ${el.href}` : ''}`
        ).join('\n')
        : '  (none visible — page may still be loading, try wait or scroll)'}

## AVAILABLE ACTIONS
{"action": "navigate", "url": "https://..."}
{"action": "click", "elementId": "NUMERIC_ID"}
{"action": "type", "elementId": "NUMERIC_ID", "text": "text"}
{"action": "pressEnter"}
{"action": "scroll", "direction": "down"}
{"action": "wait", "milliseconds": 1500}
{"action": "extract", "instruction": "what to extract"}
{"action": "askUser", "question": "question"}
{"action": "finish", "result": "final answer or summary"}

## SMART SHORTCUTS — ALWAYS PREFER THESE OVER CLICKING THROUGH UIs
Use direct URL navigation with query params to save steps:

  YouTube search:   https://www.youtube.com/results?search_query=QUERY
  YouTube video:    https://www.youtube.com/watch?v=VIDEO_ID
  Google search:    https://www.google.com/search?q=QUERY
  Amazon search:    https://www.amazon.com/s?k=QUERY
  Reddit search:    https://www.reddit.com/search/?q=QUERY
  GitHub search:    https://github.com/search?q=QUERY&type=repositories
  Wikipedia:        https://en.wikipedia.org/wiki/QUERY  (spaces → underscores)
  Etsy search:      https://www.etsy.com/search?q=QUERY
  Twitter/X search: https://twitter.com/search?q=QUERY
  DuckDuckGo:       https://duckduckgo.com/?q=QUERY

Replace spaces in QUERY with + (e.g. "seedhe maut" → "seedhe+maut").
ALWAYS use a direct URL before trying to click through a site's UI.

## RULES
- If on about:blank → use a SMART SHORTCUT to jump directly to the target page.
- If a click failed → try a different element, scroll to reveal it, or use a direct URL instead.
- If 0 elements visible → wait 1500ms or scroll down.
- After typing in a search box → use pressEnter to submit.
- Never repeat the exact same action that just failed — always try a different approach.
- Only use askUser for CAPTCHA, 2FA, or genuinely unknown info.
- Once the goal is complete or you've done everything possible → use finish.`;

    try {
      // ── Step 1: Ask the model to reason out loud ──
      const reasoningResponse = await generateText({
        model: getModel(),
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Before deciding, briefly explain your reasoning: what do you see, what went wrong before (if anything), and what you plan to do next. Be concise (2-3 sentences).' },
        ],
        temperature: 0.3,
        maxTokens: 120,
      });

      const reasoning = reasoningResponse.text.trim();
      if (reasoning) {
        console.log(chalk.yellow(`[Thinking] ${reasoning}`));
      }

      // ── Step 2: Ask for the concrete action JSON ──
      const actionResponse = await generateText({
        model: getModel(),
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Based on your reasoning, output ONLY the single next action as a JSON object. No markdown, no explanation.' },
        ],
        temperature: 0.1,
        maxTokens: 120,
      });

      let text = actionResponse.text.trim();
      // Strip markdown code fences
      text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      // Extract just the JSON object if there's surrounding prose
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) text = jsonMatch[0];

      return JSON.parse(text);
    } catch (error) {
      console.error('[Planner] Failed to decode action:', error.message);
      return { action: 'error', result: error.message };
    }
  }
}
