import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const count = process.argv[2] || '10';

try {
  const { stdout } = await execAsync(
    `git log -n ${count} --pretty=format:'{"hash":"%h","author":"%an","date":"%ar","message":"%s"},' --no-merges`
  );

  // Clean up the output to valid JSON
  const jsonStr = '[' + stdout.trim().slice(0, -1) + ']';
  const commits = JSON.parse(jsonStr);

  console.log(JSON.stringify({
    count: commits.length,
    commits: commits
  }, null, 2));

} catch (error) {
  console.error(JSON.stringify({ error: error.message }));
  process.exit(1);
}
