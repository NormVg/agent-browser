import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

try {
  const { stdout, stderr } = await execAsync('git status --porcelain');

  const lines = stdout.trim().split('\n').filter(l => l);
  const status = {
    clean: lines.length === 0,
    modified: [],
    staged: [],
    untracked: [],
  };

  for (const line of lines) {
    const code = line.substring(0, 2);
    const file = line.substring(3);

    if (code === '??') {
      status.untracked.push(file);
    } else if (code[0] !== ' ') {
      status.staged.push(file);
    } else {
      status.modified.push(file);
    }
  }

  // Get current branch
  const { stdout: branchOut } = await execAsync('git branch --show-current');
  status.branch = branchOut.trim();

  console.log(JSON.stringify(status, null, 2));

} catch (error) {
  console.error(JSON.stringify({
    error: error.message,
    isGitRepo: false
  }));
  process.exit(1);
}
