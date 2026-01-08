import chalk from 'chalk';
import boxen from 'boxen';
import figlet from 'figlet';
import config from '../config.js';

// Color themes
export const colors = {
  user: chalk.cyan,
  assistant: chalk.green,
  system: chalk.yellow,
  error: chalk.red,
  info: chalk.blue,
  dim: chalk.gray,
};

/**
 * Show the welcome banner
 */
export const showWelcomeBanner = () => {
  // console.clear(); // Disabled for debugging

  console.log(
    chalk.cyan(
      figlet.textSync('oopsAI', {
        font: 'Standard',
        horizontalLayout: 'default',
        verticalLayout: 'default',
      })
    )
  );

  console.log(colors.dim('─'.repeat(50)));
  console.log(colors.assistant('●') + ' Powered by OpenRouter · AI SDK');
  console.log(colors.assistant('●') + ' Model: ' + chalk.white(config.openrouter.model));
  if (config.tools?.enabled) {
    // Import tools dynamically to avoid circular dependency issues if possible,
    // but here we might need to pass them in or just accept the hardcoded list for now if we can't access them.
    // Actually, ui.js shouldn't import tools/index.js if tools/index.js imports ui.js (circular).
    // Let's check if tools/index.js imports ui.js. It doesn't.
    // But chat.js imports both.
    // Let's try to import tools here.
    // Wait, I can't easily import `tools` inside this function without making it async or using top-level await which might be tricky if not an ES module (it is).
    // Better: Pass tools as an argument to showWelcomeBanner?
    // For now, I'll just change the text to be generic or try to import.
    // Let's just say "Tools: Enabled" or list them if I can.
    console.log(colors.assistant('●') + ' Tools: System Skills · Weather · Math · Time');
  }
  console.log(colors.dim('─'.repeat(50)));
  console.log(colors.dim('Type your message and press Enter. Ask for weather, time, or math.'));
  console.log(colors.dim('Press Ctrl+C to exit.'));
  console.log();
};

/**
 * Display the assistant's response in a box
 */
export const displayAssistantBox = (text) => {
  if (typeof text !== 'string') return;
  const safe = text.replace(/undefined/g, '').trim();
  if (!safe) return;

  const assistantBox = boxen(
    colors.assistant.bold('Assistant\n') +
    colors.dim('─'.repeat(50)) + '\n' +
    chalk.white(safe),
    {
      padding: { left: 2, right: 2, top: 0, bottom: 0 },
      margin: { left: 0, right: 0, top: 1, bottom: 1 },
      borderStyle: 'round',
      borderColor: 'green',
    }
  );
  console.log(assistantBox);
};

/**
 * Display the user's message in a box
 */
export const displayUserBox = (text) => {
  if (typeof text !== 'string') return;
  const safe = text.replace(/undefined/g, '').trim();
  if (!safe) return;

  const userBox = boxen(
    colors.user.bold('You\n') +
    colors.dim('─'.repeat(50)) + '\n' +
    chalk.white(safe),
    {
      padding: { left: 2, right: 2, top: 0, bottom: 0 },
      margin: { left: 0, right: 0, top: 1, bottom: 0 },
      borderStyle: 'round',
      borderColor: 'cyan',
    }
  );
  console.log(userBox);
};

/**
 * Display a tool call
 */
export const displayToolCall = (toolName, args) => {
  console.log(colors.info.bold('  🔧 TOOL CALL'));
  console.log(colors.dim('  ' + '─'.repeat(58)));
  console.log(colors.system('  Tool Name: ') + chalk.bold.cyan(toolName));

  const argsStr = args ? JSON.stringify(args, null, 2) : '{}';
  console.log(colors.system('  Arguments:'));
  argsStr.split('\n').forEach(line => {
    console.log(colors.dim('    ' + line));
  });
  console.log(colors.dim('  ' + '─'.repeat(58)));
  console.log(colors.dim('  ⏳ Executing...\n'));
};

/**
 * Display a tool result
 */
export const displayToolResult = (result) => {
  console.log(colors.assistant.bold('  ✓ TOOL RESULT'));
  console.log(colors.dim('  ' + '─'.repeat(58)));

  const resultStr = result ? JSON.stringify(result, null, 2) : 'No result';
  resultStr.split('\n').forEach(line => {
    console.log(colors.dim('    ' + line));
  });
  console.log(colors.dim('  ' + '─'.repeat(58)));
  console.log();
};

/**
 * Display an error message
 */
export const displayError = (error) => {
  // Handle Rate Limits specifically
  if (error.message && error.message.includes('429')) {
    console.log(boxen(chalk.yellow('⚠️  Rate Limit Exceeded'), { padding: 1, borderColor: 'yellow' }));
    console.log(chalk.yellow('The free model is currently overloaded. Please try again in a moment.'));
    console.log(chalk.dim('Tip: You can change the model in config.js to another free model like "microsoft/phi-4"'));
  } else {
    const errorBox = boxen(
      colors.error.bold('Error\n') +
      colors.dim('─'.repeat(50)) + '\n' +
      chalk.white(error.message || error),
      {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'red',
        width: 80,
      }
    );
    console.log(errorBox);
  }
};
