# Skill Agent: Detailed Explanation

This document explains how the "skill agent" in AgentModules works: its architecture, execution flow, how tools (skills) are invoked, how memory fits into the concept, and how to extend it.

---

## Overview

AgentModules is a Node.js CLI chat app that streams AI responses and supports "skills" (tools) the model can call to perform actions. A skill agent is simply the AI model guided by a system prompt that can decide to call tools when needed, receive tool results, and produce a final answer.

- Entry point: `chat.js`
- Configuration: `config.js` (model, tool settings, system prompt)
- Tools: `tools/` (weather, calculator, time)
- UI: `lib/ui.js` (banner, boxes, tool call/result display)
- AI provider: OpenRouter via `@openrouter/ai-sdk-provider`

---

## Architecture

1. Readline loop collects user input and appends it to a persistent `messages` array (conversation history).
2. The app calls the AI SDK `streamText({ model, messages, system, tools, maxSteps })`.
3. The stream is processed incrementally:
   - `text-delta`: streamed assistant text
   - `tool-call`: a selected tool with validated inputs
   - `tool-result`: the outcome from the tool execution
4. After streaming, the app ensures a human-readable final answer. If the model produced no text (with or without tools), a fallback generation is triggered to synthesize a response.
5. The assistant response is wrapped in a styled box and added to history.

---

## System Prompt & Capabilities

The system prompt defines capabilities and expectations:

- Capabilities: Web Search (conceptual), Math, Time, Skills (delegation), Memory (knowledge graph concept)
- Memory guidance: store/link/search/update stable facts; avoid temporary chat content
- Response style: direct, conversational, markdown when useful, clarifying questions when needed

This prompt instructs the model to:
- Use tools precisely and only when necessary
- Provide a final synthesized answer after tool execution
- Keep formatting readable and professional

---

## Tools (Skills)

Tools are defined with the AI SDK `tool()` helper:

- `description`: informs the model when to use the tool
- `inputSchema`: Zod schema describing valid inputs
- `execute`: async function performing the action and returning a result
- Optional: `strict: true`, `inputExamples`, etc. to improve reliability

### Implemented Tools

- `getWeather` (`tools/weather.js`)
  - Inputs: `location` (string), optional `units` (`metric` or `imperial`)
  - Returns: temperature, condition, humidity, timestamp
  - Note: mock data; integrate a real API for production

- `calculate` (`tools/calculator.js`)
  - Inputs: `expression` (string), optional `precision` (0–10)
  - Returns: numeric result
  - Note: sanitized evaluation; consider `mathjs`/`expr-eval` for robust parsing

- `getCurrentTime` (`tools/time.js`)
  - Inputs: optional `timezone` (IANA), optional `locale`, optional `includeWeekday`
  - Returns: ISO string, human-readable string, timezone used, locale

### Tool Invocation Flow

- The model decides that a tool is needed based on the prompt and conversation.
- It emits a `tool-call` with valid inputs conforming to the Zod schema.
- The runtime executes the tool.
- A `tool-result` is streamed back into the conversation.
- The agent then synthesizes a final answer using the tool result.

### Multi-step Tool Calls

`config.tools.maxSteps = 5` allows the model to chain tool usage then produce a final answer. This enables:
- Using multiple tools in one response
- Repairing or clarifying inputs across steps
- Summarizing tool results

---

## Execution Flow in `chat.js`

1. User enters a message → appended to `messages`.
2. Start spinner; pause `readline` while the AI generates.
3. Call `streamText({...})` with:
   - `model`: from `lib/ai.js` → OpenRouter chat model (e.g., `xiaomi/mimo-v2-flash:free`)
   - `messages`: full conversation history
   - `system`: system prompt from `config.js`
   - `tools`: all exported tools
   - `maxSteps`: `config.tools.maxSteps`
4. Process the stream:
   - `text-delta`: stream assistant text
   - `tool-call`: display tool usage (name + arguments) in UI
   - `tool-result`: display the result in UI
5. If no final text is produced, trigger a concise fallback generation (with system prompt) to ensure a readable answer.
6. Box the assistant response and append it to `messages`.
7. Resume `readline` for the next input.

---

## Memory Concept

The system prompt describes a persistent memory tool and knowledge graph capabilities. Out of the box, this repository does **not** include a `memoryTool` in `tools/`. If you want memory to work:

1. Implement a `memoryTool` in `tools/memory.js` with actions like `create_node`, `link_nodes`, `search`, `update`.
2. Store memory in a local database/file or a graph DB.
3. Export `memoryTool` from `tools/index.js`.
4. Update the system prompt to reflect how memory should be used (already outlined).

Without this tool, memory-related responses are conceptual; the model may mention memory, but a real persistent store requires the tool implementation.

---

## Extending Skills

To add a new skill:

1. Create a file in `tools/`:
   ```js
   import { tool } from 'ai';
   import { z } from 'zod';

   export const mySkill = tool({
     description: 'Describe what this skill does and when to use it',
     inputSchema: z.object({ /* your params */ }),
     strict: true,
     inputExamples: [ { input: { /* example */ } } ],
     execute: async (args) => {
       // perform action and return a result
       return { success: true, data: /* ... */ };
     },
   });
   ```
2. Export it in `tools/index.js`:
   ```js
   import { mySkill } from './my-skill.js';

   export const tools = { /* existing tools */, mySkill };
   ```
3. Optionally update the system prompt in `config.js` to reference the new capability.

---

## Reliability Practices

- Use `strict: true` and clear `inputSchema` descriptions.
- Provide `inputExamples` to guide the model.
- Handle errors gracefully; return structured error info from tools.
- Keep outputs concise and human-readable; avoid raw JSON in final answers.
- Add a fallback generation if the model outputs no text (already implemented).

---

## Security Notes

- Move API keys to environment variables (do not hardcode in `config.js`).
- Add `.gitignore` for `.env`.
- Use vetted libraries for parsing/evaluations.

---

## Quick Reference

- Start: `npm start` or `node chat.js`
- Type a question → user box → assistant streams response → tool usage displayed → final boxed answer.
- Tools available: `getWeather`, `calculate`, `getCurrentTime`. Add more via `tools/`.
- Memory: conceptual; implement a `memoryTool` to persist facts.

---

## Summary

The skill agent is your model plus tools, orchestrated by `chat.js` and guided by the system prompt in `config.js`. The model decides when to call tools, the runtime executes them, and a final, readable answer is produced. Extend capabilities by adding tools and, if desired, a real memory system for persistence.
