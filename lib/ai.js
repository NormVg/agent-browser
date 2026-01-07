import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import chalk from 'chalk';
import config from '../config.js';

/**
 * Check if API key is set
 */
export const checkApiKey = () => {
  if (!config.openrouter.apiKey) {
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

/**
 * Get the configured model
 */
export const getModel = () => openrouter.chat(config.openrouter.model);
