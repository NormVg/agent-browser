name: Video Script Writer
description: Generate engaging video scripts using proven engagement frameworks
keywords: video, script, youtube, content, hook, engagement, storytelling, reels, shorts
instructions: |
  # Video Script Writer Skill

  Creates video scripts optimized for engagement using the "think in public" framework.

  ## Capabilities
  - Generate full script outlines
  - Create compelling hooks
  - Structure content for maximum retention
  - Adapt tone for different video types

  ## Usage

  ### Script: `generate.js`
  Generates a complete video script outline.
  - **Argument 1**: Topic/idea (required)
  - **Argument 2**: Video type: "tutorial", "experiment", "rant", "build", "satire" (defaults to "build")
  - **Argument 3**: Target length in seconds: "30", "60", "180", "300" (defaults to "180")

  Example:
  User: "Write a script about building a custom email client"
  Tool: `runSkillScript(scriptName="generate.js", args=["building a custom email client", "build", "180"])`

  ### Script: `hook.js`
  Generates 5 hook variations for your topic.
  - **Argument 1**: Topic/idea (required)
  - **Argument 2**: Hook style: "result", "bold", "reveal", "question" (defaults to "result")

  Example:
  User: "Give me hooks for a video about Linux customization"
  Tool: `runSkillScript(scriptName="hook.js", args=["Linux customization", "result"])`

  ### Script: `analyze.js`
  Analyzes existing script text and suggests improvements.
  - **Argument 1**: Script text to analyze (required)

  Example:
  User: "Analyze this script: [paste script]"
  Tool: `runSkillScript(scriptName="analyze.js", args=["...script text..."])`
