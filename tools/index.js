/**
 * Tools Index
 * Exports all available tools for the AI to use
 */

import { getWeather } from './weather.js';
import { calculate } from './calculator.js';
import { getCurrentTime } from './time.js';
import { delegateToSkillAgent } from './delegate.js';
import { listSkills } from './list-skills.js';
import { memoryTool } from './memory.js';
import { delegateToMemoryAgent } from './memory-agent.js';

export const tools = {
  getWeather,
  calculate,
  getCurrentTime,
  listSkills,
  memoryTool,
  delegateToMemoryAgent,
  delegateToSkillAgent,
};
