/**

 * Tools Index
 * Exports all available tools for the AI to use

 */



import { getWeather } from './weather.js';
import { calculate } from './calculator.js';
import { getCurrentTime } from './time.js';
import { runBrowserAgent } from './browser.js';

export const tools = {

  getWeather,
  calculate,
  getCurrentTime,
  runBrowserAgent,

};
