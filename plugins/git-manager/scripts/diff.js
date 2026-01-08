import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const file = process.argv[2] || '';

try {
  const cmd = file ? `git diff ${file}` : 'git diff';
  const { stdout } = await execAsync(cmd);

  if (!stdout.trim()) {
    console.log(JSON.stringify({
      hasChanges: false,
      message: 'No uncommitted changes'
    }));
  } else {
    console.log(JSON.stringify({
      hasChanges: true,
      diff: stdout,
      file: file || 'all files'
    }, null, 2));
  }

} catch (error) {
  console.error(JSON.stringify({ error: error.message }));
  process.exit(1);
}
