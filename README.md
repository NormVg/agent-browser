# AgentModules

> A modular multi-agent AI system with pluggable skills and autonomous execution capabilities.

## Overview

AgentModules is an intelligent CLI assistant built on the **Orchestrator-Worker** pattern. It features a Main Agent that handles conversation and delegates complex tasks to a specialized Skill Agent, which autonomously executes plugins.

## Architecture

### 🎯 Main Agent (Orchestrator)
- Handles user interaction and conversation
- Manages context and chat history
- Delegates skill-based tasks to the Skill Agent
- Uses `streamText` for natural conversation flow

### 🔸 Skill Agent (Worker)
Located in `agents/skill-agent/`

- Autonomous agent built with `ToolLoopAgent`
- Can auto-select the best skill for a given goal
- Executes activation → script execution → reporting loop
- Has full context of all available plugins

### 🔌 Plugin System
Located in `plugins/`

Each plugin follows a standard structure:
```
plugins/
  plugin-name/
    SKILL.md          # Instructions for the AI
    scripts/          # Executable Node.js scripts
      script.js
```

## Available Plugins

| Plugin | Description | Scripts |
|--------|-------------|---------|
| **System Info** | CPU, memory, uptime, OS details | `sysinfo.js` |
| **File Manager** | Browse and search filesystem | `list.js`, `search.js` |
| **Git Manager** | Repository operations | `status.js`, `log.js`, `diff.js` |
| **Text Utils** | Text analysis and transformation | `analyze.js`, `transform.js` |
| **Video Script Writer** | Engagement-optimized video scripts | `generate.js`, `hook.js`, `analyze.js` |
| **CLI Runner** | Execute terminal commands | `run.js`, `exec.js` |
| **Hello World** | Demo/testing | `greet.js` |

## Quick Start

### Installation
```bash
npm install
```

### Configuration
Create a `.env` file or set the API key in `config.js`:
```javascript
openrouter: {
  apiKey: 'your-openrouter-api-key',
  model: 'xiaomi/mimo-v2-flash:free'
}
```

### Run
```bash
node chat.js
```

## Usage Examples

```
You: list all plugins
You: tell me my system info
You: show me the last 5 commits
You: analyze this text: "hello world"
You: run ls -la
You: write a video script about building a custom terminal
```

## Project Structure

```
AgentModules/
├── agents/
│   └── skill-agent/        # Worker agent implementation
│       └── agent.js
├── lib/
│   ├── ai.js              # OpenRouter/AI SDK setup
│   ├── ui.js              # Terminal UI utilities
│   └── plugins/           # Plugin system internals
│       ├── registry.js
│       ├── loader.js
│       └── executor.js
├── plugins/               # Skill plugins (see above)
├── tools/                 # Available tools for Main Agent
│   ├── delegate.js       # Delegates to Skill Agent
│   ├── list-skills.js    # Lists available plugins
│   ├── skill-manager.js  # Activates skills
│   ├── skill-runner.js   # Runs skill scripts
│   ├── weather.js
│   ├── calculator.js
│   └── time.js
├── chat.js               # Main application entry point
└── config.js             # Configuration
```

## Key Features

- **Multi-Agent Architecture**: Clean separation of concerns between orchestration and execution
- **Progressive Disclosure**: Skills load instructions only when needed, conserving context
- **Autonomous Execution**: Skill Agent loops until task completion without user intervention
- **Plugin Extensibility**: Easy-to-add skill system with standardized structure
- **Error Recovery**: Built-in fallback mechanisms and auto-retry logic
- **Streaming Responses**: Real-time text generation with tool execution visibility

## How It Works

1. **User sends a message** → Main Agent receives it
2. **Main Agent analyzes** → If skill-based, calls `delegateToSkillAgent`
3. **Skill Agent launches** → Receives goal and available skills context
4. **Auto-selection** → Chooses best skill (or uses specified skillId)
5. **Activation** → Loads `SKILL.md` instructions
6. **Execution** → Runs appropriate script from `scripts/`
7. **Result** → Returns summary to Main Agent
8. **Response** → Main Agent delivers final answer to user

## Creating a New Plugin

1. Create folder: `plugins/your-skill/scripts/`
2. Write `SKILL.md` with instructions
3. Create script(s) in `scripts/` (must output JSON to stdout)
4. Restart the app - plugin auto-discovered!

**Example SKILL.md:**
```markdown
name: Your Skill Name
description: What it does
keywords: search, terms
instructions: |
  # Usage
  Use `runSkillScript(scriptName="script.js", args=["arg1"])`.

  ### Script: script.js
  - **Argument 1**: Description
```

## Technologies

- **AI SDK** (Vercel AI SDK) - Core agent framework
- **OpenRouter** - LLM provider (supports multiple models)
- **Node.js** - Runtime (ES modules)
- **Chalk** - Terminal styling
- **Boxen** - UI boxes

## Environment

- Node.js 18+
- ES Modules (`"type": "module"` in package.json)
- OpenRouter API key required

## License

MIT

---

**Built with the Orchestrator-Worker pattern** • Powered by AI SDK & OpenRouter
