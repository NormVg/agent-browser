name: Example Skill
description: A demonstration skill showing the full folder structure with scripts, references, and assets.
keywords: example, demo, template, sample
instructions: |
  # Example Skill

  This skill demonstrates the complete skill structure with all optional directories.

  ## Capabilities
  - Execute example scripts
  - Access documentation from references/
  - Use templates from assets/

  ## Directory Structure
  ```
  example-skill/
  ├── SKILL.md          # This file (required)
  ├── scripts/          # Executable code
  │   └── greet.js      # Sample greeting script
  ├── references/       # Documentation & knowledge
  │   └── guide.md      # How-to guide
  └── assets/           # Templates & resources
      └── template.json # Sample template
  ```

  ## Usage

  ### Running Scripts
  Use `runSkillScript` to execute scripts:
  - `greet.js`: Generates a greeting message
    - Args: `[name]` - Name to greet (default: "World")

  ### Reading References
  Use `readSkillReference` to access documentation:
  - `guide.md`: Contains detailed usage guide

  ### Reading Assets
  Use `readSkillAsset` to access templates:
  - `template.json`: Sample JSON template for output formatting

  ## Example Flow
  1. Activate this skill
  2. Optionally read `guide.md` for detailed instructions
  3. Run `greet.js` with a name argument
  4. Use `template.json` to format the output if needed
