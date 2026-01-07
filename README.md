# oopsAI

A beautiful command-line chat application powered by **OpenRouter** and the AI SDK.

## Features

- 🎨 **Beautiful TUI** with color-coded messages
- 📦 **Boxed formatting** for clean message display
- ⚡ **Streaming responses** with real-time typing effects
- 🌈 **Gradient ASCII art** welcome banner
- 💬 **Conversation history** maintained throughout session
- 🔧 **AI Tool Calling** (Weather, Calculator, Time)
- 🎯 **Loading indicators** with spinners

## Prerequisites

1. **Node.js** (v18 or higher)
2. **OpenRouter API Key** (Get one for free at [openrouter.ai](https://openrouter.ai/keys))

## Installation

```bash
npm install
```

## Configuration

1. Set your OpenRouter API key as an environment variable:
   ```bash
   export OPENROUTER_API_KEY="your-key-here"
   ```

2. (Optional) Customize settings in `config.js`:
   - `openrouter.model` - Model to use (default: `mistralai/devstral-2512:free`)
   - `tools.enabled` - Enable/disable tools
   - `systemPrompt` - Custom instructions for the AI

## Usage

Start the chat:

```bash
npm start
```

Or:

```bash
node chat.js
```

## Controls

- Type your message and press **Enter** to send
- Press **Ctrl+C** to exit

## Tool Calling

AgentModules supports tool calling, allowing the AI to execute functions during conversations.

### Available Tools

- **getWeather** - Get current weather for a location
- **calculate** - Perform mathematical calculations
- **getCurrentTime** - Get current date and time

### Example Usage

```
You: What's the weather in London?
🔧 TOOL CALL
  Tool Name: getWeather
  Arguments:
    {
      "location": "London"
    }
  ⏳ Executing...

✓ TOOL RESULT
  {"location":"London","temperature":"15°C",...}

Assistant: The weather in London is currently 15°C...
```

### Adding Custom Tools

Tools are located in the `tools/` directory. To add a new tool:

1. Create a new file in `tools/` (e.g., `myTool.js`)
2. Define your tool using the AI SDK `tool()` function
3. Export it in `tools/index.js`

## Customization

For advanced customization of colors, display, or UI elements, edit `chat.js` directly.

Enjoy chatting! 🚀
