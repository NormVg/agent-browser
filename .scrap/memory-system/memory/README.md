# Hybrid Memory System

The AI has two modes of memory:

## A. Background Capture (Automatic) ✨

**What it does:**
- Runs automatically after each conversation turn
- Uses lightweight pattern matching (no LLM calls)
- Extracts simple facts from conversation

**Examples of what it captures:**
- "I like hip-hop" → stored as preference
- "My name is Vishnu" → stored as person
- "I use Hyprland" → stored as tool
- "Project named Kraken" → stored as concept
- "CEO of TheAlphaOnes" → stored as company

**Rules it uses:**
- Preferences: `I like/love/prefer X`
- Personal info: `My name is X`, `I use X`
- Projects: `Project named X`, `Company is X`
- Tasks: `Need to X`, `Working on X`

**Advantages:**
- Very fast (no API calls)
- Never blocks conversation
- Captures basics automatically
- Silent failures don't interrupt

## B. Memory Agent (Manual/Strategic) 🧠

**What it does:**
- Autonomous agent with full LLM reasoning
- Handles complex memory operations
- Requires explicit delegation

**Use cases:**
- Merge duplicate memories
- Create structured relationships
- Reorganize information
- Clean up memory
- Build knowledge graphs

**How to use:**
Ask the AI to:
- "Connect my programming skills to my projects"
- "Merge all company-related nodes"
- "Clean up duplicate preferences"
- "Organize my memory by topics"

**Advantages:**
- Smart reasoning
- Can understand context
- Handles complex operations
- Creates meaningful connections

## When to Use Each

| Task | Mode |
|------|------|
| Basic facts from conversation | Automatic (background) |
| Explicit "remember this" | Manual tool |
| Complex reorganization | Memory Agent |
| Merging duplicates | Memory Agent |
| Creating relationships | Memory Agent |

## Files

- `lib/memory/auto-capture.js` - Background capture patterns
- `agents/memory-agent/agent.js` - Memory Agent implementation
- `tools/memory-agent.js` - Delegation tool
- `config.js` - System prompt with memory instructions
