name: Text Utilities
description: Text manipulation and analysis tools
keywords: text, count, words, lines, uppercase, lowercase, reverse, analysis
instructions: |
  # Text Utilities Skill

  This skill provides text manipulation and analysis.

  ## Capabilities
  - Count words, lines, characters
  - Convert case (uppercase, lowercase, title case)
  - Reverse text
  - Analyze text statistics

  ## Usage
  Use `runSkillScript` with the appropriate script.

  ### Script: `analyze.js`
  Analyzes text and provides statistics.
  - **Argument 1**: Text to analyze (required)

  Example:
  User: "How many words are in 'Hello world this is a test'?"
  Tool: `runSkillScript(scriptName="analyze.js", args=["Hello world this is a test"])`

  ### Script: `transform.js`
  Transforms text (uppercase, lowercase, title, reverse).
  - **Argument 1**: Text to transform (required)
  - **Argument 2**: Transformation type: "upper", "lower", "title", "reverse" (defaults to "lower")

  Example:
  User: "Convert 'hello world' to uppercase"
  Tool: `runSkillScript(scriptName="transform.js", args=["hello world", "upper"])`
