name: CLI Runner
description: Execute terminal commands and manage processes
keywords: cli, terminal, command, shell, bash, process, execute, run
instructions: |
  # CLI Runner Skill

  Executes terminal commands safely in the system shell.

  ## Capabilities
  - Run shell commands
  - Execute with working directory
  - Capture output and errors
  - Check command status

  ## Usage

  ### Script: `run.js`
  Executes a terminal command and returns output.
  - **Argument 1**: Command to execute (required)
  - **Argument 2**: Working directory (optional, defaults to current directory)

  **IMPORTANT**: Only use for safe, read-only commands unless explicitly requested by user.

  Example:
  User: "Run ls -la"
  Tool: `runSkillScript(scriptName="run.js", args=["ls -la"])`

  User: "Check node version"
  Tool: `runSkillScript(scriptName="run.js", args=["node --version"])`

  ### Script: `exec.js`
  Executes a command and streams output in real-time.
  - **Argument 1**: Command to execute (required)

  Example:
  User: "Install dependencies"
  Tool: `runSkillScript(scriptName="exec.js", args=["npm install"])`

  ## Safety Guidelines
  - Prefer read-only commands (ls, cat, grep, find, etc.)
  - Confirm with user before running destructive operations (rm, mv, etc.)
  - Avoid commands that require interactive input
  - Use absolute paths when possible
