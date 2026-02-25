import { tool } from 'ai';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';
import { registry } from '../lib/plugins/registry.js';

/**
 * Read Skill Reference Tool
 * Allows the AI to read documentation/knowledge files from a skill's references/ folder.
 */
export const readSkillReference = tool({
  description: 'Read a reference document from the active skill\'s references/ folder. Use this to access documentation, guides, or knowledge files that help you understand how to use the skill.',
  inputSchema: z.object({
    filename: z.string().describe('The name of the reference file to read (e.g., "api-docs.md", "examples.txt").'),
  }),
  execute: async ({ filename }) => {
    const activePlugin = registry.activePlugin;

    if (!activePlugin) {
      return {
        error: 'No active plugin. You must activate a skill before reading its references.',
      };
    }

    try {
      const refPath = path.join(activePlugin.path, 'references', filename);
      const content = await fs.readFile(refPath, 'utf-8');

      return {
        plugin: activePlugin.name,
        file: filename,
        content: content,
      };
    } catch (error) {
      // List available references on error
      let availableRefs = [];
      try {
        const refsDir = path.join(activePlugin.path, 'references');
        const files = await fs.readdir(refsDir);
        availableRefs = files.filter(f => !f.startsWith('.'));
      } catch (e) {
        // No references directory
      }

      const refList = availableRefs.length > 0
        ? `Available references: ${availableRefs.join(', ')}`
        : 'No references found in this skill.';

      return {
        plugin: activePlugin.name,
        file: filename,
        error: `${error.message}\n${refList}`,
      };
    }
  },
});

/**
 * Read Skill Asset Tool
 * Allows the AI to read template/resource files from a skill's assets/ folder.
 */
export const readSkillAsset = tool({
  description: 'Read an asset file (template, resource) from the active skill\'s assets/ folder. Use this to access templates, configuration samples, or other resources.',
  inputSchema: z.object({
    filename: z.string().describe('The name of the asset file to read (e.g., "template.html", "config.json").'),
  }),
  execute: async ({ filename }) => {
    const activePlugin = registry.activePlugin;

    if (!activePlugin) {
      return {
        error: 'No active plugin. You must activate a skill before reading its assets.',
      };
    }

    try {
      const assetPath = path.join(activePlugin.path, 'assets', filename);
      const content = await fs.readFile(assetPath, 'utf-8');

      return {
        plugin: activePlugin.name,
        file: filename,
        content: content,
      };
    } catch (error) {
      // List available assets on error
      let availableAssets = [];
      try {
        const assetsDir = path.join(activePlugin.path, 'assets');
        const files = await fs.readdir(assetsDir);
        availableAssets = files.filter(f => !f.startsWith('.'));
      } catch (e) {
        // No assets directory
      }

      const assetList = availableAssets.length > 0
        ? `Available assets: ${availableAssets.join(', ')}`
        : 'No assets found in this skill.';

      return {
        plugin: activePlugin.name,
        file: filename,
        error: `${error.message}\n${assetList}`,
      };
    }
  },
});

/**
 * List Skill Resources Tool
 * Lists all available scripts, references, and assets for the active skill.
 */
export const listSkillResources = tool({
  description: 'List all available resources (scripts, references, assets) for the currently active skill. Use this to discover what files are available.',
  inputSchema: z.object({}),
  execute: async () => {
    const activePlugin = registry.activePlugin;

    if (!activePlugin) {
      return {
        error: 'No active plugin. You must activate a skill first.',
      };
    }

    const pluginPath = activePlugin.path;

    // Helper to list directory
    const listDir = async (subdir) => {
      try {
        const dirPath = path.join(pluginPath, subdir);
        const files = await fs.readdir(dirPath);
        return files.filter(f => !f.startsWith('.'));
      } catch {
        return null;
      }
    };

    const [scripts, references, assets] = await Promise.all([
      listDir('scripts'),
      listDir('references'),
      listDir('assets'),
    ]);

    return {
      plugin: activePlugin.name,
      pluginId: activePlugin.id,
      resources: {
        scripts: scripts || 'Not available',
        references: references || 'Not available',
        assets: assets || 'Not available',
      },
    };
  },
});
