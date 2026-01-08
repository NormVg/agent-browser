name: File Manager
description: Browse, search, and inspect files in the file system
keywords: files, directory, search, list, find, browse, filesystem
instructions: |
  # File Manager Skill

  This skill provides file system operations.

  ## Capabilities
  - List files in a directory
  - Search for files by name pattern
  - Read file metadata (size, modified date)
  - Count files/directories

  ## Usage
  Use `runSkillScript` with the appropriate script.

  ### Script: `list.js`
  Lists files in a directory.
  - **Argument 1**: Path to list (defaults to current directory)
  - **Argument 2**: Show hidden files (true/false, defaults to false)

  Example:
  User: "Show me the files in the current folder"
  Tool: `runSkillScript(scriptName="list.js", args=["."])`

  ### Script: `search.js`
  Search for files matching a pattern.
  - **Argument 1**: Search pattern (e.g., "*.js", "test*")
  - **Argument 2**: Directory to search in (defaults to current directory)

  Example:
  User: "Find all JavaScript files"
  Tool: `runSkillScript(scriptName="search.js", args=["*.js", "."])`
