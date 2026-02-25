/**
 * Tools Index
 * Exports all available tools for the AI to use.
 * createTools(rl) allows the browser tool to reuse chat's readline.
 */

import { getWeather } from './weather.js';
import { calculate } from './calculator.js';
import { getCurrentTime } from './time.js';
import { createBrowserTool } from './browser.js';

export function createTools(rl) {
  return {
    getWeather,
    calculate,
    getCurrentTime,
    runBrowserAgent: createBrowserTool(rl),
  };
}

// Static tools for backwards compat (no askUser support)
export const tools = {
  getWeather,
  calculate,
  getCurrentTime,
};
