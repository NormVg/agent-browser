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
showWelcomeBanner();

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
      // Stream response from AI
      const streamConfig = {
        model: getModel(),
        messages,
        temperature: config.model.temperature,
        system: config.systemPrompt,
      };

      // Add tools if enabled
      if (config.tools.enabled) {
        streamConfig.tools = tools;
        streamConfig.maxSteps = config.tools.maxSteps;
      }

      const result = streamText(streamConfig);

      let fullResponse = '';
      let toolCalls = [];
      let toolResults = [];

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
            process.stdout.write(chalk.green(delta));
            fullResponse += delta;
          }
        }
        // Handle tool calls
        else if (part.type === 'tool-call') {
          console.log('\n'); // Break line after text
          const args = part.args ?? part.input;
          displayToolCall(part.toolName, args);
          toolCalls.push({ name: part.toolName, args });
        }
        // Handle tool results
        else if (part.type === 'tool-result') {
          const resultData = part.result || part.output;
          displayToolResult(resultData);
          toolResults.push({ name: part.toolName, result: resultData });
        }
      }

      console.log('\n'); // Final newline

      // Clean up response (remove leaked JSON artifacts)
      if (fullResponse) {
        // Remove standard JSON objects
        fullResponse = fullResponse.replace(/\{"[^"]+":\s*"[^"]+"(?:\s*,\s*"[^"]+":\s*"[^"]+")*\}/g, '');
        // Remove empty JSON objects which some models output
        fullResponse = fullResponse.replace(/\{\s*\}/g, '');
        fullResponse = fullResponse.trim();
      }

      // If no final response text (with or without tools), perform a concise follow-up generation
      if (!fullResponse || !fullResponse.trim()) {
        console.log(colors.dim('  (Generating explanation...)'));

        // Construct context with tool results to prevent hallucination
        const contextMessages = [...messages];

        if (toolResults.length > 0) {
          const toolSummary = toolResults.map(tr =>
            `Tool '${tr.name}' returned: ${JSON.stringify(tr.result)}`
          ).join('\n');

          contextMessages.push({
            role: 'system',
            content: `The tools have been executed. Here are the results:\n${toolSummary}`
          });
        }

        const fallbackPrompt = toolCalls.length > 0
          ? `Tool execution is complete. Provide a clear, concise final answer to the original user request based on the tool results provided above.
- Summarize any relevant tool findings in plain language.
- Do not include raw JSON or internal tool artifacts.
- If there are caveats or assumptions, state them briefly.`
          : `No text was generated. Provide a clear, concise answer to the user's last message using the established tone and guidelines.
- If the request is ambiguous, ask one brief clarifying question.
- Do not include raw JSON or internal artifacts.`;

        contextMessages.push({ role: 'user', content: fallbackPrompt });

        const fallbackStreamConfig = {
          model: getModel(),
          messages: contextMessages,
          temperature: config.model.temperature,
          system: config.systemPrompt,
        };

        const fallbackResult = streamText(fallbackStreamConfig);

        let fallbackFullResponse = '';
        process.stdout.write(colors.assistant('  ')); // Indent

        for await (const textDelta of fallbackResult.textStream) {
          if (typeof textDelta === 'string' && textDelta) {
            fallbackFullResponse += textDelta;
            process.stdout.write(chalk.green(textDelta));
          }
        }
        console.log('\n');

        displayAssistantBox(fallbackFullResponse);
        if (fallbackFullResponse && fallbackFullResponse.trim()) {
          messages.push({ role: 'assistant', content: fallbackFullResponse });
          fullResponse = fallbackFullResponse;
        }
      } else {
        // Standard response display
        displayAssistantBox(fullResponse);

        // Add assistant response to history
        if (fullResponse) {
          messages.push({ role: 'assistant', content: fullResponse });
        }
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
