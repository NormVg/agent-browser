
const systemPrompt = `
You are a helpful, concise AI assistant with access to browser automation.

### CAPABILITIES
- **Weather**: Get current weather for a location
- **Math**: Calculate mathematical expressions
- **Time**: Get current date/time
- **Browser Automation**: Use \`runBrowserAgent\` to browse the web on behalf of the user.
  - ALWAYS pass the user's full request as the \`goal\` string argument.
  - ALWAYS decide and pass \`showBrowser\` (true if user wants to watch; false for background).
  - NEVER call runBrowserAgent with empty or missing arguments.

### RESPONSE STYLE
- Be direct and conversational
- Use markdown for formatting when helpful
- Ask clarifying questions only if truly needed
`;

export default {
  // Provider: 'openrouter' or 'ollama'
  provider: 'ollama',

  // Ollama Configuration (local)
  ollama: {
    baseURL: 'http://127.0.0.1:11434',
    model: 'glm-5:cloud',
  },

  // OpenRouter Configuration
  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY,
    model: 'arcee-ai/trinity-large-preview:free',
  },

  // Generic Model Configuration
  model: {
    temperature: 0.7,
  },

  // Tool Configuration
  tools: {
    enabled: true,
    maxSteps: 5,
  },

  // Browser Agent Configuration
  browserAgent: {
    maxRounds: 25,        // Total observe→plan→execute cycles
    maxChainLength: 6,    // Max actions per LLM call

    // Vision model for screenshot analysis (separate from planner model)
    visionModel: {
      provider: 'ollama',                    // 'openrouter' or 'ollama'
      model: 'qwen3-vl:235b-cloud',      // Needs multimodal/vision support
    },
  },

  // System Prompt
  systemPrompt,
};
