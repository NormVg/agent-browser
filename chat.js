#!/usr/bin/env node

// Suppress AI SDK compatibility warnings
globalThis.AI_SDK_LOG_WARNINGS = false;

import { streamText } from 'ai';
import chalk from 'chalk';
import ora from 'ora';
import { createInterface } from 'readline';
import config from './config.js';
import { tools } from './tools/index.js';
import { checkApiKey, getModel } from './lib/ai.js';
import { registry } from './lib/plugins/registry.js';
import {
  colors,
  showWelcomeBanner,
  displayAssistantBox,
  displayUserBox,
  displayToolCall,
  displayToolResult,
  displayError
} from './lib/ui.js';

// Initialize
checkApiKey();
await registry.loadPlugins(); // Load available skills
showWelcomeBanner();

// Debug: Log available tools
console.log(colors.dim('Available tools:'), Object.keys(tools).join(', '));

// Message history
const messages = [];

// Create readline interface
const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: colors.user.bold('You ❯ '),
});

// Start chat loop
const chat = () => {
  rl.prompt();

  rl.on('line', async (input) => {
    const userMessage = input.trim();

    if (!userMessage) {
      rl.prompt();
      return;
    }

    // Add user message to history
    messages.push({ role: 'user', content: userMessage });

    // Display user message box
    displayUserBox(userMessage);
    console.log(); // Spacing after box

    // Start spinner
    const spinner = ora({
      text: colors.assistant('Thinking...'),
      spinner: 'dots',
      color: 'green',
    }).start();

    // Pause readline while AI is thinking
    rl.pause();

    try {
      // Inject available skills into system prompt
      const availableSkills = registry.listPlugins()
        .map(p => `- ${p.name} (ID: ${p.id}): ${p.description}`)
        .join('\n');

      const skillSystemPrompt = `
### AVAILABLE SKILLS
The following skills are available. If the user's request matches a skill, use the \`delegateToSkillAgent\` tool.
${availableSkills}
`;

      // Stream response from AI
      const streamConfig = {
        model: getModel(),
        messages,
        temperature: config.model.temperature,
        system: config.systemPrompt + skillSystemPrompt,
        maxSteps: 5,
      };

      // Add tools if enabled
      if (config.tools.enabled) {
        streamConfig.tools = tools;
        streamConfig.maxSteps = config.tools.maxSteps;
      }

      const result = streamText(streamConfig);

      let fullResponse = '';
      let toolResults = []; // Track tool results

      // Stop spinner
      spinner.stop();

      // Display assistant header with streaming indicator
      console.log('\n' + colors.assistant.bold('Assistant') + colors.dim(' • Streaming response...'));
      console.log(colors.dim('─'.repeat(60)) + '\n');

      // Process the stream
      for await (const part of result.fullStream) {
        // Handle text deltas (streaming)
        if (part.type === 'text-delta') {
          const delta = typeof part.textDelta === 'string' ? part.textDelta : '';
          if (delta) {
            process.stdout.write(colors.streaming(delta)); // Magenta for streaming
            fullResponse += delta;
          }
        }
        // Handle tool calls
        else if (part.type === 'tool-call') {
          console.log('\n'); // Break line after text
          const args = part.args ?? part.input;
          displayToolCall(part.toolName, args);
        }
        // Handle tool results
        else if (part.type === 'tool-result') {
          const resultData = part.result || part.output;
          displayToolResult(resultData);
          toolResults.push({ toolName: part.toolName, result: resultData }); // Store result
        }
      }

      console.log('\n'); // Final newline

      // Clean up response
      if (fullResponse) {
        fullResponse = fullResponse.replace(/\{"[^"]+"\s*"[^"]+"(?:\s*,\s*"[^"]+"\s*"[^"]+")*\}/g, '').replace(/\{\s*\}/g, '').trim();
      }

      // If no response text after tools, force a final answer
      if (!fullResponse || !fullResponse.trim()) {
        console.log(colors.dim('  (Generating final answer...)'));

        // Build context with tool results
        const contextPrompt = toolResults.length > 0
          ? `Here are the results from the tools I just used:\n\n${toolResults.map(tr => `${tr.toolName}: ${JSON.stringify(tr.result)}`).join('\n\n')}\n\nBased on these results, provide a clear, concise answer to my original question.`
          : 'Please provide a clear, concise answer to my original question.';

        const fallbackResult = await streamText({
          model: getModel(),
          messages: [
            ...messages,
            { role: 'user', content: contextPrompt }
          ],
          temperature: config.model.temperature,
          system: config.systemPrompt,
        });

        let fallbackResponse = '';
        for await (const textDelta of fallbackResult.textStream) {
          if (typeof textDelta === 'string' && textDelta) {
            fallbackResponse += textDelta;
            process.stdout.write(colors.streaming(textDelta)); // Magenta for streaming
          }
        }
        console.log('\n');

        if (fallbackResponse && fallbackResponse.trim()) {
          displayAssistantBox(fallbackResponse);
          messages.push({ role: 'assistant', content: fallbackResponse });
        }
      } else {
        // Add assistant response to history
        messages.push({ role: 'assistant', content: fullResponse });
      }

    } catch (error) {
      spinner.stop();
      console.log();
      displayError(error);
    }

    // Resume readline and show prompt again
    rl.resume();
    rl.prompt();
  });
};

// Handle exit
rl.on('close', () => {
  console.log(colors.dim('\nGoodbye! 👋'));
  process.exit(0);
});

// Start the app
chat();
