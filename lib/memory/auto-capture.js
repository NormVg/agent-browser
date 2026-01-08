import { memoryGraph } from './graph.js';

/**
 * Lightweight automatic memory capture
 * Extracts simple facts from conversation using pattern matching
 * No LLM calls - just rules
 */

// Simple patterns to detect memorable information
const patterns = [
  // Preferences
  { regex: /(?:i|my)\s+(?:like|love|prefer|enjoy)\s+([^,.!?]+)/i, type: 'note', tag: 'preference' },
  { regex: /(?:i|my)\s+(?:hate|dislike|avoid)\s+([^,.!?]+)/i, type: 'note', tag: 'preference' },

  // Personal info
  { regex: /(?:my name is|i am|i'm)\s+([A-Z][a-z]+)/i, type: 'person', tag: 'user' },
  { regex: /(?:i use|i'm using)\s+([A-Z][a-zA-Z0-9]+)/i, type: 'note', tag: 'tool' },

  // Projects and companies
  { regex: /(?:project|company)\s+(?:is|named?)\s+([A-Z][a-zA-Z0-9]+)/i, type: 'concept', tag: 'project' },
  { regex: /(?:CEO|founder|owner)\s+of\s+([A-Z][a-zA-Z0-9]+)/i, type: 'concept', tag: 'company' },

  // Tasks and goals
  { regex: /(?:need to|have to|must|should)\s+([^,.!?]+)/i, type: 'task', tag: 'todo' },
  { regex: /(?:working on|building|creating)\s+([^,.!?]+)/i, type: 'task', tag: 'active' },
];

/**
 * Auto-capture memorable facts from user message
 * @param {string} userMessage - The user's message
 * @param {string} assistantResponse - The assistant's response
 */
export async function autoCapture(userMessage, assistantResponse) {
  if (!userMessage || userMessage.length < 10) {
    return; // Skip very short messages
  }

  const captured = [];

  // Extract facts from user message
  for (const pattern of patterns) {
    const match = userMessage.match(pattern.regex);
    if (match && match[1]) {
      const content = match[1].trim();

      // Avoid duplicates by searching first
      const existing = await memoryGraph.search(content);
      if (existing.length === 0) {
        try {
          const node = await memoryGraph.createNode(
            content,
            pattern.type,
            [pattern.tag]
          );
          captured.push(node);
        } catch (err) {
          // Silent fail for background capture
          console.error('Auto-capture failed:', err.message);
        }
      }
    }
  }

  return captured;
}

/**
 * Simple entity extraction (names, places, tools)
 * @param {string} text - Text to extract from
 */
export function extractEntities(text) {
  const entities = {
    names: [],
    tools: [],
    dates: []
  };

  // Extract capitalized words (potential names)
  const namePattern = /\b[A-Z][a-z]+\b/g;
  entities.names = [...new Set(text.match(namePattern) || [])];

  // Extract common tools/technologies
  const toolPattern = /\b(React|Node|Python|JavaScript|TypeScript|Docker|Git|GitHub|VS Code|Neovim|Vim|Hyprland|Linux|macOS|Windows)\b/gi;
  entities.tools = [...new Set(text.match(toolPattern) || [])];

  // Extract dates
  const datePattern = /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:,\s+\d{4})?\b/gi;
  entities.dates = [...new Set(text.match(datePattern) || [])];

  return entities;
}
