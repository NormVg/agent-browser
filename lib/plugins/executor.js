import { spawn } from 'child_process';
import path from 'path';
import chalk from 'chalk';

/**
 * Execute a script inside a plugin directory.
 *
 * @param {string} pluginPath - Absolute path to the plugin root
 * @param {string} scriptName - Name of the script file (e.g., "myscript.py")
 * @param {string[]} args - Arguments to pass to the script
 * @returns {Promise<string>} - Output of the script
 */
export const runScript = (pluginPath, scriptName, args = []) => {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(pluginPath, 'scripts', scriptName);
    const cwd = pluginPath; // Sandbox execution to plugin directory

    // Determine interpreter based on extension
    let command;
    let commandArgs = [];

    if (scriptName.endsWith('.js')) {
      command = 'node';
      commandArgs = [scriptPath, ...args];
    } else {
      return reject(new Error(`Unsupported script type: ${scriptName}. Only .js scripts are supported.`));
    }

    console.log(chalk.dim(`  (Executing ${scriptName} in ${cwd})...`));

    const child = spawn(command, commandArgs, {
      cwd,
      env: { ...process.env }, // Pass env vars? Maybe restrict later.
      shell: false // Safer
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Script failed with code ${code}: ${stderr || stdout}`));
      } else {
        resolve(stdout.trim());
      }
    });

    child.on('error', (err) => {
      reject(new Error(`Failed to start script: ${err.message}`));
    });
  });
};
