import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const pattern = process.argv[2] || '*';
const searchDir = process.argv[3] || '.';

// Convert glob pattern to regex
function globToRegex(glob) {
  return new RegExp(
    '^' + glob
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.') + '$'
  );
}

async function searchFiles(dir, pattern) {
  const results = [];
  const regex = globToRegex(pattern);

  async function walk(currentDir) {
    const files = await fs.readdir(currentDir, { withFileTypes: true });

    for (const file of files) {
      const fullPath = path.join(currentDir, file.name);

      if (regex.test(file.name)) {
        const stats = await fs.stat(fullPath);
        results.push({
          name: file.name,
          path: fullPath,
          type: file.isDirectory() ? 'directory' : 'file',
          size: file.isFile() ? stats.size : null,
        });
      }

      if (file.isDirectory() && !file.name.startsWith('.')) {
        await walk(fullPath);
      }
    }
  }

  try {
    await walk(path.resolve(dir));
  } catch (error) {
    // Ignore permission errors
  }

  return results;
}

try {
  const matches = await searchFiles(searchDir, pattern);

  console.log(JSON.stringify({
    pattern: pattern,
    searchPath: path.resolve(searchDir),
    matches: matches.length,
    files: matches
  }, null, 2));

} catch (error) {
  console.error(JSON.stringify({ error: error.message }));
  process.exit(1);
}
