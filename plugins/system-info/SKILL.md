name: System Diagnostics
description: Retrieve system information like CPU usage, memory usage, uptime, and OS details.
keywords: system, cpu, memory, ram, uptime, os, specs, computer, health, diagnostics
instructions: |
  # System Diagnostics Skill

  This skill allows you to check the health and status of the host machine.

  ## Capabilities
  - Check CPU load and model
  - Check available and total memory
  - Check system uptime
  - Get OS platform and release info

  ## Usage
  When the user asks about the computer's status, performance, or specs, use the `run_skill_script` tool.

  **IMPORTANT**: If the user asks a general question like "tell me system info" or "check health", DO NOT ASK for clarification. Immediately run the script with `args=["all"]`.

  ### Script: `sysinfo.js`
  - **Argument 1**: The type of information to retrieve.
    - `cpu`: CPU model and load averages
    - `memory`: Total and free memory (in GB)
    - `os`: Platform, release, and hostname
    - `uptime`: System uptime in human-readable format
    - `all`: All of the above (default)

  Example:
  User: "How much RAM do I have left?"
  Tool: `run_skill_script(scriptName="sysinfo.js", args=["memory"])`
