name: Git Manager
description: Check git status, view commits, and inspect repository information
keywords: git, version control, commit, status, log, diff, repository
instructions: |
  # Git Manager Skill

  This skill provides git repository operations.

  ## Capabilities
  - Check git status
  - View commit log
  - Show diff of changes
  - Get repository information

  ## Usage
  Use `runSkillScript` with the appropriate script.

  ### Script: `status.js`
  Shows the current git status (modified, staged, untracked files).
  - No arguments required

  Example:
  User: "What's the git status?"
  Tool: `runSkillScript(scriptName="status.js", args=[])`

  ### Script: `log.js`
  Shows recent commit history.
  - **Argument 1**: Number of commits to show (defaults to 10)

  Example:
  User: "Show me the last 5 commits"
  Tool: `runSkillScript(scriptName="log.js", args=["5"])`

  ### Script: `diff.js`
  Shows uncommitted changes.
  - **Argument 1**: File path (optional, shows all changes if not specified)

  Example:
  User: "What changed in the code?"
  Tool: `runSkillScript(scriptName="diff.js", args=[])`
