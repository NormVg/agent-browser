import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

const command = process.argv.slice(2).join(' ');
const cwd = process.env.PWD || process.cwd();

if (!command) {
  console.error(JSON.stringify({ error: 'No command provided' }));
  process.exit(1);
}

try {
  const { stdout, stderr } = await execAsync(command, {
    cwd: cwd,
    timeout: 30000, // 30 second timeout
    maxBuffer: 10 * 1024 * 1024, // 10MB buffer
  });

  const result = {
    command: command,
    cwd: cwd,
    success: true,
    stdout: stdout.trim(),
    stderr: stderr.trim(),
  };

  console.log(JSON.stringify(result, null, 2));

} catch (error) {
  const result = {
    command: command,
    cwd: cwd,
    success: false,
    error: error.message,
    stdout: error.stdout ? error.stdout.trim() : '',
    stderr: error.stderr ? error.stderr.trim() : '',
    exitCode: error.code,
  };

  console.log(JSON.stringify(result, null, 2));
  process.exit(1);
}
