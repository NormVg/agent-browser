import { getVisionModel } from '../../lib/ai.js';
import { generateText } from 'ai';
import chalk from 'chalk';

/**
 * Visual Observer — takes a screenshot and asks a vision model to describe what it sees.
 * Returns a concise text description that gets fed into the planner alongside DOM state.
 */
export class VisionObserver {

  /**
   * Analyze a screenshot buffer and return a text description.
   * @param {Buffer} screenshotBuffer - PNG screenshot from page.screenshot()
   * @param {string} pageUrl - Current page URL for context
   * @param {string} goal - The agent's current goal
   * @returns {Promise<string>} - Concise description of what's on screen
   */
  async analyze(screenshotBuffer, pageUrl, goal = '') {
    try {
      const res = await generateText({
        model: getVisionModel(),
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                image: screenshotBuffer,
              },
              {
                type: 'text',
                text: `You are a visual observer for a browser automation agent.
The agent is working on: "${goal}"
Current URL: ${pageUrl}

Look at this screenshot and describe:
1. What page/section is visible (layout, key content)
2. Any interactive elements visible (buttons, forms, inputs, dropdowns, links)
3. Any visual content the DOM might miss (images, charts, canvas, popups, modal overlays, loading states)
4. Current state of the page (is it loaded? any errors? any blocking modals?)

Be CONCISE — max 4-5 short bullet points. Focus on what's useful for the agent to accomplish its goal.`,
              },
            ],
          },
        ],
        temperature: 0.2,
        maxTokens: 300,
      });

      const description = res.text.trim();
      if (description) {
        console.log(chalk.blue(`  👁‍🗨 Vision: ${description.substring(0, 120)}...`));
      }
      return description;

    } catch (e) {
      console.warn(chalk.yellow(`  ⚠ Vision error: ${e.message}`));
      return ''; // Non-fatal — DOM observer still works
    }
  }
}
