import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { createOllama } from 'ai-sdk-ollama';
import chalk from 'chalk';
import config from '../config.js';

/**
 * Check if API key is set
 */
export const checkApiKey = () => {
  if (config.provider === 'openrouter' && !config.openrouter.apiKey) {
    console.error(chalk.red('\n❌ Error: OPENROUTER_API_KEY is not set!'));
    console.log(chalk.yellow('\nPlease set your OpenRouter API key:'));
    console.log(chalk.cyan('  export OPENROUTER_API_KEY="your-api-key-here"\n'));
    console.log(chalk.dim('Get your key from: https://openrouter.ai/keys\n'));
    process.exit(1);
  }
};

// Initialize OpenRouter
const openrouter = createOpenRouter({
  apiKey: config.openrouter.apiKey,
});

// Initialize Ollama
const ollama = createOllama({
  baseURL: config.ollama.baseURL,
});

/**
 * Get the configured model (for chat/planner)
 */
export const getModel = () => {
  if (config.provider === 'ollama') {
    return ollama(config.ollama.model);
  }
  return openrouter.chat(config.openrouter.model);
};

/**
 * Get the vision model (for screenshot analysis)
 * Uses a separate config from the planner model.
 */
export const getVisionModel = () => {
  const vm = config.browserAgent?.visionModel;
  if (!vm) return getModel(); // Fallback to default model

  if (vm.provider === 'ollama') {
    return ollama(vm.model);
  }
  return openrouter.chat(vm.model);
};
