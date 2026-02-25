# Browser Agent — Architecture & Workflow

A chain-based autonomous browser agent. The model plans a full sequence of actions upfront, the orchestrator runs them in bulk, and only re-plans when something goes wrong or it hits a step that needs live page data.

---

## High-Level Architecture

```mermaid
graph TD
    User["👤 User Input"] --> Chat["chat.js\nStreaming Chat Loop"]
    Chat -->|tool call| BrowserTool["runBrowserAgent tool\ntools/browser.js"]
    BrowserTool --> Orch["Orchestrator\nagent/orchestrator"]
    Orch --> Browser["BrowserRuntime\nagent/browser"]
    Orch --> Planner["Planner\nagent/planner"]
    Orch --> Memory["Memory\nagent/memory"]
    Planner -->|generateText| LLM["LLM\nvia AI SDK / OpenRouter / Ollama"]
    Browser -->|Playwright| Page["🌐 Real Browser Page\nChrome via Playwright"]
    Orch -->|result string| BrowserTool
    BrowserTool -->|tool result| Chat
    Chat --> User
```

---

## Main Execution Loop (Chain Mode)

```mermaid
flowchart TD
    Start([🚀 Start: goal received]) --> Init["browser.init(headless)"]
    Init --> Round["📍 Round N / maxRounds"]

    Round --> Observe["👁 Observe Page\nbrowser.observeState()\n→ URL, title, visible elements with IDs"]
    Observe --> LogState["memory.logState()"]
    LogState --> Plan

    Plan["🧠 Planner: planChain(goal, memory, state)\n\n1. LLM reasons out loud → [Thinking]\n2. LLM outputs JSON array of steps"]

    Plan --> GotChain{Valid chain?}
    GotChain -->|No / empty| PartialReport["⚠️ buildPartialReport()\nReturn pages visited + actions taken + errors"]
    GotChain -->|Yes| ShowChain["Log chain preview\n[1] navigate → URL\n[2] wait\n[3] click #ID\n..."]

    ShowChain --> RunChain["🔁 Execute Chain (in order)"]

    RunChain --> NextAction["Get next action from chain"]

    NextAction --> IsClickType{"action = click\nor type\nand i > 0?"}
    IsClickType -->|Yes| ReObserve["👁 Re-observe\nfor fresh element IDs"]
    IsClickType -->|No| ExecAction
    ReObserve --> ExecAction

    ExecAction["⚙️ executeAction(action)"]

    ExecAction --> ActionResult{Result?}

    ActionResult -->|"'finish'"| Done(["✅ Return result\n🎉 Goal complete — early exit"])
    ActionResult -->|"'replan'"| ReplanBreak["Break chain\n→ next round re-plans"]
    ActionResult -->|"'ok'"| MoreInChain{More actions\nin chain?}

    MoreInChain -->|Yes| Wait["wait 300ms"] --> NextAction
    MoreInChain -->|No| ChainDone["Chain exhausted\n→ next round re-plans"]

    ReplanBreak --> RoundCheck
    ChainDone --> RoundCheck

    RoundCheck{Rounds left?}
    RoundCheck -->|Yes| Round
    RoundCheck -->|No| PartialReport

    style Done fill:#22c55e,color:#fff
    style PartialReport fill:#f59e0b,color:#fff
    style Plan fill:#6366f1,color:#fff
    style ExecAction fill:#3b82f6,color:#fff
```

---

## When Re-Planning is Triggered

```mermaid
flowchart LR
    A[Action executed] --> B{Outcome}
    B -->|Success + more chain| C["▶ Continue chain\n(no LLM call)"]
    B -->|Action failed| D["🔁 Re-plan\nnew observe + planChain"]
    B -->|extract action| D
    B -->|askUser action| D
    B -->|finish| E["✅ Done"]
    B -->|Chain complete| D
```

**Static actions** (run without LLM): `navigate` · `wait` · `scroll` · `pressEnter`

**Dynamic actions** (re-observe before executing): `click` · `type`

**Triggers re-plan**: failure · `extract` · `askUser` · chain exhausted

---

## Planner Intelligence

```mermaid
flowchart TD
    Goal["goal + memory.getStepLog() + page state"] --> Prompt["System prompt\nwith SMART SHORTCUTS\nURL patterns for 10+ sites"]

    Prompt --> Reason["LLM Call 1 — Reasoning\n2-3 sentence explanation\nof what it sees + plans"]
    Reason --> ThinkLog["[Thinking] logged to console"]

    ThinkLog --> Chain["LLM Call 2 — Chain\nJSON array of up to 6 steps\n\nPrefers direct URL params:\nyoutube.com/results?search_query=...\ngoogle.com/search?q=...\namazon.com/s?k=...\n...etc"]

    Chain --> Parse["Strip markdown fences\nExtract JSON array\nValidate structure"]
    Parse --> Return["Return Step[]"]
```

---

## Memory — Step Log Format

The planner always receives a compact, human-readable trace:

```
🌐 Page: https://www.youtube.com/results?search_query=nayab+seedhe+maut | "YouTube" | 41 elements
➡️  navigate → https://www.youtube.com/results?search_query=nayab+seedhe+maut
✓  Loaded https://www.youtube.com/results?search_query=nayab+seedhe+maut
🖱️  click #7
✗  FAILED: Element not visible
🔽 scroll down
✓  Scrolled down
🖱️  click #12
✓  Clicked #12
```

Memory caps: **last observed page** + **last 8 action/outcome pairs** — keeps planner context small regardless of session length.

---

## File Structure

```
agentBrowser/
├── chat.js                     # Entry point — streaming chat loop
├── config.js                   # Provider, model, system prompt
├── tools/
│   └── browser.js              # runBrowserAgent tool (zod schema + execute)
├── agent/
│   ├── orchestrator/index.js   # Main loop — chain execution engine
│   ├── planner/index.js        # planChain() — LLM reasoning + JSON array output
│   ├── browser/index.js        # BrowserRuntime — Playwright wrapper
│   └── memory/index.js         # Trace log — actions, outcomes, observations
└── lib/
    ├── ai.js                   # Provider setup (OpenRouter / Ollama)
    └── ui.js                   # CLI banner + response boxes
```

---

## Token Efficiency

| Old (step-by-step) | New (chain mode) |
|---|---|
| 1 LLM call per action | 2 LLM calls per **round** (reason + chain) |
| 25 steps = ~50 LLM calls | 25 rounds, but each runs 1–6 actions |
| Re-plan every step | Re-plan only on failure or dynamic boundary |
| Context grows unboundedly | Memory capped at last observe + 8 pairs |
