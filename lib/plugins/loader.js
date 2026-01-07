import fs from 'fs/promises';
import path from 'path';

/**
 * Parse a SKILL.md file to extract metadata and content.
 * Supports a simple YAML-like structure for top-level keys:
 * name: ...
 * description: ...
 * instructions: ...
 *
 * @param {string} filePath - Path to SKILL.md
 * @returns {Promise<{name: string, description: string, instructions: string, raw: string} | null>}
 */
export const parseSkillFile = async (filePath) => {
  try {
    const content = await fs.readFile(filePath, 'utf-8');

    // Simple regex to extract name and description
    // Looks for "name: Value" at the start of a line
    const nameMatch = content.match(/^name:\s*(.+)$/m);
    const descMatch = content.match(/^description:\s*(.+)$/m);
    const keywordsMatch = content.match(/^keywords:\s*(.+)$/m);

    if (!nameMatch || !descMatch) {
      console.warn(`Skipping invalid skill file: ${filePath} (Missing name or description)`);
      return null;
    }

    const keywords = keywordsMatch
      ? keywordsMatch[1].split(',').map(k => k.trim().toLowerCase())
      : [];

    return {
      name: nameMatch[1].trim(),
      description: descMatch[1].trim(),
      keywords,
      // For instructions, we'll just return the whole content for now,
      // or we could try to parse the "instructions:" block.
      // The user wants "progressive disclosure", so we need the full text available for later.
      raw: content
    };
  } catch (error) {
    console.error(`Error reading skill file ${filePath}:`, error.message);
    return null;
  }
};
