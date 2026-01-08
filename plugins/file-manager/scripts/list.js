import fs from 'fs/promises';
import path from 'path';

const targetDir = process.argv[2] || '.';
const showHidden = process.argv[3] === 'true';

try {
  const files = await fs.readdir(targetDir, { withFileTypes: true });

  const items = [];

  for (const file of files) {
    if (!showHidden && file.name.startsWith('.')) continue;

    const fullPath = path.join(targetDir, file.name);
    const stats = await fs.stat(fullPath);

    items.push({
      name: file.name,
      type: file.isDirectory() ? 'directory' : 'file',
      size: file.isFile() ? stats.size : null,
      modified: stats.mtime.toISOString(),
    });
  }

  console.log(JSON.stringify({
    path: path.resolve(targetDir),
    totalItems: items.length,
    items: items
  }, null, 2));

} catch (error) {
  console.error(JSON.stringify({ error: error.message }));
  process.exit(1);
}
