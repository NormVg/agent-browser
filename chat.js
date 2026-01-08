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
The following skills are available. If the user's request matches a skill, use the \`activateSkill\` tool to load its instructions.
${availableSkills}
`;

      // Stream response from AI
      const streamConfig = {
        model: getModel(),
        messages,
        temperature: config.model.temperature,
        system: config.systemPrompt + skillSystemPrompt,
        maxSteps: 5, // Allow multiple steps for Activate -> Run -> Answer
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
        // Auto-Execution Logic: If skill activated but script NOT run
        const activatedSkill = toolCalls.find(t => t.name === 'activateSkill');
        const ranScript = toolCalls.find(t => t.name === 'runSkillScript');

        if (activatedSkill && !ranScript) {
          console.log(colors.dim('  (Auto-executing skill script...)'));

          // Add the "lazy" response to history so the model knows what it just said (optional, maybe skip to keep context clean?)
          // Actually, let's skip adding the question to history and just force the action.
          // But we need to keep the tool result in history.
          // The `messages` array is updated by the SDK? No, I have to update it.

          // Wait, `streamText` updates `messages`? No, I pass `messages` in.
          // The `messages` array I pass to `streamText` is NOT mutated by it.
          // I need to manually add the assistant's turn (tool calls + text) to `messages` before the next call.

          // Construct the assistant message that JUST happened
          const assistantMessage = {
            role: 'assistant',
            content: fullResponse,
            toolCalls: toolCalls.map(tc => ({
              type: 'function',
              function: { name: tc.name, arguments: JSON.stringify(tc.args) },
              id: 'call_' + Math.random().toString(36).substr(2, 9) // Mock ID
            }))
          };

          // We also need to add the tool results!
          // The SDK handles tool execution and re-calls the model if maxSteps > 1.
          // If we are here, it means the SDK *finished*.
          // So the history *should* effectively contain the tool results if we were using the SDK's `appendResponseMessages`.
          // But here I am managing `messages` manually.

          // Let's reconstruct the conversation state for the follow-up.
          const followUpMessages = [...messages];
          followUpMessages.push(assistantMessage);

          // Add tool results to history
          toolResults.forEach(tr => {
            followUpMessages.push({
              role: 'tool',
              toolCallId: assistantMessage.toolCalls.find(tc => tc.function.name === tr.name).id,
              content: JSON.stringify(tr.result)
            });
          });

          // Prompt to force execution
          const forceRunPrompt = "You have activated the skill. Now, immediately run the script defined in the instructions (e.g., 'sysinfo.js', 'greet.js', etc.) with appropriate arguments (use 'all' or defaults if unsure). Do not ask for clarification.";
          followUpMessages.push({ role: 'user', content: forceRunPrompt });

          try {
            const autoRunConfig = {
              model: getModel(),
              messages: followUpMessages,
              temperature: config.model.temperature,
              system: config.systemPrompt,
              tools: tools, // Give access to tools again!
              maxSteps: 5,
            };

            const autoRunResult = streamText(autoRunConfig);
            let autoRunFullResponse = '';

            process.stdout.write(colors.assistant('  ')); // Indent

            for await (const part of autoRunResult.fullStream) {
              if (part.type === 'text-delta') {
                const delta = typeof part.textDelta === 'string' ? part.textDelta : '';
                if (delta) {
                  process.stdout.write(chalk.green(delta));
                  autoRunFullResponse += delta;
                }
              } else if (part.type === 'tool-call') {
                console.log('\n');
                const args = part.args ?? part.input;
                displayToolCall(part.toolName, args);
                // We don't push to `toolCalls` here because we are in a sub-loop,
                // but we should probably track it if we want to recurse?
                // For now, let's assume one level of auto-fix is enough.
              } else if (part.type === 'tool-result') {
                const resultData = part.result || part.output;
                displayToolResult(resultData);
              }
            }
            console.log('\n');

            // Clean up response
            if (autoRunFullResponse) {
              autoRunFullResponse = autoRunFullResponse.replace(/\{"[^"]+":\s*"[^"]+"(?:\s*,\s*"[^"]+":\s*"[^"]+")*\}/g, '').replace(/\{\s*\}/g, '').trim();
            }

            displayAssistantBox(autoRunFullResponse);
            if (autoRunFullResponse) {
              messages.push({ role: 'assistant', content: autoRunFullResponse });
            }
            return; // Done
          } catch (err) {
            console.log(colors.error('Auto-execution failed: ' + err.message));
          }
        }

        // Standard response display (if no auto-execution needed)
        if (!activatedSkill || ranScript) {
          displayAssistantBox(fullResponse);
          if (fullResponse) {
            messages.push({ role: 'assistant', content: fullResponse });
          }
        }

      }
    } catch (error) {
      spinner.stop();

      // Handle "empty output" error by attempting a Force Reply
      if (error.message && (error.message.includes('model output must contain either output text or tool calls') || error.message.includes('empty response'))) {
        console.log(colors.dim('\n  (Recovering from empty response...)'));

        // Use the same Force Reply logic as above
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

        const fallbackPrompt = `The previous attempt to generate a response failed. Please provide a clear, concise answer to the user's original request based on the tool results above.`;

        contextMessages.push({ role: 'user', content: fallbackPrompt });

        try {
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
          }
          return; // Successfully recovered
        } catch (fallbackError) {
          console.log();
          displayError(fallbackError);
        }
      } else {
        console.log();
        displayError(error);
      }
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
