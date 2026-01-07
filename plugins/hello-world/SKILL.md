name: Hello World
description: A simple greeting skill that can say hello in different languages.
instructions: |
  # Hello World Skill

  This skill allows you to greet the user in various languages using a script.

  ## Capabilities
  - Greet the user
  - Support multiple languages

  ## Usage
  If the user asks for a greeting or says "hello world", use the `run_skill_script` tool.

  ### Script: `greet.js`
  - **Argument 1**: The name of the user (optional, default "World")
  - **Argument 2**: The language code (optional, default "en")

  Example:
  User: "Say hello to Alice in Spanish"
  Tool: `run_skill_script(scriptName="greet.js", args=["Alice", "es"])`
