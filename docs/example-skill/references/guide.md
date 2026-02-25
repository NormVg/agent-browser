# Example Skill Guide

This is the reference documentation for the Example Skill.

## Overview

The Example Skill demonstrates the full plugin structure with:
- **scripts/**: Executable Node.js code
- **references/**: Documentation like this file
- **assets/**: Templates and resources

## Script Reference

### greet.js

Generates a personalized greeting message.

**Arguments:**
| Position | Name | Required | Default | Description |
|----------|------|----------|---------|-------------|
| 1 | name | No | "World" | The name to greet |

**Output Format:**
```json
{
  "message": "Hello, [name]!",
  "timestamp": "1/15/2026, 4:00:00 PM",
  "skill": "example-skill"
}
```

**Examples:**
```bash
# Default greeting
node scripts/greet.js
# Output: { "message": "Hello, World!", ... }

# Custom name
node scripts/greet.js Alice
# Output: { "message": "Hello, Alice!", ... }
```

## Best Practices

1. Always check the SKILL.md first for quick reference
2. Use this guide for detailed documentation
3. Check assets/ for templates you can use in your output
