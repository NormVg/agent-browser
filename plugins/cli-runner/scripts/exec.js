import { spawn } from 'child_process';

const command = process.argv[2];
const args = process.argv.slice(3);

if (!command) {
  console.error(JSON.stringify({ error: 'No command provided' }));
  process.exit(1);
}

const child = spawn(command, args, {
  cwd: process.cwd(),
  stdio: 'inherit', // Stream directly to parent process
  shell: true,
});

child.on('error', (error) => {
  console.error(JSON.stringify({ error: error.message }));
  process.exit(1);
});

child.on('exit', (code) => {
  if (code !== 0) {
    process.exit(code);
  }
});
